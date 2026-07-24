import { defineStore } from 'pinia'
import { ref } from 'vue'
import localforage from 'localforage'

export const usePresetsStore = defineStore('presets', () => {
  const presets = ref([])
  const presetsLoaded = ref(false)

  function normalizePreset(preset = {}) {
    return {
      ...preset,
      name: preset.name || 'New Preset',
      content: String(preset.content || ''),
      enabled: preset.enabled !== false,
      role: ['system', 'user', 'assistant'].includes(preset.role) ? preset.role : 'system'
    }
  }

  async function loadPresets() {
    try {
      const data = await localforage.getItem('presets')
      presets.value = (data || []).map(normalizePreset)
    } catch (err) {
      console.error('Failed to load presets:', err)
      presets.value = []
    }
    presetsLoaded.value = true
  }

  async function savePresets() {
    try {
      await localforage.setItem('presets', presets.value)
    } catch (err) {
      console.error('Failed to save presets:', err)
    }
  }

  function addPreset(preset) {
    presets.value.push(normalizePreset(preset))
  }

  function removePreset(index) {
    if (index >= 0 && index < presets.value.length) {
      presets.value.splice(index, 1)
    }
  }

  function updatePreset(index, data) {
    if (index >= 0 && index < presets.value.length) {
      presets.value[index] = normalizePreset({ ...presets.value[index], ...data })
    }
  }

  function movePreset(fromIndex, toIndex) {
    if (fromIndex >= 0 && fromIndex < presets.value.length &&
        toIndex >= 0 && toIndex < presets.value.length) {
      const item = presets.value.splice(fromIndex, 1)[0]
      presets.value.splice(toIndex, 0, item)
    }
  }

  return {
    presets,
    presetsLoaded,
    loadPresets,
    savePresets,
    addPreset,
    removePreset,
    updatePreset,
    movePreset
  }
})
