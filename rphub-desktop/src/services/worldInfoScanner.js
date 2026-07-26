// src/services/worldInfoScanner.js
// Scan messages and world info entries; return matches bucketed by position.

function testKey(key, text, useRegex, caseSensitive) {
  if (useRegex) {
    try {
      const re = new RegExp(key, caseSensitive ? '' : 'i')
      return re.test(text)
    } catch {
      return false
    }
  } else {
    return caseSensitive
      ? text.includes(key)
      : text.toLowerCase().includes(key.toLowerCase())
  }
}

function entryMatches(entry, messages) {
  if (entry.enabled === false) return false
  if (entry.constant === true) return true
  if (!Array.isArray(entry.key) || entry.key.length === 0) {
    // Non-constant entry with no keys: web treats as always-match. We follow.
    return true
  }
  const textsToScan = messages.map(m => m.content || '').join('\n')
  if (entry.selectiveLogic === 1) {
    // AND-NOT: all keys must match, none negated
    return entry.key.every(k => testKey(k, textsToScan, entry.useRegex, entry.caseSensitive))
  } else {
    // default AND: at least one key matches
    return entry.key.some(k => testKey(k, textsToScan, entry.useRegex, entry.caseSensitive))
  }
}

export function scanWorldInfo({ messages = [], worldInfo = [], settings = {} } = {}) {
  const result = {
    systemNoteEntries: [],
    beforeCharEntries: [],
    afterCharEntries: [],
    userOnlyEntries: [],
    assistantOnlyEntries: [],
    depthEntries: new Map(),
  }
  const { scanDepth = 2, maxDepth = 0 } = settings
  const recent = messages.slice(-Math.max(1, scanDepth))
  const matches = worldInfo.filter(e => entryMatches(e, recent))
  for (const e of matches) {
    if (e.probability != null && e.probability < 100 && Math.random() * 100 >= e.probability) continue
    switch (e.position) {
      case 'global_note': result.systemNoteEntries.push(e); break
      case 'before_character': result.beforeCharEntries.push(e); break
      case 'after_character': result.afterCharEntries.push(e); break
      case 'user_only': result.userOnlyEntries.push(e); break
      case 'assistant_only': result.assistantOnlyEntries.push(e); break
      case 'at_depth': {
        const d = e.depth ?? 4
        if (!result.depthEntries.has(d)) result.depthEntries.set(d, [])
        result.depthEntries.get(d).push(e)
        break
      }
      default: result.systemNoteEntries.push(e)
    }
  }
  // Sort each bucket by order ascending
  for (const key of Object.keys(result)) {
    if (key === 'depthEntries') continue
    result[key].sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
  }
  for (const [d, arr] of result.depthEntries) {
    arr.sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
  }
  // Apply maxDepth cap
  if (maxDepth > 0) {
    const allMatched = [
      ...result.systemNoteEntries,
      ...result.beforeCharEntries,
      ...result.afterCharEntries,
      ...[...result.depthEntries.values()].flat(),
    ]
    if (allMatched.length > maxDepth) {
      // Keep first maxDepth by order
      const sorted = allMatched.sort((a, b) => (a.order ?? 100) - (b.order ?? 100)).slice(0, maxDepth)
      const keepIds = new Set(sorted.map(e => e.id))
      result.systemNoteEntries = result.systemNoteEntries.filter(e => keepIds.has(e.id))
      result.beforeCharEntries = result.beforeCharEntries.filter(e => keepIds.has(e.id))
      result.afterCharEntries = result.afterCharEntries.filter(e => keepIds.has(e.id))
      for (const [d, arr] of result.depthEntries) {
        result.depthEntries.set(d, arr.filter(e => keepIds.has(e.id)))
      }
    }
  }
  return result
}
