// src/services/worldInfoSchema.js
// Pure normalizer for world info entries.

const VALID_POSITIONS = ['global_note', 'before_character', 'after_character', 'at_depth', 'user_only', 'assistant_only']

function asKeyArray(v) {
  if (Array.isArray(v)) return v.map(s => String(s)).filter(Boolean)
  if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

export function normalizeWorldInfoEntry(e) {
  return {
    id: typeof e?.id === 'string' && e.id ? e.id : (globalThis.crypto?.randomUUID?.() ?? `wi_${Date.now()}_${Math.random()}`),
    comment: typeof e?.comment === 'string' ? e.comment : '',
    content: typeof e?.content === 'string' ? e.content : '',
    key: asKeyArray(e?.key),
    secondaryKeys: asKeyArray(e?.secondaryKeys),
    selectiveLogic: Number.isFinite(e?.selectiveLogic) ? e.selectiveLogic : 0,
    caseSensitive: !!e?.caseSensitive,
    useRegex: !!e?.useRegex,
    constant: !!e?.constant,
    enabled: e?.enabled !== false,
    position: VALID_POSITIONS.includes(e?.position) ? e.position : 'global_note',
    depth: Number.isFinite(e?.depth) ? e.depth : 4,
    order: Number.isFinite(e?.order) ? e.order : 100,
    probability: Number.isFinite(e?.probability) ? e.probability : 100,
    group: typeof e?.group === 'string' ? e.group : '',
    groupOverride: !!e?.groupOverride,
    groupWeight: Number.isFinite(e?.groupWeight) ? e.groupWeight : 100,
    scanDepth: Number.isFinite(e?.scanDepth) ? e.scanDepth : null,
    note: typeof e?.note === 'string' ? e.note : '',
    disableAddedEntryNotifications: !!e?.disableAddedEntryNotifications,
    scope: e?.scope === 'character' ? 'character' : 'global',
    systemSeed: e?.systemSeed === true,
  }
}

export function isBuiltinWorldInfoName(name) {
  return name === '自动生图'
}
