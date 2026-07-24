<template>
  <div class="chat-view-root flex flex-col h-full relative">
    <!-- Character Background Layer -->
    <div v-if="settings.useCharacterBackground && currentCharacter?.avatar"
      class="absolute -inset-4 bg-cover bg-center bg-no-repeat pointer-events-none transition-opacity duration-500 z-0 blur-[2px] char-bg-blur"
      :style="{ backgroundImage: `url(${currentCharacter?.avatar})`, opacity: 0.9 }">
    </div>

    <!-- Blur Overlay for Description Panel -->
    <transition name="fade">
      <div v-if="showDescription" @click="showDescription = false"
        class="absolute inset-0 bg-black/5 z-[35] transition-opacity duration-300">
      </div>
    </transition>

    <!-- Description Panel -->
    <transition name="dropdown">
      <DescriptionPanel
        v-if="showDescription && currentCharacter"
        :character="currentCharacter"
        :message-count="chat.length"
        :total-chars="totalContextLength"
        :render-markdown-fn="renderMarkdown"
        @close="showDescription = false"
        @edit="handleEditCharacter"
      />
    </transition>

    <!-- Chat Header -->
    <div class="absolute top-0 left-0 right-0 z-10 pointer-events-none">
      <div class="absolute top-0 left-0 right-0 h-28"
        style="background: linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.4) 20%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0.06) 80%, rgba(0,0,0,0.02) 95%, rgba(0,0,0,0) 100%); pointer-events: none;">
      </div>
      <div class="relative h-12 flex items-center justify-between px-4 pointer-events-auto">
        <div class="flex items-center min-w-0">
          <button @click="ui.toggleMobileMenu"
            class="md:hidden mr-3 text-white/80 hover:text-white transition-colors flex-shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path>
            </svg>
          </button>
          <div v-if="currentCharacter" class="flex items-center min-w-0 cursor-pointer"
            @click="showDescription = !showDescription">
            <img :src="currentCharacter?.avatar"
              class="w-9 h-9 rounded-full object-cover border border-white/20 shadow-sm flex-shrink-0">
            <span class="ml-2 font-medium text-white truncate drop-shadow-md">{{ currentCharacter.name }}</span>
            <button
              class="ml-1 p-1.5 text-white/60 hover:text-white hover:bg-white/20 rounded-full transition-all flex-shrink-0"
              :class="{'bg-white/20 text-white': showDescription}">
              <svg class="w-4 h-4 transition-transform duration-300 ease-out"
                :class="{'rotate-180': showDescription}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
          </div>
          <div v-else class="text-white/60 italic drop-shadow-sm">未选择角色卡</div>
        </div>
        <div class="flex items-center gap-0">
          <button @click="ui.toggleChatFullscreen"
            class="p-1.5 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            :title="ui.isChatFullscreen ? '退出全屏' : '全屏聊天'">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="!ui.isChatFullscreen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 4H5a1 1 0 00-1 1v3m12-4h3a1 1 0 011 1v3M4 16v3a1 1 0 001 1h3m8 0h3a1 1 0 001-1v-3">
              </path>
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 4v4a1 1 0 01-1 1H4m11-5v4a1 1 0 001 1h4M9 20v-4a1 1 0 00-1-1H4m11 5v-4a1 1 0 011-1h4">
              </path>
            </svg>
          </button>
          <button @click="handleClearChat"
            class="p-1.5 text-white/70 hover:text-red-400 rounded-full hover:bg-white/10 transition-colors"
            title="清空聊天">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">
              </path>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Chat Messages -->
    <div ref="chatContainer"
      @scroll="handleScroll"
      class="flex-1 overflow-y-auto overflow-x-hidden px-2 pt-14 md:pt-16 pb-40 md:pb-56 relative z-0 transition-all duration-500 space-y-6"
      :class="!settings.useCharacterBackground || !currentCharacter?.avatar ? 'bg-gray-50' : ''">

      <!-- Empty State: No Character -->
      <div v-if="!currentCharacter"
        class="flex flex-col items-center justify-center h-full text-gray-500">
        <div class="w-24 h-24 bg-gray-200 rounded-full mb-4 flex items-center justify-center">
          <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z">
            </path>
          </svg>
        </div>
        <p class="mb-4 font-medium">请先选择或创建一个角色卡</p>
      </div>

      <!-- Empty State: No Messages -->
      <div v-else-if="chat.length === 0"
        class="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
        <img :src="currentCharacter?.avatar" class="w-24 h-24 rounded-full mb-4 opacity-50 grayscale">
        <p>开始与 {{ currentCharacter.name }} 对话吧</p>
      </div>

      <!-- Message Bubbles -->
      <template v-for="(msg, idx) in chat" :key="msg.id || idx">
        <MessageBubble
          :message="msg"
          :character="currentCharacter"
          :index="idx"
          :is-last-message="idx === chat.length - 1"
          :render-markdown-fn="renderMarkdown"
          @edit="handleEditMessage"
          @delete="handleDeleteMessage"
          @regenerate="handleRegenerateMessage"
        />
      </template>

      <!-- Streaming / Typing Indicator -->
      <div v-if="isGenerating && !isReceiving"
        class="flex w-full justify-start">
        <div class="flex max-w-[85%] md:max-w-[70%]">
          <div class="flex-shrink-0">
            <img :src="currentCharacter?.avatar"
              class="w-9 h-9 rounded-full object-cover mr-1.5 border border-gray-200 shadow-sm">
          </div>
          <div class="flex flex-col min-w-0 items-start">
            <div class="text-[10px] font-bold text-gray-600 mb-1 select-none px-1.5 py-0.5 rounded-md bg-white/50 backdrop-blur-sm border border-white/20 w-fit shadow-sm ml-1">
              {{ currentCharacter?.name }}
            </div>
            <div class="min-w-[100px] min-h-[3rem] px-5 py-3 rounded-2xl bg-white/70 backdrop-blur-md border border-white/40 shadow-card flex items-center justify-center">
              <div class="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Input -->
    <MessageInput
      :character="currentCharacter"
      :disabled="!currentCharacter"
      :is-generating="isGenerating"
      :show-background="settings.useCharacterBackground"
      :model="settings.model"
      @send="handleSendMessage"
      @stop="handleStopGeneration"
      @toggle-background="toggleBackground"
      @update:model-value="handleModelChange"
    />
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, nextTick, toRef } from 'vue'
import { useChatStore } from '../stores/chat'
import { useCharacterStore } from '../stores/characters'
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'
import MessageBubble from '../components/chat/MessageBubble.vue'
import MessageInput from '../components/chat/MessageInput.vue'
import DescriptionPanel from '../components/chat/DescriptionPanel.vue'

// These are loaded via package.json — they'll be available as ESM imports
import { marked } from 'marked'
import DOMPurify from 'dompurify'

export default {
  name: 'ChatView',
  components: { MessageBubble, MessageInput, DescriptionPanel },
  setup() {
    const chatStore = useChatStore()
    const characters = useCharacterStore()
    const settingsStore = useSettingsStore()
    const ui = useUIStore()
    const settings = settingsStore.settings

    const chatContainer = ref(null)
    const showDescription = ref(false)

    const currentCharacter = computed(() => {
      return characters.currentCharacter
    })

    const chat_history = computed(() => {
      return chatStore.chatHistory || []
    })

    const totalContextLength = computed(() => {
      let total = 0
      for (const msg of chatStore.chatHistory || []) {
        total += (msg.content || '').length
        if (msg.reasoning) total += msg.reasoning.length
      }
      return total
    })

    // Load chat history when character changes
    watch(() => characters.currentCharacterIndex, async () => {
      const char = characters.currentCharacter
      if (char) {
        await chatStore.loadChatHistory(char.id || char.uuid)
        await nextTick()
        scrollToBottom()
      } else {
        chatStore.loadChatHistory(null)
      }
    }, { immediate: true })

    // Auto-scroll when new messages arrive
    watch(() => chatStore.chatHistory?.length, async () => {
      await nextTick()
      scrollToBottom()
    })

    watch(() => chatStore.isThinking, async () => {
      await nextTick()
      scrollToBottom()
    })

    function scrollToBottom() {
      const container = chatContainer.value
      if (!container) return
      // Check if user is near bottom already (within 200px)
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
      if (distanceFromBottom < 200) {
        container.scrollTop = container.scrollHeight
      }
    }

    function handleScroll() {
      // Could add pagination logic here
    }

    function handleSendMessage(text) {
      chatStore.userInput.value = text
      chatStore.sendMessage(currentCharacter.value, settings)
    }

    function handleStopGeneration() {
      chatStore.abortGeneration()
    }

    function handleEditMessage(index, content) {
      chatStore.editMessage(index, content)
    }

    function handleDeleteMessage(index) {
      chatStore.deleteMessage(index)
    }

    function handleRegenerateMessage(index) {
      // Remove the last assistant message and regenerate
      if (index >= 0 && index < chatStore.chatHistory.length) {
        chatStore.chatHistory.splice(index, 1)
        // Trigger regeneration using the current character and settings
        chatStore.generateResponse(currentCharacter.value, settings)
      }
    }

    function handleClearChat() {
      if (confirm('确定要清空聊天记录吗？此操作无法撤销。')) {
        chatStore.clearChat()
      }
    }

    function handleEditCharacter() {
      // Navigate to character editor — this will be implemented later
      ui.setCurrentView('characters')
    }

    function handleModelChange(value) {
      settings.model = value
      settingsStore.saveSettings()
    }

    function toggleBackground() {
      settings.useCharacterBackground = !settings.useCharacterBackground
      settingsStore.saveSettings()
    }

    // --- renderMarkdown ---
    const renderMarkdownCache = new Map()

    function renderMarkdown(text, role = 'assistant', skipRegex = false) {
      if (!text) return ''
      const cacheKey = `${role}_${skipRegex}_${text}`
      if (renderMarkdownCache.has(cacheKey)) return renderMarkdownCache.get(cacheKey)

      let html = text

      // Configure DOMPurify for compatibility
      const cleanConfig = {
        ADD_TAGS: ['details', 'summary', 'iframe', 'svg', 'path', 'g', 'circle', 'rect', 'defs', 'style', 'div', 'span', 'button', 'input'],
        ADD_ATTR: ['style', 'open', 'srcdoc', 'sandbox', 'frameborder', 'allow', 'allowfullscreen', 'class', 'id', 'viewBox', 'fill', 'stroke', 'stroke-width', 'd', 'stroke-linecap', 'stroke-linejoin', 'width', 'height', 'type', 'value', 'checked'],
        FORBID_ATTR: ['onmouseover', 'onload', 'onclick'],
        FORCE_BODY: true
      }

      try {
        html = DOMPurify.sanitize(marked.parse(text), cleanConfig)
      } catch (e) {
        console.error('Markdown render error:', e)
        html = text
      }

      renderMarkdownCache.set(cacheKey, html)
      if (renderMarkdownCache.size > 500) {
        const firstKey = renderMarkdownCache.keys().next().value
        renderMarkdownCache.delete(firstKey)
      }
      return html
    }

    onMounted(async () => {
      await nextTick()
      scrollToBottom()
    })

    // Expose individual store properties so template doesn't need to go through `chat`
    const isGenerating = toRef(chatStore, 'isGenerating')
    const isReceiving = toRef(chatStore, 'isReceiving')
    const isThinking = toRef(chatStore, 'isThinking')

    return {
      chatStore,
      chat: chat_history,
      characters,
      settings,
      settingsStore,
      ui,
      chatContainer,
      showDescription,
      currentCharacter,
      totalContextLength,
      renderMarkdown,
      handleSendMessage,
      handleStopGeneration,
      handleEditMessage,
      handleDeleteMessage,
      handleRegenerateMessage,
      handleClearChat,
      handleEditCharacter,
      handleScroll,
      toggleBackground,
      handleModelChange,
      isGenerating,
      isReceiving,
      isThinking,
      sendMessage: chatStore.sendMessage,
      abortGeneration: chatStore.abortGeneration,
      editMessage: chatStore.editMessage,
      deleteMessage: chatStore.deleteMessage,
      clearChat: chatStore.clearChat
    }
  }
}
</script>
