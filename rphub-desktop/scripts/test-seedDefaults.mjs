// scripts/test-seedDefaults.mjs
// Mock-import tests for seedDefaults.js
import { USER_REPLACE_REGEX_NAME } from '../src/services/builtinRegex.js'
import {
  ensureSeedPresets, ensureSeedWorldInfo, ensureSeedRegex, isSeededEntry
} from '../src/services/seedDefaults.js'

let passed = 0, failed = 0
function t(name, cond) {
  if (cond) { passed++; console.log('  ✓', name) }
  else { failed++; console.log('  ✗', name) }
}

console.log('--- ensureSeedPresets ---')
{
  const r1 = ensureSeedPresets([])
  const r2 = ensureSeedPresets(r1)
  const r3 = ensureSeedPresets(r2)
  t('first call produces 15', r1.length === 15)
  t('idempotent: second call still 15', r2.length === 15)
  t('idempotent: third call still 15', r3.length === 15)
  t('all entries have systemSeed=true on first boot', r1.every(p => p.systemSeed === true))
}
{
  const userCustom = { name: 'MyCustomPreset', role: 'system', content: 'CUSTOM CONTENT', enabled: true }
  const r = ensureSeedPresets([userCustom])
  t('user entry preserved', r.find(p => p.name === 'MyCustomPreset')?.content === 'CUSTOM CONTENT')
  t('user entry not identified as seeded', !isSeededEntry(r.find(p => p.name === 'MyCustomPreset'), 'preset'))
  t('seed still added alongside', r.length === 16)
}
{
  const userOverride = { name: '破限', role: 'system', content: 'USER OVERRIDE', enabled: false }
  const r = ensureSeedPresets([userOverride])
  const override = r.find(p => p.name === '破限')
  t('user content override preserved', override?.content === 'USER OVERRIDE')
  t('user enabled=false preserved', override?.enabled === false)
}
{
  const many = [...Array(5)].map((_, i) => ({ name: `User${i}`, content: 'x', enabled: true }))
  const r = ensureSeedPresets(many)
  t('multiple user entries preserved', r.filter(p => p.name.startsWith('User')).length === 5)
  t('total = 5 + 15 seeds', r.length === 20)
}

console.log('--- ensureSeedWorldInfo ---')
{
  const r1 = ensureSeedWorldInfo([])
  t('first call produces 1', r1.length === 1)
  const r2 = ensureSeedWorldInfo(r1)
  t('idempotent', r2.length === 1)
}
{
  const userWI = { comment: 'MyWorld', content: 'lore', key: ['x'], enabled: true }
  const r = ensureSeedWorldInfo([userWI])
  t('user WI preserved', r.find(e => e.comment === 'MyWorld')?.content === 'lore')
  t('seed alongside', r.length === 2)
}

console.log('--- ensureSeedRegex ---')
{
  const r1 = ensureSeedRegex([])
  t('first call produces 2', r1.length === 2)
  const r2 = ensureSeedRegex(r1)
  t('idempotent', r2.length === 2)
}
{
  const userRx = { name: 'MyRegex', regex: 'foo', flags: 'g', replacement: 'bar', placement: [1,2], enabled: true }
  const r = ensureSeedRegex([userRx])
  t('user regex preserved', r.find(s => s.name === 'MyRegex')?.replacement === 'bar')
  t('seed alongside', r.length === 3)
}

console.log('--- isSeededEntry ---')
t('built-in preset identified', isSeededEntry({ name: '破限', systemSeed: true }, 'preset'))
t('user preset not identified', !isSeededEntry({ name: 'Custom' }, 'preset'))
t('built-in WI identified', isSeededEntry({ comment: '自动生图', systemSeed: true }, 'worldinfo'))
t('built-in regex identified', isSeededEntry({ name: USER_REPLACE_REGEX_NAME, systemSeed: true }, 'regex'))
t('unknown kind returns false', !isSeededEntry({ name: 'x' }, 'unknown'))

console.log(`\nResults: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
