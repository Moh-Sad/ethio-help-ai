import express from "express";
import fs from "fs/promises";
import path from "path";
import os from "os";
import DocumentChunk from "../models/DocumentChunk.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { getEmbedding, getEmbeddings, splitIntoChunks } from "../services/embedding.js";
import { getKnowledgeBaseStats, getDocumentTitles, deleteDocument } from "../services/retrieval.js";
import { detectLanguage } from "../services/language.js";
import { extractTextFromFile } from "../utils/fileExtractor.js";

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
 * Can receive either raw `content` (text) OR a base64 encoded `file`.
 * Splits text into chunks, generates embeddings, and stores in MongoDB.
 */
router.post("/upload", requireAuth, requireAdmin, async (req, res, next) => {
  let tempFilePath = null;
  try {
    const { title, content, category, language, file, fileName } = req.body;

    let finalContent = content;
    let finalTitle = title;

    // Handle file upload if provided
    if (file) {
      if (!fileName) {
        return res.status(400).json({ error: "File name is required when uploading a file." });
      }

      // Parse base64 string
      const matches = file.match(/^data:(.+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ error: "Invalid file format. Must be a base64 data URI." });
      }

      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      // Write to a temporary file
      const tempDir = os.tmpdir();
      const ext = path.extname(fileName);
      const uniqueName = `upload_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
      tempFilePath = path.join(tempDir, uniqueName);

      await fs.writeFile(tempFilePath, buffer);

      // Extract text content using our extractor utility
      try {
        finalContent = await extractTextFromFile(tempFilePath);
      } catch (err) {
        console.error("Text extraction failed:", err);
        return res.status(400).json({ error: `Failed to extract text from file: ${err.message}` });
      }

      // If title is not specified, use the file name without extension
      if (!finalTitle || finalTitle.trim().length === 0) {
        finalTitle = path.basename(fileName, ext).replace(/[_-]/g, " ");
      }
    }

    // Validate inputs
    if (!finalTitle || typeof finalTitle !== "string" || finalTitle.trim().length === 0) {
      return res.status(400).json({ error: "Document title is required." });
    }

    if (!finalContent || typeof finalContent !== "string" || finalContent.trim().length === 0) {
      return res.status(400).json({ error: "Document content is empty or could not be extracted." });
    }

    const cleanTitle = finalTitle.trim();
    const cleanContent = finalContent.trim();

    // Auto-detect language if not provided
    const detectedLang = language || detectLanguage(cleanContent);

    // Validate category
    const validCategories = ["government", "education", "health", "business", "legal", "general"];
    const docCategory = validCategories.includes(category) ? category : "general";

    // Split into chunks
    const textChunks = splitIntoChunks(cleanContent, 500, 50);

    if (textChunks.length === 0) {
      return res.status(400).json({ error: "Document text is too short or has no content to index." });
    }

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
        source: file ? "file_upload" : "manual_upload",
        fileName: file ? fileName : undefined,
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
  } finally {
    // Clean up temporary file if created
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (err) {
        console.error("Failed to delete temp file:", tempFilePath, err);
      }
    }
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
