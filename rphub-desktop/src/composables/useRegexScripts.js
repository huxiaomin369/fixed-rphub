// src/composables/useRegexScripts.js
// Vue 3 composable wrapping the regex store with a {{user}} watcher.
// When the active profile name changes, syncs the Auto Replace {{user}} regex's replacement field.
import { computed, watch } from 'vue'
import { useRegexStore } from '../stores/regex.js'
import { useSettingsStore } from '../stores/settings.js'
import { USER_REPLACE_REGEX_NAME } from '../services/builtinRegex.js'
import { ensureSeedRegex } from '../services/seedDefaults.js'

export function useRegexScripts() {
  const store = useRegexStore()
  const settingsStore = useSettingsStore()

  // Derive active profile from settings (same pattern as useUserProfile.js)
  const activeProfile = computed(() => {
    return settingsStore.settings.userProfiles.find(
      p => p.uuid === settingsStore.settings.activeProfileId
    ) || null
  })

  function syncUserNameReplacement() {
    const name = activeProfile.value?.name || 'user'
    const entry = store.regexScripts.find(s => s.name === USER_REPLACE_REGEX_NAME)
    if (entry) entry.replacement = name
  }

  function ensureSeeds() {
    store.regexScripts = ensureSeedRegex(store.regexScripts)
    store.globalRegexScripts = store.regexScripts.filter(s => s.scope === 'global')
  }

  // Watch active profile name; on change, sync {{user}} replacement
  watch(
    () => activeProfile.value?.name,
    () => syncUserNameReplacement(),
    { immediate: false }
  )

  return {
    regexScripts: computed(() => store.regexScripts),
    globalRegexScripts: computed(() => store.globalRegexScripts),
    addScript: (s) => store.addRegexScript(s),
    updateScript: (idx, patch) => store.updateRegexScript(idx, patch),
    removeScript: (idx) => store.removeRegexScript(idx),
    moveScript: (from, to) => store.moveRegexScript(from, to),
    save: () => store.saveRegex(),
    saveGlobal: () => store.saveGlobalRegex(),
    syncUserNameReplacement,
    ensureSeeds,
  }
}
