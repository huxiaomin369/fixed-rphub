// src/services/regexSchema.js
// Pure normalizer for regex script entries.

const VALID_PLACEMENT = [1, 2, 3]

export function normalizeRegexScript(s) {
  const placement = Array.isArray(s?.placement)
    ? s.placement.filter(n => VALID_PLACEMENT.includes(n))
    : [1, 2]
  return {
    id: typeof s?.id === 'string' && s.id ? s.id : (globalThis.crypto?.randomUUID?.() ?? `rx_${Date.now()}_${Math.random()}`),
    name: typeof s?.name === 'string' && s.name ? s.name : (typeof s?.scriptName === 'string' ? s.scriptName : 'New Script'),
    regex: typeof s?.regex === 'string' ? s.regex : '',
    flags: typeof s?.flags === 'string' ? s.flags : 'g',
    replacement: typeof s?.replacement === 'string' ? s.replacement : (typeof s?.replaceString === 'string' ? s.replaceString : ''),
    placement: placement.length ? placement : [1, 2],
    markdownOnly: !!s?.markdownOnly,
    promptOnly: !!s?.promptOnly,
    runOnEdit: s?.runOnEdit !== false,
    minDepth: Number.isFinite(s?.minDepth) ? s.minDepth : null,
    maxDepth: Number.isFinite(s?.maxDepth) ? s.maxDepth : null,
    scope: s?.scope === 'global' ? 'global' : 'character',
    enabled: s?.enabled !== false,
    systemSeed: s?.systemSeed === true,
    order: Number.isFinite(s?.order) ? s.order : 0,
  }
}

export function isBuiltinRegexName(name) {
  return name === 'Auto Replace {{user}}' || name === 'NAI画图正则'
}

export const USER_REPLACE_REGEX_NAME = 'Auto Replace {{user}}'
export const NAI_IMAGE_REGEX_NAME = 'NAI画图正则'
