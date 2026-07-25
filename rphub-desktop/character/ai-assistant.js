// rphub-desktop/character/ai-assistant.js
// Workshop-local AI assistant. Self-contained, no Vue/Pinia dependency.
// Provides: parseDiffBlocks, runDiffGeneration, applyDiff, plus the diff system prompt.

const DIFF_SYSTEM_PROMPT = `你是角色卡编辑助手. 你的任务是按用户的要求修改角色卡.

输出格式严格如下, 每个改动一个 FIND/REPLACE 块:

<<<<<<<FIND
###path###<字段名>
<字段当前完整内容>
=======
<新内容>
>>>>>>>REPLACE

字段名只能是以下之一: name, description, personality, first_mes, creator_notes.

如果用户没要求改某个字段, 就不要输出该字段的块.

严格按格式输出, 不要加任何额外解释或开场白.`

const DIFF_FIELD_LABELS = {
  name: '角色名称',
  description: '角色描述',
  personality: '设定',
  first_mes: '开场白',
  creator_notes: '作者注释'
}

export function parseDiffBlocks(text) {
  if (!text) return []
  const re = /<<<<<<<FIND\s*\n###path###([a-z_]+)\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>>REPLACE/g
  const out = []
  let m
  while ((m = re.exec(text)) !== null) {
    out.push({ field: m[1], find: m[2], replace: m[3] })
  }
  return out
}

export function fieldLabel(field) {
  return DIFF_FIELD_LABELS[field] || field
}

async function* streamSse(reader, signal) {
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    if (signal?.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' })
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') return
      try {
        const json = JSON.parse(payload)
        const delta = json.choices?.[0]?.delta?.content
        if (delta) yield delta
      } catch { /* ignore */ }
    }
  }
}

export async function runDiffGeneration({
  character, userPrompt, baseURL, apiKey, model, signal,
  onProgress = () => {}, onBlock = () => {}, onDone = () => {}, onError = () => {}
}) {
  const ctx = ['【当前角色卡】']
  for (const field of Object.keys(DIFF_FIELD_LABELS)) {
    if (character[field]) ctx.push(`${field}: ${character[field]}`)
  }
  const userContent = `${ctx.join('\n')}\n\n【用户的修改要求】\n${userPrompt}\n\n请输出 FIND/REPLACE 块:`

  const messages = [
    { role: 'system', content: DIFF_SYSTEM_PROMPT },
    { role: 'user', content: userContent }
  ]

  const url = `${baseURL.replace(/\/+$/, '')}/chat/completions`
  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      signal,
      body: JSON.stringify({ model, messages, stream: true, temperature: 0.7 })
    })
  } catch (err) { onError(err); return }
  if (!response.ok) {
    onError(new Error(`API ${response.status}: ${await response.text().catch(() => response.statusText)}`))
    return
  }

  onProgress({ status: '正在等待API响应...', percent: 10 })

  let visibleText = ''
  const seen = new Set()
  try {
    const reader = response.body.getReader()
    for await (const delta of streamSse(reader, signal)) {
      visibleText += delta
      const blocks = parseDiffBlocks(visibleText)
      for (const b of blocks) {
        const key = `${b.field}::${b.find}`
        if (seen.has(key)) continue
        seen.add(key)
        onBlock(b)
        onProgress({ status: `正在修改: ${fieldLabel(b.field)}`, percent: 50 })
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') return
    onError(err)
    return
  }
  const diffs = parseDiffBlocks(visibleText)
  onDone({ diffs })
}

/**
 * Apply a parsed diff block to a character object (mutates in place).
 * Returns true if the field existed and was updated, false otherwise.
 */
export function applyDiff(character, diff) {
  if (character[diff.field] === undefined) return false
  character[diff.field] = diff.replace
  return true
}
