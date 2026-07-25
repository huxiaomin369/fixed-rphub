// rphub-desktop/src/composables/useGenerator.js
import { ref } from 'vue'
import {
  runNewGeneration,
  parseFlexibleJsonItems,
  normalizeWorldInfo,
  normalizeRegexScript
} from '../services/characterGenerator.js'
import { useSettingsStore } from '../stores/settings'

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
      error.value = new Error('请先在设置中配置 API Key 和模型')
      status.value = '未配置 API'
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
          error.value = err
          status.value = '生成失败'
        }
      })
    } finally {
      isGenerating.value = false
      abortController.value = null
    }
  }

  return { isGenerating, status, progress, error, sections, generate, stop, reset }
}
