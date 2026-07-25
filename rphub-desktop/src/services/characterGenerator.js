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

/**
 * Extract FIND/REPLACE blocks from a diff-mode AI response.
 * Each block: <<<<<<<FIND\n###path###<field>\n<old>\n=======\n<new>\n>>>>>>>REPLACE
 * Returns an array of { field, find, replace }. Malformed blocks are skipped.
 */
export function parseDiffBlocks(text) {
  if (!text) return []
  const re = /<<<<<<<FIND\s*\n###path###([a-z_]+)\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>>REPLACE/g
  const out = []
  let m
  while ((m = re.exec(text)) !== null) {
    out.push({ field: m[1], find: m[2], replace: m[3] })
  }
  return out
}

import { apiRequest } from '../api/index.js'

/**
 * Async-iterate over an SSE response body, yielding each `delta.content` text.
 * Stops at [DONE]. Throws AbortError on signal.
 */
export async function* streamSse(reader, signal) {
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    if (signal?.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' })
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') return
      try {
        const json = JSON.parse(payload)
        const delta = json.choices?.[0]?.delta?.content
        if (delta) yield delta
      } catch {
        // ignore malformed lines
      }
    }
  }
}

const SECTION_FIELD_LABELS = {
  name: '角色名称',
  description: '角色描述',
  personality: '设定',
  first_mes: '开场白',
  post_history_instructions: '后续指令',
  creator_notes: '作者注释',
  avatar_prompt: '头像',
  world_info_json: '世界书',
  regex_scripts_json: '正则脚本'
}

const PROGRESS_MILESTONES = {
  name: 30, description: 45, personality: 60, first_mes: 75,
  post_history_instructions: 80, creator_notes: 82, avatar_prompt: 84,
  world_info_json: 88, regex_scripts_json: 92
}

/**
 * Stream an OpenAI-compatible chat completion, parse sections as they appear,
 * and emit them via callbacks. Auto-retries once with stream=false on truncation.
 *
 * Callbacks:
 *   onProgress({ status, percent })
 *   onSection({ field, value })
 *   onDone({ sections, truncated, usedStream })
 *   onError(error)
 */
export async function runNewGeneration(opts) {
  const { prompt, baseURL, apiKey, model, signal,
          onProgress = () => {}, onSection = () => {},
          onDone = () => {}, onError = () => {} } = opts
  const stream = opts.stream !== false
  const temperature = opts.temperature ?? 1
  const maxTokens = opts.maxTokens ?? 8192

  const messages = [
    { role: 'system', content: SINGLE_PLAYER_SYSTEM_PROMPT },
    { role: 'user',   content: `### 用户的描述\n${prompt}\n\n请开始生成。` }
  ]

  let reader
  try {
    reader = await apiRequest({ baseURL, apiKey, model, messages, stream, signal, temperature, max_tokens: maxTokens })
  } catch (err) {
    onError(err)
    return
  }

  if (!stream) {
    // Non-streaming path: parse the full response at once
    onProgress({ status: '正在等待API响应...', percent: 10 })
    try {
      const data = await reader.json()
      const content = stripInlineThinking(data.choices?.[0]?.message?.content || '')
      const sections = parseSections(content)
      for (const [field, value] of Object.entries(sections)) {
        onSection({ field, value })
        onProgress({ status: `正在生成: ${SECTION_FIELD_LABELS[field] || field}`, percent: PROGRESS_MILESTONES[field] || 50 })
      }
      const truncated = !sections.name || !sections.description || !sections.personality || !sections.first_mes
      onDone({ sections, truncated, usedStream: false })
    } catch (err) {
      onError(err)
    }
    return
  }

  onProgress({ status: '正在等待API响应...', percent: 10 })

  let visibleText = ''
  let lastSections = {}
  try {
    for await (const delta of streamSse(reader, signal)) {
      visibleText += delta
      const cleaned = stripInlineThinking(visibleText)
      const sections = parseSections(cleaned)
      for (const { field } of SECTION_HEADERS) {
        if (sections[field] && sections[field] !== lastSections[field]) {
          onSection({ field, value: sections[field] })
          lastSections[field] = sections[field]
          onProgress({
            status: `正在生成: ${SECTION_FIELD_LABELS[field] || field}`,
            percent: PROGRESS_MILESTONES[field] || 50
          })
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') return  // silent
    onError(err)
    return
  }

  const truncated = !lastSections.name || !lastSections.description || !lastSections.personality || !lastSections.first_mes
  if (truncated && stream) {
    onProgress({ status: '检测到内容截断, 切换非流式重试...', percent: 90 })
    return runNewGeneration({ ...opts, stream: false })
  }

  onDone({ sections: lastSections, truncated: false, usedStream: stream })
}
