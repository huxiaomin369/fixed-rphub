<template>
  <div class="absolute top-14 left-3 right-3 md:w-[420px] md:left-[60px] md:right-auto md:top-[60px] max-h-[calc(100dvh-5rem)] bg-white border border-gray-200/90 shadow-[0_18px_48px_-26px_rgba(15,23,42,0.5)] rounded-2xl z-40 overflow-hidden ring-1 ring-black/5 flex flex-col">
    <!-- Header -->
    <div class="flex items-center gap-3 p-3.5 pr-12 border-b border-gray-100/80 bg-white flex-shrink-0">
      <div class="flex-shrink-0 rounded-xl overflow-hidden">
        <img :src="character?.avatar" class="w-14 h-14 rounded-xl object-cover border border-white shadow-sm">
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 min-w-0">
          <h3 class="font-bold text-gray-900 text-lg leading-tight truncate">{{ character?.name }}</h3>
          <button @click="$emit('edit')"
            class="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors flex-shrink-0"
            title="编辑角色">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z">
              </path>
            </svg>
          </button>
        </div>
        <div class="mt-1.5 flex items-center gap-2 text-[11px] font-medium text-gray-400">
          <span class="inline-flex items-baseline gap-1">
            <span class="text-[13px] font-bold leading-none text-gray-700">{{ messageCount }}</span>
            <span>条</span>
          </span>
          <span class="h-3 w-px rounded-full bg-gray-200"></span>
          <span class="inline-flex items-baseline gap-1">
            <span class="text-[13px] font-bold leading-none text-gray-700">{{ totalChars }}</span>
            <span>字</span>
          </span>
        </div>
      </div>

      <button @click="$emit('close')"
        class="absolute top-3 right-3 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all z-20"
        title="关闭">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>

    <!-- Content -->
    <div class="min-h-0 flex-1 p-3.5 flex flex-col overflow-hidden">
      <div class="mb-2 flex items-center justify-between px-0.5">
        <div class="flex items-center gap-2 text-[11px] font-bold text-gray-400">
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
            </path>
          </svg>
          角色卡简介
        </div>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto rounded-xl bg-gray-50/55 p-3">
        <div v-if="character?.description" class="text-sm text-gray-700 leading-relaxed markdown-body"
          v-html="renderedDescription">
        </div>
        <div v-else class="flex min-h-32 flex-col items-center justify-center text-gray-400 italic text-sm">
          <svg class="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
            </path>
          </svg>
          暂无描述信息
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'DescriptionPanel',
  props: {
    character: { type: Object, default: null },
    messageCount: { type: Number, default: 0 },
    totalChars: { type: Number, default: 0 },
    renderMarkdownFn: { type: Function, required: true }
  },
  emits: ['close', 'edit'],
  setup(props) {
    const renderedDescription = computed(() => {
      if (!props.character?.description) return ''
      return props.renderMarkdownFn(props.character.description, 'assistant', true)
    })

    return { renderedDescription }
  }
}
</script>
