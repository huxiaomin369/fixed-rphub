// rphub-desktop/src/services/connectionCheck.js
// 纯函数：API/文生图连接探测
import { normalizeProviderUrl } from './apiProviders.js'

function withTimeout(signal, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs)
  if (signal) {
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  }
  return { signal: controller.signal, cancel: () => clearTimeout(timer) }
}

/**
 * GET {baseURL}/models 带 Bearer，10s 超时
 * 返回 { status: 'connected' | 'error', latency, error? }
 */
export async function checkApiConnection({ baseURL, apiKey, signal, timeoutMs = 10000 }) {
  const { signal: s, cancel } = withTimeout(signal, timeoutMs)
  const base = normalizeProviderUrl(baseURL)
  const url = base.endsWith('/v1') ? `${base}/models` : `${base}/v1/models`
  const start = Date.now()
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: s
    })
    cancel()
    if (res.ok) {
      return { status: 'connected', latency: Date.now() - start }
    }
    return { status: 'error', latency: Date.now() - start, error: `HTTP ${res.status}` }
  } catch (e) {
    cancel()
    return { status: 'error', latency: Date.now() - start, error: e.message }
  }
}

/**
 * HEAD {baseURL}/images/generations，10s 超时
 */
export async function checkImageGenConnection({ baseURL, apiKey, signal, timeoutMs = 10000 }) {
  const { signal: s, cancel } = withTimeout(signal, timeoutMs)
  const url = `${normalizeProviderUrl(baseURL)}/images/generations`
  const start = Date.now()
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
      signal: s
    })
    cancel()
    if (res.ok) {
      return { status: 'connected', latency: Date.now() - start }
    }
    return { status: 'error', latency: Date.now() - start, error: `HTTP ${res.status}` }
  } catch (e) {
    cancel()
    return { status: 'error', latency: Date.now() - start, error: e.message }
  }
}
