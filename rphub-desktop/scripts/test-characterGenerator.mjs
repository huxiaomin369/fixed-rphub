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

// ────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
