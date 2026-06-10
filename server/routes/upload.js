import express from "express";
import DocumentChunk from "../models/DocumentChunk.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { getEmbedding, getEmbeddings, splitIntoChunks } from "../services/embedding.js";
import { getKnowledgeBaseStats, getDocumentTitles, deleteDocument } from "../services/retrieval.js";
import { detectLanguage } from "../services/language.js";

const router = express.Router();

/**
 * GET /documents
 * Get knowledge base statistics (public).
 */
router.get("/", async (_req, res, next) => {
  try {
    const stats = await getKnowledgeBaseStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /documents/titles
 * Get all document titles (public).
 */
router.get("/titles", async (_req, res, next) => {
  try {
    const titles = await getDocumentTitles();
    res.json({ titles });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /documents/upload
 * Upload and index a new document. Admin-only.
 * Splits text into chunks, generates embeddings, and stores in MongoDB.
 */
router.post("/upload", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { title, content, category, language } = req.body;

    // Validate inputs
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ error: "Document title is required." });
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ error: "Document content is required." });
    }

    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    // Auto-detect language if not provided
    const detectedLang = language || detectLanguage(cleanContent);

    // Validate category
    const validCategories = ["government", "education", "health", "business", "legal", "general"];
    const docCategory = validCategories.includes(category) ? category : "general";

    // Split into chunks
    const textChunks = splitIntoChunks(cleanContent, 500, 50);

    // Generate embeddings for all chunks
    const embeddings = await getEmbeddings(textChunks);

    // Create document chunk records
    const chunkDocs = textChunks.map((text, i) => ({
      title: cleanTitle,
      content: text,
      category: docCategory,
      language: detectedLang,
      embedding: embeddings[i],
      chunkIndex: i,
      totalChunks: textChunks.length,
      metadata: {
        source: "manual_upload",
        uploadedBy: req.user._id,
      },
    }));

    // Bulk insert into MongoDB
    await DocumentChunk.insertMany(chunkDocs);

    res.status(201).json({
      success: true,
      message: `Document "${cleanTitle}" indexed successfully.`,
      chunksCreated: chunkDocs.length,
      language: detectedLang,
      category: docCategory,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /documents/:title
 * Delete all chunks for a document by title. Admin-only.
 */
router.delete("/:title", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const title = decodeURIComponent(req.params.title);
    const result = await deleteDocument(title);

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Document not found." });
    }

    res.json({
      success: true,
      message: `Document "${title}" deleted.`,
      chunksDeleted: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
