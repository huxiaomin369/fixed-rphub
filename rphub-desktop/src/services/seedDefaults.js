// src/services/seedDefaults.js
// Pure module: idempotent merge of built-in seeds into existing user data.
// Framework-agnostic — no Vue, Pinia, or Electron imports.
//
// Each ensure* function:
//   - Given the user's existing list, ensures all built-in seeds are present.
//   - Matches by unique name (presets/regex) or comment (world info).
//   - Preserves user edits and the `enabled` toggle for matched entries.
//   - Never removes user entries.
//   - Returns a new array (does not mutate the input).

import { BUILTIN_PRESETS, BUILTIN_PRESET_NAMES } from './builtinPresets.js'
import { BUILTIN_WORLD_INFO, BUILTIN_WORLD_INFO_NAMES } from './builtinWorldInfo.js'
import { BUILTIN_REGEX, BUILTIN_REGEX_NAMES } from './builtinRegex.js'

// ─── Helpers ──────────────────────────────────────────

/**
 * Check whether a given entry originates from a built-in seed.
 *
 * @param {object} entry - The entry to check (preset, world info, or regex).
 * @param {'preset'|'worldinfo'|'regex'} kind
 * @returns {boolean}
 */
export function isSeededEntry(entry, kind) {
  if (!entry || typeof entry !== 'object') return false

  if (kind === 'preset') {
    // Builtin presets are seeded with `systemSeed: true` and have a known name.
    return entry.systemSeed === true && BUILTIN_PRESET_NAMES.has(entry.name)
  }
  if (kind === 'worldinfo') {
    return entry.systemSeed === true && BUILTIN_WORLD_INFO_NAMES.has(entry.comment)
  }
  if (kind === 'regex') {
    return entry.systemSeed === true && BUILTIN_REGEX_NAMES.has(entry.name)
  }
  return false
}

/**
 * Deep-ish clone a plain object (safe for our seed data — no Date/Map/Set).
 */
function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Build a lookup Map from an array using the given key function.
 */
function indexBy(arr, fn) {
  const map = new Map()
  for (const item of arr) {
    const key = fn(item)
    if (key != null) map.set(key, item)
  }
  return map
}

// ─── Public ensure* functions ─────────────────────────

/**
 * Merge built-in preset seeds into the user's preset list.
 *
 * @param {Array<object>} userPresets - The user's current preset array.
 * @returns {Array<object>} New array with all seeds present.
 */
export function ensureSeedPresets(userPresets) {
  if (!Array.isArray(userPresets)) userPresets = []

  const byName = indexBy(userPresets, p => p.name)
  const result = [...userPresets]

  for (const seed of BUILTIN_PRESETS) {
    const existing = byName.get(seed.name)

    if (existing) {
      // Preserve user's version — just ensure the seed marker is set.
      if (!existing.systemSeed) {
        const idx = result.indexOf(existing)
        if (idx !== -1) {
          result[idx] = { ...existing, systemSeed: true }
        }
      }
    } else {
      // Seed is missing — append a fresh copy.
      result.push({ ...clone(seed), enabled: seed.enabled })
    }
  }

  return result
}

/**
 * Merge built-in world info seeds into the user's world info list.
 *
 * @param {Array<object>} userWorldInfo - The user's current world info array.
 * @returns {Array<object>} New array with all seeds present.
 */
export function ensureSeedWorldInfo(userWorldInfo) {
  if (!Array.isArray(userWorldInfo)) userWorldInfo = []

  const byComment = indexBy(userWorldInfo, e => e.comment)
  const result = [...userWorldInfo]

  for (const seed of BUILTIN_WORLD_INFO) {
    const existing = byComment.get(seed.comment)

    if (existing) {
      if (!existing.systemSeed) {
        const idx = result.indexOf(existing)
        if (idx !== -1) {
          result[idx] = { ...existing, systemSeed: true }
        }
      }
    } else {
      result.push({ ...clone(seed), enabled: seed.enabled })
    }
  }

  return result
}

/**
 * Merge built-in regex seeds into the user's regex list.
 *
 * @param {Array<object>} userRegex - The user's current regex array.
 * @returns {Array<object>} New array with all seeds present.
 */
export function ensureSeedRegex(userRegex) {
  if (!Array.isArray(userRegex)) userRegex = []

  const byName = indexBy(userRegex, s => s.name)
  const result = [...userRegex]

  for (const seed of BUILTIN_REGEX) {
    const existing = byName.get(seed.name)

    if (existing) {
      if (!existing.systemSeed) {
        const idx = result.indexOf(existing)
        if (idx !== -1) {
          result[idx] = { ...existing, systemSeed: true }
        }
      }
    } else {
      result.push({ ...clone(seed), enabled: seed.enabled })
    }
  }

  return result
}
