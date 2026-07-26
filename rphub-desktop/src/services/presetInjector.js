// src/services/presetInjector.js
// Format system presets into the [System Presets] block; build prelude messages.
// Interpolate {{...}} placeholders (e.g. COT's {{memoryContext}}).

const SYSTEM_HEADER = '【系统提示词】以下是本对话的所有系统级预设，编号顺序即加载顺序。请严格遵守其中每一条规则：\n\n'
const PRELUDE_ORDER = [
  { role: 'user', name: '破限预注入 · User 1' },
  { role: 'assistant', name: '破限预注入 · AI 1' },
  { role: 'user', name: '破限预注入 · User 2' },
  { role: 'assistant', name: '破限预注入 · AI 2' },
]

/**
 * Substitute {{key}} placeholders in `content` with values from `ctx`.
 * Unknown keys are replaced with empty string.
 * @param {string} content
 * @param {Record<string,string>} ctx
 * @returns {string}
 */
export function interpolatePresetContent(content = '', ctx = {}) {
  return String(content).replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => {
    return Object.prototype.hasOwnProperty.call(ctx, key) ? String(ctx[key]) : ''
  })
}

export function isSystemPreset(p) {
  return p?.role === 'system' && p?.name !== '破限'
}

export function formatPresetsForSystemPrompt(presets = [], ctx = {}) {
  const systemPresets = presets.filter(isSystemPreset).filter(p => p.enabled !== false)
  if (systemPresets.length === 0) return ''
  let out = SYSTEM_HEADER
  systemPresets.forEach((p, i) => {
    const interpolated = interpolatePresetContent(p.content, ctx)
    out += `${i + 1}. [${p.name}]\n${interpolated}\n\n`
  })
  return out.trim()
}

export function buildPreludeMessages(presets = [], ctx = {}) {
  const messages = []
  for (const { role, name } of PRELUDE_ORDER) {
    const p = presets.find(x => x.name === name && x.enabled !== false)
    if (p) messages.push({ role, content: interpolatePresetContent(p.content, ctx) })
  }
  return messages
}

export function getBreakLimitContent(presets = [], ctx = {}) {
  // Return 破限's content (or empty if disabled/missing)
  const p = presets.find(x => x.name === '破限' && x.enabled !== false)
  return p ? interpolatePresetContent(p.content, ctx) : ''
}
