import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import localforage from 'localforage'
import { ensureSeedWorldInfo } from '../services/seedDefaults.js'
import { normalizeWorldInfoEntry } from '../services/worldInfoSchema.js'

export const useWorldInfoStore = defineStore('worldinfo', () => {
  const worldInfo = ref([])
  const globalWorldInfo = ref([])
  const worldInfoSettings = reactive({
    scanDepth: 2,
    maxDepth: 0
  })
  const worldInfoLoaded = ref(false)

  // ── Scope migration helpers ──────────────────────────────

  /**
   * Backfill `scope: 'global'` on legacy entries that lack the field.
   * Mutates the array in place for efficiency; returns it for chaining.
   */
  function migrateScope(flat) {
    for (const e of flat) {
      if (e.scope == null) e.scope = 'global'
    }
    return flat
  }

  /**
   * Normalize every entry and split into two arrays:
   *   all       → every entry (worldInfo)
   *   globalOnly → entries where scope === 'global' (globalWorldInfo)
   */
  function splitByScope(flat) {
    const globalOnly = []
    const all = []
    for (const e of flat) {
      const norm = normalizeWorldInfoEntry(e)
      all.push(norm)
      if (norm.scope === 'global') globalOnly.push(norm)
    }
    return { all, globalOnly }
  }

  // ── Persistence ──────────────────────────────────────────

  async function loadWorldInfo() {
    try {
      // 1. Load from the single source-of-truth key
      const storedFlat = await localforage.getItem('worldinfo') || []
      const safeArray = Array.isArray(storedFlat) ? storedFlat : []

      // 2. Backfill scope on legacy entries
      const migrated = migrateScope(safeArray)

      // 3. Ensure built-in seed entries are present
      const seeded = ensureSeedWorldInfo(migrated)

      // 4. Normalize and split by scope
      const { all, globalOnly } = splitByScope(seeded)
      worldInfo.value = all
      globalWorldInfo.value = globalOnly

      // 5. Save back if the array changed (seeds added)
      if (all.length !== storedFlat.length) {
        await localforage.setItem('worldinfo', all)
      }
    } catch (err) {
      console.error('Failed to load world info:', err)
      worldInfo.value = []
      globalWorldInfo.value = []
    }

    // 6. Load settings
    try {
      const storedSettings = await localforage.getItem('worldinfo_settings')
      if (storedSettings && typeof storedSettings === 'object') {
        Object.assign(worldInfoSettings, storedSettings)
      }
    } catch (err) {
      console.error('Failed to load world info settings:', err)
    }

    // 7. Sync the separate global_worldinfo key for backward compat
    try {
      const storedGlobal = await localforage.getItem('global_worldinfo') || []
      if (storedGlobal.length !== globalWorldInfo.value.length) {
        await localforage.setItem('global_worldinfo', globalWorldInfo.value)
      }
    } catch (err) {
      console.error('Failed to sync global world info:', err)
    }

    worldInfoLoaded.value = true
  }

  async function saveWorldInfo() {
    try {
      await localforage.setItem('worldinfo', worldInfo.value)
    } catch (err) {
      console.error('Failed to save world info:', err)
    }
  }

  async function saveGlobalWorldInfo() {
    try {
      // Re-derive from worldInfo to guarantee consistency
      const globalOnly = worldInfo.value.filter(e => e.scope === 'global')
      globalWorldInfo.value = globalOnly
      await localforage.setItem('global_worldinfo', globalOnly)
    } catch (err) {
      console.error('Failed to save global world info:', err)
    }
  }

  async function saveWorldInfoSettings() {
    try {
      await localforage.setItem('worldinfo_settings', { ...worldInfoSettings })
    } catch (err) {
      console.error('Failed to save world info settings:', err)
    }
  }

  // ── CRUD ─────────────────────────────────────────────────

  /**
   * Add a new world info entry.
   *
   * @param {object} entry  - The raw entry data.
   * @param {object} [opts] - Options:
   *   @param {string} [opts.scope]             - Force a specific scope.
   *   @param {string} [opts.currentCharacterId] - If truthy, default scope is 'character'.
   */
  function addWorldInfoEntry(entry, opts = {}) {
    const characterLoaded = !!opts.currentCharacterId
    const scope = opts.scope ?? (characterLoaded ? 'character' : 'global')
    const normalized = normalizeWorldInfoEntry({ ...entry, scope, systemSeed: false })
    worldInfo.value.push(normalized)
    if (scope === 'global') {
      globalWorldInfo.value.push(normalized)
    }
  }

  function removeWorldInfoEntry(index) {
    if (index < 0 || index >= worldInfo.value.length) return
    const entry = worldInfo.value[index]
    if (entry.systemSeed === true) return // cannot delete built-in seeds
    worldInfo.value.splice(index, 1)
    if (entry.scope === 'global') {
      globalWorldInfo.value = globalWorldInfo.value.filter(e => e.id !== entry.id)
    }
  }

  function updateWorldInfoEntry(index, data) {
    if (index < 0 || index >= worldInfo.value.length) return
    const merged = normalizeWorldInfoEntry({ ...worldInfo.value[index], ...data })
    worldInfo.value[index] = merged
    // Keep globalWorldInfo in sync
    if (merged.scope === 'global') {
      const gIdx = globalWorldInfo.value.findIndex(e => e.id === merged.id)
      if (gIdx >= 0) globalWorldInfo.value[gIdx] = merged
      else globalWorldInfo.value.push(merged)
    } else {
      globalWorldInfo.value = globalWorldInfo.value.filter(e => e.id !== merged.id)
    }
  }

  function moveWorldInfoEntry(fromIndex, toIndex) {
    if (fromIndex >= 0 && fromIndex < worldInfo.value.length &&
        toIndex >= 0 && toIndex < worldInfo.value.length) {
      const item = worldInfo.value.splice(fromIndex, 1)[0]
      worldInfo.value.splice(toIndex, 0, item)
    }
  }

  // ── Legacy helpers (backward compat, kept for API surface) ──

  function addGlobalWorldInfoEntry(entry) {
    const normalized = normalizeWorldInfoEntry({ ...entry, scope: 'global' })
    globalWorldInfo.value.push(normalized)
    worldInfo.value.push(normalized)
  }

  function removeGlobalWorldInfoEntry(index) {
    if (index < 0 || index >= globalWorldInfo.value.length) return
    const entry = globalWorldInfo.value[index]
    if (entry.systemSeed === true) return
    const wiIdx = worldInfo.value.findIndex(e => e.id === entry.id)
    if (wiIdx >= 0) worldInfo.value.splice(wiIdx, 1)
    globalWorldInfo.value.splice(index, 1)
  }

  function updateGlobalWorldInfoEntry(index, data) {
    if (index < 0 || index >= globalWorldInfo.value.length) return
    const merged = normalizeWorldInfoEntry({ ...globalWorldInfo.value[index], ...data, scope: 'global' })
    globalWorldInfo.value[index] = merged
    const wiIdx = worldInfo.value.findIndex(e => e.id === merged.id)
    if (wiIdx >= 0) worldInfo.value[wiIdx] = merged
  }

  return {
    worldInfo,
    globalWorldInfo,
    worldInfoSettings,
    worldInfoLoaded,
    loadWorldInfo,
    saveWorldInfo,
    saveGlobalWorldInfo,
    saveWorldInfoSettings,
    addWorldInfoEntry,
    removeWorldInfoEntry,
    updateWorldInfoEntry,
    moveWorldInfoEntry,
    addGlobalWorldInfoEntry,
    removeGlobalWorldInfoEntry,
    updateGlobalWorldInfoEntry
  }
})
