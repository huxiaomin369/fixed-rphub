<template>
  <div class="flex-1 flex flex-col h-full overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200/80 bg-white/70 backdrop-blur-sm flex-shrink-0">
      <div class="flex items-center">
        <button @click="ui.toggleMobileMenu"
          class="md:hidden mr-3 text-gray-500 md:hover:text-gray-700 active:text-gray-700 transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path>
          </svg>
        </button>
        <h2 class="text-lg font-bold text-gray-800 flex items-center">
          <svg class="w-6 h-6 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
          </svg>
          预设管理
        </h2>
      </div>
      <div class="flex items-center gap-2">
        <!-- Import -->
        <label class="cursor-pointer p-2.5 bg-white hover:bg-gray-50 text-gray-600 rounded-xl border border-gray-200 transition-all shadow-sm hover:shadow-md active:scale-95" title="导入预设">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
          </svg>
          <input type="file" accept=".json" @change="handleImport" class="hidden">
        </label>
        <!-- Create -->
        <button @click="handleCreate"
          class="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all shadow-sm font-medium">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          新建
        </button>
      </div>
    </div>

    <!-- List -->
    <div class="flex-1 overflow-y-auto p-6">
      <div v-if="store.presets.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400">
        <div class="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center mb-4">
          <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
          </svg>
        </div>
        <p class="font-medium mb-1">还没有预设</p>
        <p class="text-sm">点击「新建」创建 API 请求预设</p>
      </div>

      <div v-else ref="sortableEl" class="space-y-3">
        <div v-for="(preset, index) in store.presets" :key="preset.name + index"
          class="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between group shadow-sm hover:shadow-md transition-all preset-drag-handle">
          <div class="flex items-center flex-1 min-w-0 mr-4">
            <div class="cursor-move text-gray-400 mr-3 hover:text-gray-600 flex-shrink-0" title="拖动排序">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 min-w-0">
                <h3 class="font-bold text-gray-800 truncate">{{ preset.name }}</h3>
                <span :class="['hidden md:inline-flex text-[10px] px-2 py-0.5 rounded-full border font-bold flex-shrink-0', getRoleBadgeClass(preset)]">
                  {{ getRoleLabel(preset) }}
                </span>
              </div>
              <p v-if="preset.content" class="text-xs text-gray-400 mt-0.5 truncate">{{ preset.content.substring(0, 80) }}{{ preset.content.length > 80 ? '...' : '' }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 flex-shrink-0">
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" :checked="preset.enabled" @change="toggleEnabled(index, $event.target.checked)" class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
            <div class="flex gap-1 border-l border-gray-200 pl-3">
              <button @click="handleEdit(index)" class="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="编辑">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button @click="handleDelete(index)" class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="删除">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Preset Editor Modal -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showEditor" class="fixed inset-0 z-[60] flex items-center justify-center p-4" @click.self="showEditor = false">
          <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
          <div class="relative w-full max-w-2xl bg-white rounded-2xl border border-gray-200 shadow-2xl max-h-[94vh] overflow-hidden">
            <!-- Header -->
            <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 backdrop-blur-sm">
              <div class="flex items-center gap-3">
                <div class="p-2 bg-primary-50 text-primary-600 rounded-lg">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-bold text-gray-800">{{ editingIndex >= 0 ? '编辑预设' : '新建预设' }}</h3>
                  <p class="text-xs text-gray-500">{{ getRoleLabel(editingData) }}</p>
                </div>
              </div>
              <button @click="showEditor = false" class="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="p-6 space-y-6 bg-gray-50/30 overflow-y-auto" style="max-height: calc(94vh - 140px);">
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">预设名称</label>
                <input v-model="editingData.name" type="text"
                  class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none transition-all shadow-sm font-medium"
                  placeholder="例如：沉浸式叙事">
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">注入位置</label>
                <select v-model="editingData.role"
                  class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none transition-all shadow-sm font-medium">
                  <option value="system">System（系统提示）</option>
                  <option value="user">User（用户消息）</option>
                  <option value="assistant">Assistant（AI 消息）</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 flex justify-between">
                  <span>{{ getRoleLabel(editingData) }}内容</span>
                  <span class="text-[10px] font-normal normal-case bg-gray-100 px-1.5 rounded text-gray-500">{{ (editingData.content || '').length }} 字符</span>
                </label>
                <textarea v-model="editingData.content" rows="12"
                  class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none text-sm shadow-inner leading-relaxed resize-y min-h-[200px]"
                  placeholder="在此输入预设内容..."></textarea>
              </div>
            </div>

            <!-- Footer -->
            <div class="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/80 backdrop-blur-sm">
              <button @click="showEditor = false"
                class="px-5 py-2.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl transition-all shadow-sm font-medium text-sm active:scale-95">取消</button>
              <button @click="handleSave"
                class="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-bold text-sm active:scale-95 flex items-center">
                <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                保存预设
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- Delete Confirmation -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showDeleteConfirm" class="fixed inset-0 z-[70] flex items-center justify-center p-4" @click.self="showDeleteConfirm = false">
          <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
          <div class="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden p-6">
            <div class="text-center">
              <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
                <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <h3 class="text-lg font-bold text-gray-800 mb-2">确认删除</h3>
              <p class="text-sm text-gray-500 mb-6">确定要删除预设「{{ deleteTargetName }}」吗？</p>
              <div class="flex items-center justify-center gap-3">
                <button @click="showDeleteConfirm = false"
                  class="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition-colors">取消</button>
                <button @click="confirmDelete"
                  class="px-5 py-2.5 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium shadow-sm">确认删除</button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { usePresetsStore } from '../stores/presets'
import { useUIStore } from '../stores/ui'

export default {
  name: 'PresetsView',
  setup() {
    const store = usePresetsStore()
    const ui = useUIStore()

    const sortableEl = ref(null)
    const showEditor = ref(false)
    const showDeleteConfirm = ref(false)
    const editingIndex = ref(-1)
    const editingData = ref({ name: '', role: 'system', content: '', enabled: true })
    const deleteTargetIndex = ref(-1)
    const deleteTargetName = ref('')

    let sortableInstance = null

    function getRoleLabel(preset) {
      const labels = { system: '系统提示', user: '用户消息', assistant: 'AI 消息' }
      return labels[preset.role] || '系统提示'
    }

    function getRoleBadgeClass(preset) {
      const classes = {
        system: 'bg-blue-50 text-blue-700 border-blue-200',
        user: 'bg-green-50 text-green-700 border-green-200',
        assistant: 'bg-purple-50 text-purple-700 border-purple-200'
      }
      return classes[preset.role] || classes.system
    }

    async function initSortable() {
      await nextTick()
      if (!sortableEl.value) return
      try {
        const Sortable = (await import('sortablejs')).default
        sortableInstance = new Sortable(sortableEl.value, {
          animation: 200,
          handle: '.preset-drag-handle',
          ghostClass: 'opacity-40',
          dragClass: '!shadow-xl !scale-105 !z-50',
          onEnd: (evt) => {
            store.movePreset(evt.oldIndex, evt.newIndex)
            store.savePresets()
          }
        })
      } catch (err) {
        console.warn('SortableJS init failed:', err)
      }
    }

    function destroySortable() {
      if (sortableInstance) {
        sortableInstance.destroy()
        sortableInstance = null
      }
    }

    function handleCreate() {
      editingIndex.value = -1
      editingData.value = { name: '', role: 'system', content: '', enabled: true }
      showEditor.value = true
    }

    function handleEdit(index) {
      const preset = store.presets[index]
      editingIndex.value = index
      editingData.value = { ...preset }
      showEditor.value = true
    }

    function handleSave() {
      const data = { ...editingData.value }
      if (editingIndex.value >= 0) {
        store.updatePreset(editingIndex.value, data)
      } else {
        store.addPreset(data)
      }
      store.savePresets()
      showEditor.value = false
      ui.addToast(editingIndex.value >= 0 ? '预设已更新' : '预设已创建', 'success')
    }

    function handleDelete(index) {
      deleteTargetIndex.value = index
      deleteTargetName.value = store.presets[index].name || '未命名预设'
      showDeleteConfirm.value = true
    }

    function confirmDelete() {
      if (deleteTargetIndex.value >= 0) {
        store.removePreset(deleteTargetIndex.value)
        store.savePresets()
        ui.addToast(`已删除预设「${deleteTargetName.value}」`, 'success')
      }
      showDeleteConfirm.value = false
      deleteTargetIndex.value = -1
      deleteTargetName.value = ''
    }

    function toggleEnabled(index, val) {
      store.updatePreset(index, { enabled: val })
      store.savePresets()
    }

    async function handleImport(e) {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        const items = Array.isArray(data) ? data : [data]
        items.forEach(item => store.addPreset(item))
        await store.savePresets()
        ui.addToast(`成功导入 ${items.length} 个预设`, 'success')
      } catch (err) {
        ui.addToast('导入失败：' + err.message, 'error')
      }
      e.target.value = ''
    }

    onMounted(async () => {
      if (!store.presetsLoaded) {
        await store.loadPresets()
      }
      await initSortable()
    })

    onBeforeUnmount(() => {
      destroySortable()
    })

    watch(() => store.presets?.length, async () => {
      destroySortable()
      await nextTick()
      await initSortable()
    })

    return {
      store,
      ui,
      sortableEl,
      showEditor,
      showDeleteConfirm,
      editingIndex,
      editingData,
      deleteTargetName,
      getRoleLabel,
      getRoleBadgeClass,
      handleCreate,
      handleEdit,
      handleSave,
      handleDelete,
      confirmDelete,
      toggleEnabled,
      handleImport
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
