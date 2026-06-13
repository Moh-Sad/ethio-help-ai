import { detectLanguage, getLanguageInstruction } from "./language.js";

// ---------------------------------------------------------------------------
// Conversational Memory — Sliding Window Configuration
// ---------------------------------------------------------------------------
// The last RECENT_WINDOW_SIZE messages are always sent verbatim to the AI.
// Older messages beyond this window are compressed into a summary paragraph
// using Gemini, reducing token usage while preserving broad context.
const RECENT_WINDOW_SIZE = 6; // last 3 turns (user + assistant each)

/**
 * Summarize an array of older messages into a compact paragraph in English using Gemini.
 * Called only when the conversation has grown beyond the recent window.
 *
 * @param {Array<{role: string, text: string}>} messages - Older messages to summarize
 * @returns {Promise<string>} A concise English summary paragraph
 */
export async function summarizeHistory(messages) {
  if (!messages || messages.length === 0) return "";

  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
    .join("\n");

  const summaryPrompt = `You are a conversation summarizer. Below is the beginning of a conversation between a user and EthioHelp AI. Summarize it into a single concise paragraph (max 150 words) IN ENGLISH. The summary must capture the key topics discussed, questions asked, and answers given, regardless of the language of the conversation. This summary will be used to give the AI memory of the earlier conversation.

CONVERSATION:
${transcript}

SUMMARY (IN ENGLISH):`;

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: summaryPrompt }] }],
    });
    return result.response.text().trim();
  } catch (err) {
    console.error("History summarization failed:", err.message);
    // Fallback: just truncate the transcript
    return transcript.slice(0, 400) + (transcript.length > 400 ? "..." : "");
  }
}

/**
 * Build a conversation history block to inject into prompts.
 * @param {string} summary - Summary of older messages (may be empty)
 * @param {string} recentTranscript - Recent conversation transcript verbatim
 * @returns {string} Formatted history block, or empty string if no history
 */
function buildHistoryBlock(summary, recentTranscript) {
  const parts = [];

  if (summary) {
    parts.push(`## Conversation Summary (earlier in this session):\n${summary}`);
  }

  if (recentTranscript) {
    parts.push(`## Recent Conversation:\n${recentTranscript}`);
  }

  if (parts.length === 0) return "";
  return parts.join("\n\n") + "\n\n";
}

// ---------------------------------------------------------------------------
// Prompt Builders
// ---------------------------------------------------------------------------

/**
 * Build a RAG prompt with retrieved context chunks and language awareness.
 *
 * @param {string} query - The user's question (in English for context matching)
 * @param {Array<{title: string, content: string, score: number}>} docs - Retrieved document chunks
 * @param {string} detectedLang - Language code for the output ('en', 'am', 'ar')
 * @param {Object} [history] - Optional conversational history
 * @param {string} [history.summary] - Summary of older messages
 * @param {string} [history.recentTranscript] - Recent conversation transcript block
 * @returns {string} The system prompt for the LLM
 */
export function buildPrompt(query, docs, detectedLang, history = {}) {
  const lang = detectedLang || detectLanguage(query);
  const langInstruction = getLanguageInstruction(lang);
  const historyBlock = buildHistoryBlock(history.summary || "", history.recentTranscript || "");

  if (!docs || docs.length === 0) {
    return `You are EthioHelp AI (ኢትዮ ሔልፕ AI), a helpful assistant for the Ethiopian community. You help with questions about government services, education, health, jobs, and business processes in Ethiopia.

${langInstruction}

${historyBlock}Currently, no relevant documents were found in the knowledge base for this question. You can still try to help with general knowledge about Ethiopia, but please let the user know that for the most accurate and specific information, an admin should upload relevant documents.

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

${historyBlock}CONTEXT:
${contextText}

QUESTION: ${query}

INSTRUCTIONS:
- Answer based primarily on the provided context documents
- If the context does not contain enough information, say so honestly and provide what general knowledge you can
- Be helpful, clear, and provide step-by-step instructions when applicable
- If the question is about a process or procedure, list the steps clearly with required documents
- Mention which source documents the information came from
- Include relevant fees, timeframes, and locations if available in the context
- If the user refers to something mentioned earlier in the conversation, use the conversation history above to understand the reference`;
}

/**
 * Build a structured process prompt for step-by-step procedure questions.
 * The response structure uses the target language for ALL labels and headers.
 *
 * @param {string} query
 * @param {Array} docs
 * @param {string} detectedLang
 * @param {Object} [history]
 * @param {string} [history.summary]
 * @param {string} [history.recentTranscript]
 */
export function buildProcessPrompt(query, docs, detectedLang, history = {}) {
  const lang = detectedLang || detectLanguage(query);
  const langInstruction = getLanguageInstruction(lang);
  const historyBlock = buildHistoryBlock(history.summary || "", history.recentTranscript || "");

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

${historyBlock}CONTEXT:
${contextText}

QUESTION: ${query}

Respond with a well-structured format that includes ALL of the following sections. Every section heading, label, and content MUST be in the language specified above — do NOT use English headings or labels unless the response language is English:

1. A bold title describing the process
2. Numbered steps with detailed explanations for each step
3. A list of required documents
4. Estimated time and fees (if known from the context)
5. Important notes, tips, or relevant office locations

INSTRUCTIONS:
- Use the provided context when available
- If context is insufficient, provide general guidance and note that specific details may vary
- Be specific about Ethiopian government processes when information is available
- Include estimated timeframes and fees if known
- Mention relevant government offices and their locations if available
- If the user refers to something mentioned earlier in the conversation, use the conversation history above to understand the reference
- IMPORTANT: Your entire response — including all headings like "Process", "Steps", "Required Documents", "Estimated Time", "Important Notes", "Source" — must be written in the language specified in the language instruction above. Do not mix languages.`;
}

// ---------------------------------------------------------------------------
// Process Question Detection
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Answer Generation
// ---------------------------------------------------------------------------

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

export { RECENT_WINDOW_SIZE };

