/**
 * Remove inline reasoning blocks that some models emit before the visible answer.
 * Handles both <think>...</think> and [THINK]...[/THINK] (case-insensitive on the opener).
 */
export function stripInlineThinking(text) {
  if (!text) return text
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/\[THINK\][\s\S]*?\[\/THINK\]/gi, '')
}
