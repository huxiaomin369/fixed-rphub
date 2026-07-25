// rphub-desktop/scripts/test-characterGenerator.mjs
// Manual test script for characterGenerator service.
// Run with: npm run test:generator
// Mocks global.fetch to feed synthetic SSE chunks; asserts parser behavior.

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  PASS  ${name}`)
    passed++
  } catch (err) {
    console.error(`  FAIL  ${name}\n    ${err.message}`)
    failed++
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed')
}

function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'assertEq'}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`)
  }
}

// ────────────────────────────────────────────────────────────
// MOCK FETCH HELPERS
// ────────────────────────────────────────────────────────────

/**
 * Build a fake Response that yields the given SSE chunks as a ReadableStream.
 * chunks: array of strings, each is a complete SSE event block (with "data: ..." lines)
 */
function sseResponse(chunks) {
  const encoder = new TextEncoder()
  const body = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    }
  })
  return { ok: true, status: 200, body }
}

function setFetchMock(chunksOrResponder) {
  globalThis.fetch = async (url, opts) => {
    if (typeof chunksOrResponder === 'function') return chunksOrResponder(url, opts)
    return sseResponse(chunksOrResponder)
  }
}

function restoreFetch() {
  delete globalThis.fetch
}

// ────────────────────────────────────────────────────────────
// PLACEHOLDER (real tests start in Task 3)
// ────────────────────────────────────────────────────────────

test('scaffold runs', () => {
  assertEq(1 + 1, 2, 'sanity')
})

import { stripInlineThinking } from '../src/services/characterGenerator.js'

test('stripInlineThinking removes <think> blocks', () => {
  assertEq(
    stripInlineThinking('before<think>reasoning</think>after'),
    'beforeafter',
    'removes think tag'
  )
})

test('stripInlineThinking removes [THINK] blocks', () => {
  assertEq(
    stripInlineThinking('a[THINK]hidden[/THINK]b'),
    'ab',
    'removes square-bracket THINK tag'
  )
})

test('stripInlineThinking handles multiline blocks', () => {
  const input = 'visible<think>\nline 1\nline 2\n</think>visible2'
  assertEq(stripInlineThinking(input), 'visiblevisible2', 'multiline')
})

test('stripInlineThinking passes through clean text', () => {
  assertEq(stripInlineThinking('no markers here'), 'no markers here', 'passthrough')
})

import { parseSections } from '../src/services/characterGenerator.js'

test('parseSections extracts a single field', () => {
  const text = '### Name\nAlice\n### Description\nA brave knight'
  const result = parseSections(text)
  assertEq(result.name, 'Alice', 'name')
  assertEq(result.description, 'A brave knight', 'description')
})

test('parseSections returns all 9 fields when present', () => {
  const text = `
### Name
Alice

### Description
A brave knight.

### Personality
Bold, kind.

### First Message
Hello, traveler.

### Post History Instructions
Stay in character.

### Creator Notes
Created by me.

### Avatar Prompt
<image>image###prompt###anime girl, silver hair</image>

### World Info
[{"comment":"Magic","keys":["magic"],"content":"Magic is real","position":0,"order":100,"depth":4}]

### Regex Scripts
[{"name":"Format","regex":"\\*\\*(.*?)\\*\\*","replace":"<b>$1</b>","flags":"g"}]
`
  const r = parseSections(text)
  assertEq(r.name, 'Alice', 'name')
  assertEq(r.description, 'A brave knight.', 'description')
  assertEq(r.personality, 'Bold, kind.', 'personality')
  assertEq(r.first_mes, 'Hello, traveler.', 'first_mes')
  assertEq(r.post_history_instructions, 'Stay in character.', 'post_history_instructions')
  assertEq(r.creator_notes, 'Created by me.', 'creator_notes')
  assertEq(r.avatar_prompt, 'anime girl, silver hair', 'avatar_prompt')
  assert(r.world_info_json?.includes('Magic'), 'world_info_json contains Magic')
  assert(r.regex_scripts_json?.includes('Format'), 'regex_scripts_json contains Format')
})

test('parseSections is idempotent', () => {
  const text = '### Name\nAlice\n### Description\nA brave knight'
  const a = parseSections(text)
  const b = parseSections(text)
  assertEq(JSON.stringify(a), JSON.stringify(b), 'idempotent')
})

test('parseSections returns empty for no headers', () => {
  const r = parseSections('just some text without any section markers')
  assertEq(Object.keys(r).length, 0, 'no fields')
})

test('parseSections handles partial output (only Name so far)', () => {
  const r = parseSections('### Name\nAlice\n')
  assertEq(r.name, 'Alice', 'name present')
  assertEq(r.description, undefined, 'no description yet')
})

test('parseSections strips trailing section markers', () => {
  // A trailing "### " without a name should not be parsed as a field
  const r = parseSections('### Name\nAlice\n### ')
  assertEq(r.name, 'Alice', 'name still present despite trailing empty header')
})

import { parseFlexibleJsonItems, normalizeWorldInfo, normalizeRegexScript } from '../src/services/characterGenerator.js'

test('parseFlexibleJsonItems parses clean JSON array', () => {
  const r = parseFlexibleJsonItems('[{"a":1},{"a":2}]')
  assertEq(r.length, 2, 'count')
  assertEq(r[0].a, 1, 'a=1')
})

test('parseFlexibleJsonItems strips json fence', () => {
  const r = parseFlexibleJsonItems('```json\n[{"a":1}]\n```')
  assertEq(r.length, 1, 'count after fence')
})

test('parseFlexibleJsonItems returns empty on bad JSON', () => {
  const r = parseFlexibleJsonItems('not json at all')
  assertEq(r.length, 0, 'empty')
})

test('parseFlexibleJsonItems handles single object', () => {
  const r = parseFlexibleJsonItems('{"a":1}')
  assertEq(r.length, 1, 'single obj')
  assertEq(r[0].a, 1, 'a=1')
})

test('normalizeWorldInfo fills defaults', () => {
  const w = normalizeWorldInfo({ keys: ['k'], content: 'c' })
  assertEq(w.comment, '', 'default comment')
  assertEq(w.position, 0, 'default position')
  assertEq(w.order, 100, 'default order')
  assertEq(w.depth, 4, 'default depth')
  assertEq(w.probability, 100, 'default probability')
  assertEq(w.constant, false, 'default constant')
  assertEq(w.keys[0], 'k', 'keys preserved')
  assertEq(w.content, 'c', 'content preserved')
})

test('normalizeWorldInfo drops unknown fields', () => {
  const w = normalizeWorldInfo({ keys: [], content: 'c', randomExtra: 'x' })
  assertEq(w.randomExtra, undefined, 'unknown dropped')
})

test('normalizeRegexScript fills defaults', () => {
  const r = normalizeRegexScript({ name: 'n', regex: 'r', replace: 'x' })
  assertEq(r.flags, 'g', 'default flags')
  assertEq(r.placement[0], 1, 'default placement')
  assertEq(r.enabled, true, 'default enabled')
  assertEq(r.markdownOnly, false, 'default markdownOnly')
  assertEq(r.promptOnly, false, 'default promptOnly')
  assertEq(r.depth, 4, 'default depth')
})

import { parseDiffBlocks } from '../src/services/characterGenerator.js'

test('parseDiffBlocks extracts a single block', () => {
  const text = `<<<<<<<FIND
###path###personality
old content
=======
new content
>>>>>>>REPLACE`
  const r = parseDiffBlocks(text)
  assertEq(r.length, 1, 'count')
  assertEq(r[0].field, 'personality', 'field')
  assertEq(r[0].find, 'old content', 'find')
  assertEq(r[0].replace, 'new content', 'replace')
})

test('parseDiffBlocks extracts multiple blocks', () => {
  const text = `<<<<<<<FIND
###path###personality
old1
=======
new1
>>>>>>>REPLACE
<<<<<<<FIND
###path###first_mes
old2
=======
new2
>>>>>>>REPLACE`
  const r = parseDiffBlocks(text)
  assertEq(r.length, 2, 'count')
  assertEq(r[0].field, 'personality', 'first field')
  assertEq(r[1].field, 'first_mes', 'second field')
})

test('parseDiffBlocks handles multiline content', () => {
  const text = `<<<<<<<FIND
###path###description
line 1
line 2
=======
line A
line B
line C
>>>>>>>REPLACE`
  const r = parseDiffBlocks(text)
  assertEq(r[0].find, 'line 1\nline 2', 'multiline find')
  assertEq(r[0].replace, 'line A\nline B\nline C', 'multiline replace')
})

test('parseDiffBlocks returns empty for no blocks', () => {
  const r = parseDiffBlocks('just some plain text')
  assertEq(r.length, 0, 'empty')
})

test('parseDiffBlocks ignores malformed blocks', () => {
  // Missing the closing marker
  const text = `<<<<<<<FIND
###path###name
old
=======
new` // no >>>>>>>REPLACE
  const r = parseDiffBlocks(text)
  assertEq(r.length, 0, 'malformed ignored')
})

import { runNewGeneration } from '../src/services/characterGenerator.js'

test('runNewGeneration streams and fills all primary fields', async () => {
  const chunks = [
    'data: {"choices":[{"delta":{"content":"### Name\\nAlice\\n### Description\\nA brave knight\\n### Personality\\nBold\\n### First Message\\nHello"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":", traveler."}}]}\n\n',
    'data: [DONE]\n\n'
  ]
  setFetchMock(sseResponse(chunks))

  const sections = {}
  const events = []
  await runNewGeneration({
    prompt: 'a knight',
    baseURL: 'https://api.example.com/v1',
    apiKey: 'test-key',
    model: 'test-model',
    stream: true,
    onProgress: (e) => events.push({ kind: 'progress', ...e }),
    onSection: (e) => { sections[e.field] = e.value },
    onDone: (e) => events.push({ kind: 'done', ...e }),
    onError: (e) => events.push({ kind: 'error', error: e.message })
  })

  assertEq(sections.name, 'Alice', 'name')
  assertEq(sections.description, 'A brave knight', 'description')
  assertEq(sections.personality, 'Bold', 'personality')
  assertEq(sections.first_mes, 'Hello, traveler.', 'first_mes')
  assert(events.some(e => e.kind === 'done'), 'onDone fired')
  restoreFetch()
})

test('runNewGeneration onError fires on fetch failure', async () => {
  setFetchMock(async () => ({ ok: false, status: 401, text: async () => 'unauthorized' }))
  let err = null
  await runNewGeneration({
    prompt: 'p', baseURL: 'x', apiKey: 'k', model: 'm',
    onError: (e) => { err = e }
  })
  assert(err !== null, 'error fired')
  assert(err.message.includes('401'), 'error has status')
  restoreFetch()
})

test('runNewGeneration respects AbortSignal', async () => {
  const ac = new AbortController()
  setFetchMock(sseResponse(['data: {"choices":[{"delta":{"content":"### Name\\nAlice"}}]}\n\n']))
  let err = null
  // Abort before run
  ac.abort()
  await runNewGeneration({
    prompt: 'p', baseURL: 'x', apiKey: 'k', model: 'm', signal: ac.signal,
    onError: (e) => { err = e }
  })
  // AbortError should be silent (not surfaced as onError)
  assertEq(err, null, 'abort is silent')
  restoreFetch()
})

import { runDiffGeneration } from '../src/services/characterGenerator.js'

test('runDiffGeneration parses diff blocks from stream', async () => {
  const chunks = [
    'data: {"choices":[{"delta":{"content":"<<<<<<<FIND\\n###path###personality\\nold\\n"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"=======\\nnew\\n>>>>>>>REPLACE"}}]}\n\n',
    'data: [DONE]\n\n'
  ]
  setFetchMock(sseResponse(chunks))

  const diffs = []
  let done = null
  await runDiffGeneration({
    character: { name: 'A', description: 'B', personality: 'old' },
    userPrompt: 'make it cooler',
    baseURL: 'https://api.example.com/v1', apiKey: 'k', model: 'm',
    onSection: (e) => diffs.push(e),
    onDone: (e) => { done = e }
  })

  assertEq(diffs.length, 1, 'one diff block')
  assertEq(diffs[0].field, 'personality', 'field')
  assertEq(diffs[0].find, 'old', 'find')
  assertEq(diffs[0].replace, 'new', 'replace')
  assert(done !== null, 'onDone fired')
  restoreFetch()
})

// ────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
