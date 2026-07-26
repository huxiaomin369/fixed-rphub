// src/services/scopeResolver.js
// Merge entries by scope at runtime. Character-scoped first, then global.

export function resolveScopedEntries({ global = [], character = [] } = {}) {
  return [...character, ...global]
}

export function mergeByScope(flat = []) {
  const global = flat.filter(e => !e.scope || e.scope === 'global')
  const character = flat.filter(e => e.scope === 'character')
  return { global, character, merged: resolveScopedEntries({ global, character }) }
}
