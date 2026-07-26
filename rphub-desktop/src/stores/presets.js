import { defineStore } from 'pinia'
import { ref } from 'vue'
import localforage from 'localforage'
import { ensureSeedPresets } from '../services/seedDefaults.js'

export const usePresetsStore = defineStore('presets', () => {
  const presets = ref([])
  const presetsLoaded = ref(false)

  function normalizePreset(preset = {}) {
    return {
      ...preset,
      name: preset.name || 'New Preset',
      content: String(preset.content || ''),
      enabled: preset.enabled !== false,
      role: ['system', 'user', 'assistant'].includes(preset.role) ? preset.role : 'system',
      scope: preset.scope === 'character' ? 'character' : 'global',
      systemSeed: preset.systemSeed === true,
      order: Number.isFinite(preset.order) ? preset.order : 0
    }
  }

  async function loadPresets() {
    try {
      const data = await localforage.getItem('presets')
      const stored = (data || []).map(normalizePreset)
      const merged = ensureSeedPresets(stored)
      presets.value = merged
      if (merged.length !== stored.length) {
        await localforage.setItem('presets', merged)
      }
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
    presets.value.push(normalizePreset({ ...preset, systemSeed: false }))
  }

  function removePreset(index) {
    if (index >= 0 && index < presets.value.length) {
      if (presets.value[index].systemSeed === true) return
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
