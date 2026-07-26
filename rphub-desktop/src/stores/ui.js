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

  // Generic confirm dialog state — wired to <ConfirmModal> in App.vue.
  const confirmDialog = ref({
    open: false,
    title: '',
    message: '',
    confirmText: '确认',
    cancelText: '取消',
    confirmButtonClass: 'bg-red-500 hover:bg-red-600',
    onConfirm: null
  })

  function showConfirmDialog(opts) {
    confirmDialog.value = {
      open: true,
      title: opts.title || '确认操作',
      message: opts.message || '',
      confirmText: opts.confirmText || '确认',
      cancelText: opts.cancelText || '取消',
      confirmButtonClass: opts.confirmButtonClass || 'bg-primary-500 hover:bg-primary-600',
      onConfirm: opts.onConfirm || null
    }
  }

  function closeConfirmDialog() {
    confirmDialog.value = { ...confirmDialog.value, open: false, onConfirm: null }
    if (_confirmResolve) {
      _confirmResolve(false)
      _confirmResolve = null
    }
  }

  function handleConfirmDialog() {
    const cb = confirmDialog.value.onConfirm
    closeConfirmDialog()
    if (typeof cb === 'function') cb()
    if (_confirmResolve) {
      _confirmResolve(true)
      _confirmResolve = null
    }
  }

  /**
   * Show a "已保存, 立即去工坊进一步编辑?" confirm.
   * On confirm: invokes the existing electronAPI.openWorkshop(charData) (passes the
   * full character object, NOT just an id — see the IPC contract in electron/preload).
   */
  // Internal: resolves the promise returned by confirm()
  let _confirmResolve = null

  /**
   * Promise-based confirm. Returns a promise that resolves true/false.
   * Wires into the same confirmDialog state used by <ConfirmModal> in App.vue.
   */
  function confirm(message, title = '确认操作') {
    return new Promise((resolve) => {
      _confirmResolve = resolve
      showConfirmDialog({
        title,
        message,
        confirmText: '确认',
        confirmButtonClass: 'bg-red-500 hover:bg-red-600',
        onConfirm: () => {},
      })
    })
  }

  function promptOpenWorkshop(character) {
    showConfirmDialog({
      title: '继续编辑?',
      message: `已保存「${character.name}」, 立即去工坊进一步编辑?`,
      confirmText: '打开工坊',
      cancelText: '留在此处',
      confirmButtonClass: 'bg-primary-500 hover:bg-primary-600',
      onConfirm: () => window.electronAPI?.openWorkshop?.(character)
    })
  }

  return {
    currentView,
    isSidebarCollapsed,
    isMobileMenuOpen,
    toasts,
    isAdvancedNavOpen,
    isChatFullscreen,
    confirmDialog,
    addToast,
    closeMobileMenu,
    toggleMobileMenu,
    toggleAdvancedNav,
    toggleChatFullscreen,
    setCurrentView,
    toggleSidebar,
    showConfirmDialog,
    closeConfirmDialog,
    handleConfirmDialog,
    promptOpenWorkshop,
    confirm
  }
})
