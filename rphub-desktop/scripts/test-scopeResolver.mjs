// scripts/test-scopeResolver.mjs
import { resolveScopedEntries, mergeByScope } from '../src/services/scopeResolver.js'

let passed = 0, failed = 0
function t(name, cond) { if (cond) { passed++; console.log('  ✓', name) } else { failed++; console.log('  ✗', name) } }

t('empty inputs', resolveScopedEntries({}).length === 0)
t('all global', resolveScopedEntries({ global: [{ id: 'a' }] }).length === 1)
t('all character', resolveScopedEntries({ character: [{ id: 'a' }, { id: 'b' }] }).length === 2)
t('character first, then global', (() => {
  const r = resolveScopedEntries({ character: [{ id: 'c' }], global: [{ id: 'g' }] })
  return r[0].id === 'c' && r[1].id === 'g'
})())
t('mergeByScope splits correctly', (() => {
  const r = mergeByScope([{ id: 'c', scope: 'character' }, { id: 'g', scope: 'global' }])
  return r.global.length === 1 && r.character.length === 1 && r.merged.length === 2
})())
t('mergeByScope defaults to global when scope missing', (() => {
  const r = mergeByScope([{ id: 'x' }])
  return r.global.length === 1 && r.character.length === 0
})())

console.log(`\nResults: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
