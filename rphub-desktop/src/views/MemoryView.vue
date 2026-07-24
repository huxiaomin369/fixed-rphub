<template>
  <div class="flex-1 flex flex-col h-full overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200/80 bg-white/70 backdrop-blur-sm flex-shrink-0">
      <div>
        <h2 class="text-lg font-bold text-gray-800">记忆系统</h2>
        <p class="text-xs text-gray-400 mt-0.5">{{ memories.length }} 条记忆</p>
      </div>
      <div class="flex items-center gap-2">
        <button @click="showAddForm = true"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all shadow-sm font-medium">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          添加记忆
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6">
      <!-- Memory Settings Panel -->
      <div class="mb-6 bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div class="px-5 py-3 border-b border-gray-100/80 bg-gray-50/30">
          <h3 class="text-sm font-bold text-gray-700">记忆设置</h3>
        </div>
        <div class="px-5 py-4 space-y-4">
          <!-- Enable Memory -->
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-gray-700">启用记忆系统</label>
            <button @click="memorySettings.enabled = !memorySettings.enabled; saveMemSettings()"
              class="relative w-10 h-6 rounded-full transition-colors duration-200"
              :class="memorySettings.enabled ? 'bg-primary-500' : 'bg-gray-200'">
              <span class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200"
                :class="memorySettings.enabled ? 'translate-x-4' : ''"></span>
            </button>
          </div>

          <!-- Memory Mode -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">记忆模式</label>
            <div class="flex gap-3">
              <button @click="memorySettings.mode = 'classic'; saveMemSettings()"
                class="flex-1 px-4 py-2.5 rounded-xl border-2 transition-all text-sm font-medium"
                :class="memorySettings.mode === 'classic' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'">
                经典模式
              </button>
              <button @click="memorySettings.mode = 'vector'; saveMemSettings()"
                class="flex-1 px-4 py-2.5 rounded-xl border-2 transition-all text-sm font-medium"
                :class="memorySettings.mode === 'vector' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'">
                向量模式
              </button>
            </div>
          </div>

          <!-- Model Settings (Vector Mode) -->
          <template v-if="memorySettings.mode === 'vector'">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">嵌入模型</label>
              <input v-model="memorySettings.embeddingModel" type="text" placeholder="text-embedding-3-small"
                @change="saveMemSettings"
                class="w-full px-3 py-2 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Top-K</label>
                <input v-model.number="memorySettings.vectorTopK" type="number" min="1" max="100"
                  @change="saveMemSettings"
                  class="w-full px-3 py-2 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">相似度阈值 (%)</label>
                <input v-model.number="memorySettings.similarityThreshold" type="number" min="0" max="100"
                  @change="saveMemSettings"
                  class="w-full px-3 py-2 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm" />
              </div>
            </div>
          </template>

          <!-- Classic Mode Settings -->
          <template v-if="memorySettings.mode === 'classic'">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">经典记忆模型</label>
              <input v-model="memorySettings.classicModel" type="text" placeholder="gpt-4o-mini"
                @change="saveMemSettings"
                class="w-full px-3 py-2 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">默认深度</label>
              <input v-model.number="memorySettings.defaultDepth" type="number" min="1" max="10"
                @change="saveMemSettings"
                class="w-full px-3 py-2 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm" />
            </div>
          </template>
        </div>
      </div>

      <!-- Memory List -->
      <div v-if="memories.length === 0" class="flex flex-col items-center justify-center py-16 text-gray-400">
        <div class="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-4">
          <svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
          </svg>
        </div>
        <p class="font-medium mb-1">暂无记忆</p>
        <p class="text-sm">点击"添加记忆"创建第一条记忆</p>
      </div>

      <div v-else class="space-y-3">
        <div v-for="(mem, idx) in memories" :key="idx"
          class="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-gray-200">
          <div class="px-5 py-4">
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <div class="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div class="min-w-0">
                  <div class="text-sm font-medium text-gray-800 truncate">{{ mem.title || '未命名记忆' }}</div>
                  <div class="text-xs text-gray-400 mt-0.5">
                    <span v-if="mem.createdAt">{{ formatDate(mem.createdAt) }}</span>
                    <span v-if="mem.depth"> · 深度 {{ mem.depth }}</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-1 ml-2 flex-shrink-0">
                <button @click="startEdit(idx)"
                  class="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-all">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                </button>
                <button @click="handleDelete(idx)"
                  class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            </div>
            <p class="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap line-clamp-3">{{ mem.content }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showAddForm || editingIndex >= 0" class="fixed inset-0 z-[60] flex items-center justify-center p-4"
          @click.self="closeForm">
          <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
          <div class="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden z-10">
            <div class="px-6 py-4 border-b border-gray-100/80">
              <h3 class="text-lg font-bold text-gray-800">{{ editingIndex >= 0 ? '编辑记忆' : '添加记忆' }}</h3>
            </div>
            <div class="px-6 py-5 space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">标题</label>
                <input v-model="formData.title" type="text" placeholder="记忆标题"
                  class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">内容</label>
                <textarea v-model="formData.content" rows="5" placeholder="记忆内容..."
                  class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm resize-none"></textarea>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">深度</label>
                <input v-model.number="formData.depth" type="number" min="1" max="10"
                  class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm" />
              </div>
            </div>
            <div class="px-6 py-4 border-t border-gray-100/80 flex justify-end gap-3">
              <button @click="closeForm"
                class="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition-colors">
                取消
              </button>
              <button @click="handleSave"
                class="px-5 py-2.5 text-sm bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium shadow-sm"
                :disabled="!formData.content.trim()">
                {{ editingIndex >= 0 ? '保存' : '添加' }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script>
import { ref, reactive, onMounted, watch } from 'vue'
import { useMemoryStore } from '../stores/memory'
import { useUIStore } from '../stores/ui'

export default {
  name: 'MemoryView',
  setup() {
    const memoryStore = useMemoryStore()
    const ui = useUIStore()

    const showAddForm = ref(false)
    const editingIndex = ref(-1)
    const formData = reactive({
      title: '',
      content: '',
      depth: 1
    })

    const memories = memoryStore.memories
    const memorySettings = memoryStore.memorySettings

    function resetForm() {
      formData.title = ''
      formData.content = ''
      formData.depth = 1
    }

    function closeForm() {
      showAddForm.value = false
      editingIndex.value = -1
      resetForm()
    }

    function startEdit(idx) {
      const mem = memories.value[idx]
      if (!mem) return
      editingIndex.value = idx
      formData.title = mem.title || ''
      formData.content = mem.content || ''
      formData.depth = mem.depth || 1
    }

    function handleSave() {
      if (!formData.content.trim()) {
        ui.addToast('请输入记忆内容', 'warning')
        return
      }

      const entry = {
        title: formData.title.trim() || '未命名记忆',
        content: formData.content.trim(),
        depth: formData.depth || 1,
        createdAt: Date.now()
      }

      if (editingIndex.value >= 0) {
        memories.value[editingIndex.value] = { ...memories.value[editingIndex.value], ...entry, editedAt: Date.now() }
        memoryStore.saveMemories()
        ui.addToast('记忆已更新', 'success')
      } else {
        memoryStore.addMemory(entry)
        memoryStore.saveMemories()
        ui.addToast('记忆已添加', 'success')
      }

      closeForm()
    }

    function handleDelete(idx) {
      if (confirm('确定要删除这条记忆吗？')) {
        memoryStore.removeMemory(idx)
        memoryStore.saveMemories()
        ui.addToast('记忆已删除', 'success')
      }
    }

    function saveMemSettings() {
      memoryStore.saveMemorySettings()
    }

    function formatDate(ts) {
      if (!ts) return ''
      const d = new Date(ts)
      return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    onMounted(async () => {
      if (!memoryStore.memoriesLoaded) {
        await memoryStore.loadMemories()
      }
    })

    return {
      memories,
      memorySettings,
      ui,
      showAddForm,
      editingIndex,
      formData,
      closeForm,
      startEdit,
      handleSave,
      handleDelete,
      saveMemSettings,
      formatDate
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
