// src/composables/useWorldInfo.js
import { computed } from 'vue'
import { useWorldInfoStore } from '../stores/worldinfo.js'
import { AUTO_IMAGE_GEN_WI_NAME } from '../services/builtinWorldInfo.js'
import { ensureSeedWorldInfo } from '../services/seedDefaults.js'
import { normalizeWorldInfoEntry } from '../services/worldInfoSchema.js'

export function useWorldInfo() {
  const store = useWorldInfoStore()

  function syncAutoImageGenWI(enabled) {
    const entry = store.worldInfo.find(e => e.comment === AUTO_IMAGE_GEN_WI_NAME)
    if (entry) entry.enabled = !!enabled
  }

  function ensureSeeds() {
    const seeded = ensureSeedWorldInfo(store.worldInfo)
    store.worldInfo = seeded
    store.globalWorldInfo = seeded.filter(e => e.scope === 'global')
  }

  return {
    worldInfo: computed(() => store.worldInfo),
    globalWorldInfo: computed(() => store.globalWorldInfo),
    settings: computed(() => store.worldInfoSettings),
    addEntry: (e, opts) => store.addWorldInfoEntry(e, opts),
    updateEntry: (idx, patch) => store.updateWorldInfoEntry(idx, patch),
    removeEntry: (idx) => store.removeWorldInfoEntry(idx),
    moveEntry: (from, to) => store.moveWorldInfoEntry(from, to),
    save: () => store.saveWorldInfo(),
    saveGlobal: () => store.saveGlobalWorldInfo(),
    syncAutoImageGenWI,
    ensureSeeds,
  }
}
