/**
 * Language detection service for EthioHelp AI.
 * Detects whether user input is in Amharic (am), Arabic (ar), or English (en).
 *
 * Uses Unicode script detection as the primary method:
 * - Ethiopic script (U+1200–U+137F, U+1380–U+139F, U+2D80–U+2DDF) → Amharic
 * - Arabic script  (U+0600–U+06FF, U+0750–U+077F, U+08A0–U+08FF, U+FB50–U+FDFF, U+FE70–U+FEFF) → Arabic
 * - Otherwise → English (default)
 */

// Regex patterns for script detection
const ETHIOPIC_REGEX = /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF]/;
const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/**
 * Detect the language of a text string.
 * Returns 'am' for Amharic, 'ar' for Arabic, 'en' for English.
 */
export function detectLanguage(text) {
  if (!text || typeof text !== "string") return "en";

  const cleaned = text.trim();
  if (cleaned.length === 0) return "en";

  // Count characters from each script
  let ethiopicCount = 0;
  let arabicCount = 0;
  let latinCount = 0;
  let totalLetters = 0;

  for (const char of cleaned) {
    if (ETHIOPIC_REGEX.test(char)) {
      ethiopicCount++;
      totalLetters++;
    } else if (ARABIC_REGEX.test(char)) {
      arabicCount++;
      totalLetters++;
    } else if (/[a-zA-Z]/.test(char)) {
      latinCount++;
      totalLetters++;
    }
  }

  if (totalLetters === 0) return "en";

  // If >30% of letters are Ethiopic → Amharic
  if (ethiopicCount / totalLetters > 0.3) return "am";

  // If >30% of letters are Arabic → Arabic
  if (arabicCount / totalLetters > 0.3) return "ar";

  return "en";
}

/**
 * Get the full language name.
 */
export function getLanguageName(code) {
  const names = {
    en: "English",
    am: "Amharic (አማርኛ)",
    ar: "Arabic (عربي)",
  };
  return names[code] || "English";
}

/**
 * Check if a language uses RTL (right-to-left) direction.
 */
export function isRTL(langCode) {
  return langCode === "ar";
}

/**
 * Build a language-aware system prompt instruction.
 * Tells the LLM to respond in the same language as the user.
 */
export function getLanguageInstruction(detectedLang) {
  const instructions = {
    en: "LANGUAGE: Respond entirely in English.",
    am: `LANGUAGE: You MUST respond ENTIRELY in Amharic (አማርኛ) using Ethiopic/Geez script (ፊደል).
This means every single word in your response must be in Amharic — including all headings, section titles, labels (such as the equivalents of "Process", "Steps", "Required Documents", "Estimated Time", "Important Notes", "Source"), bullet point text, and body content.
Do NOT use any English words anywhere in your response. The only exceptions are proper nouns that have no Amharic equivalent (e.g., specific system names).
If you use even one English word for a heading or label, your response is WRONG.`,
    ar: `LANGUAGE: You MUST respond ENTIRELY in Arabic (العربية) using Arabic script.
This means every single word in your response must be in Arabic — including all headings, section titles, labels (such as the equivalents of "Process", "Steps", "Required Documents", "Estimated Time", "Important Notes", "Source"), bullet point text, and body content.
Do NOT use any English words anywhere in your response. The only exceptions are proper nouns that have no Arabic equivalent.
If you use even one English word for a heading or label, your response is WRONG.`,
  };
  return instructions[detectedLang] || instructions.en;
}
