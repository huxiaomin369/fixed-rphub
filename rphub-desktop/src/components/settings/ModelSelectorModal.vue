<template>
  <teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div class="fixed inset-0" @click="close"></div>
      <div class="relative z-10 bg-white rounded-xl border border-gray-200 w-full max-w-2xl max-h-[90vh] h-[90vh] flex flex-col shadow-2xl">
        <!-- Header -->
        <div class="p-4 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
          <h3 class="text-lg font-bold text-gray-800">{{ title }}</h3>
          <button type="button" @click="close" class="text-gray-400 hover:text-gray-600 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Empty state hint -->
        <div v-if="models.length === 0" class="flex-1 flex flex-col items-center justify-center text-gray-400 p-6">
          <svg class="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z">
            </path>
          </svg>
          <p class="text-sm">请先点击「刷新可用模型列表」获取模型</p>
        </div>

        <template v-else>
          <!-- Search + tags -->
          <div class="p-4 border-b border-gray-100 flex flex-col gap-3 flex-shrink-0">
            <input v-model="searchQuery" type="text" placeholder="检索模型..."
              class="w-full bg-gray-50/60 border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:shadow-md transition-all shadow-sm" />
            <div class="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto items-center py-1">
              <button v-for="tag in tags" :key="tag.name" type="button" @click="activeTag = tag.name"
                class="flex items-center px-3.5 py-1.5 text-xs font-bold rounded-full transition-all border outline-none active:scale-95 whitespace-nowrap shadow-sm"
                :class="activeTag === tag.name
                  ? 'bg-primary-50 text-primary-700 border-primary-300'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300'">
                <span class="leading-none">{{ tag.label }}</span>
                <span class="ml-1.5 opacity-60 font-mono text-[11px] leading-none">{{ tag.count }}</span>
              </button>
            </div>
          </div>

          <!-- Model list -->
          <div class="flex-1 overflow-y-auto p-2 min-h-[300px]">
            <div v-if="filteredModels.length === 0" class="flex flex-col items-center justify-center py-12 text-gray-400">
              <svg class="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z">
                </path>
              </svg>
              未找到模型或正在加载...
            </div>
            <div v-else class="space-y-1">
              <button v-for="model in filteredModels" :key="model.id" type="button" @click="select(model.id)"
                class="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 hover:shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-colors flex justify-between items-center group border border-transparent hover:border-gray-100 active:bg-gray-100">
                <span class="text-gray-700 font-mono font-medium group-hover:text-primary-600 transition-colors">
                  {{ model.id }}
                </span>
                <span v-if="currentValue === model.id"
                  class="text-primary-600 bg-primary-50 p-1 rounded-full shadow-sm flex-shrink-0 ml-3">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </teleport>
</template>

<script>
import { buildModelTags, filterModels } from '../../services/popularModels'

export default {
  name: 'ModelSelectorModal',
  props: {
    modelValue: { type: Boolean, default: false },
    models: { type: Array, default: () => [] },
    currentValue: { type: String, default: '' },
    title: { type: String, default: '选择模型' }
  },
  emits: ['update:modelValue', 'select'],
  data() {
    return {
      searchQuery: '',
      activeTag: 'all'
    }
  },
  computed: {
    tags() {
      return buildModelTags(this.models)
    },
    filteredModels() {
      return filterModels(this.models, this.activeTag, this.searchQuery)
    }
  },
  watch: {
    modelValue(open) {
      if (open) {
        this.searchQuery = ''
        this.activeTag = 'all'
      }
    }
  },
  methods: {
    close() {
      this.$emit('update:modelValue', false)
    },
    select(id) {
      this.$emit('select', id)
      this.close()
    }
  }
}
</script>
