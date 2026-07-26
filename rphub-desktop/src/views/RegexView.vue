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
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
          </svg>
          正则脚本
        </h2>
      </div>
      <div class="flex items-center gap-2">
        <label class="cursor-pointer p-2.5 bg-white hover:bg-gray-50 text-gray-600 rounded-xl border border-gray-200 transition-all shadow-sm hover:shadow-md active:scale-95" title="导入">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
          </svg>
          <input type="file" accept=".json" @change="handleImport" class="hidden">
        </label>
        <button @click="handleCreate"
          class="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all shadow-sm font-medium">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          新建
        </button>
      </div>
    </div>

    <!-- Scope tabs -->
    <div class="px-6 pt-3">
      <RegexScopeTabs v-model="scopeTab" />
    </div>

    <!-- List -->
    <div class="flex-1 overflow-y-auto p-6">
      <div v-if="displayScripts.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400">
        <div class="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center mb-4">
          <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
          </svg>
        </div>
        <p class="font-medium mb-1">还没有正则脚本</p>
        <p class="text-sm">点击「新建」创建正则替换脚本</p>
      </div>

      <div v-else class="border rounded-lg overflow-hidden divide-y divide-gray-100 bg-white shadow-sm">
        <RegexListItem
          v-for="script in displayScripts"
          :key="script.name + (script.scope || 'character')"
          :script="script"
          @toggle="handleToggle"
          @edit="handleEdit"
          @delete="handleDelete"
        />
      </div>
    </div>

    <!-- Editor Modal -->
    <RegexEditorModal
      :open="showEditor"
      :script="editingScript"
      :is-new="isNew"
      @save="handleSave"
      @cancel="showEditor = false"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '../stores/ui'
import { useRegexStore } from '../stores/regex'
import { useCharacterStore } from '../stores/characters'
import { useRegexScripts } from '../composables/useRegexScripts'
import RegexScopeTabs from '../components/regex/RegexScopeTabs.vue'
import RegexListItem from '../components/regex/RegexListItem.vue'
import RegexEditorModal from '../components/regex/RegexEditorModal.vue'

export default {
  name: 'RegexView',
  components: { RegexScopeTabs, RegexListItem, RegexEditorModal },
  setup() {
    const ui = useUIStore()
    const store = useRegexStore()
    const { regexScripts, globalRegexScripts, addScript, save, saveGlobal, ensureSeeds } = useRegexScripts()

    const scopeTab = ref('all')
    const showEditor = ref(false)
    const editingScript = ref({})
    const isNew = ref(false)

    // Filter by scope tab and map store fields (substituteRegex/replaceString/content) to
    // child-component-expected fields (regex/replacement)
    const displayScripts = computed(() => {
      const raw = scopeTab.value === 'all'
        ? [...regexScripts.value, ...globalRegexScripts.value]
        : scopeTab.value === 'global'
          ? globalRegexScripts.value
          : regexScripts.value
      return raw.map(s => ({
        ...s,
        regex: s.regex || s.substituteRegex || s.content || '',
        replacement: s.replacement || s.replaceString || '',
      }))
    })

    function handleCreate() {
      const charStore = useCharacterStore()
      editingScript.value = {
        name: '', regex: '', flags: 'g', replacement: '',
        placement: [1, 2], markdownOnly: false, promptOnly: false,
        minDepth: null, maxDepth: null,
        scope: charStore.currentCharacter ? 'character' : 'global',
        enabled: true,
      }
      isNew.value = true
      showEditor.value = true
    }

    function handleEdit(script) {
      editingScript.value = { ...script }
      isNew.value = false
      showEditor.value = true
    }

    function handleSave(form) {
      // Map component format (regex/replacement) to store format
      const data = {
        ...form,
        substituteRegex: form.regex || '',
        replaceString: form.replacement || '',
        content: form.regex || '',
      }

      if (isNew.value) {
        addScript(data)
      } else {
        // Find the script in its scope array by name
        const arr = form.scope === 'global' ? store.globalRegexScripts : store.regexScripts
        const idx = arr.findIndex(s => s.name === editingScript.value.name)
        if (idx >= 0) {
          if (form.scope === 'global') {
            store.updateGlobalRegexScript(idx, data)
          } else {
            store.updateRegexScript(idx, data)
          }
        }
      }

      save()
      if (form.scope === 'global') saveGlobal()
      showEditor.value = false
      ui.addToast(isNew.value ? '正则脚本已创建' : '正则脚本已更新', 'success')
    }

    function handleToggle(script) {
      const arr = script.scope === 'global' ? store.globalRegexScripts : store.regexScripts
      const idx = arr.findIndex(s => s.name === script.name)
      if (idx >= 0) {
        if (script.scope === 'global') {
          store.updateGlobalRegexScript(idx, { enabled: !script.enabled })
        } else {
          store.updateRegexScript(idx, { enabled: !script.enabled })
        }
        save()
        if (script.scope === 'global') saveGlobal()
      }
    }

    function handleDelete(script) {
      if (!window.confirm(`确定要删除脚本「${script.name}」吗？`)) return
      const arr = script.scope === 'global' ? store.globalRegexScripts : store.regexScripts
      const idx = arr.findIndex(s => s.name === script.name)
      if (idx >= 0) {
        if (script.scope === 'global') {
          store.removeGlobalRegexScript(idx)
        } else {
          store.removeRegexScript(idx)
        }
        save()
        if (script.scope === 'global') saveGlobal()
        ui.addToast(`已删除脚本「${script.name}」`, 'success')
      }
    }

    async function handleImport(e) {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        const items = Array.isArray(data) ? data : [data]
        items.forEach(item => addScript(item))
        save()
        saveGlobal()
        ui.addToast(`成功导入 ${items.length} 个正则脚本`, 'success')
      } catch (err) {
        ui.addToast('导入失败：' + err.message, 'error')
      }
      e.target.value = ''
    }

    onMounted(async () => {
      if (!store.regexLoaded) {
        await store.loadRegex()
      }
      ensureSeeds()
    })

    return {
      ui,
      scopeTab,
      displayScripts,
      showEditor,
      editingScript,
      isNew,
      handleCreate,
      handleEdit,
      handleSave,
      handleToggle,
      handleDelete,
      handleImport,
    }
  },
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
