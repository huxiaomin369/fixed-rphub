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

/**
 * Robustly extract an array of objects from a JSON-ish string.
 * Strips ```json fences, tolerates trailing commas, falls back to empty array.
 */
export function parseFlexibleJsonItems(rawText) {
  if (!rawText) return []
  // Strip code fences
  let s = rawText.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
  // Find the first '[' and the matching closing ']' (naive, no string handling)
  const start = s.indexOf('[')
  if (start < 0) {
    // Maybe it's a single object — try wrapping
    const objStart = s.indexOf('{')
    const objEnd = s.lastIndexOf('}')
    if (objStart >= 0 && objEnd > objStart) {
      const candidate = s.slice(objStart, objEnd + 1)
      try { return [JSON.parse(candidate)] } catch { return [] }
    }
    return []
  }
  // Find last ']' from the end
  const end = s.lastIndexOf(']')
  if (end <= start) return []
  const candidate = s.slice(start, end + 1)
  // Remove trailing commas before ] or }
  const cleaned = candidate.replace(/,(\s*[\]}])/g, '$1')
  try {
    const parsed = JSON.parse(cleaned)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return []
  }
}

const WORLD_INFO_DEFAULTS = {
  comment: '',
  keys: [],
  content: '',
  position: 0,
  order: 100,
  depth: 4,
  probability: 100,
  constant: false
}

const ALLOWED_WORLD_INFO_FIELDS = Object.keys(WORLD_INFO_DEFAULTS)

/**
 * Map a raw AI-generated world-info entry to the desktop's stored schema.
 * Drops unknown fields, fills missing fields with defaults.
 */
export function normalizeWorldInfo(raw) {
  const out = { ...WORLD_INFO_DEFAULTS }
  if (!raw || typeof raw !== 'object') return out
  for (const key of ALLOWED_WORLD_INFO_FIELDS) {
    if (raw[key] !== undefined) out[key] = raw[key]
  }
  if (typeof out.keys === 'string') out.keys = [out.keys]
  return out
}

const REGEX_SCRIPT_DEFAULTS = {
  name: '',
  regex: '',
  replace: '',
  flags: 'g',
  placement: [1],
  enabled: true,
  markdownOnly: false,
  promptOnly: false,
  depth: 4
}

const ALLOWED_REGEX_SCRIPT_FIELDS = Object.keys(REGEX_SCRIPT_DEFAULTS)

export function normalizeRegexScript(raw) {
  const out = { ...REGEX_SCRIPT_DEFAULTS }
  if (!raw || typeof raw !== 'object') return out
  for (const key of ALLOWED_REGEX_SCRIPT_FIELDS) {
    if (raw[key] !== undefined) out[key] = raw[key]
  }
  return out
}
