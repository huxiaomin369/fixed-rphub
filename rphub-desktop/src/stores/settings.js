import { defineStore } from 'pinia'
import { ref, reactive, watch } from 'vue'
import localforage from 'localforage'
import { createProfile, migrateLegacyUser } from '../services/userProfile.js'

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
  imageGenModel: '',
  qualityModel: '',
  balancedModel: '',
  fastModel: '',
  userProfiles: [],
  activeProfileId: null,
  apiStatus: 'unknown',
  apiLatency: 0,
  imageGenStatus: 'unknown',
  imageGenLatency: 0
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

    // ─── Legacy data migration ────────────────────────
    // 1. apiKey → apiProviderKeys[currentProviderId]
    const currentProviderId = settings.apiProviderId || 'agnes'
    if (settings.apiKey && !settings.apiProviderKeys?.[currentProviderId]) {
      if (!settings.apiProviderKeys || typeof settings.apiProviderKeys !== 'object') {
        settings.apiProviderKeys = {}
      }
      settings.apiProviderKeys[currentProviderId] = settings.apiKey
    }
    // 2. imageGenKey → imageGenProviderKeys.agnes
    if (settings.imageGenKey && !Object.keys(settings.imageGenProviderKeys || {}).length) {
      if (!settings.imageGenProviderKeys || typeof settings.imageGenProviderKeys !== 'object') {
        settings.imageGenProviderKeys = {}
      }
      settings.imageGenProviderKeys['agnes'] = settings.imageGenKey
      if (!settings.imageGenProviderModels?.['agnes']) {
        if (!settings.imageGenProviderModels || typeof settings.imageGenProviderModels !== 'object') {
          settings.imageGenProviderModels = {}
        }
        settings.imageGenProviderModels['agnes'] = 'agnes-image-2.1-flash'
      }
    }
    // 3. 单 user 对象 → userProfiles 数组
    if (settings.user && !settings.userProfiles.length) {
      const { profiles, activeProfileId } = migrateLegacyUser(settings.user)
      settings.userProfiles = profiles
      settings.activeProfileId = activeProfileId
      delete settings.user
    }
    // 兜底：保证至少一个 profile
    if (!settings.userProfiles.length) {
      const fresh = createProfile()
      settings.userProfiles = [fresh]
      settings.activeProfileId = fresh.uuid
    }

    // Push initial state to the main process so the workshop window can
    // request them on open.
    pushToMainProcess()
  }

  // Mirror the latest settings to the main process whenever they change,
  // so the workshop window (separate BrowserWindow) can fetch them on open.
  function pushToMainProcess() {
    if (typeof window !== 'undefined' && window.electronAPI?.pushSettings) {
      window.electronAPI.pushSettings({ ...settings })
    }
  }
  let pushTimer = null
  watch(settings, () => {
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(() => pushToMainProcess(), 300)
  }, { deep: true })

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

  function setUserProfiles(arr) {
    settings.userProfiles = Array.isArray(arr) ? arr : []
  }
  function addUserProfile(partial) {
    const p = createProfile(partial)
    settings.userProfiles.push(p)
    settings.activeProfileId = p.uuid
    return p
  }
  function deleteUserProfile(id) {
    const idx = settings.userProfiles.findIndex(p => p.uuid === id)
    if (idx === -1) return
    settings.userProfiles.splice(idx, 1)
    if (settings.activeProfileId === id) {
      if (settings.userProfiles.length) {
        settings.activeProfileId = settings.userProfiles[0].uuid
      } else {
        const fresh = createProfile()
        settings.userProfiles = [fresh]
        settings.activeProfileId = fresh.uuid
      }
    }
  }
  function setActiveProfile(id) {
    if (settings.userProfiles.find(p => p.uuid === id)) {
      settings.activeProfileId = id
    }
  }
  function updateActiveProfile(partial) {
    const idx = settings.userProfiles.findIndex(p => p.uuid === settings.activeProfileId)
    if (idx === -1) return
    settings.userProfiles[idx] = { ...settings.userProfiles[idx], ...partial }
  }
  function setApiStatus(status, latency = 0) {
    settings.apiStatus = status
    settings.apiLatency = latency
  }
  function setImageGenStatus(status, latency = 0) {
    settings.imageGenStatus = status
    settings.imageGenLatency = latency
  }

  return {
    settings,
    settingsLoaded,
    loadSettings,
    saveSettings,
    updateSettings,
    resetSettings,
    setUserProfiles, addUserProfile, deleteUserProfile, setActiveProfile, updateActiveProfile,
    setApiStatus, setImageGenStatus
  }
})
