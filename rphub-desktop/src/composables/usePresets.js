// src/composables/usePresets.js
// Vue 3 composable wrapping the presets store + seed sync helpers.

import { computed } from 'vue'
import { usePresetsStore } from '../stores/presets.js'
import { PERSON_PRESET_NAMES, isBuiltinPresetName } from '../services/builtinPresets.js'
import { ensureSeedPresets } from '../services/seedDefaults.js'

export function usePresets() {
  const store = usePresetsStore()

  function syncPersonPresets(person) {
    // Mutate in place so store's reactive value updates; the next savePresets call persists
    for (const p of store.presets) {
      if (p.name === '第二人称') p.enabled = (person === 'second')
      else if (p.name === '第三人称') p.enabled = (person === 'third')
    }
  }

  function ensureSeeds() {
    store.presets = ensureSeedPresets(store.presets)
  }

  const isPersonPreset = (name) => PERSON_PRESET_NAMES.has(name)
  const isBuiltin = (name) => isBuiltinPresetName(name)

  return {
    presets: computed(() => store.presets),
    addPreset: (p) => store.addPreset(p),
    updatePreset: (idx, patch) => store.updatePreset(idx, patch),
    removePreset: (idx) => store.removePreset(idx),
    movePreset: (from, to) => store.movePreset(from, to),
    save: () => store.savePresets(),
    syncPersonPresets,
    ensureSeeds,
    isPersonPreset,
    isBuiltin,
  }
}
