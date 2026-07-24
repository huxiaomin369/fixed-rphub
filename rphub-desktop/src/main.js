import './assets/styles.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import localforage from 'localforage'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.mount('#app')

// ── Data export/import helpers for Electron main process ──
// The main process calls these via executeJavaScript to collect/restore all data.

window.__getAllDataForExport = async function () {
  const characters = (await localforage.getItem('characters')) || []

  // Collect chat history for every character
  const chats = {}
  for (const char of characters) {
    const charId = char.id || char.uuid
    if (charId) {
      const history = await localforage.getItem(`chat_${charId}`)
      if (history) {
        chats[charId] = history
      }
    }
  }

  return {
    characters,
    chats,
    settings: (await localforage.getItem('settings')) || null,
    presets: (await localforage.getItem('presets')) || [],
    worldInfo: (await localforage.getItem('worldinfo')) || [],
    globalWorldInfo: (await localforage.getItem('global_worldinfo')) || [],
    worldInfoSettings: (await localforage.getItem('worldinfo_settings')) || null,
    regex: (await localforage.getItem('regex')) || [],
    globalRegex: (await localforage.getItem('global_regex')) || [],
    memories: (await localforage.getItem('memories')) || [],
    classicMemories: (await localforage.getItem('classic_memories')) || [],
    memorySettings: (await localforage.getItem('memory_settings')) || null
  }
}

window.__restoreAllData = async function (data) {
  const items = [
    ['characters', data.characters],
    ['settings', data.settings],
    ['presets', data.presets],
    ['worldinfo', data.worldInfo],
    ['global_worldinfo', data.globalWorldInfo],
    ['worldinfo_settings', data.worldInfoSettings],
    ['regex', data.regex],
    ['global_regex', data.globalRegex],
    ['memories', data.memories],
    ['classic_memories', data.classicMemories],
    ['memory_settings', data.memorySettings]
  ]

  for (const [key, value] of items) {
    if (value !== null && value !== undefined) {
      await localforage.setItem(key, value)
    }
  }

  // Restore chat histories per character
  if (data.chats) {
    for (const [charId, history] of Object.entries(data.chats)) {
      if (history) {
        await localforage.setItem(`chat_${charId}`, history)
      }
    }
  }

  // Reload every store so in-memory state matches the newly written data
  const { useSettingsStore } = await import('./stores/settings')
  const { useCharacterStore } = await import('./stores/characters')
  const { usePresetsStore } = await import('./stores/presets')
  const { useWorldInfoStore } = await import('./stores/worldinfo')
  const { useRegexStore } = await import('./stores/regex')
  const { useMemoryStore } = await import('./stores/memory')

  await Promise.all([
    useSettingsStore().loadSettings(),
    useCharacterStore().loadCharacters(),
    usePresetsStore().loadPresets(),
    useWorldInfoStore().loadWorldInfo(),
    useRegexStore().loadRegex(),
    useMemoryStore().loadMemories()
  ])

  // Notify UI store so components can refresh
  const { useUIStore } = await import('./stores/ui')
  useUIStore().addToast('数据已恢复，请刷新页面查看', 'success', 5000)

  return true
}
