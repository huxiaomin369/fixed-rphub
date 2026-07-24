<template>
  <div class="relative" @click.stop>
    <button @click="open = !open"
      class="px-3 py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-all duration-300 flex items-center bg-white hover:bg-gray-50 border border-gray-200 shadow-sm active:scale-95 text-primary-600"
      title="切换模型">
      <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z">
        </path>
      </svg>
      {{ model || '选择模型' }}
    </button>

    <!-- Dropdown -->
    <transition name="fade">
      <div v-if="open"
        class="absolute top-full left-0 mt-1.5 w-64 max-h-60 overflow-y-auto bg-white border border-gray-200/80 rounded-2xl shadow-[0_12px_40px_-8px_rgba(0,0,0,0.25)] z-50 py-1.5 ring-1 ring-black/5">
        <div class="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 mb-1">
          模型列表
        </div>
        <button
          v-for="m in models"
          :key="m"
          @click="selectModel(m)"
          class="w-full text-left px-3 py-2 text-xs font-medium transition-colors flex items-center gap-2 hover:bg-primary-50/60"
          :class="m === model ? 'text-primary-700 bg-primary-50 font-bold' : 'text-gray-700'"
        >
          <svg v-if="m === model" class="w-3.5 h-3.5 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
          </svg>
          <span v-else class="w-3.5 h-3.5 flex-shrink-0"></span>
          <span class="truncate">{{ m }}</span>
        </button>
        <div v-if="models.length === 0" class="px-3 py-4 text-xs text-gray-400 text-center italic">
          暂无可用模型
        </div>
      </div>
    </transition>

    <!-- Backdrop to close -->
    <div v-if="open" @click="open = false" class="fixed inset-0 z-40"></div>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'ModelSelector',
  props: {
    model: { type: String, default: '' },
    models: { type: Array, default: () => [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4',
      'gpt-3.5-turbo',
      'claude-3-opus',
      'claude-3-sonnet',
      'claude-3-haiku'
    ]}
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const open = ref(false)

    function selectModel(value) {
      emit('update:modelValue', value)
      open.value = false
    }

    return { open, selectModel }
  }
}
</script>
