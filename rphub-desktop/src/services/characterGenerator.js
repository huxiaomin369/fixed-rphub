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

const SECTION_HEADERS = [
  { key: 'Name', field: 'name' },
  { key: 'Description', field: 'description' },
  { key: 'Personality', field: 'personality' },
  { key: 'First Message', field: 'first_mes' },
  { key: 'Post History Instructions', field: 'post_history_instructions' },
  { key: 'Creator Notes', field: 'creator_notes' },
  { key: 'Avatar Prompt', field: 'avatar_prompt' },
  { key: 'World Info', field: 'world_info_json' },
  { key: 'Regex Scripts', field: 'regex_scripts_json' }
]

/**
 * Extract all completed `### Key` sections from the accumulated streaming text.
 * Each section's content runs from its header line up to the next `### ` header (or end of text).
 * Idempotent: same input always yields same output.
 */
export function parseSections(visibleText) {
  if (!visibleText) return {}
  const result = {}
  for (let i = 0; i < SECTION_HEADERS.length; i++) {
    const { key, field } = SECTION_HEADERS[i]
    const headerRe = new RegExp(`#{2,6}\\s*${key}\\s*\\n`, 'i')
    const match = visibleText.match(headerRe)
    if (!match) continue
    const start = match.index + match[0].length
    // Find the next `### ` header (any text) at start of line
    const nextHeaderRe = /\n#{2,6}\s+[A-Z]/g
    nextHeaderRe.lastIndex = start
    const next = nextHeaderRe.exec(visibleText)
    const end = next ? next.index : visibleText.length
    let content = visibleText.slice(start, end).trim()
    // Strip a trailing empty section header (e.g. "### " with no name, or "###")
    // that the model may emit mid-stream before the next field.
    content = content.replace(/\n+#{1,6}\s*$/, '').trim()
    // Special handling: Avatar Prompt wraps content in <image>image###prompt###...</image>
    if (field === 'avatar_prompt') {
      const m = content.match(/<image>image###prompt###([\s\S]*?)<\/image>/i)
      if (m) content = m[1].trim()
    }
    if (content) result[field] = content
  }
  return result
}
