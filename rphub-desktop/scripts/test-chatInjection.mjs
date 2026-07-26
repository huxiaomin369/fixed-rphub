// rphub-desktop/scripts/test-chatInjection.mjs
// Automated test for user info injection in chat system prompt.
// Verifies chat.js imports, injection pattern, and userProfile service.
// Run with: npm run test:chat (or node scripts/test-chatInjection.mjs)

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const chatJsPath = path.resolve(__dirname, '../src/stores/chat.js')
const userProfilePath = path.resolve(__dirname, '../src/services/userProfile.js')

let passed = 0, failed = 0
const testPromises = []

function test(name, fn) {
  testPromises.push((async () => {
    try {
      await fn()
      console.log(`  PASS  ${name}`)
      passed++
    } catch (err) {
      console.error(`  FAIL  ${name}\n    ${err.message}`)
      failed++
    }
  })())
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed')
}

function assertContains(haystack, needle, msg) {
  if (!haystack.includes(needle)) {
    throw new Error(`${msg || 'assertContains'}\n      expected to contain: ${JSON.stringify(needle)}`)
  }
}

const chatJs = fs.readFileSync(chatJsPath, 'utf8')
const userProfileSource = fs.readFileSync(userProfilePath, 'utf8')

// ─── chat.js import checks ──────────────────────────────

test('chat.js imports useSettingsStore', () => {
  assertContains(chatJs, "import { useSettingsStore }", 'should import useSettingsStore')
})

test('chat.js imports buildUserInfoPrompt', () => {
  assertContains(chatJs, "import { buildUserInfoPrompt }", 'should import buildUserInfoPrompt')
})

// ─── buildApiMessages injection ─────────────────────────

test('chat.js buildApiMessages injects [User Info]', () => {
  assertContains(chatJs, 'buildUserInfoPrompt', 'should call buildUserInfoPrompt')
  // The injection guards on profile presence
  assert(chatJs.includes('profile &&') || chatJs.includes('profile.name') || chatJs.includes('profile.description'),
    'should guard injection on profile presence')
  // The [User Info] string is produced by buildUserInfoPrompt, not necessarily in chat.js
  // but we still check the injection callsite references the prompt builder
})

// ─── userProfile service checks ─────────────────────────

test('userProfile exports buildUserInfoPrompt', () => {
  assertContains(userProfileSource, 'export function buildUserInfoPrompt', 'should export buildUserInfoPrompt')
})

test('buildUserInfoPrompt produces [User Info] block format', async () => {
  const { buildUserInfoPrompt } = await import('../src/services/userProfile.js')
  const out = buildUserInfoPrompt({ name: 'Alice', description: 'kind' })
  assertContains(out, '[User Info]')
  assertContains(out, 'Name: Alice')
  assertContains(out, 'Description: kind')
})

// ─── Chat generator scope fix checks ───────────────────

test('chat.js hoists assistantMsg (no const inside try block)', () => {
  // Regression: assistantMsg was const inside try, invisible to finally
  // Now it should be declared with let outside try
  const constMatch = chatJs.match(/const\s+assistantMsg\s*=/) || chatJs.match(/const\s+assistantMsg\s+\{/)
  if (constMatch) {
    throw new Error('assistantMsg should not be declared with const at block scope')
  }
})

test('chat.js declares let assistantMsg (scope hoisting)', () => {
  if (!chatJs.includes('let assistantMsg')) {
    throw new Error('assistantMsg should be declared with let (hoisted to function scope)')
  }
  // Verify the reassignment (not const) exists inside try
  if (!chatJs.includes('assistantMsg = reactiveMessage')) {
    throw new Error('assistantMsg should be assigned (not const-declared) inside try block')
  }
})

// ─── Run all ────────────────────────────────────────────

Promise.allSettled(testPromises).then(() => {
  console.log(`\nResults: ${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
})
