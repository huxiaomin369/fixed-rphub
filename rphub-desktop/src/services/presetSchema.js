// src/services/presetSchema.js
// Pure normalizer for preset entries. Framework-agnostic.

const VALID_ROLES = ['system', 'user', 'assistant']

/**
 * Normalize a preset object. Tolerates malformed input; never throws.
 * @param {any} p
 * @returns {{name: string, content: string, role: string, enabled: boolean, scope: 'global'|'character', systemSeed: boolean, order: number}}
 */
export function normalizePreset(p) {
  const role = VALID_ROLES.includes(p?.role) ? p.role : 'system'
  const scope = p?.scope === 'character' ? 'character' : 'global'
  return {
    name: typeof p?.name === 'string' && p.name ? p.name : 'New Preset',
    content: typeof p?.content === 'string' ? p.content : '',
    role,
    enabled: p?.enabled !== false,
    scope,
    systemSeed: p?.systemSeed === true,
    order: Number.isFinite(p?.order) ? p.order : 0,
  }
}

/**
 * @param {string} name
 * @returns {boolean}
 */
export function isBuiltinPresetName(name) {
  return name === '破限'
    || name === '破限预注入 · User 1'
    || name === '破限预注入 · AI 1'
    || name === '破限预注入 · User 2'
    || name === '破限预注入 · AI 2'
    || name === '色情内容增强'
    || name === '防抢话'
    || name === '防神化'
    || name === '防重复'
    || name === '人格内核'
    || name === '文风（抗八股）'
    || name === '第二人称'
    || name === '第三人称'
    || name === '禁止规则'
    || name === 'COT'
}
