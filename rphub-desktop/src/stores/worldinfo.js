import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import localforage from 'localforage'

export const useWorldInfoStore = defineStore('worldinfo', () => {
  const worldInfo = ref([])
  const globalWorldInfo = ref([])
  const worldInfoSettings = reactive({
    scanDepth: 2,
    maxDepth: 0
  })
  const worldInfoLoaded = ref(false)

  function normalizeWorldInfoEntry(entry = {}) {
    return {
      ...entry,
      comment: entry.comment || '',
      content: String(entry.content || ''),
      key: Array.isArray(entry.key) ? entry.key : (entry.key ? [String(entry.key)] : []),
      enabled: entry.enabled !== false,
      position: entry.position || 'global_note',
      scope: entry.scope || 'global',
      selectiveLogic: entry.selectiveLogic || 'or',
      caseSensitive: entry.caseSensitive !== false,
      group: entry.group || '',
      note: entry.note || '',
      groupOverride: entry.groupOverride || false,
      scanDepth: entry.scanDepth != null ? entry.scanDepth : null,
      order: entry.order != null ? entry.order : 0,
      disableAddedEntryNotifications: entry.disableAddedEntryNotifications || false
    }
  }

  async function loadWorldInfo() {
    try {
      const data = await localforage.getItem('worldinfo')
      worldInfo.value = (data || []).map(normalizeWorldInfoEntry)
    } catch (err) {
      console.error('Failed to load world info:', err)
      worldInfo.value = []
    }

    try {
      const data = await localforage.getItem('global_worldinfo')
      globalWorldInfo.value = (data || []).map(e => normalizeWorldInfoEntry({ ...e, scope: 'global' }))
    } catch (err) {
      console.error('Failed to load global world info:', err)
      globalWorldInfo.value = []
    }

    try {
      const wiSettings = await localforage.getItem('worldinfo_settings')
      if (wiSettings) {
        Object.assign(worldInfoSettings, wiSettings)
      }
    } catch (err) {
      console.error('Failed to load world info settings:', err)
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
      await localforage.setItem('global_worldinfo', globalWorldInfo.value)
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

  function addWorldInfoEntry(entry) {
    worldInfo.value.push(normalizeWorldInfoEntry(entry))
  }

  function removeWorldInfoEntry(index) {
    if (index >= 0 && index < worldInfo.value.length) {
      worldInfo.value.splice(index, 1)
    }
  }

  function updateWorldInfoEntry(index, data) {
    if (index >= 0 && index < worldInfo.value.length) {
      worldInfo.value[index] = normalizeWorldInfoEntry({ ...worldInfo.value[index], ...data })
    }
  }

  function moveWorldInfoEntry(fromIndex, toIndex) {
    if (fromIndex >= 0 && fromIndex < worldInfo.value.length &&
        toIndex >= 0 && toIndex < worldInfo.value.length) {
      const item = worldInfo.value.splice(fromIndex, 1)[0]
      worldInfo.value.splice(toIndex, 0, item)
    }
  }

  function addGlobalWorldInfoEntry(entry) {
    globalWorldInfo.value.push(normalizeWorldInfoEntry({ ...entry, scope: 'global' }))
  }

  function removeGlobalWorldInfoEntry(index) {
    if (index >= 0 && index < globalWorldInfo.value.length) {
      globalWorldInfo.value.splice(index, 1)
    }
  }

  function updateGlobalWorldInfoEntry(index, data) {
    if (index >= 0 && index < globalWorldInfo.value.length) {
      globalWorldInfo.value[index] = normalizeWorldInfoEntry({ ...globalWorldInfo.value[index], ...data, scope: 'global' })
    }
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
