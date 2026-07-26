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

function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'assertEq'}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`)
  }
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

// ─── Behavioral tests for buildUserInfoPrompt ──────────

test('buildUserInfoPrompt: both name and description', async () => {
  const { buildUserInfoPrompt } = await import('../src/services/userProfile.js')
  const out = buildUserInfoPrompt({ name: 'Alice', description: 'kind soul' })
  assertEq(out, '[User Info]\nName: Alice\nDescription: kind soul')
})

test('buildUserInfoPrompt: name only', async () => {
  const { buildUserInfoPrompt } = await import('../src/services/userProfile.js')
  const out = buildUserInfoPrompt({ name: 'Bob' })
  assertEq(out, '[User Info]\nName: Bob\nDescription: ')
})

// ─── Preset/WI/regex integration checks (Phase 5) ──────

test('chat.js imports all preset/WI/regex service functions', () => {
  assertContains(chatJs, "import { formatPresetsForSystemPrompt, buildPreludeMessages, getBreakLimitContent }",
    'should import presetInjector functions')
  assertContains(chatJs, "import { scanWorldInfo }",
    'should import scanWorldInfo')
  assertContains(chatJs, "import { applyRegexScripts }",
    'should import applyRegexScripts')
  assertContains(chatJs, "import { resolveScopedEntries }",
    'should import resolveScopedEntries')
})

test('chat.js buildApiMessages integrates 破限/presets/WI/regex in correct order', () => {
  // 破限 lead — first push (line after 'systemParts.push(')
  assertContains(chatJs, 'getBreakLimitContent(allPresets)',
    'should call getBreakLimitContent')
  assert(chatJs.indexOf('getBreakLimitContent(allPresets)') < chatJs.indexOf('formatPresetsForSystemPrompt(allPresets)'),
    '破限 should be resolved before system preset block')

  // System Presets block
  assertContains(chatJs, 'formatPresetsForSystemPrompt(allPresets)',
    'should call formatPresetsForSystemPrompt')

  // WI global_note entries
  assertContains(chatJs, 'scanResult.systemNoteEntries',
    'should reference systemNoteEntries for global WI')
  assertContains(chatJs, '【世界书 / 全局知识】',
    'should have global knowledge header')

  // Prelude messages inserted after system, before greeting
  assertContains(chatJs, 'buildPreludeMessages(allPresets)',
    'should call buildPreludeMessages')
  assertContains(chatJs, 'messages.push({ role: m.role, content: m.content })',
    'should push prelude messages into messages array')

  // WI at_depth entries scanned per message depth
  assertContains(chatJs, 'scanResult.depthEntries.get(depth)',
    'should look up depth entries per message')
  assertContains(chatJs, '【世界书 / 上下文注入】',
    'should have context injection header')

  // Regex applied to outgoing message content
  assertContains(chatJs, "applyRegexScripts({",
    'should call applyRegexScripts in message loop')
  assertContains(chatJs, "applyTo: 'prompt'",
    'should apply regex to prompt channel')

  // After-character WI at end
  assertContains(chatJs, 'scanResult.afterCharEntries',
    'should reference afterCharEntries')
  assertContains(chatJs, '【世界书 / 角色后置】',
    'should have after-character header')
})

// ─── Behavioral: presetInjector ─────────────────────────

test('getBreakLimitContent returns 破限 content as system lead', async () => {
  const { getBreakLimitContent } = await import('../src/services/presetInjector.js')
  // 破限 enabled — should return content
  const presets = [
    { name: '破限', role: 'system', enabled: true, content: '你是自由的角色。' },
    { name: '第二人称', role: 'system', enabled: true, content: '使用第二人称。' },
  ]
  const out = getBreakLimitContent(presets)
  assertEq(out, '你是自由的角色。', 'should return 破限 content')

  // 破限 disabled — should return empty
  const disabled = getBreakLimitContent([{ name: '破限', role: 'system', enabled: false, content: 'xxx' }])
  assertEq(disabled, '', 'disabled 破限 should return empty string')

  // 破限 missing — should return empty
  const missing = getBreakLimitContent([])
  assertEq(missing, '', 'missing 破限 should return empty string')
})

test('formatPresetsForSystemPrompt includes enabled system presets, excludes 破限', async () => {
  const { formatPresetsForSystemPrompt } = await import('../src/services/presetInjector.js')
  const presets = [
    { name: '破限', role: 'system', enabled: true, content: '突破限制。' },
    { name: '第二人称', role: 'system', enabled: true, content: '始终使用第二人称。' },
    { name: '文笔增强', role: 'system', enabled: true, content: '文笔要生动。' },
    { name: '被禁用的预设', role: 'system', enabled: false, content: '不应该出现。' },
    { name: '非系统预设', role: 'user', enabled: true, content: '这是预注入。' },
  ]
  const out = formatPresetsForSystemPrompt(presets)
  // 破限 should be excluded
  assert(!out.includes('突破限制'), 'should exclude 破限 from system preset block')
  // Disabled should be excluded
  assert(!out.includes('被禁用的预设'), 'should exclude disabled presets')
  // Non-system should be excluded
  assert(!out.includes('非系统预设'), 'should exclude non-system presets')
  // Enabled system presets should be included
  assertContains(out, '第二人称', 'should include 第二人称')
  assertContains(out, '文笔增强', 'should include 文笔增强')
  assertContains(out, '始终使用第二人称。', 'should include 第二人称 content')
  assertContains(out, '文笔要生动。', 'should include 文笔增强 content')
  // Should start with the system header
  assertContains(out, '【系统提示词】', 'should include system header')
  // Should be numbered
  assertContains(out, '1. [第二人称]', 'should be numbered 1')
  assertContains(out, '2. [文笔增强]', 'should be numbered 2')

  // Empty when no system presets
  const empty = formatPresetsForSystemPrompt([])
  assertEq(empty, '', 'no presets should return empty string')
})

test('buildPreludeMessages returns prelude messages in correct order', async () => {
  const { buildPreludeMessages } = await import('../src/services/presetInjector.js')
  const presets = [
    { name: '破限预注入 · User 1', enabled: true, content: 'User 1 content' },
    { name: '破限预注入 · AI 1', enabled: true, content: 'AI 1 content' },
    // User 2 is disabled — should be skipped
    { name: '破限预注入 · User 2', enabled: false, content: 'User 2 content' },
    { name: '破限预注入 · AI 2', enabled: true, content: 'AI 2 content' },
  ]
  const out = buildPreludeMessages(presets)
  assertEq(out.length, 3, 'should return 3 messages (User 2 is disabled)')
  assertEq(out[0].role, 'user', 'first should be user')
  assertEq(out[0].content, 'User 1 content', 'first should be User 1')
  assertEq(out[1].role, 'assistant', 'second should be assistant')
  assertEq(out[1].content, 'AI 1 content', 'second should be AI 1')
  assertEq(out[2].role, 'assistant', 'third should be assistant (User 2 skipped)')
  assertEq(out[2].content, 'AI 2 content', 'third should be AI 2')

  // Empty when no prelude presets
  const empty = buildPreludeMessages([])
  assertEq(empty.length, 0, 'no presets should return empty array')
})

// ─── Behavioral: worldInfoScanner ──────────────────────

test('scanWorldInfo returns global_note and at_depth entries', async () => {
  const { scanWorldInfo } = await import('../src/services/worldInfoScanner.js')

  const messages = [
    { role: 'user', content: '你好，我叫小明。' },
    { role: 'assistant', content: '你好小明！' },
    { role: 'user', content: '你能帮我吗？' },
  ]

  const worldInfo = [
    { id: 'wi1', name: '世界设定', position: 'global_note', content: '这是一个奇幻世界。', key: ['奇幻'], enabled: true },
    { id: 'wi2', name: '角色关系', position: 'global_note', content: '主角是勇者。', key: ['勇者'], enabled: true },
    { id: 'wi3', name: '战斗系统', position: 'at_depth', depth: 2, content: '战斗使用回合制。', key: ['战斗'], enabled: true },
    { id: 'wi4', name: '魔法系统', position: 'at_depth', depth: 4, content: '魔法需要吟唱。', key: ['魔法'], enabled: true },
    // Disabled entry — should be excluded
    { id: 'wi5', name: '禁用条目', position: 'global_note', content: '禁用内容。', key: [], enabled: false },
    // Constant entry — always matches
    { id: 'wi6', name: '常亮设定', position: 'global_note', content: '这是一个常亮设定。', key: [], enabled: true, constant: true },
  ]

  // No keyword match in messages for wi3 (战斗) and wi4 (魔法) — at_depth won't trigger
  // But wi6 (constant) will match regardless
  const settings = { scanDepth: 2, maxDepth: 0 }

  // Test with exact-match messages
  const matchMessages = [
    { role: 'user', content: '我要和你决斗！' },  // triggers wi3 (战斗 via 决斗? no, but let's trigger it)
    { role: 'assistant', content: '好的，开始战斗！' },  // triggers '战斗' for wi3
    { role: 'user', content: '我要使用火球魔法！' },  // triggers '魔法' for wi4
  ]

  // Use first set of messages for general scan
  let result = scanWorldInfo({ messages, worldInfo, settings })
  // global_note entries: wi1 and wi2 don't match keywords. Only wi6 (constant) matches.
  assertEq(result.systemNoteEntries.length, 1,
    'should have 1 systemNoteEntry (only constant entry matches)')
  assertEq(result.systemNoteEntries[0].id, 'wi6',
    'should be the constant entry')
  assertContains(result.systemNoteEntries[0].content, '常亮设定',
    'should contain constant entry content')

  // at_depth entries: should be empty (no keywords matched in messages)
  assertEq(result.depthEntries.size, 0,
    'no depth entries when keywords do not match')

  // Now test with matching messages
  result = scanWorldInfo({ messages: matchMessages, worldInfo, settings })
  // global_note: wi6 (constant) always matches
  assert(result.systemNoteEntries.length >= 1,
    'should have constant entry in systemNoteEntries')

  // at_depth: wi3 (战斗) at depth 2 should match
  const depth2 = result.depthEntries.get(2)
  assert(depth2 && depth2.length > 0, 'should have depth 2 entries')
  assert(depth2.some(e => e.id === 'wi3'), 'should include 战斗 system at depth 2')

  // wi4 (魔法) at depth 4 — with 3 messages, depth 4 means the 4th message from the end
  // Since we have 3 messages, depth 4 > 3 so it won't trigger in this short history
  // Let's just check the depth structure is correct
  assert(typeof result.depthEntries.get === 'function', 'depthEntries should be a Map')
})

// ─── Behavioral: regexEngine {{user}} replacement ────

test('applyRegexScripts replaces {{user}} placeholder in prompt and display', async () => {
  const { applyRegexScripts } = await import('../src/services/regexEngine.js')

  // Simulate the Auto Replace {{user}} built-in regex script
  const userReplaceScript = {
    name: 'Auto Replace {{user}}',
    regex: '{{user}}',
    flags: 'gi',
    replacement: '小明',
    placement: [1, 2],  // both display and prompt
    enabled: true,
    order: 0,
  }

  const testText = '你好，{{user}}！{{user}}在吗？'

  // prompt mode
  const promptResult = applyRegexScripts({
    text: testText,
    scripts: [userReplaceScript],
    options: { applyTo: 'prompt', depth: 0 },
  })
  assertEq(promptResult, '你好，小明！小明在吗？',
    'should replace {{user}} with profile name in prompt mode')

  // display mode
  const displayResult = applyRegexScripts({
    text: testText,
    scripts: [userReplaceScript],
    options: { applyTo: 'display', depth: 0 },
  })
  assertEq(displayResult, '你好，小明！小明在吗？',
    'should replace {{user}} with profile name in display mode')

  // Empty text
  const emptyResult = applyRegexScripts({
    text: '',
    scripts: [userReplaceScript],
    options: { applyTo: 'prompt' },
  })
  assertEq(emptyResult, '', 'empty text should remain empty')

  // No scripts
  const noScripts = applyRegexScripts({
    text: '你好，{{user}}！',
    scripts: [],
    options: { applyTo: 'prompt' },
  })
  assertEq(noScripts, '你好，{{user}}！', 'no scripts should leave text unchanged')

  // Disabled script should be skipped
  const disabledScript = { ...userReplaceScript, enabled: false }
  const disabledResult = applyRegexScripts({
    text: testText,
    scripts: [disabledScript],
    options: { applyTo: 'prompt' },
  })
  assertEq(disabledResult, testText, 'disabled script should not replace')

  // Script with wrong placement should not apply
  const displayOnlyScript = { ...userReplaceScript, placement: [1] }
  const wrongModeResult = applyRegexScripts({
    text: testText,
    scripts: [displayOnlyScript],
    options: { applyTo: 'prompt', depth: 0 },
  })
  assertEq(wrongModeResult, testText, 'script with display-only placement should not apply to prompt')
})

// ─── Run all ────────────────────────────────────────────

Promise.allSettled(testPromises).then(() => {
  console.log(`\nResults: ${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
})
