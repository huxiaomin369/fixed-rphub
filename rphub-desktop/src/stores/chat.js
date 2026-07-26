import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import localforage from 'localforage'
import { apiRequest } from '../api'
import { useSettingsStore } from './settings'
import { buildUserInfoPrompt } from '../services/userProfile'

export const useChatStore = defineStore('chat', () => {
  const chatHistory = ref([])
  const isThinking = ref(false)
  const isGenerating = ref(false)
  const isReceiving = ref(false)
  const abortController = ref(null)
  const userInput = ref('')
  const streamingMessage = ref('')
  const currentCharacterId = ref(null)

  const visibleMessages = computed(() => {
    return chatHistory.value.filter(msg => msg && msg.role)
  })

  const lastMessage = computed(() => {
    const history = chatHistory.value
    return history.length > 0 ? history[history.length - 1] : null
  })

  async function loadChatHistory(characterId) {
    currentCharacterId.value = characterId
    if (!characterId) {
      chatHistory.value = []
      return
    }
    try {
      const data = await localforage.getItem(`chat_${characterId}`)
      chatHistory.value = data || []
    } catch (err) {
      console.error('Failed to load chat history:', err)
      chatHistory.value = []
    }
  }

  async function saveChatHistory(characterId) {
    const id = characterId || currentCharacterId.value
    if (!id) return
    try {
      await localforage.setItem(`chat_${id}`, chatHistory.value)
    } catch (err) {
      console.error('Failed to save chat history:', err)
    }
  }

  function sendMessage(character, settings) {
    const content = userInput.value.trim()
    if (!content || !character) return

    const userMsg = {
      id: generateId(),
      role: 'user',
      name: '我',
      content,
      isSelf: true,
      timestamp: Date.now(),
      images: []
    }
    chatHistory.value.push(userMsg)
    userInput.value = ''

    // Save user message immediately
    saveChatHistory()

    // Start generating response
    generateResponse(character, settings)
  }

  async function generateResponse(character, settings) {
    if (!character || isGenerating.value) return
    if (!settings.apiUrl || !settings.apiKey || !settings.model) {
      console.error('API not configured')
      return
    }

    isGenerating.value = true
    isThinking.value = false
    isReceiving.value = false
    abortController.value = new AbortController()

    // Build messages array for API
    const messages = buildApiMessages(character, settings)

    try {
      const baseURL = settings.apiUrl.replace(/\/+$/, '')

      // Create assistant message placeholder
      const assistantMsg = reactiveMessage({
        role: 'assistant',
        name: character.name,
        content: '',
        id: generateId(),
        shouldAnimate: true
      })
      chatHistory.value.push(assistantMsg)
      isReceiving.value = true

      // Non-streaming request
      if (!settings.stream) {
        const data = await apiRequest({
          baseURL,
          apiKey: settings.apiKey,
          model: settings.model,
          messages,
          stream: false,
          temperature: settings.temperature,
          signal: abortController.value.signal
        })

        const content = data.choices?.[0]?.message?.content || ''
        assistantMsg.content = content
        isGenerating.value = false
        isReceiving.value = false
        saveChatHistory()
        return
      }

      // Streaming request
      const reader = await apiRequest({
        baseURL,
        apiKey: settings.apiKey,
        model: settings.model,
        messages,
        stream: true,
        temperature: settings.temperature,
        signal: abortController.value.signal
      })

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6)
            if (dataStr === '[DONE]') continue

            try {
              const data = JSON.parse(dataStr)
              const choice = data.choices?.[0]
              if (!choice) continue

              const delta = choice.delta || choice.message || {}
              const content = delta.content || ''
              const reasoning = delta.reasoning || choice.delta?.reasoning || ''

              if (content) {
                assistantMsg.content += content
                isThinking.value = false
              }
              if (reasoning) {
                assistantMsg.reasoning = (assistantMsg.reasoning || '') + reasoning
                isThinking.value = true
              }
            } catch (e) {
              console.warn('Error parsing SSE chunk:', e)
            }
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Generation cancelled')
      } else {
        console.error('Generation error:', err)
        // Add error message to chat
        const lastMsg = chatHistory.value[chatHistory.value.length - 1]
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.content += `\n\n**Error:** ${err.message}`
        }
      }
    } finally {
      isGenerating.value = false
      isThinking.value = false
      isReceiving.value = false
      abortController.value = null
      saveChatHistory()
      // 触发文生图（不阻塞 UI）
      try {
        const { useImageGenTrigger } = await import('../composables/useImageGenTrigger.js')
        const trigger = useImageGenTrigger()
        await trigger.processMessageImages(assistantMsg, settings)
        saveChatHistory()
      } catch (e) {
        console.warn('ImageGen trigger failed:', e)
      }
    }
  }

  function buildApiMessages(character, settings) {
    const systemParts = [
      `Name: ${character.name}`,
      character.personality ? `Personality: ${character.personality}` : '',
      character.description ? `Description: ${character.description}` : '',
      character.mes_example ? `Example conversations:\n${character.mes_example}` : '',
      settings.systemPrompt || ''
    ].filter(Boolean)

    // 注入当前用户人设
    try {
      const settingsStore = useSettingsStore()
      const activeId = settingsStore.settings.activeProfileId
      const profile = settingsStore.settings.userProfiles.find(p => p.uuid === activeId)
      if (profile && (profile.name || profile.description)) {
        systemParts.push(buildUserInfoPrompt(profile))
      }
    } catch (e) {
      // store 不可用时静默
    }

    const systemContent = systemParts.join('\n\n')
    const messages = [{ role: 'system', content: systemContent }]

    // If first message is not in history and character has first_mes, add it
    if (chatHistory.value.length === 0 && character.first_mes) {
      messages.push({
        role: 'assistant',
        name: character.name,
        content: character.first_mes
      })
    }

    // Add chat history
    for (const msg of chatHistory.value) {
      messages.push({
        role: msg.role,
        name: msg.name || (msg.role === 'user' ? '我' : character.name),
        content: msg.content
      })
    }

    return messages
  }

  function editMessage(index, content) {
    if (index >= 0 && index < chatHistory.value.length) {
      chatHistory.value[index] = {
        ...chatHistory.value[index],
        content,
        edited: true,
        editedAt: Date.now()
      }
      // Trim future messages if editing a past message
      chatHistory.value = chatHistory.value.slice(0, index + 1)
      saveChatHistory()
    }
  }

  function deleteMessage(index) {
    if (index >= 0 && index < chatHistory.value.length) {
      chatHistory.value.splice(index, 1)
      saveChatHistory()
    }
  }

  function clearChat() {
    chatHistory.value = []
    streamingMessage.value = ''
    isThinking.value = false
    isGenerating.value = false
    isReceiving.value = false
    abortController.value = null
    saveChatHistory()
  }

  function abortGeneration() {
    if (abortController.value) {
      abortController.value.abort()
      abortController.value = null
    }
    isGenerating.value = false
    isThinking.value = false
    isReceiving.value = false
    // Remove empty assistant message if generation was cancelled
    const last = chatHistory.value[chatHistory.value.length - 1]
    if (last && last.role === 'assistant' && !last.content && !last.reasoning) {
      chatHistory.value.pop()
    }
  }

  function generateId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9)
  }

  function reactiveMessage(msg) {
    // Simply return the message object; Vue's reactivity handles it
    return msg
  }

  return {
    chatHistory,
    isThinking,
    isGenerating,
    isReceiving,
    abortController,
    userInput,
    streamingMessage,
    visibleMessages,
    lastMessage,
    currentCharacterId,
    loadChatHistory,
    saveChatHistory,
    sendMessage,
    editMessage,
    deleteMessage,
    clearChat,
    abortGeneration
  }
})
