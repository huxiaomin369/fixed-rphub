// rphub-desktop/src/services/apiProviders.js
// 纯函数模块：API/文生图 provider 预设表 + 解析 helpers
// 与网页版 assets/js/app.js:103-170 / 626-770 对齐

export const API_PROVIDERS = [
  { id: 'agnes', name: 'Agnes', apiUrl: 'https://apihub.agnes-ai.com/v1', icon: 'https://agnes-ai.com/images/logo-icon.png' },
  { id: 'sta1n', name: 'STA1N API', apiUrl: 'https://cdn.sta1n.cn/v1', icon: 'https://img.cdn1.vip/i/69c18cc07538b_1774292160.webp' },
  { id: 'deepseek', name: 'DeepSeek', apiUrl: 'https://api.deepseek.com/v1', icon: 'https://www.deepseek.com/favicon.ico' },
  { id: 'openrouter', name: 'OpenRouter', apiUrl: 'https://openrouter.ai/api/v1', icon: 'https://openrouter.ai/favicon.ico' },
  { id: 'siliconflow', name: 'SiliconFlow', apiUrl: 'https://api.siliconflow.cn/v1', icon: 'https://siliconflow.cn/favicon.ico' },
  { id: 'opencode', name: 'OpenCode', apiUrl: 'https://rphub.aieasy.cc.cd/opencode/zen/v1', icon: 'https://opencode.ai/favicon-v3.ico' },
  { id: 'sensenova', name: 'SenseNova', apiUrl: 'https://rphub.aieasy.cc.cd/sensenova/v1', icon: 'https://largemodel.sensetime.com/skin/images/bannericon.svg' },
  { id: 'mimo', name: 'mimo', apiUrl: 'https://rphub.aieasy.cc.cd/mimo/v1', icon: '' }
]

export const IMAGE_GEN_PROVIDERS = [
  { id: 'agnes', name: 'Agnes', apiUrl: 'https://apihub.agnes-ai.com/v1', icon: 'https://agnes-ai.com/images/logo-icon.png', defaultModel: 'agnes-image-2.1-flash' },
  { id: 'sensenova', name: 'SenseNova', apiUrl: 'https://rphub.aieasy.cc.cd/sensenova/v1', icon: 'https://largemodel.sensetime.com/skin/images/bannericon.svg', defaultModel: 'sensenova-u1-fast', fixedSize: '1760x2368' }
]

export const CUSTOM_PROVIDER_SLOTS = [
  { id: 'custom', name: '自定义' },
  { id: 'custom2', name: '自定义2' }
]

export const CUSTOM_IMAGE_GEN_SLOTS = CUSTOM_PROVIDER_SLOTS

export function getApiProviderById(id) {
  return API_PROVIDERS.find(p => p.id === id) || null
}

export function getImageGenProviderById(id) {
  return IMAGE_GEN_PROVIDERS.find(p => p.id === id) || null
}

export function isCustomApiProviderId(id) {
  return CUSTOM_PROVIDER_SLOTS.some(p => p.id === id)
}

export function isCustomImageGenProviderId(id) {
  return CUSTOM_IMAGE_GEN_SLOTS.some(p => p.id === id)
}

export function getCustomApiUrlKey(id) {
  return id === 'custom2' ? 'customApiUrl2' : 'customApiUrl'
}

export function getCustomImageGenUrlKey(id) {
  return id === 'custom2' ? 'customImageGenUrl2' : 'customImageGenUrl'
}

export function normalizeProviderUrl(url) {
  return String(url || '').replace(/\/+$/, '').toLowerCase()
}

/**
 * 从 settings 解析当前激活的 API provider。
 * - 如果 apiProviderId 命中内置：返回内置（apiUrl = provider.apiUrl）
 * - 如果 apiProviderId 命中 custom/custom2：apiUrl 从 settings[getCustomApiUrlKey(id)] 读
 * - key 始终从 settings.apiProviderKeys[id] 读
 */
export function resolveActiveApiProvider(settings) {
  const id = settings.apiProviderId || 'agnes'
  const key = (settings.apiProviderKeys && settings.apiProviderKeys[id]) || settings.apiKey || ''
  const builtin = getApiProviderById(id)
  if (builtin) {
    return { id, name: builtin.name, apiUrl: builtin.apiUrl, apiKey: key, isCustom: false, provider: builtin }
  }
  if (isCustomApiProviderId(id)) {
    return {
      id, name: id === 'custom2' ? '自定义2' : '自定义',
      apiUrl: settings[getCustomApiUrlKey(id)] || '',
      apiKey: key,
      isCustom: true
    }
  }
  // 未知 id：回退 agnes
  return resolveActiveApiProvider({ ...settings, apiProviderId: 'agnes' })
}

/** 与 resolveActiveApiProvider 对称，但返回文生图 provider 字段（含 defaultModel） */
export function resolveActiveImageGenProvider(settings) {
  const id = settings.imageGenProviderId || 'agnes'
  const key = (settings.imageGenProviderKeys && settings.imageGenProviderKeys[id]) || settings.imageGenKey || ''
  const model = (settings.imageGenProviderModels && settings.imageGenProviderModels[id]) || ''
  const builtin = getImageGenProviderById(id)
  if (builtin) {
    return { id, name: builtin.name, apiUrl: builtin.apiUrl, apiKey: key, model, fixedSize: builtin.fixedSize || null, isCustom: false, provider: builtin }
  }
  if (isCustomImageGenProviderId(id)) {
    return {
      id, name: id === 'custom2' ? '自定义2' : '自定义',
      apiUrl: settings[getCustomImageGenUrlKey(id)] || '',
      apiKey: key, model,
      isCustom: true
    }
  }
  return resolveActiveImageGenProvider({ ...settings, imageGenProviderId: 'agnes' })
}
