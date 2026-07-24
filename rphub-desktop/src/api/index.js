/**
 * API call wrapper — direct fetch() to OpenAI-compatible endpoints.
 * No CORS issues because Electron runs with webSecurity: false.
 */
export async function apiRequest({ baseURL, apiKey, model, messages, stream = false, signal, ...opts }) {
  // Destructure known API params from opts; only unknown extras leak into the body
  const { temperature = 0.7, max_tokens = 2048, ...extraOpts } = opts
  const url = `${baseURL.replace(/\/+$/, '')}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    signal,
    body: JSON.stringify({
      model,
      messages,
      stream,
      temperature,
      max_tokens,
      ...extraOpts
    })
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`API ${res.status}: ${err}`)
  }

  return stream ? res.body.getReader() : res.json()
}
