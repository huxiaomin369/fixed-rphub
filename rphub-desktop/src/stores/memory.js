import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import localforage from 'localforage'

const DEFAULT_MEMORY_SETTINGS = {
  enabled: false,
  mode: 'classic',
  embeddingModel: '',
  classicModel: '',
  vectorTopK: 10,
  similarityThreshold: 50,
  defaultDepth: 1,
  vectorKeepFloors: 50,
  summaryKeepFloors: 20
}

export const useMemoryStore = defineStore('memory', () => {
  const memories = ref([])
  const classicMemories = ref([])
  const classicMemoryPage = ref(1)
  const memorySettings = reactive({ ...DEFAULT_MEMORY_SETTINGS })
  const isExtracting = ref(false)
  const memoriesLoaded = ref(false)

  async function loadMemories() {
    try {
      const data = await localforage.getItem('memories')
      memories.value = data || []
    } catch (err) {
      console.error('Failed to load memories:', err)
      memories.value = []
    }

    try {
      const classicData = await localforage.getItem('classic_memories')
      classicMemories.value = classicData || []
    } catch (err) {
      console.error('Failed to load classic memories:', err)
      classicMemories.value = []
    }

    try {
      const memSettings = await localforage.getItem('memory_settings')
      if (memSettings) {
        Object.assign(memorySettings, memSettings)
      }
    } catch (err) {
      console.error('Failed to load memory settings:', err)
    }

    memoriesLoaded.value = true
  }

  async function saveMemories() {
    try {
      await localforage.setItem('memories', memories.value)
    } catch (err) {
      console.error('Failed to save memories:', err)
    }
  }

  async function saveClassicMemories() {
    try {
      await localforage.setItem('classic_memories', classicMemories.value)
    } catch (err) {
      console.error('Failed to save classic memories:', err)
    }
  }

  async function saveMemorySettings() {
    try {
      await localforage.setItem('memory_settings', { ...memorySettings })
    } catch (err) {
      console.error('Failed to save memory settings:', err)
    }
  }

  function addMemory(memory) {
    memories.value.push(memory)
  }

  function removeMemory(index) {
    if (index >= 0 && index < memories.value.length) {
      memories.value.splice(index, 1)
    }
  }

  function addClassicMemory(memory) {
    classicMemories.value.push(memory)
  }

  function removeClassicMemory(index) {
    if (index >= 0 && index < classicMemories.value.length) {
      classicMemories.value.splice(index, 1)
    }
  }

  function updateMemorySettings(partial) {
    Object.assign(memorySettings, partial)
  }

  return {
    memories,
    classicMemories,
    classicMemoryPage,
    memorySettings,
    isExtracting,
    memoriesLoaded,
    loadMemories,
    saveMemories,
    saveClassicMemories,
    saveMemorySettings,
    addMemory,
    removeMemory,
    addClassicMemory,
    removeClassicMemory,
    updateMemorySettings
  }
})
