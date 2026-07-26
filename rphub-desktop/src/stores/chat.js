import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import localforage from 'localforage'
import { apiRequest } from '../api'
import { useSettingsStore } from './settings'
import { buildUserInfoPrompt } from '../services/userProfile'
import { usePresetsStore } from './presets'
import { useWorldInfoStore } from './worldinfo'
import { useRegexStore } from './regex'
import { useCharacterStore } from './characters'
import { formatPresetsForSystemPrompt, buildPreludeMessages, getBreakLimitContent } from '../services/presetInjector'
import { scanWorldInfo } from '../services/worldInfoScanner'
import { applyRegexScripts } from '../services/regexEngine'
import { resolveScopedEntries } from '../services/scopeResolver'

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

    // Hoisted to function scope so finally block can reference it
    let assistantMsg
    let wasAborted = false

    try {
      const baseURL = settings.apiUrl.replace(/\/+$/, '')

      // Create assistant message placeholder
      assistantMsg = reactiveMessage({
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
        wasAborted = true
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
      saveChatHistory()
      // 触发文生图（不阻塞 UI）— 仅当用户未取消生成时才执行
      if (!wasAborted && assistantMsg) {
        try {
          const { useImageGenTrigger } = await import('../composables/useImageGenTrigger.js')
          const trigger = useImageGenTrigger()
          await trigger.processMessageImages(assistantMsg, settings, undefined)
          saveChatHistory()
        } catch (e) {
          console.warn('ImageGen trigger failed:', e)
        }
      }
      abortController.value = null
    }
  }

  function buildApiMessages(character, settings) {
    const presetsStore = usePresetsStore()
    const worldInfoStore = useWorldInfoStore()
    const regexStore = useRegexStore()
    const charactersStore = useCharacterStore()

    // Resolve scoped entries for all 3 features
    const allPresets = resolveScopedEntries({
      global: presetsStore.presets.filter(p => p.scope === 'global'),
      character: presetsStore.presets.filter(p => p.scope === 'character'),
    })
    const allWorldInfo = resolveScopedEntries({
      global: worldInfoStore.globalWorldInfo,
      character: worldInfoStore.worldInfo.filter(e => e.scope === 'character'),
    })
    const allRegex = resolveScopedEntries({
      global: regexStore.globalRegexScripts,
      character: regexStore.regexScripts.filter(s => s.scope === 'character'),
    })

    // World info scan over recent messages
    const scanResult = scanWorldInfo({
      messages: chatHistory.value,
      worldInfo: allWorldInfo,
      settings: worldInfoStore.worldInfoSettings,
    })

    // Build system prompt parts in order
    const systemParts = []

    // 1. 破限 lead
    const breakLimit = getBreakLimitContent(allPresets)
    if (breakLimit) systemParts.push(breakLimit)

    // 2. System Presets block (everything except 破限)
    const presetBlock = formatPresetsForSystemPrompt(allPresets)
    if (presetBlock) systemParts.push(presetBlock)

    // 3. World info global_note entries
    if (scanResult.systemNoteEntries.length > 0) {
      systemParts.push(
        '【世界书 / 全局知识】\n' +
        scanResult.systemNoteEntries.map(e => e.content).join('\n\n')
      )
    }

    // 4. User's custom systemPrompt
    if (settings.systemPrompt) systemParts.push(settings.systemPrompt)

    // 5. Character card
    systemParts.push(`Name: ${character.name}`)
    if (character.personality) systemParts.push(`Personality: ${character.personality}`)
    if (character.description) systemParts.push(`Description: ${character.description}`)
    if (character.mes_example) systemParts.push(`Example conversations:\n${character.mes_example}`)

    // 6. User Info (existing)
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

    // 7. Prelude preset messages (after system, before greeting)
    const prelude = buildPreludeMessages(allPresets)
    for (const m of prelude) {
      messages.push({ role: m.role, content: m.content })
    }

    // 8. If first message and character has first_mes, add greeting
    if (chatHistory.value.length === 0 && character.first_mes) {
      messages.push({
        role: 'assistant',
        name: character.name,
        content: character.first_mes
      })
    }

    // 9. Add chat history with regex transform on outgoing content
    for (let i = 0; i < chatHistory.value.length; i++) {
      const msg = chatHistory.value[i]
      const depth = chatHistory.value.length - i
      let content = msg.content
      if (typeof content === 'string') {
        content = applyRegexScripts({
          text: content,
          scripts: allRegex,
          options: { applyTo: 'prompt', depth },
        })
      }
      // For at_depth WI: insert a system note before this message
      const depthEntries = scanResult.depthEntries.get(depth)
      if (depthEntries && depthEntries.length > 0) {
        const wiText = depthEntries.map(e => e.content).join('\n\n')
        messages.push({ role: 'system', content: `【世界书 / 上下文注入】\n${wiText}` })
      }
      messages.push({
        role: msg.role,
        name: msg.name || (msg.role === 'user' ? '我' : character.name),
        content
      })
    }

    // 10. After-character WI: insert at end (rarely used; can be improved)
    if (scanResult.afterCharEntries.length > 0) {
      messages.push({
        role: 'system',
        content: '【世界书 / 角色后置】\n' + scanResult.afterCharEntries.map(e => e.content).join('\n\n'),
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
