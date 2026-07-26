// scripts/test-presetInjector.mjs
import { formatPresetsForSystemPrompt, buildPreludeMessages, getBreakLimitContent, isSystemPreset } from '../src/services/presetInjector.js'

let passed = 0, failed = 0
function t(name, cond) { if (cond) { passed++; console.log('  ✓', name) } else { failed++; console.log('  ✗', name) } }

const allPresets = [
  { name: '破限', role: 'system', content: 'BREAK', enabled: true },
  { name: '色情内容增强', role: 'system', content: 'NSFW', enabled: true },
  { name: '禁止规则', role: 'system', content: 'BANNED', enabled: true },
  { name: '破限预注入 · User 1', role: 'user', content: 'U1', enabled: true },
  { name: '破限预注入 · AI 1', role: 'assistant', content: 'A1', enabled: true },
  { name: '破限预注入 · User 2', role: 'user', content: 'U2', enabled: true },
  { name: '破限预注入 · AI 2', role: 'assistant', content: 'A2', enabled: true },
  { name: 'COT', role: 'system', content: 'COT', enabled: false },
]

console.log('--- isSystemPreset ---')
t('system role is system preset', isSystemPreset({ name: 'X', role: 'system' }))
t('user role is not system preset', !isSystemPreset({ name: 'X', role: 'user' }))
t('破限 is NOT a system preset (excluded)', !isSystemPreset({ name: '破限', role: 'system' }))

console.log('--- formatPresetsForSystemPrompt ---')
t('empty returns empty', formatPresetsForSystemPrompt([]) === '')
t('excludes 破限', !formatPresetsForSystemPrompt(allPresets).includes('BREAK'))
t('includes NSFW', formatPresetsForSystemPrompt(allPresets).includes('NSFW'))
t('includes BANNED', formatPresetsForSystemPrompt(allPresets).includes('BANNED'))
t('excludes disabled COT', !formatPresetsForSystemPrompt(allPresets).includes('COT'))
{
  const onlyOne = [{ name: 'X', role: 'system', content: 'X', enabled: true }]
  const r = formatPresetsForSystemPrompt(onlyOne)
  t('header present', r.startsWith('【系统提示词】'))
  t('numbered', r.includes('1. [X]'))
}

console.log('--- buildPreludeMessages ---')
t('empty returns []', buildPreludeMessages([]).length === 0)
{
  const r = buildPreludeMessages(allPresets)
  t('produces 4 messages', r.length === 4)
  t('order is U1, A1, U2, A2', r[0].content === 'U1' && r[1].content === 'A1' && r[2].content === 'U2' && r[3].content === 'A2')
  t('roles correct', r[0].role === 'user' && r[1].role === 'assistant')
}
{
  const partial = allPresets.filter(p => p.name !== '破限预注入 · AI 2')
  const r = buildPreludeMessages(partial)
  t('skips disabled/missing', r.length === 3)
}

console.log('--- getBreakLimitContent ---')
t('returns 破限 content', getBreakLimitContent(allPresets) === 'BREAK')
t('returns empty when missing', getBreakLimitContent([]) === '')
t('returns empty when disabled', getBreakLimitContent([{ name: '破限', role: 'system', content: 'X', enabled: false }]) === '')

console.log(`\nResults: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
