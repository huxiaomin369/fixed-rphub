// rphub-desktop/src/composables/useImageGenTrigger.js
// 解析 AI 回复中的 <auto_image_gen>...</auto_image_gen> 标签并触发文生图
import { useSettingsStore } from '../stores/settings'
import { useUIStore } from '../stores/ui'
import { generateImages, sizeToDims, styleToArtists } from '../services/imageGen'
import { resolveActiveImageGenProvider } from '../services/apiProviders'

/**
 * 检测 message.content 是否包含 <auto_image_gen>...</auto_image_gen>
 * 容器内是若干个 @image@...@imageEnd@ 提示词块
 */
function parseAutoImageGen(content) {
  if (!content || !content.includes('<auto_image_gen>')) return null
  const match = content.match(/<auto_image_gen>([\s\S]*?)<\/auto_image_gen>/i)
  if (!match) return null
  const inner = match[1]
  const prompts = []
  const re = /@image@([\s\S]*?)@imageEnd@/g
  let m
  while ((m = re.exec(inner)) !== null) {
    prompts.push(m[1].trim())
  }
  if (!prompts.length) {
    // 容器内没有 @image@ 块：把整段 inner 当作一张图
    prompts.push(inner.trim())
  }
  return { raw: match[0], prompts }
}

export function useImageGenTrigger() {
  const settingsStore = useSettingsStore()
  const ui = useUIStore()

  /**
   * 处理一条消息：检测 <auto_image_gen>，调用 imageGen，把结果写入 message.images
   * @param {object} message - chat message，必须有 .images 字段
   * @param {object} settings - 传入 chat 时的 settings 快照
   * @param {AbortSignal} [signal]
   */
  async function processMessageImages(message, settings, signal) {
    if (!message || !message.content) return
    const parsed = parseAutoImageGen(message.content)
    if (!parsed) return

    const s = settings || settingsStore.settings
    const provider = resolveActiveImageGenProvider(s)
    if (!provider.apiKey) {
      ui.addToast('文生图 API Key 未配置', 'error')
      return
    }
    const n = Math.min(parsed.prompts.length, Math.max(1, Number(s.imageGenCount) || 1))
    const dims = provider.fixedSize || sizeToDims(s.imageSize)
    const artists = styleToArtists(s.imageStyle || 'vertical', s.customImageArtists || '')

    message.images = message.images || []
    message.imageStatus = 'generating'

    try {
      // 串行生成：避免一次性打爆 API
      for (let i = 0; i < n; i++) {
        const prompt = parsed.prompts[i] || parsed.prompts[0]
        const finalPrompt = artists ? `${artists}, ${prompt}` : prompt
        const list = await generateImages({
          baseURL: provider.apiUrl,
          apiKey: provider.apiKey,
          model: provider.model || s.imageGenModel,
          prompt: finalPrompt,
          size: dims,
          n: 1,
          signal
        })
        if (list?.[0]) {
          message.images.push({ url: list[0].url, prompt: finalPrompt, style: s.imageStyle })
        }
      }
      message.imageStatus = 'done'
    } catch (e) {
      message.imageStatus = 'error'
      ui.addToast(`生图失败: ${e.message}`, 'error')
    }
  }

  return { processMessageImages, parseAutoImageGen }
}
