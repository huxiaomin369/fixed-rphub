// src/composables/useSystemSeeds.js
// Orchestrator: calls all three seed sync composables on app boot.

import { usePresets } from './usePresets.js'
import { useWorldInfo } from './useWorldInfo.js'
import { useRegexScripts } from './useRegexScripts.js'
import { useSettingsStore } from '../stores/settings.js'

export function useSystemSeeds() {
  const presets = usePresets()
  const worldInfo = useWorldInfo()
  const regex = useRegexScripts()
  const settings = useSettingsStore()

  function bootSeeds() {
    // Ensure all built-in seeds are present (idempotent)
    presets.ensureSeeds()
    worldInfo.ensureSeeds()
    regex.ensureSeeds()

    // After seed enforcement, sync dynamic fields from the active profile
    const activeProfile = settings.settings.userProfiles.find(p => p.uuid === settings.settings.activeProfileId)
    const person = activeProfile?.person ?? 'second'
    presets.syncPersonPresets(person)
    regex.syncUserNameReplacement()
    // 自动生图 WI is enabled iff user has configured an imageGen key for the active provider
    const providerId = settings.settings.imageGenProviderId
    const key = settings.settings.imageGenProviderKeys?.[providerId]
    worldInfo.syncAutoImageGenWI(!!key && key.length > 0)

    // Persist once
    presets.save()
    worldInfo.save()
    worldInfo.saveGlobal()
    regex.save()
    regex.saveGlobal()
  }

  return { bootSeeds }
}
