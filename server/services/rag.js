import axios from "axios";
import { detectLanguage, getLanguageInstruction } from "./language.js";

/**
 * Build a RAG prompt with retrieved context chunks and language awareness.
 *
 * @param {string} query - The user's question
 * @param {Array<{title: string, content: string, score: number}>} docs - Retrieved document chunks
 * @param {string} detectedLang - Detected language code ('en', 'am', 'ar')
 * @returns {string} The system prompt for the LLM
 */
export function buildPrompt(query, docs, detectedLang) {
  const lang = detectedLang || detectLanguage(query);
  const langInstruction = getLanguageInstruction(lang);

  if (!docs || docs.length === 0) {
    return `You are EthioHelp AI (ኢትዮ ሔልፕ AI), a helpful assistant for the Ethiopian community. You help with questions about government services, education, health, jobs, and business processes in Ethiopia.

${langInstruction}

Currently, no relevant documents were found in the knowledge base for this question. You can still try to help with general knowledge about Ethiopia, but please let the user know that for the most accurate and specific information, an admin should upload relevant documents.

Be friendly, helpful, and honest about the limitations of your current knowledge.

User's question: ${query}`;
  }

  const contextText = docs
    .map(
      (doc, i) =>
        `--- Document: ${doc.title} (Chunk ${i + 1}, Relevance: ${(doc.score * 100).toFixed(1)}%) ---\n${doc.content}`
    )
    .join("\n\n");

  return `You are EthioHelp AI (ኢትዮ ሔልፕ AI), a knowledgeable assistant for the Ethiopian community. Answer the following question using the provided context documents.

${langInstruction}

CONTEXT:
${contextText}

QUESTION: ${query}

INSTRUCTIONS:
- Answer based primarily on the provided context documents
- If the context does not contain enough information, say so honestly and provide what general knowledge you can
- Be helpful, clear, and provide step-by-step instructions when applicable
- If the question is about a process or procedure, list the steps clearly with required documents
- Mention which source documents the information came from
- Include relevant fees, timeframes, and locations if available in the context
- If the user asks in Amharic or Arabic, respond in the same language`;
}

/**
 * Build a structured process prompt for step-by-step procedure questions.
 */
export function buildProcessPrompt(query, docs, detectedLang) {
  const lang = detectedLang || detectLanguage(query);
  const langInstruction = getLanguageInstruction(lang);

  const contextText =
    docs && docs.length > 0
      ? docs
          .map(
            (doc, i) =>
              `--- Document: ${doc.title} (Chunk ${i + 1}) ---\n${doc.content}`
          )
          .join("\n\n")
      : "No specific documents found for this process.";

  return `You are EthioHelp AI (ኢትዮ ሔልፕ AI) Process Assistant. The user is asking about a process or procedure in Ethiopia.

${langInstruction}

CONTEXT:
${contextText}

QUESTION: ${query}

Respond with the following structure:

**Process: [Title of the process]**

**Steps:**
1. [First step with details]
2. [Second step with details]
...

**Required Documents:**
- [Document 1]
- [Document 2]
...

**Estimated Time & Fees:**
- Time: [estimated duration]
- Fee: [cost if known]

**Important Notes:**
- [Any additional tips, warnings, or office locations]

**Source:** [Which documents this information came from]

INSTRUCTIONS:
- Use the provided context when available
- If context is insufficient, provide general guidance and note that specific details may vary
- Be specific about Ethiopian government processes when information is available
- Include estimated timeframes and fees if known
- Mention relevant government offices and their locations if available`;
}

/**
 * Detect if a question is about a process/procedure.
 */
const PROCESS_KEYWORDS_EN = [
  "how to",
  "how do i",
  "how can i",
  "steps to",
  "process for",
  "procedure",
  "apply for",
  "register",
  "get a",
  "obtain",
  "renew",
  "requirements for",
  "documents needed",
  "what do i need",
  "guide for",
  "instructions for",
];

const PROCESS_KEYWORDS_AM = [
  "እንዴት",       // how
  "ሂደት",        // process
  "ደረጃዎች",      // steps
  "ማመልከት",     // to apply
  "መመዝገብ",     // to register
  "ማግኘት",      // to obtain
  "ማደስ",        // to renew
  "ምን ያስፈልጋል",  // what is needed
  "ሰነዶች",       // documents
];

const PROCESS_KEYWORDS_AR = [
  "كيف",         // how
  "خطوات",       // steps
  "عملية",       // process
  "إجراء",       // procedure
  "تقديم",       // to apply
  "تسجيل",       // register
  "الحصول على",   // to obtain
  "تجديد",       // renew
  "المستندات",    // documents
  "ما المطلوب",   // what is needed
];

export function isProcessQuestion(question) {
  const lower = question.toLowerCase();
  return (
    PROCESS_KEYWORDS_EN.some((kw) => lower.includes(kw)) ||
    PROCESS_KEYWORDS_AM.some((kw) => question.includes(kw)) ||
    PROCESS_KEYWORDS_AR.some((kw) => question.includes(kw))
  );
}

/**
 * Generate an answer using Google Gemini.
 * Supports streaming responses.
 *
 * @param {string} systemPrompt - The system prompt with context
 * @param {Object} options
 * @param {boolean} [options.stream=false] - Whether to stream the response
 * @returns {Promise<string|import('stream').Readable>}
 */
export async function generateAnswer(systemPrompt, { stream = false } = {}) {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  if (stream) {
    const result = await model.generateContentStream({
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
    });
    
    const { Readable } = await import("stream");
    return Readable.from((async function* () {
      for await (const chunk of result.stream) {
        yield chunk.text();
      }
    })());
  }

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
  });

  return result.response.text();
}
