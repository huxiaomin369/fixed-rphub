<template>
  <div class="flex-1 flex flex-col h-full overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200/80 bg-white/70 backdrop-blur-sm flex-shrink-0">
      <div>
        <h2 class="text-lg font-bold text-gray-800">角色卡管理</h2>
        <p class="text-xs text-gray-400 mt-0.5">共 {{ characters.characterList.length }} 个角色</p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Search -->
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索角色..."
            class="w-48 pl-9 pr-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all placeholder-gray-400"
          />
        </div>

        <!-- Import Button -->
        <button @click="showImportModal = true"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-white border border-gray-200/80 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm font-medium">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
          </svg>
          导入
        </button>

        <!-- Create Button -->
        <button @click="handleCreateCharacter"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all shadow-sm font-medium">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          新建
        </button>
      </div>
    </div>

    <!-- Character Grid -->
    <div class="flex-1 overflow-y-auto p-6">
      <div v-if="filteredCharacters.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400">
        <div class="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center mb-4">
          <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
        </div>
        <p class="font-medium mb-1">{{ searchQuery ? '未找到匹配的角色' : '还没有角色卡' }}</p>
        <p class="text-sm">{{ searchQuery ? '尝试其他关键词' : '点击"新建"或"导入"开始' }}</p>
      </div>

      <!-- Character Cards Grid -->
      <div v-else
        ref="sortableEl"
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        <CharacterCard
          v-for="(char, idx) in filteredCharacters"
          :key="char.id || char.uuid || idx"
          :character="char"
          :selected="characters.characterList[characters.currentCharacterIndex]?.uuid === char.uuid"
          @select="handleSelect(idx)"
          @edit="handleEdit(idx)"
          @export="handleExport(idx)"
          @delete="handleDelete(idx)"
        />
      </div>
    </div>

    <!-- Import Modal -->
    <CharacterImportModal
      :visible="showImportModal"
      @close="showImportModal = false"
      @import="handleImportCharacter"
    />

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showDeleteConfirm" class="fixed inset-0 z-[60] flex items-center justify-center p-4"
          @click.self="showDeleteConfirm = false">
          <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
          <div class="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden z-10 p-6">
            <div class="text-center">
              <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
                <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <h3 class="text-lg font-bold text-gray-800 mb-2">确认删除</h3>
              <p class="text-sm text-gray-500 mb-1">确定要删除角色卡「{{ deleteTargetName }}」吗？</p>
              <p class="text-xs text-gray-400 mb-6">此操作无法撤销，关联的聊天记录也会被删除。</p>
              <div class="flex items-center justify-center gap-3">
                <button @click="showDeleteConfirm = false"
                  class="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition-colors">
                  取消
                </button>
                <button @click="confirmDelete"
                  class="px-5 py-2.5 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium shadow-sm">
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useCharacterStore } from '../stores/characters'
import { useUIStore } from '../stores/ui'
import CharacterCard from '../components/characters/CharacterCard.vue'
import CharacterImportModal from '../components/characters/CharacterImportModal.vue'
import cardUtils from '../utils/card-utils.js'
import { generateUUID } from '../utils/utils.js'

export default {
  name: 'CharacterView',
  components: { CharacterCard, CharacterImportModal },
  setup() {
    const characters = useCharacterStore()
    const ui = useUIStore()

    const searchQuery = ref('')
    const showImportModal = ref(false)
    const showDeleteConfirm = ref(false)
    const deleteTargetIndex = ref(-1)
    const deleteTargetName = ref('')
    const sortableEl = ref(null)

    let sortableInstance = null

    const filteredCharacters = computed(() => {
      const list = characters.characterList || []
      if (!searchQuery.value.trim()) return list
      const q = searchQuery.value.toLowerCase().trim()
      return list.filter(char => {
        const name = (char.name || '').toLowerCase()
        const desc = (char.description || '').toLowerCase()
        return name.includes(q) || desc.includes(q)
      })
    })

    // Initialize SortableJS for drag reorder
    async function initSortable() {
      await nextTick()
      if (!sortableEl.value) return

      try {
        const Sortable = (await import('sortablejs')).default
        sortableInstance = new Sortable(sortableEl.value, {
          animation: 200,
          handle: '.char-grid-item',
          ghostClass: 'opacity-40',
          dragClass: '!shadow-xl !scale-105 !z-50',
          onEnd: (evt) => {
            const list = characters.characterList
            const [moved] = list.splice(evt.oldIndex, 1)
            list.splice(evt.newIndex, 0, moved)

            // Adjust currentCharacterIndex if needed
            if (characters.currentCharacterIndex === evt.oldIndex) {
              characters.setCurrentCharacter(evt.newIndex)
            } else if (
              characters.currentCharacterIndex > evt.oldIndex &&
              characters.currentCharacterIndex <= evt.newIndex
            ) {
              characters.setCurrentCharacter(characters.currentCharacterIndex - 1)
            } else if (
              characters.currentCharacterIndex < evt.oldIndex &&
              characters.currentCharacterIndex >= evt.newIndex
            ) {
              characters.setCurrentCharacter(characters.currentCharacterIndex + 1)
            }

            characters.saveCharacters()
          }
        })
      } catch (err) {
        console.warn('SortableJS init failed (optional feature):', err)
      }
    }

    function destroySortable() {
      if (sortableInstance) {
        sortableInstance.destroy()
        sortableInstance = null
      }
    }

    onMounted(async () => {
      if (!characters.charactersLoaded) {
        await characters.loadCharacters()
      }
      await initSortable()

      // Listen for workshop save → update character list
      if (window.electronAPI?.onWorkshopUpdate) {
        window.electronAPI.onWorkshopUpdate((updatedCharacter) => {
          if (!updatedCharacter || !updatedCharacter.uuid) return
          const idx = characters.characterList.findIndex(c => c.uuid === updatedCharacter.uuid)
          if (idx >= 0) {
            characters.characterList[idx] = updatedCharacter
            characters.saveCharacters()
            ui.addToast(`角色「${updatedCharacter.name || '未命名'}」已更新`, 'success')
          }
        })
      }
    })

    onBeforeUnmount(() => {
      destroySortable()
    })

    // Re-init sortable when filtered list changes (but only if not searching)
    watch(() => characters.characterList?.length, async () => {
      destroySortable()
      if (!searchQuery.value) {
        await nextTick()
        await initSortable()
      }
    })

    watch(searchQuery, () => {
      if (searchQuery.value) {
        destroySortable()
      } else {
        nextTick(() => initSortable())
      }
    })

    function handleSelect(index) {
      const realIndex = findRealIndex(index)
      if (realIndex >= 0) {
        characters.selectCharacter(characters.characterList[realIndex])
        // Switch to chat view
        ui.setCurrentView('chat')
      }
    }

    function handleEdit(index) {
      const realIndex = findRealIndex(index)
      if (realIndex < 0) return
      const char = characters.characterList[realIndex]
      // Open character workshop via IPC
      if (window.electronAPI?.openWorkshop) {
        window.electronAPI.openWorkshop(char)
      } else {
        ui.addToast('角色编辑功能将在后续版本实现', 'info')
      }
    }

    async function handleExport(index) {
      const realIndex = findRealIndex(index)
      if (realIndex < 0) return
      const char = characters.characterList[realIndex]

      try {
        // Build V2 card data
        const v2Data = cardUtils.buildCharacterCardData(char)
        const jsonStr = JSON.stringify(v2Data)

        if (!char.avatar) {
          ui.addToast('该角色没有头像，无法导出 PNG', 'warning')
          return
        }

        // Convert avatar to PNG bytes
        const pngBytes = await cardUtils.imageUrlToPngBytes(char.avatar, { crossOrigin: 'Anonymous' })

        // Inject character data as text chunk
        const finalPng = cardUtils.injectPngTextChunk(
          pngBytes,
          'chara',
          cardUtils.encodeBase64Utf8(jsonStr)
        )

        // Save via native dialog
        const saveResult = await window.electronAPI.saveFileDialog({
          defaultPath: (char.name || 'character') + '.png',
          filters: [
            { name: 'PNG 图片', extensions: ['png'] }
          ]
        })

        if (saveResult && saveResult.path) {
          await window.electronAPI.writeFile(saveResult.path, finalPng)
          ui.addToast(`角色卡「${char.name}」导出成功`, 'success')
        }
      } catch (err) {
        console.error('Export error:', err)
        ui.addToast('导出失败: ' + err.message, 'error')
      }
    }

    function handleDelete(index) {
      const realIndex = findRealIndex(index)
      if (realIndex < 0) return
      const char = characters.characterList[realIndex]
      deleteTargetIndex.value = realIndex
      deleteTargetName.value = char.name || '未命名角色'
      showDeleteConfirm.value = true
    }

    async function confirmDelete() {
      if (deleteTargetIndex.value >= 0) {
        characters.removeCharacter(deleteTargetIndex.value)
        await characters.saveCharacters()
        ui.addToast(`已删除角色「${deleteTargetName.value}」`, 'success')
      }
      showDeleteConfirm.value = false
      deleteTargetIndex.value = -1
      deleteTargetName.value = ''
    }

    function handleCreateCharacter() {
      const newChar = {
        name: '新建角色',
        description: '',
        personality: '',
        first_mes: '',
        avatar: null,
        creator_notes: '',
        worldInfo: [],
        regexScripts: [],
        uiTemplates: [],
        recentGenerationTimes: [],
        uuid: generateUUID(),
        createdAt: Date.now()
      }
      characters.addCharacter(newChar)
      characters.saveCharacters()
      // Select the new character and open chat
      const idx = characters.characterList.length - 1
      characters.selectCharacter(characters.characterList[idx])
      ui.setCurrentView('chat')
    }

    async function handleImportCharacter(charData) {
      characters.addCharacter(charData)
      await characters.saveCharacters()
      ui.addToast(`已导入角色卡「${charData.name}」`, 'success')
      // Auto-select the new character
      const idx = characters.characterList.length - 1
      characters.selectCharacter(characters.characterList[idx])
    }

    // Helper: find real index in characterList (filteredCharacters returns filtered subset)
    function findRealIndex(filteredIdx) {
      if (filteredIdx < 0 || filteredIdx >= filteredCharacters.value.length) return -1
      const char = filteredCharacters.value[filteredIdx]
      return characters.characterList.findIndex(c => c.uuid === char.uuid || c.id === char.id)
    }

    return {
      characters,
      ui,
      searchQuery,
      showImportModal,
      showDeleteConfirm,
      deleteTargetName,
      sortableEl,
      filteredCharacters,
      handleSelect,
      handleEdit,
      handleExport,
      handleDelete,
      confirmDelete,
      handleCreateCharacter,
      handleImportCharacter
    }
  }
}
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
