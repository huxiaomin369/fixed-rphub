<template>
  <div class="space-y-3">
    <div class="relative">
      <textarea
        v-model="localPrompt"
        :disabled="isGenerating"
        rows="3"
        placeholder="描述你想创建的角色, 例如: 26岁女骑士, 金发, 外冷内热, 失忆后被主角救下..."
        class="w-full px-4 py-3 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all text-sm resize-none disabled:opacity-60"
        @keydown.enter.exact.prevent="onSend"
      />
    </div>
    <div class="flex items-center justify-between">
      <p class="text-xs text-gray-400">Enter 发送 · AI 将流式生成角色卡</p>
      <div class="flex items-center gap-2">
        <button v-if="!isGenerating" @click="onSend" :disabled="!localPrompt.trim()"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
          开始生成
        </button>
        <button v-else @click="onStop"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-sm font-medium">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path>
          </svg>
          停止
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'GeneratorInputPanel',
  props: {
    isGenerating: { type: Boolean, default: false }
  },
  emits: ['send', 'stop'],
  setup(props, { emit }) {
    const localPrompt = ref('')

    function onSend() {
      if (!localPrompt.value.trim()) return
      emit('send', localPrompt.value)
    }

    function onStop() {
      emit('stop')
    }

    return { localPrompt, onSend, onStop }
  }
}
</script>
