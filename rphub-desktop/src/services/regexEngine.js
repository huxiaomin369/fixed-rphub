// src/services/regexEngine.js
// Apply regex scripts to text. Error-tolerant: one bad script doesn't break the chain.
// Ported from web (assets/js/app.js lines 3887-3948): handles /pattern/flags format,
// inline modifiers, and fallback field names.

/**
 * Parse a regex pattern+flags from a script entry, handling:
 * - `/pattern/flags` delimited format (strips delimiters, extracts flags)
 * - Inline modifiers: `(?s)`, `(?i)`, `(?m)` injected into the flags
 * - Fallback field names: `findRegex` / `regexFlags` / `replaceString`
 */
function parseRegex(script) {
  let pattern = script.regex || script.findRegex || ''
  let flags = script.flags || script.regexFlags || 'g'

  if (!pattern) return null

  // Parse /pattern/flags format
  if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
    const lastSlash = pattern.lastIndexOf('/')
    const potentialFlags = pattern.substring(lastSlash + 1)
    if (/^[gimsuy]*$/.test(potentialFlags)) {
      flags = potentialFlags
      pattern = pattern.substring(1, lastSlash)
    }
  }

  // Compatibility: Handle inline modifiers (?s), (?i), (?m) commonly found in ST scripts
  if (pattern.includes('(?s)')) {
    pattern = pattern.replace(/\(\?s\)/g, '')
    if (!flags.includes('s')) flags += 's'
  }
  if (pattern.includes('(?i)')) {
    pattern = pattern.replace(/\(\?i\)/g, '')
    if (!flags.includes('i')) flags += 'i'
  }
  if (pattern.includes('(?m)')) {
    pattern = pattern.replace(/\(\?m\)/g, '')
    if (!flags.includes('m')) flags += 'm'
  }

  return { pattern, flags }
}

export function applyRegexScripts({ text = '', scripts = [], options = {} } = {}) {
  const { applyTo = 'display', depth = 0 } = options
  let result = text
  const sorted = [...scripts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  for (const s of sorted) {
    if (s.enabled === false) continue
    // placement: 1=display, 2=prompt
    const targetChannel = applyTo === 'display' ? 1 : 2
    if (!Array.isArray(s.placement) || !s.placement.includes(targetChannel)) continue
    // markdownOnly: skip in prompt
    if (s.markdownOnly && applyTo !== 'display') continue
    // promptOnly: skip in display
    if (s.promptOnly && applyTo !== 'prompt') continue
    // minDepth / maxDepth
    if (Number.isFinite(s.minDepth) && depth < s.minDepth) continue
    if (Number.isFinite(s.maxDepth) && depth > s.maxDepth) continue
    try {
      const parsed = parseRegex(s)
      if (!parsed) continue
      const replacement = s.hasOwnProperty('replacement')
        ? s.replacement
        : (s.replaceString || '')
      const re = new RegExp(parsed.pattern, parsed.flags)
      result = result.replace(re, replacement)
    } catch (err) {
      console.warn(`[regexEngine] script "${s.name || 'unnamed'}" failed:`, err.message)
    }
  }
  return result
}
