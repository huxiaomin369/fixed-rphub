<template>
  <div
    :class="['flex w-full mb-6', message.isSelf ? 'justify-end' : 'justify-start']"
    :data-role="message.role"
  >
    <div :class="['flex max-w-[85%] md:max-w-[70%]', message.isSelf ? 'flex-row-reverse' : 'flex-row']">
      <!-- Avatar -->
      <div class="flex-shrink-0 select-none">
        <div v-if="message.role === 'user' && message.isSelf" class="w-9 h-9 rounded-full overflow-hidden shadow-sm ml-1.5">
          <div class="w-full h-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-xs text-white">
            {{ (message.name || '我').charAt(0) }}
          </div>
        </div>
        <img v-else-if="character?.avatar"
          :src="character.avatar"
          class="w-9 h-9 rounded-full object-cover mr-1.5 border border-gray-200 shadow-sm"
        >
      </div>

      <div :class="['flex flex-col min-w-0', message.isSelf ? 'items-end' : 'items-start']">
        <!-- Name Tag -->
        <div
          class="text-[10px] font-bold text-gray-600 mb-1 select-none px-1.5 py-0.5 rounded-md bg-white/50 backdrop-blur-sm border border-white/20 w-fit shadow-sm truncate max-w-[150px] msg-name-tag"
          :class="message.isSelf ? 'ml-auto mr-1' : 'mr-auto ml-1'"
        >
          {{ displayName }}
        </div>

        <!-- Message Bubble -->
        <div class="group relative">
          <!-- Edit Mode -->
          <div v-if="message.isEditing_Message" class="relative z-10 animate-fade-in w-full p-3 md:p-4 rounded-2xl bg-white/70 border border-white/40 shadow-card">
            <textarea
              v-model="editContent"
              class="w-full min-h-[88px] max-h-[70vh] p-3 text-sm text-gray-700 bg-white/50 backdrop-blur-md rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all shadow-inner resize-y"
              placeholder="编辑消息..."
            ></textarea>
            <div class="flex justify-end space-x-2 mt-3">
              <button @click="cancelEdit"
                class="px-4 py-1.5 text-xs font-bold text-gray-500 bg-white/80 hover:bg-white border border-gray-200 rounded-lg shadow-sm transition-all">
                取消
              </button>
              <button @click="saveEdit"
                class="px-4 py-1.5 text-xs font-bold text-white bg-primary-500 hover:bg-primary-600 rounded-lg shadow-sm transition-all">
                保存
              </button>
            </div>
          </div>

          <!-- Display Mode -->
          <div v-else
            :class="['p-3 md:p-4 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed overflow-hidden backdrop-blur-md glass-stabilize',
              message.role === 'user'
                ? (message.isSelf ? 'bg-blue-50/85 text-gray-900 shadow-[0_4px_12px_rgba(59,130,246,0.1)] border border-primary-300/50' : 'bg-white/70 text-gray-800 border border-white/40 shadow-card')
                : 'bg-white/70 text-gray-800 border border-white/40 shadow-card'
            ]"
          >
            <!-- CoT / Thinking Section -->
            <div v-if="cotContent" class="mb-3">
              <div class="cot-ui native-thinking-card">
                <button type="button" class="cot-header native-thinking-header justify-between w-full"
                  @click="isCotOpen = !isCotOpen">
                  <div class="flex items-center min-w-0">
                    <svg class="w-3.5 h-3.5 mr-2 flex-shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 006 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5M9 18h6M10 22h4">
                      </path>
                    </svg>
                    <span class="text-sm font-bold truncate">Thinking</span>
                  </div>
                  <svg class="w-3.5 h-3.5 ml-2 opacity-60 transition-transform duration-300"
                    :class="{ 'rotate-180': isCotOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
                <div class="overflow-hidden transition-all duration-300" :class="isCotOpen ? 'max-h-[2000px]' : 'max-h-0'">
                  <div class="p-3 bg-gray-50 border-t border-gray-100 text-[13px] text-gray-700 markdown-body"
                    v-html="renderMarkdownFn(cotContent, 'assistant', true)">
                  </div>
                </div>
              </div>
            </div>

            <!-- Main Content -->
            <div v-if="mainContent || message.content" class="markdown-body"
              v-html="renderMarkdownFn(mainContent || message.content, message.role)">
            </div>

            <!-- Generated Images -->
            <div v-if="message.images && message.images.length" class="mt-2 grid grid-cols-2 gap-2 max-w-md">
              <a v-for="(img, i) in message.images" :key="i" :href="img.url" target="_blank" class="block">
                <img :src="img.url" :alt="img.prompt" class="w-full h-auto rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow" loading="lazy">
              </a>
            </div>
            <div v-else-if="message.imageStatus === 'generating'" class="mt-2 text-xs text-gray-400 inline-flex items-center gap-1">
              <span class="w-3 h-3 border-2 border-primary-300 border-t-primary-500 rounded-full animate-spin"></span>
              正在生成图片…
            </div>

            <!-- Sys Instruction Part -->
            <div v-if="sysContent"
              class="mt-2 p-3 bg-gradient-to-r from-gray-50/80 to-gray-100/50 rounded-xl border border-gray-200/60 shadow-sm flex flex-col gap-1.5">
              <div class="flex items-center text-gray-500 font-bold text-xs uppercase tracking-wider">
                <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z">
                  </path>
                </svg>
                临时指令
              </div>
              <div class="text-gray-600 leading-relaxed font-medium text-[13px] markdown-body"
                v-html="renderMarkdownFn(sysContent, 'user', true)">
              </div>
            </div>
          </div>

          <!-- Message Actions -->
          <div v-if="!message.isEditing_Message"
            :class="['flex items-center space-x-1 md:space-x-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 mt-1', message.isSelf ? 'justify-end' : 'justify-start']">
            <button v-if="isLastMessage && message.role === 'assistant'"
              @click="$emit('regenerate', index)"
              class="p-1 md:p-1.5 text-gray-500 hover:text-primary-600 bg-white/90 rounded-full border border-gray-200/60 shadow-sm hover:bg-white hover:scale-105 transition-all"
              title="重新生成">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15">
                </path>
              </svg>
            </button>
            <button @click="startEdit"
              class="p-1 md:p-1.5 text-gray-500 hover:text-primary-600 bg-white/90 rounded-full border border-gray-200/60 shadow-sm hover:bg-white hover:scale-105 transition-all"
              title="编辑">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z">
                </path>
              </svg>
            </button>
            <button @click="copyContent"
              class="p-1 md:p-1.5 text-gray-500 hover:text-primary-600 bg-white/90 rounded-full border border-gray-200/60 shadow-sm hover:bg-white hover:scale-105 transition-all"
              title="复制">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z">
                </path>
              </svg>
            </button>
            <button @click="$emit('delete', index)"
              class="p-1 md:p-1.5 text-gray-500 hover:text-red-600 bg-white/90 rounded-full border border-gray-200/60 shadow-sm hover:bg-white hover:scale-105 transition-all"
              title="删除">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">
                </path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'MessageBubble',
  props: {
    message: { type: Object, required: true },
    character: { type: Object, default: null },
    index: { type: Number, default: 0 },
    isLastMessage: { type: Boolean, default: false },
    renderMarkdownFn: { type: Function, required: true }
  },
  emits: ['edit', 'delete', 'regenerate'],
  setup(props, { emit }) {
    const editContent = ref('')
    const isCotOpen = ref(true)

    const displayName = computed(() => {
      if (props.message.name) return props.message.name
      if (props.message.role === 'user') return '我'
      return props.character?.name || 'Assistant'
    })

    const cotContent = computed(() => {
      return props.message.reasoning || ''
    })

    const mainContent = computed(() => {
      if (props.message.reasoning) {
        // If message has reasoning, the content is the main part
        return props.message.content || ''
      }
      return props.message.content || ''
    })

    const sysContent = computed(() => {
      return props.message.sys || ''
    })

    function startEdit() {
      editContent.value = props.message.content || ''
      props.message.isEditing_Message = true
    }

    function saveEdit() {
      emit('edit', props.index, editContent.value)
      props.message.isEditing_Message = false
    }

    function cancelEdit() {
      props.message.isEditing_Message = false
    }

    function copyContent() {
      navigator.clipboard.writeText(props.message.content || '').then(() => {
        // Could use a toast notification here
      }).catch(err => console.error('Copy failed:', err))
    }

    return {
      editContent,
      isCotOpen,
      displayName,
      cotContent,
      mainContent,
      sysContent,
      startEdit,
      saveEdit,
      cancelEdit,
      copyContent
    }
  }
}
</script>
