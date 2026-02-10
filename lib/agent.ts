/**
 * Agent utilities for the AI Process Helper.
 * Detects process-related questions and builds structured prompts
 * that instruct the LLM to return step-by-step guides with checklists.
 */

/**
 * Keywords that indicate a process-related question
 */
const PROCESS_KEYWORDS = [
  'how to',
  'how do i',
  'how can i',
  'steps to',
  'process for',
  'procedure',
  'apply for',
  'register',
  'get a',
  'obtain',
  'renew',
  'requirements for',
  'documents needed',
  'what do i need',
  'guide for',
  'instructions for',
]

/**
 * Check if a question is process-related
 */
export function isProcessQuestion(question: string): boolean {
  const lower = question.toLowerCase()
  return PROCESS_KEYWORDS.some((keyword) => lower.includes(keyword))
}

/**
 * Build a process-helper prompt that instructs the LLM to return
 * structured step-by-step instructions with a document checklist
 */
export function buildProcessPrompt(
  question: string,
  contextChunks: { title: string; content: string }[]
): string {
  const contextText =
    contextChunks.length > 0
      ? contextChunks
          .map(
            (chunk, i) =>
              `--- Document: ${chunk.title} (Chunk ${i + 1}) ---\n${chunk.content}`
          )
          .join('\n\n')
      : 'No specific documents found for this process.'

  return `You are EthioHelp AI Process Assistant. The user is asking about a process or procedure. Your job is to provide a clear, structured response.

CONTEXT:
${contextText}

QUESTION: ${question}

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

**Important Notes:**
- [Any additional tips or warnings]

**Source:** [Which documents this information came from]

INSTRUCTIONS:
- Use ONLY the provided context when available
- If context is insufficient, provide general guidance and note that specific details may vary
- Be specific about Ethiopian government processes when information is available
- Include estimated timeframes if known
- Mention any fees if known`
}
