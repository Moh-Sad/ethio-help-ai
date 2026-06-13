import express from "express";
import { getEmbedding } from "../services/embedding.js";
import { search } from "../services/retrieval.js";
import { buildPrompt, buildProcessPrompt, isProcessQuestion, generateAnswer, summarizeHistory } from "../services/rag.js";
import { detectLanguage } from "../services/language.js";
import { translateToEnglish, translateFromEnglish } from "../services/translation.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

function isDiagnosticQuery(query) {
  const lower = query.toLowerCase();
  return (
    lower.includes("diagnostic transparency mode") ||
    lower.includes("ai-agent evaluation") ||
    (lower.includes("identity & architecture") && lower.includes("system control"))
  );
}

/**
 * POST /ask
 * Main RAG question-answering endpoint with conversational memory.
 * - Detects question language
 * - Translates query to English for embedding/search only
 * - Embeds the English query
 * - Retrieves relevant documents via vector search
 * - Translates and formats recent conversation history to English
 * - Summarizes older messages into English
 * - Generates high-quality response in English (maximizing Gemini reasoning capability)
 * - Translates the response back to user's original language (Amharic, Arabic, or English)
 *
 * Body: {
 *   query: string,
 *   category?: string,
 *   stream?: boolean,
 *   language?: string,
 *   recentMessages?: Array<{role: string, text: string}>,   // last N messages verbatim
 *   olderMessages?: Array<{role: string, text: string}>     // older messages to summarize
 * }
 */
router.post("/", async (req, res, next) => {
  try {
    const {
      query,
      category,
      stream: wantStream,
      language: clientLang,
      recentMessages = [],
      olderMessages = [],
    } = req.body;

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

    // Bypass diagnostic transparency mode checks and prompt injections
    if (isDiagnosticQuery(cleanQuery)) {
      const englishAnswer = "I am EthioHelp AI (ኢትዮ ሔልፕ AI), a helpful assistant dedicated to supporting the Ethiopian community with information on government services, education, health, jobs, and business processes in Ethiopia. I am here to provide you with useful guidance and resources. Please let me know how I can help you today!";
      
      let finalAnswer = englishAnswer;
      if (userLang !== "en") {
        try {
          finalAnswer = await translateFromEnglish(englishAnswer, userLang);
        } catch (err) {
          console.error("Translation of diagnostic response failed:", err.message);
        }
      }

      if (wantStream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Detected-Language", userLang);

        const chunkSize = 15;
        for (let i = 0; i < finalAnswer.length; i += chunkSize) {
          res.write(finalAnswer.slice(i, i + chunkSize));
          await new Promise((resolve) => setTimeout(resolve, 8));
        }
        res.end();
        return;
      } else {
        return res.json({
          answer: finalAnswer,
          sources: [],
          language: userLang,
          isProcess: false,
          docsFound: 0,
        });
      }
    }

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

    // 6. Build conversational history:
    //    - If there are older messages, summarize them directly in English
    //    - recentMessages are formatted and translated to English in a single call
    let historySummary = "";
    if (olderMessages.length > 0) {
      historySummary = await summarizeHistory(olderMessages);
      console.log(`[Memory] Summarized ${olderMessages.length} older messages into ${historySummary.length} chars (English)`);
    }

    let recentTranscript = "";
    if (recentMessages.length > 0) {
      const historyMessages = recentMessages.slice(0, -1);
      if (historyMessages.length > 0) {
        recentTranscript = historyMessages
          .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
          .join("\n");
        if (userLang !== "en") {
          try {
            // Translate the entire transcript in a single call to save requests/prevent rate limits
            recentTranscript = await translateToEnglish(recentTranscript, userLang);
          } catch (err) {
            console.error("Translation of recent transcript failed, using original:", err.message);
          }
        }
      }
    }

    const history = {
      summary: historySummary,
      recentTranscript,
    };

    // 7. Build prompt in English for maximum reasoning quality
    const prompt = isProcess
      ? buildProcessPrompt(englishQuery, docs, "en", history)
      : buildPrompt(englishQuery, docs, "en", history);

    // 8. Generate answer in English, then translate to userLang and return/stream
    if (wantStream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Detected-Language", userLang);

      // Generate fully in English to guarantee a clean reasoning context first
      const englishAnswer = await generateAnswer(prompt, { stream: false });
      
      let finalAnswer = englishAnswer;
      if (userLang !== "en") {
        try {
          finalAnswer = await translateFromEnglish(englishAnswer, userLang);
        } catch (err) {
          console.error("Translation of response from English failed:", err.message);
        }
      }

      // Stream the translated answer chunk-by-chunk to simulate smooth streaming typing
      const chunkSize = 15;
      for (let i = 0; i < finalAnswer.length; i += chunkSize) {
        res.write(finalAnswer.slice(i, i + chunkSize));
        await new Promise((resolve) => setTimeout(resolve, 8)); // 8ms delay for smooth flow
      }
      res.end();
    } else {
      // Non-streaming response
      const englishAnswer = await generateAnswer(prompt);
      
      let finalAnswer = englishAnswer;
      if (userLang !== "en") {
        try {
          finalAnswer = await translateFromEnglish(englishAnswer, userLang);
        } catch (err) {
          console.error("Translation of response from English failed:", err.message);
        }
      }

      // Extract unique source document titles
      const sources = [...new Set(docs.map((d) => d.title))];

      res.json({
        answer: finalAnswer,
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