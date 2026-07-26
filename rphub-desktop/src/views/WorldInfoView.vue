<template>
  <div class="flex-1 flex flex-col h-full overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200/80 bg-white/70 backdrop-blur-sm flex-shrink-0">
      <div class="flex items-center">
        <button @click="ui.toggleMobileMenu"
          class="md:hidden mr-3 text-gray-500 md:hover:text-gray-700 active:text-gray-700 transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"/>
          </svg>
        </button>
        <h2 class="text-lg font-bold text-gray-800 flex items-center">
          <svg class="w-6 h-6 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
          </svg>
          世界书
        </h2>
      </div>
      <div class="flex items-center gap-2">
        <label class="cursor-pointer p-2.5 bg-white hover:bg-gray-50 text-gray-600 rounded-xl border border-gray-200 transition-all shadow-sm hover:shadow-md active:scale-95" title="导入">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          <input type="file" accept=".json" @change="handleImport" class="hidden">
        </label>
        <button @click="handleCreate"
          class="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all shadow-sm font-medium">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          新建
        </button>
      </div>
    </div>

    <!-- Scrollable body -->
    <div class="flex-1 overflow-y-auto p-6">
      <WorldInfoScopeTabs v-model="scopeFilter" />

      <!-- Empty state -->
      <div v-if="sortedEntries.length === 0" class="flex flex-col items-center justify-center h-64 text-gray-400">
        <div class="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center mb-4">
          <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
          </svg>
        </div>
        <p class="font-medium mb-1">还没有世界书条目</p>
        <p class="text-sm">点击「新建」创建世界书条目</p>
      </div>

      <!-- Entry list -->
      <div v-else ref="sortableEl" class="space-y-3">
        <div v-for="entry in sortedEntries" :key="entry.id"
          class="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all wi-drag-handle">
          <WorldInfoListItem :entry="entry"
            @toggle="handleToggle"
            @edit="handleEdit"
            @delete="handleDelete" />
        </div>
      </div>

      <!-- Global settings sliders -->
      <div class="mt-6">
        <div class="bg-white/70 backdrop-blur-sm p-1 rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <button @click="showSettings = !showSettings"
            :class="['w-full flex justify-between items-center px-4 py-3 rounded-xl transition-all font-bold',
                     showSettings ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50']">
            <span class="flex items-center">
              <div :class="['p-1.5 rounded-lg mr-3 transition-colors', showSettings ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500']">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
                </svg>
              </div>
              全局世界信息/知识书激活设置
            </span>
            <svg :class="{'rotate-180': showSettings}" class="w-5 h-5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <div v-show="showSettings" class="p-4 pt-3 border-t border-gray-100 animate-fade-in">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 text-sm">
              <div>
                <div class="flex justify-between items-center mb-1">
                  <label class="font-medium text-gray-600">扫描深度</label>
                  <span class="text-primary-600 font-mono bg-primary-50 px-2 py-0.5 rounded">{{ settings.scanDepth }}</span>
                </div>
                <input type="range" v-model.number="settings.scanDepth" min="0" max="20"
                  @change="saveSettings"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600">
              </div>
              <div>
                <div class="flex justify-between items-center mb-1">
                  <label class="font-medium text-gray-600">最大扫描深度</label>
                  <span class="text-primary-600 font-mono bg-primary-50 px-2 py-0.5 rounded">{{ settings.maxDepth }}</span>
                </div>
                <input type="range" v-model.number="settings.maxDepth" min="0" max="50"
                  @change="saveSettings"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Editor Modal -->
    <WorldInfoEditorModal :open="showEditor" :entry="editingEntry" :is-new="isNewEntry"
      @save="handleSave" @cancel="showEditor = false" />

    <!-- Delete confirmation -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showDeleteConfirm" class="fixed inset-0 z-[70] flex items-center justify-center p-4" @click.self="showDeleteConfirm = false">
          <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
          <div class="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden p-6">
            <div class="text-center">
              <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
                <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <h3 class="text-lg font-bold text-gray-800 mb-2">确认删除</h3>
              <p class="text-sm text-gray-500 mb-6">确定要删除世界书条目「{{ deleteTargetName }}」吗？</p>
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
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useWorldInfo } from '../composables/useWorldInfo'
import { useWorldInfoStore } from '../stores/worldinfo'
import { useChatStore } from '../stores/chat'
import { useUIStore } from '../stores/ui'
import WorldInfoScopeTabs from '../components/worldinfo/WorldInfoScopeTabs.vue'
import WorldInfoListItem from '../components/worldinfo/WorldInfoListItem.vue'
import WorldInfoEditorModal from '../components/worldinfo/WorldInfoEditorModal.vue'

export default {
  name: 'WorldInfoView',
  components: { WorldInfoScopeTabs, WorldInfoListItem, WorldInfoEditorModal },
  setup() {
    const { worldInfo, settings, addEntry, updateEntry, removeEntry, moveEntry, save, saveGlobal, ensureSeeds } = useWorldInfo()
    const wStore = useWorldInfoStore()
    const chat = useChatStore()
    const ui = useUIStore()

    const sortableEl = ref(null)
    const showEditor = ref(false)
    const showSettings = ref(false)
    const showDeleteConfirm = ref(false)
    const scopeFilter = ref('all')
    const editingEntry = ref({ comment: '', content: '', key: [], position: 'global_note', scope: 'global', depth: 4, order: 100, probability: 100, group: '', constant: false, useRegex: false, caseSensitive: false, enabled: true })
    const isNewEntry = ref(true)
    const deleteTargetId = ref(null)
    const deleteTargetName = ref('')

    let sortableInstance = null

    const sortedEntries = computed(() => {
      if (scopeFilter.value === 'all') return worldInfo.value
      return worldInfo.value.filter(e => e.scope === scopeFilter.value)
    })

    function findIndexById(id) {
      return worldInfo.value.findIndex(e => e.id === id)
    }

    async function initSortable() {
      await nextTick()
      if (!sortableEl.value) return
      try {
        const Sortable = (await import('sortablejs')).default
        sortableInstance = new Sortable(sortableEl.value, {
          animation: 200,
          handle: '.wi-drag-handle',
          ghostClass: 'opacity-40',
          dragClass: '!shadow-xl !scale-105 !z-50',
          onEnd: (evt) => {
            const fromIdx = findIndexById(sortedEntries.value[evt.oldIndex]?.id)
            const toIdx = findIndexById(sortedEntries.value[evt.newIndex]?.id)
            if (fromIdx >= 0 && toIdx >= 0) {
              moveEntry(fromIdx, toIdx)
              save()
            }
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

    const defaultEntry = () => ({
      comment: '', content: '', key: [], enabled: true,
      position: 'global_note', scope: chat.currentCharacterId ? 'character' : 'global',
      useRegex: false, caseSensitive: true, constant: false, group: '',
      scanDepth: null, order: 0, useProbability: false, probability: 100, depth: 4
    })

    function handleCreate() {
      editingEntry.value = defaultEntry()
      isNewEntry.value = true
      showEditor.value = true
    }

    function handleEdit(entry) {
      editingEntry.value = { ...entry }
      isNewEntry.value = false
      showEditor.value = true
    }

    function handleSave(data) {
      const idx = findIndexById(data.id)
      if (idx >= 0) {
        updateEntry(idx, data)
      } else {
        addEntry(data, { currentCharacterId: chat.currentCharacterId })
      }
      save()
      if (data.scope === 'global') saveGlobal()
      showEditor.value = false
      ui.addToast(idx >= 0 ? '世界书条目已更新' : '世界书条目已创建', 'success')
    }

    function handleToggle(entry) {
      const idx = findIndexById(entry.id)
      if (idx >= 0) {
        updateEntry(idx, { enabled: !entry.enabled })
        save()
      }
    }

    function handleDelete(entry) {
      deleteTargetId.value = entry.id
      deleteTargetName.value = entry.comment || '未命名条目'
      showDeleteConfirm.value = true
    }

    function confirmDelete() {
      const idx = findIndexById(deleteTargetId.value)
      if (idx >= 0) {
        const entry = worldInfo.value[idx]
        removeEntry(idx)
        save()
        if (entry.scope === 'global') saveGlobal()
        ui.addToast(`已删除世界书条目「${deleteTargetName.value}」`, 'success')
      }
      showDeleteConfirm.value = false
      deleteTargetId.value = null
      deleteTargetName.value = ''
    }

    function saveSettings() {
      wStore.saveWorldInfoSettings()
    }

    async function handleImport(e) {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        const items = Array.isArray(data) ? data : [data]
        items.forEach(item => addEntry(item, { currentCharacterId: chat.currentCharacterId }))
        await save()
        ui.addToast(`成功导入 ${items.length} 个世界书条目`, 'success')
      } catch (err) {
        ui.addToast('导入失败：' + err.message, 'error')
      }
      e.target.value = ''
    }

    onMounted(async () => {
      if (!wStore.worldInfoLoaded) {
        await wStore.loadWorldInfo()
      }
      ensureSeeds()
      await initSortable()
    })

    onBeforeUnmount(() => {
      destroySortable()
    })

    watch(sortedEntries, async () => {
      destroySortable()
      await nextTick()
      await initSortable()
    })

    return {
      ui, settings, sortedEntries, sortableEl,
      showEditor, showSettings, showDeleteConfirm,
      scopeFilter, editingEntry, isNewEntry, deleteTargetName,
      handleCreate, handleEdit, handleSave, handleToggle,
      handleDelete, confirmDelete, handleImport, saveSettings
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
