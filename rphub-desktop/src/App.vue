<template>
  <div class="h-full flex flex-col md:flex-row relative">
    <!-- Toast Container -->
    <ToastStack />

    <!-- Mobile Overlay -->
    <div v-if="ui.isMobileMenuOpen" @click="ui.closeMobileMenu"
      class="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden" />

    <!-- Sidebar -->
    <Sidebar />

    <!-- Main Content -->
    <div class="app-main flex-1 flex flex-col h-full overflow-hidden bg-gray-50 relative">
      <component :is="currentViewComponent" />
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useUIStore } from './stores/ui'
import Sidebar from './components/sidebar/Sidebar.vue'
import ToastStack from './components/common/ToastStack.vue'

import ChatView from './views/ChatView.vue'
import CharacterView from './views/CharacterView.vue'
import MemoryView from './views/MemoryView.vue'
import ToolView from './views/ToolView.vue'
import UsageView from './views/UsageView.vue'
import SquareView from './views/SquareView.vue'
import GeneratorView from './views/GeneratorView.vue'
import UITemplatesView from './views/UITemplatesView.vue'
import PresetsView from './views/PresetsView.vue'
import WorldInfoView from './views/WorldInfoView.vue'
import RegexView from './views/RegexView.vue'
import SettingsView from './views/SettingsView.vue'

const viewMap = {
  chat: ChatView,
  memory: MemoryView,
  tools: ToolView,
  usage: UsageView,
  characters: CharacterView,
  generator: GeneratorView,
  square: SquareView,
  uitemplates: UITemplatesView,
  presets: PresetsView,
  worldinfo: WorldInfoView,
  regex: RegexView,
  settings: SettingsView
}

export default {
  name: 'App',
  components: { Sidebar, ToastStack },
  setup() {
    const ui = useUIStore()
    const currentViewComponent = computed(() => viewMap[ui.currentView] || ChatView)
    return { ui, currentViewComponent }
  }
}
</script>
