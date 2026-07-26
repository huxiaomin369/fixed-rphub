<template>
  <div class="flex-1 flex flex-col h-full overflow-hidden">
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200/80 bg-white/70 backdrop-blur-sm flex-shrink-0">
      <h2 class="text-lg font-bold text-gray-800">预设管理</h2>
      <div class="flex items-center gap-2">
        <label class="cursor-pointer p-2.5 bg-white hover:bg-gray-50 text-gray-600 rounded-xl border border-gray-200 transition-all shadow-sm" title="导入预设">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
          </svg>
          <input type="file" accept=".json" @change="handleImport" class="hidden">
        </label>
        <button @click="handleCreate" class="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all shadow-sm font-medium">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          新建
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-6">
      <PresetScopeTabs v-model="scopeFilter" />

      <div v-if="filteredPresets.length === 0" class="flex flex-col items-center justify-center h-64 text-gray-400">
        <p class="font-medium mb-1">还没有预设</p>
        <p class="text-sm">点击「新建」创建 API 请求预设</p>
      </div>

      <div v-else class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <PresetListItem
          v-for="(p, idx) in filteredPresets"
          :key="p.name + idx"
          :preset="p"
          @toggle="handleToggle(p)"
          @edit="handleEdit(p)"
          @delete="handleDelete(p)"
        />
      </div>
    </div>

    <PresetEditorModal
      v-if="editorOpen"
      :open="editorOpen"
      :preset="editorTarget"
      :is-new="isNew"
      @save="handleSave"
      @cancel="editorOpen = false"
    />
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { usePresets } from '../composables/usePresets.js'
import { useUIStore } from '../stores/ui.js'
import PresetScopeTabs from '../components/presets/PresetScopeTabs.vue'
import PresetListItem from '../components/presets/PresetListItem.vue'
import PresetEditorModal from '../components/presets/PresetEditorModal.vue'

export default {
  name: 'PresetsView',
  components: { PresetScopeTabs, PresetListItem, PresetEditorModal },
  setup() {
    const { presets, addPreset, updatePreset, removePreset, save } = usePresets()
    const ui = useUIStore()

    const scopeFilter = ref('all')
    const editorOpen = ref(false)
    const isNew = ref(false)
    const editorTarget = ref({ name: '', content: '', role: 'system', scope: 'global' })

    const filteredPresets = computed(() => {
      if (scopeFilter.value === 'all') return presets.value
      return presets.value.filter(p => p.scope === scopeFilter.value)
    })

    function handleCreate() {
      isNew.value = true
      editorTarget.value = { name: '', content: '', role: 'system', scope: 'global' }
      editorOpen.value = true
    }

    function handleEdit(preset) {
      isNew.value = false
      editorTarget.value = { ...preset }
      editorOpen.value = true
    }

    function handleSave(form) {
      if (isNew.value) {
        addPreset({ ...form, enabled: true, systemSeed: false })
      } else {
        const idx = presets.value.findIndex(p => p.name === editorTarget.value.name)
        if (idx >= 0) updatePreset(idx, form)
      }
      save()
      editorOpen.value = false
    }

    function handleDelete(preset) {
      ui.confirm(`确定删除预设「${preset.name}」？`).then(ok => {
        if (!ok) return
        const idx = presets.value.findIndex(p => p.name === preset.name)
        if (idx >= 0) {
          removePreset(idx)
          save()
        }
      })
    }

    function handleToggle(preset) {
      const idx = presets.value.findIndex(p => p.name === preset.name)
      if (idx >= 0) {
        updatePreset(idx, { enabled: !preset.enabled })
        save()
      }
    }

    function handleImport(e) {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result)
          if (Array.isArray(data)) {
            for (const p of data) addPreset({ ...p, systemSeed: false })
            save()
          }
        } catch (err) { console.error('Import failed:', err) }
      }
      reader.readAsText(file)
    }

    return {
      presets, scopeFilter, filteredPresets,
      editorOpen, isNew, editorTarget,
      handleCreate, handleEdit, handleSave, handleDelete, handleToggle, handleImport,
    }
  },
}
</script>
