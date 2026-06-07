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
    en: "The user is writing in English. Respond in English.",
    am: "The user is writing in Amharic (አማርኛ). You MUST respond in Amharic using Ethiopic/Geez script (ፊደል). Do NOT respond in English unless the user explicitly asks for English.",
    ar: "The user is writing in Arabic (عربي). You MUST respond in Arabic using Arabic script. Do NOT respond in English unless the user explicitly asks for English.",
  };
  return instructions[detectedLang] || instructions.en;
}
