<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div v-if="visible" class="fixed inset-0 z-[60] flex items-center justify-center p-4"
        @click.self="handleClose">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>

        <!-- Modal -->
        <div class="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden z-10">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 class="text-lg font-bold text-gray-800">导入角色卡</h2>
            <button @click="handleClose"
              class="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="px-6 py-5">
            <!-- Import State: No file selected -->
            <div v-if="!parsedData && !loading && !error" class="text-center py-8">
              <div class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary-50 flex items-center justify-center">
                <svg class="w-10 h-10 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
              </div>
              <p class="text-gray-600 font-medium mb-2">选择角色卡文件</p>
              <p class="text-xs text-gray-400 mb-6">支持 PNG 格式的角色卡文件</p>
              <button @click="handleSelectFile"
                class="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium shadow-sm">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                </svg>
                选择文件
              </button>
            </div>

            <!-- Loading State -->
            <div v-if="loading" class="text-center py-8">
              <div class="w-10 h-10 mx-auto mb-4 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
              <p class="text-gray-500">正在解析角色卡...</p>
            </div>

            <!-- Error State -->
            <div v-if="error" class="text-center py-4">
              <div class="w-16 h-16 mx-auto mb-3 rounded-2xl bg-red-50 flex items-center justify-center">
                <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <p class="text-red-600 font-medium text-sm mb-1">解析失败</p>
              <p class="text-xs text-gray-500 mb-4">{{ errorMessage }}</p>
              <button @click="handleSelectFile"
                class="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm">
                重新选择
              </button>
            </div>

            <!-- Preview -->
            <div v-if="parsedData && !loading" class="space-y-4">
              <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200/60">
                <img
                  :src="parsedData.avatarUrl"
                  class="w-16 h-16 rounded-xl object-cover shadow-sm ring-2 ring-white flex-shrink-0"
                />
                <div class="min-w-0 flex-1">
                  <h3 class="font-bold text-gray-800 text-base truncate">{{ parsedData.character.name || '未命名角色' }}</h3>
                  <p class="text-xs text-gray-500 mt-1 line-clamp-2">{{ parsedData.character.description || '暂无描述' }}</p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200/60">
                  <span class="text-gray-400 text-xs">开场白</span>
                  <p class="text-gray-700 font-medium truncate mt-0.5">{{ parsedData.character.first_mes ? '包含' : '无' }}</p>
                </div>
                <div class="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200/60">
                  <span class="text-gray-400 text-xs">世界书条目</span>
                  <p class="text-gray-700 font-medium truncate mt-0.5">{{ parsedData.worldInfoCount || 0 }} 条</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div v-if="parsedData && !loading" class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <button @click="handleClose"
              class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition-colors">
              取消
            </button>
            <button @click="handleConfirm"
              class="px-5 py-2 text-sm bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium shadow-sm">
              确认导入
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script>
import { ref, watch } from 'vue'
import cardUtils from '../../utils/card-utils.js'
import { generateUUID } from '../../utils/utils.js'

export default {
  name: 'CharacterImportModal',
  props: {
    visible: { type: Boolean, default: false }
  },
  emits: ['close', 'import'],
  setup(props, { emit }) {
    const loading = ref(false)
    const error = ref(false)
    const errorMessage = ref('')
    const parsedData = ref(null)

    // Reset state when modal opens/closes
    watch(() => props.visible, (val) => {
      if (!val) {
        loading.value = false
        error.value = false
        errorMessage.value = ''
        parsedData.value = null
      }
    })

    function handleClose() {
      emit('close')
    }

    async function handleSelectFile() {
      try {
        loading.value = true
        error.value = false
        errorMessage.value = ''
        parsedData.value = null

        // Open file dialog for PNG files
        const result = await window.electronAPI.openFileDialog({
          properties: ['openFile'],
          filters: [
            { name: '角色卡 PNG', extensions: ['png'] },
            { name: '所有文件', extensions: ['*'] }
          ]
        })

        if (!result) {
          loading.value = false
          return // User cancelled
        }

        // Read the file content (ArrayBuffer)
        let fileBuffer
        if (result.content) {
          fileBuffer = result.content
        } else if (result.path) {
          fileBuffer = await window.electronAPI.readFile(result.path)
        }

        if (!fileBuffer) {
          throw new Error('无法读取文件内容')
        }

        // Parse PNG character data using card-utils
        const parsed = cardUtils.parsePngCharacterData(fileBuffer)
        const charData = parsed.data

        if (!charData) {
          throw new Error('未找到角色卡数据')
        }

        // Extract character fields (same logic as original app.js)
        const innerData = charData.data || charData
        const name = innerData.name || innerData.char_name || '未命名角色'
        const description = innerData.description || innerData.char_persona || ''
        const personality = innerData.personality || ''
        const first_mes = innerData.first_mes || ''
        const creator_notes = innerData.creator_notes || innerData.creatorcomment || innerData.creator_comment || ''

        // Create avatar URL from the PNG buffer
        const blob = new Blob([fileBuffer], { type: 'image/png' })
        const avatarUrl = await cardUtils.blobToDataUrl(blob)

        // Count world info entries
        let worldInfoCount = 0
        let characterBook = null
        if (innerData.character_book) {
          characterBook = innerData.character_book
        } else if (charData.character_book) {
          characterBook = charData.character_book
        }
        if (characterBook) {
          if (Array.isArray(characterBook.entries)) {
            worldInfoCount = characterBook.entries.length
          } else if (typeof characterBook.entries === 'object' && characterBook.entries !== null) {
            worldInfoCount = Object.keys(characterBook.entries).length
          } else if (Array.isArray(characterBook)) {
            worldInfoCount = characterBook.length
          }
        }

        parsedData.value = {
          character: {
            name,
            description,
            personality,
            first_mes,
            creator_notes,
            avatar: avatarUrl,
            uuid: generateUUID(),
            createdAt: Date.now(),
            // These will be populated on confirm
            worldInfo: [],
            regexScripts: [],
            uiTemplates: []
          },
          avatarUrl,
          rawData: charData,
          worldInfoCount
        }

        loading.value = false
      } catch (err) {
        console.error('Import error:', err)
        error.value = true
        errorMessage.value = err.message || '未知错误'
        loading.value = false
      }
    }

    function handleConfirm() {
      if (parsedData.value) {
        emit('import', parsedData.value.character)
        handleClose()
      }
    }

    return {
      loading,
      error,
      errorMessage,
      parsedData,
      handleClose,
      handleSelectFile,
      handleConfirm
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
