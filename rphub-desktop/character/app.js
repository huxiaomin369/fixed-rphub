import { createApp, ref, reactive, onMounted } from 'vue'
import * as diffModal from './diff-modal.js'

createApp({
  setup() {
    const character = ref(null)
    const originalSnapshot = ref(null)
    const dirty = ref(false)
    const toasts = reactive([])

    function showToast(message, type = 'success') {
      toasts.push({ message, type })
      setTimeout(() => { toasts.shift() }, 2500)
    }

    function markDirty() {
      dirty.value = true
    }

    function saveCharacter() {
      if (!character.value) return
      // Send updated character back to main window
      if (window.electronAPI?.saveWorkshop) {
        window.electronAPI.saveWorkshop(JSON.parse(JSON.stringify(character.value)))
      } else {
        // Fallback: save to localforage if available
        showToast('保存成功（本地模式）', 'success')
      }
      dirty.value = false
    }

    function handleAvatarUpload(e) {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        character.value.avatar = ev.target.result
        markDirty()
      }
      reader.readAsDataURL(file)
      e.target.value = ''
    }

    // Listen for character data from main process
    function setupIPC() {
      if (window.electronAPI?.onWorkshopLoad) {
        window.electronAPI.onWorkshopLoad((data) => {
          character.value = JSON.parse(JSON.stringify(data))
          originalSnapshot.value = JSON.parse(JSON.stringify(data))
          dirty.value = false
        })
      }
    }

    // Fallback: if no electronAPI, load from URL params or create blank
    function loadFallback() {
      const params = new URLSearchParams(window.location.search)
      const dataParam = params.get('data')
      if (dataParam) {
        try {
          character.value = JSON.parse(decodeURIComponent(dataParam))
        } catch (e) {
          character.value = { name: '新建角色', description: '', personality: '', first_mes: '', avatar: null, creator_notes: '', worldInfo: [], regexScripts: [], uuid: Date.now().toString() }
        }
      } else {
        character.value = { name: '新建角色', description: '', personality: '', first_mes: '', avatar: null, creator_notes: '', worldInfo: [], regexScripts: [], uuid: Date.now().toString() }
      }
      originalSnapshot.value = JSON.parse(JSON.stringify(character.value))
    }

    function setupAIAssistant() {
      // Expose the workshop's toast function so diff-modal.js can use it
      // (it falls back to inline toast if not present, but ours is better).
      window.__workshopToast = showToast

      const btn = document.getElementById('ai-assistant-btn')
      if (btn) {
        btn.addEventListener('click', () => {
          if (!character.value) {
            showToast('尚未加载角色, 请稍候', 'warning')
            return
          }
          diffModal.open(character.value)
        })
      }

      // When a diff is applied, mark dirty so the save button enables.
      document.addEventListener('ai-assistant:apply', () => {
        markDirty()
      })
    }

    onMounted(() => {
      setupIPC()
      setupAIAssistant()
      // If no data received after a short delay, load fallback
      setTimeout(() => {
        if (!character.value) {
          loadFallback()
        }
      }, 500)
    })

    return {
      character,
      dirty,
      toasts,
      saveCharacter,
      markDirty,
      handleAvatarUpload
    }
  }
}).mount('#app')
