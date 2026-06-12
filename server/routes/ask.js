import express from "express";
import { getEmbedding } from "../services/embedding.js";
import { search } from "../services/retrieval.js";
import { buildPrompt, buildProcessPrompt, isProcessQuestion, generateAnswer } from "../services/rag.js";
import { detectLanguage } from "../services/language.js";
import { translateToEnglish } from "../services/translation.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

/**
 * POST /ask
 * Main RAG question-answering endpoint.
 * - Detects question language
 * - Translates query to English for embedding/search only
 * - Embeds the English query
 * - Retrieves relevant documents via vector search
 * - Generates a contextualized answer directly in the user's language
 *
 * Body: { query: string, category?: string, stream?: boolean, language?: string }
 */
router.post("/", async (req, res, next) => {
  try {
    const { query, category, stream: wantStream, language: clientLang } = req.body;

    // Validate input
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ error: "Query is required." });
    }

    if (query.trim().length > 2000) {
      return res.status(400).json({ error: "Query must be under 2000 characters." });
    }

    const cleanQuery = query.trim();

    // 1. Determine language: prefer explicit client language, fallback to detection
    const userLang = clientLang && ["en", "am", "ar"].includes(clientLang)
      ? clientLang
      : detectLanguage(cleanQuery);

    // 2. Translate query to English ONLY for embedding/search
    let englishQuery = cleanQuery;
    if (userLang !== "en") {
      try {
        englishQuery = await translateToEnglish(cleanQuery, userLang);
      } catch (err) {
        console.error("Translation to English failed, using original query:", err.message);
      }
    }

    // 3. Generate embedding for the English query
    const embedding = await getEmbedding(englishQuery);

    // 4. Search for relevant documents (always in English)
    const docs = await search(embedding, {
      topK: 5,
      category: category || undefined,
    });

    // 5. Determine if this is a process question (check both original and English)
    const isProcess = isProcessQuestion(cleanQuery) || isProcessQuestion(englishQuery);

    // 6. Build the prompt — generate directly in the user's language
    //    We pass the English query for context matching but set language to userLang
    //    so Gemini generates the response natively in that language.
    const prompt = isProcess
      ? buildProcessPrompt(englishQuery, docs, userLang)
      : buildPrompt(englishQuery, docs, userLang);

    // 7. Generate the answer — stream directly for ALL languages
    if (wantStream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Detected-Language", userLang);

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
        language: userLang,
        isProcess,
        docsFound: docs.length,
      });
    }
  } catch (error) {
    next(error);
  }
});

export default router;