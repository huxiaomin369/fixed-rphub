import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  const currentView = ref('chat')
  const isSidebarCollapsed = ref(false)
  const isMobileMenuOpen = ref(false)
  const toasts = ref([])
  const isAdvancedNavOpen = ref(false)
  const isChatFullscreen = ref(false)

  let toastId = 0

  function addToast(message, type = 'info', duration = 3000) {
    const id = ++toastId
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, duration)
  }

  function closeMobileMenu() {
    isMobileMenuOpen.value = false
  }

  function toggleMobileMenu() {
    isMobileMenuOpen.value = !isMobileMenuOpen.value
  }

  function toggleAdvancedNav() {
    isAdvancedNavOpen.value = !isAdvancedNavOpen.value
  }

  function toggleChatFullscreen() {
    isChatFullscreen.value = !isChatFullscreen.value
  }

  function setCurrentView(view) {
    currentView.value = view
  }

  function toggleSidebar() {
    isSidebarCollapsed.value = !isSidebarCollapsed.value
  }

  return {
    currentView,
    isSidebarCollapsed,
    isMobileMenuOpen,
    toasts,
    isAdvancedNavOpen,
    isChatFullscreen,
    addToast,
    closeMobileMenu,
    toggleMobileMenu,
    toggleAdvancedNav,
    toggleChatFullscreen,
    setCurrentView,
    toggleSidebar
  }
})
