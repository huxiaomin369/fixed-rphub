<template>
  <div class="absolute bottom-0 left-0 right-0 w-full p-2 md:p-3 z-30 pointer-events-none flex justify-center flex-shrink-0">
    <div class="w-full max-w-lg pointer-events-auto p-2.5 md:p-3 bg-white/90 backdrop-blur-xl border border-white/40 shadow-lg rounded-3xl ring-1 ring-black/5 transition-all duration-300 flex flex-col">
      <!-- Toolbar Row -->
      <div class="relative w-full flex justify-between items-center mb-2 px-1">
        <div class="flex items-center gap-2">
          <!-- Model Selector -->
          <ModelSelector
            :model="model"
            :models="models"
            @update:model-value="$emit('update:modelValue', $event)"
          />
        </div>

        <div class="flex items-center gap-2">
          <!-- Background Toggle -->
          <button @click="$emit('toggleBackground')"
            :class="['rounded-full w-8 h-8 flex items-center justify-center border transition-all active:scale-95',
              showBackground
                ? 'bg-primary-500 text-white border-primary-500'
                : 'bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 border-gray-200 shadow-sm'
            ]"
            title="角色背景">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z">
              </path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Textarea + Send Row -->
      <div class="relative w-full flex items-end gap-2 px-1">
        <textarea
          v-model="inputText"
          @input="autoResize"
          @keydown.enter.prevent="handleSend"
          :placeholder="placeholder"
          :disabled="disabled"
          ref="textareaRef"
          class="flex-1 bg-gray-100/70 text-gray-800 rounded-2xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 resize-none border border-transparent shadow-inner transition-all focus:bg-white min-h-[44px] max-h-[140px]"
          rows="1"
        ></textarea>

        <!-- Send / Stop Button -->
        <div class="flex-shrink-0 flex items-center gap-1">
          <button v-if="!isGenerating" @click="handleSend" :disabled="!inputText.trim() || disabled"
            class="p-2 md:p-2.5 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 hover:shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center w-[44px] h-[44px]"
            title="发送">
            <svg class="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
            </svg>
          </button>
          <button v-else @click="$emit('stop')"
            class="p-2 md:p-2.5 bg-red-500 text-white rounded-2xl hover:bg-red-600 hover:shadow-lg active:scale-95 transition-all shadow-md flex items-center justify-center w-[44px] h-[44px]"
            title="中止生成">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue'
import ModelSelector from './ModelSelector.vue'

export default {
  name: 'MessageInput',
  components: { ModelSelector },
  props: {
    character: { type: Object, default: null },
    disabled: { type: Boolean, default: false },
    placeholder: { type: String, default: '输入消息...' },
    isGenerating: { type: Boolean, default: false },
    showBackground: { type: Boolean, default: true },
    modelValue: { type: String, default: '' },
    model: { type: String, default: '' },
    models: { type: Array, default: () => [] }
  },
  emits: ['send', 'stop', 'toggleBackground', 'update:modelValue'],
  setup(props, { emit }) {
    const inputText = ref('')
    const textareaRef = ref(null)

    watch(() => props.modelValue, (val) => {
      inputText.value = val
    })

    function handleSend() {
      const text = inputText.value.trim()
      if (!text || props.disabled) return
      emit('send', text)
      inputText.value = ''
      autoResize()
    }

    function autoResize() {
      const el = textareaRef.value
      if (!el) return
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 140) + 'px'
    }

    return {
      inputText,
      textareaRef,
      handleSend,
      autoResize
    }
  }
}
</script>
