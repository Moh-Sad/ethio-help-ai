import express from "express";
import { getEmbedding } from "../services/embedding.js";
import { search } from "../services/retrieval.js";
import { buildPrompt, buildProcessPrompt, isProcessQuestion, generateAnswer } from "../services/rag.js";
import { detectLanguage } from "../services/language.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

/**
 * POST /ask
 * Main RAG question-answering endpoint.
 * - Authenticates user
 * - Detects question language
 * - Embeds the query
 * - Retrieves relevant documents via vector search
 * - Generates a contextualized answer
 *
 * Body: { query: string, category?: string, stream?: boolean }
 */
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { query, category, stream: wantStream } = req.body;

    // Validate input
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ error: "Query is required." });
    }

    if (query.trim().length > 2000) {
      return res.status(400).json({ error: "Query must be under 2000 characters." });
    }

    const cleanQuery = query.trim();

    // 1. Detect language
    const detectedLang = detectLanguage(cleanQuery);

    // 2. Generate embedding for the query
    const embedding = await getEmbedding(cleanQuery);

    // 3. Search for relevant documents
    const docs = await search(embedding, {
      topK: 5,
      category: category || undefined,
    });

    // 4. Determine if this is a process question
    const isProcess = isProcessQuestion(cleanQuery);

    // 5. Build the appropriate prompt
    const prompt = isProcess
      ? buildProcessPrompt(cleanQuery, docs, detectedLang)
      : buildPrompt(cleanQuery, docs, detectedLang);

    // 6. Generate the answer
    if (wantStream) {
      // Streaming response
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Detected-Language", detectedLang);

      const stream = await generateAnswer(prompt, { stream: true });

      stream.on("data", (chunk) => {
        res.write(chunk);
      });

      stream.on("end", () => {
        res.end();
      });

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        res.end();
      });
    } else {
      // Non-streaming response
      const answer = await generateAnswer(prompt);

      // Extract unique source document titles
      const sources = [...new Set(docs.map((d) => d.title))];

      res.json({
        answer,
        sources,
        language: detectedLang,
        isProcess,
        docsFound: docs.length,
      });
    }
  } catch (error) {
    next(error);
  }
});

export default router;