/**
 * Translation service for EthioHelp AI.
 * Uses Google Gemini to translate between English, Amharic, and Arabic.
 *
 * The RAG pipeline operates in English only. This service wraps the pipeline:
 *   1. Translate user question → English (before RAG)
 *   2. Translate English response → user's language (after RAG)
 */

const LANGUAGE_NAMES = {
  en: "English",
  am: "Amharic",
  ar: "Arabic",
};

/**
 * Translate text to English from a source language.
 * Returns the original text if already in English.
 *
 * @param {string} text - The text to translate
 * @param {string} sourceLang - Source language code ('en', 'am', 'ar')
 * @returns {Promise<string>} The translated English text
 */
export async function translateToEnglish(text, sourceLang) {
  if (!text || sourceLang === "en") return text;

  const sourceName = LANGUAGE_NAMES[sourceLang] || "the source language";

  const prompt = `You are a professional translator. Translate the following ${sourceName} text to English accurately. Preserve the meaning, intent, and any specific terminology. Output ONLY the translated text with no explanations, notes, or extra formatting.

Text to translate:
${text}`;

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return result.response.text().trim();
}

/**
 * Translate text from English to a target language.
 * Returns the original text if the target is English.
 *
 * @param {string} text - The English text to translate
 * @param {string} targetLang - Target language code ('en', 'am', 'ar')
 * @returns {Promise<string>} The translated text
 */
export async function translateFromEnglish(text, targetLang) {
  if (!text || targetLang === "en") return text;

  const targetName = LANGUAGE_NAMES[targetLang] || "the target language";

  // Language-specific instructions for better output quality
  const scriptInstructions = {
    am: "Use Ethiopic/Geez script (ፊደል). The response must be entirely in Amharic script.",
    ar: "Use Arabic script. The response must be entirely in Arabic script with proper right-to-left formatting.",
  };

  const prompt = `You are a professional translator. Translate the following English text to ${targetName} accurately.
Preserve the meaning, structure, formatting (including markdown, lists, bold, etc.), and any specific terminology.

${scriptInstructions[targetLang] || ""}

CRITICAL REQUIREMENT: You MUST translate every single part of the text. This includes all headings, section headers, labels, and prefixes (for example, "Process:", "Steps:", "Required Documents:", "Note:", "Warning:") into ${targetName}. Do not leave these headers, prefixes, or labels in English. The final output must be 100% in ${targetName} with no English words remaining except for standard proper nouns or untranslatable system names.

Output ONLY the translated text with no explanations, notes, or extra commentary. Keep all markdown formatting intact.

Text to translate:
${text}`;

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return result.response.text().trim();
}
