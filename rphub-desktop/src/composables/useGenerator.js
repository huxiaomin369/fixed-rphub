// rphub-desktop/src/composables/useGenerator.js
import { ref } from 'vue'
import {
  runNewGeneration,
  parseFlexibleJsonItems,
  normalizeWorldInfo,
  normalizeRegexScript
} from '../services/characterGenerator.js'
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'

/**
 * Translate raw API/HTTP errors into user-friendly messages.
 * The upstream runNewGeneration embeds the status code in the error message
 * (e.g. "API 401: unauthorized"), so we sniff it here.
 */
function friendlyApiError(err) {
  const msg = err?.message || ''
  if (msg.includes('401') || msg.includes('403')) return 'API Key 无效, 请到设置中检查'
  if (msg.includes('404')) return '模型不存在, 请到设置中检查模型名称'
  if (msg.includes('429')) return '请求过于频繁, 请稍后重试'
  if (msg.includes('500') || msg.includes('502') || msg.includes('503')) return '服务暂时不可用, 请稍后重试'
  return '生成失败: ' + msg
}

/**
 * Vue composable that wraps runNewGeneration with reactive state.
 * Returns: { isGenerating, status, progress, error, sections, generate, stop, reset }
 *
 * sections.value shape:
 *   { name, description, personality, first_mes, post_history_instructions,
 *     creator_notes, avatar_prompt,
 *     worldInfo: WorldInfoEntry[], regexScripts: RegexScriptEntry[] }
 */
export function useGenerator() {
  const settingsStore = useSettingsStore()
  const ui = useUIStore()
  const settings = settingsStore.settings

  const isGenerating = ref(false)
  const status = ref('')
  const progress = ref(0)
  const error = ref(null)
  const sections = ref({})
  const abortController = ref(null)

  function reset() {
    sections.value = {}
    error.value = null
    progress.value = 0
    status.value = ''
  }

  function stop() {
    abortController.value?.abort()
  }

  async function generate(prompt) {
    if (!settings.apiKey) {
      const friendly = '请先在设置中配置 API Key 和模型'
      error.value = new Error(friendly)
      status.value = '未配置 API'
      ui.addToast(friendly, 'error')
      return
    }
    reset()
    isGenerating.value = true
    status.value = '准备中...'
    progress.value = 5
    abortController.value = new AbortController()
    try {
      await runNewGeneration({
        prompt,
        baseURL: settings.apiUrl,
        apiKey: settings.apiKey,
        model: settings.model,
        stream: settings.stream !== false,
        temperature: settings.temperature,
        signal: abortController.value.signal,
        onProgress: ({ status: s, percent }) => {
          status.value = s
          progress.value = percent
        },
        onSection: ({ field, value }) => {
          if (field === 'world_info_json') {
            sections.value.worldInfo = parseFlexibleJsonItems(value).map(normalizeWorldInfo)
          } else if (field === 'regex_scripts_json') {
            sections.value.regexScripts = parseFlexibleJsonItems(value).map(normalizeRegexScript)
          } else {
            sections.value[field] = value
          }
        },
        onDone: () => {
          status.value = '生成完成'
          progress.value = 100
        },
        onError: (err) => {
          const friendly = friendlyApiError(err)
          error.value = new Error(friendly)
          status.value = '生成失败'
          ui.addToast(friendly, 'error')
        }
      })
    } finally {
      isGenerating.value = false
      abortController.value = null
    }
  }

  return { isGenerating, status, progress, error, sections, generate, stop, reset }
}
