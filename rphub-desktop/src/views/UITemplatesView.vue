<template>
  <div class="flex-1 flex flex-col h-full overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200/80 bg-white/70 backdrop-blur-sm flex-shrink-0">
      <div>
        <h2 class="text-lg font-bold text-gray-800">UI 模板</h2>
        <p class="text-xs text-gray-400 mt-0.5">{{ templates.length }} 个模板</p>
      </div>
      <div class="flex items-center gap-2">
        <button @click="showAddForm = true"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all shadow-sm font-medium">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          新建模板
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6">
      <!-- Empty State -->
      <div v-if="templates.length === 0"
        class="flex flex-col items-center justify-center h-full text-gray-400">
        <div class="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center mb-4">
          <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm4 3h8M8 12h8M8 16h5"></path>
          </svg>
        </div>
        <p class="font-medium mb-1">还没有 UI 模板</p>
        <p class="text-sm">点击"新建模板"创建自定义界面模板</p>
      </div>

      <!-- Template List -->
      <div v-else class="space-y-3">
        <div v-for="(tmpl, idx) in templates" :key="tmpl.id || idx"
          class="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-gray-200">
          <div class="px-5 py-4">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center flex-shrink-0">
                  <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm4 3h8M8 12h8M8 16h5"></path>
                  </svg>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-gray-800 truncate">{{ tmpl.name || '未命名模板' }}</span>
                    <span class="px-2 py-0.5 text-xs rounded-full"
                      :class="tmpl.enabled !== false ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'">
                      {{ tmpl.enabled !== false ? '已启用' : '已禁用' }}
                    </span>
                  </div>
                  <div class="text-xs text-gray-400 mt-0.5">
                    <span>位置: {{ placementLabel(tmpl.placement) }}</span>
                    <span v-if="tmpl.order != null" class="ml-3">顺序: {{ tmpl.order }}</span>
                    <span class="ml-3">{{ tmpl.scope || '角色' }} 级别</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-1 ml-2 flex-shrink-0">
                <button @click="toggleEnabled(idx)"
                  class="p-1.5 rounded-lg transition-all"
                  :class="tmpl.enabled !== false ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path v-if="tmpl.enabled !== false" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </button>
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
            <div v-if="tmpl.htmlTemplate" class="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <pre class="text-xs text-gray-500 overflow-x-auto whitespace-pre-wrap max-h-24">{{ truncateTemplate(tmpl.htmlTemplate) }}</pre>
            </div>
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
          <div class="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden z-10">
            <div class="px-6 py-4 border-b border-gray-100/80">
              <h3 class="text-lg font-bold text-gray-800">{{ editingIndex >= 0 ? '编辑模板' : '新建模板' }}</h3>
            </div>
            <div class="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <!-- Template Name -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">模板名称</label>
                <input v-model="formData.name" type="text" placeholder="模板名称"
                  class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm" />
              </div>

              <!-- HTML Template -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">HTML 模板内容</label>
                <textarea v-model="formData.htmlTemplate" rows="8" placeholder="<div>{{content}}</div>"
                  class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm font-mono resize-none"></textarea>
                <p class="text-xs text-gray-400 mt-1">支持 Vue 模板语法。可用变量：<code class="text-primary-500">content</code>, <code class="text-primary-500">character</code></p>
              </div>

              <!-- Placement -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">放置位置</label>
                <select v-model="formData.placement"
                  class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm">
                  <option value="bottom">消息底部</option>
                  <option value="top">消息顶部</option>
                </select>
              </div>

              <!-- Scope -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">作用范围</label>
                <select v-model="formData.scope"
                  class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm">
                  <option value="character">角色级别</option>
                  <option value="global">全局</option>
                </select>
              </div>

              <!-- Order -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">执行顺序</label>
                <input v-model.number="formData.order" type="number" min="0" max="999"
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
                :disabled="!formData.name.trim()">
                {{ editingIndex >= 0 ? '保存' : '创建' }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { useUIStore } from '../stores/ui'

export default {
  name: 'UITemplatesView',
  setup() {
    const ui = useUIStore()

    const templates = ref([])
    const showAddForm = ref(false)
    const editingIndex = ref(-1)
    const formData = reactive({
      name: '',
      htmlTemplate: '',
      placement: 'bottom',
      scope: 'character',
      order: 100,
      enabled: true
    })

    function loadTemplates() {
      try {
        // Load from localStorage for now (persisted via localforage in store)
        const raw = localStorage.getItem('rphub_ui_templates')
        if (raw) {
          templates.value = JSON.parse(raw)
        } else {
          // Demo templates
          templates.value = []
        }
      } catch (_) {
        templates.value = []
      }
    }

    function saveTemplates() {
      try {
        localStorage.setItem('rphub_ui_templates', JSON.stringify(templates.value))
      } catch (_) { /* ignore */ }
    }

    function resetForm() {
      formData.name = ''
      formData.htmlTemplate = ''
      formData.placement = 'bottom'
      formData.scope = 'character'
      formData.order = 100
      formData.enabled = true
    }

    function closeForm() {
      showAddForm.value = false
      editingIndex.value = -1
      resetForm()
    }

    function startEdit(idx) {
      const tmpl = templates.value[idx]
      if (!tmpl) return
      editingIndex.value = idx
      formData.name = tmpl.name || ''
      formData.htmlTemplate = tmpl.htmlTemplate || ''
      formData.placement = tmpl.placement || 'bottom'
      formData.scope = tmpl.scope || 'character'
      formData.order = tmpl.order ?? 100
      formData.enabled = tmpl.enabled !== false
    }

    function handleSave() {
      if (!formData.name.trim()) {
        ui.addToast('请输入模板名称', 'warning')
        return
      }

      const entry = {
        id: 'tmpl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        name: formData.name.trim(),
        htmlTemplate: formData.htmlTemplate || '',
        placement: formData.placement,
        scope: formData.scope,
        order: formData.order ?? 100,
        enabled: formData.enabled
      }

      if (editingIndex.value >= 0) {
        templates.value[editingIndex.value] = { ...templates.value[editingIndex.value], ...entry }
        ui.addToast('模板已更新', 'success')
      } else {
        templates.value.push(entry)
        ui.addToast('模板已创建', 'success')
      }

      saveTemplates()
      closeForm()
    }

    function handleDelete(idx) {
      if (confirm('确定要删除这个模板吗？')) {
        templates.value.splice(idx, 1)
        saveTemplates()
        ui.addToast('模板已删除', 'success')
      }
    }

    function toggleEnabled(idx) {
      const tmpl = templates.value[idx]
      if (tmpl) {
        tmpl.enabled = tmpl.enabled !== false ? false : true
        saveTemplates()
      }
    }

    function placementLabel(p) {
      return p === 'top' ? '消息顶部' : '消息底部'
    }

    function truncateTemplate(html) {
      if (!html) return ''
      return html.length > 200 ? html.slice(0, 200) + '...' : html
    }

    onMounted(() => {
      loadTemplates()
    })

    return {
      templates,
      showAddForm,
      editingIndex,
      formData,
      closeForm,
      startEdit,
      handleSave,
      handleDelete,
      toggleEnabled,
      placementLabel,
      truncateTemplate
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
