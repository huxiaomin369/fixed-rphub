import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import localforage from 'localforage'

const DEFAULT_SETTINGS = {
  apiUrl: 'https://apihub.agnes-ai.com/v1',
  apiKey: '',
  apiProviderId: 'agnes',
  apiProviderKeys: {},
  customApiUrl: '',
  customApiUrl2: '',
  model: '',
  contextSize: 1000000,
  temperature: 1.0,
  autoFetchModels: true,
  stream: true,
  activeToolAggressiveness: 'adaptive',
  activeToolAggressivenessVersion: 2,
  useCharacterBackground: true,
  immersiveMode: false,
  uiTemplateEnabled: false,
  uiTemplateModel: '',
  uiTemplateAnalysisDepth: 4,
  uiTemplateInjectContext: false,
  uiTemplateMainModelAnalysis: true,
  fontFamily: 'modern',
  fontFamilyVersion: 4,
  fontSize: 16,
  imageGenKey: '',
  imageGenProviderId: 'agnes',
  imageGenProviderKeys: {},
  imageGenProviderModels: {},
  customImageGenUrl: '',
  customImageGenUrl2: '',
  imageStyle: 'vertical',
  customImageArtists: '',
  imageSize: '竖图',
  imageGenCount: 2,
  qualityModel: '',
  balancedModel: '',
  fastModel: ''
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = reactive({ ...DEFAULT_SETTINGS })
  const settingsLoaded = ref(false)

  async function loadSettings() {
    try {
      const data = await localforage.getItem('settings')
      if (data) {
        Object.assign(settings, data)
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
    settingsLoaded.value = true
  }

  async function saveSettings() {
    try {
      await localforage.setItem('settings', { ...settings })
    } catch (err) {
      console.error('Failed to save settings:', err)
    }
  }

  function updateSettings(partial) {
    Object.assign(settings, partial)
  }

  function resetSettings() {
    Object.assign(settings, DEFAULT_SETTINGS)
  }

  return {
    settings,
    settingsLoaded,
    loadSettings,
    saveSettings,
    updateSettings,
    resetSettings
  }
})
