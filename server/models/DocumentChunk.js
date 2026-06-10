import mongoose from "mongoose";

const documentChunkSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Document title is required"],
      trim: true,
      maxlength: [300, "Title cannot exceed 300 characters"],
      index: true,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    category: {
      type: String,
      enum: ["government", "education", "health", "business", "legal", "general"],
      default: "general",
      index: true,
    },
    language: {
      type: String,
      enum: ["en", "am", "ar"],
      default: "en",
      index: true,
    },
    embedding: {
      type: [Number],
      required: true,
      // 1536 dimensions (padded from 768 for Gemini)
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    totalChunks: {
      type: Number,
      required: true,
    },
    metadata: {
      source: { type: String, default: "" },
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
  },
  { timestamps: true }
);

// Compound index for efficient filtering + recency sorting
documentChunkSchema.index({ category: 1, language: 1, createdAt: -1 });

// Text index for basic keyword fallback search
documentChunkSchema.index({ title: "text", content: "text" });

/**
 * Perform vector similarity search using MongoDB Atlas Vector Search.
 * Falls back to cosine similarity in application code if Atlas index is unavailable.
 *
 * IMPORTANT: You must create a Vector Search Index in MongoDB Atlas UI:
 * Index Name: "vector_index"
 * Field: "embedding"
 * Dimensions: 1536
 * Similarity: "cosine"
 */
documentChunkSchema.statics.vectorSearch = async function (
  queryEmbedding,
  { topK = 5, category, language } = {}
) {
  // Build optional pre-filter
  const filter = {};
  if (category) filter.category = category;
  if (language) filter.language = language;

  try {
    // Try Atlas Vector Search first ($vectorSearch aggregation stage)
    const pipeline = [
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: topK * 10,
          limit: topK,
          ...(Object.keys(filter).length > 0 && {
            filter: filter,
          }),
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          content: 1,
          category: 1,
          language: 1,
          chunkIndex: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ];

    const results = await this.aggregate(pipeline);
    return results;
  } catch (error) {
    // Fallback: If Atlas Vector Search is not available (e.g., local MongoDB),
    // do brute-force cosine similarity in application code.
    console.warn(
      "Atlas Vector Search unavailable, falling back to in-app cosine similarity:",
      error.message
    );
    return await this.cosineFallback(queryEmbedding, { topK, category, language });
  }
};

/**
 * Brute-force cosine similarity fallback for local/non-Atlas MongoDB instances.
 * Not recommended for production with large datasets.
 */
documentChunkSchema.statics.cosineFallback = async function (
  queryEmbedding,
  { topK = 5, category, language } = {}
) {
  const query = {};
  if (category) query.category = category;
  if (language) query.language = language;

  const chunks = await this.find(query)
    .select("title content category language chunkIndex embedding")
    .lean();

  if (chunks.length === 0) return [];

  // Compute cosine similarity for each chunk
  const scored = chunks.map((chunk) => ({
    _id: chunk._id,
    title: chunk.title,
    content: chunk.content,
    category: chunk.category,
    language: chunk.language,
    chunkIndex: chunk.chunkIndex,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
};

/**
 * Get all unique document titles.
 */
documentChunkSchema.statics.getDocumentTitles = async function () {
  const titles = await this.distinct("title");
  return titles;
};

/**
 * Get statistics about the knowledge base.
 */
documentChunkSchema.statics.getStats = async function () {
  const [totalChunks, titles, languageCounts, categoryCounts] = await Promise.all([
    this.countDocuments(),
    this.distinct("title"),
    this.aggregate([
      { $group: { _id: "$language", count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
  ]);

  return {
    totalDocuments: titles.length,
    totalChunks,
    titles,
    languages: Object.fromEntries(languageCounts.map((l) => [l._id, l.count])),
    categories: Object.fromEntries(categoryCounts.map((c) => [c._id, c.count])),
  };
};

/**
 * Delete all chunks belonging to a document by title.
 */
documentChunkSchema.statics.deleteByTitle = async function (title) {
  return this.deleteMany({ title });
};

function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

const DocumentChunk = mongoose.model("DocumentChunk", documentChunkSchema);
export default DocumentChunk;
