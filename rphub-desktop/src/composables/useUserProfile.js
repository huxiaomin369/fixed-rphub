// rphub-desktop/src/composables/useUserProfile.js
// 包 settings.userProfiles 为响应式 activeProfile + 动作
import { computed } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { usePresetsStore } from '../stores/presets'
import { useUIStore } from '../stores/ui'
import { applyPersonToggle } from '../services/userProfile'

export function useUserProfile() {
  const settingsStore = useSettingsStore()
  const presetsStore = usePresetsStore()
  const ui = useUIStore()
  const settings = settingsStore.settings

  const activeProfile = computed(() => {
    return settings.userProfiles.find(p => p.uuid === settings.activeProfileId) || null
  })

  function switchProfile(id) {
    settingsStore.setActiveProfile(id)
    ui.addToast(`已切换人设: ${activeProfile.value?.name || ''}`, 'info')
  }

  function setPerson(person) {
    settingsStore.updateActiveProfile({ person })
    presetsStore.presets = applyPersonToggle(presetsStore.presets, person)
    presetsStore.savePresets()
  }

  return { activeProfile, switchProfile, setPerson }
}
