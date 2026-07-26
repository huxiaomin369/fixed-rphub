// scripts/test-worldInfoScanner.mjs
import { scanWorldInfo } from '../src/services/worldInfoScanner.js'

let passed = 0, failed = 0
function t(name, cond) { if (cond) { passed++; console.log('  ✓', name) } else { failed++; console.log('  ✗', name) } }

const makeEntry = (overrides) => ({
  id: Math.random().toString(),
  enabled: true,
  position: 'global_note',
  order: 100,
  ...overrides,
})

console.log('--- constant entries ---')
{
  const e = makeEntry({ constant: true, position: 'global_note', content: 'C' })
  const r = scanWorldInfo({ messages: [{ content: 'foo' }], worldInfo: [e] })
  t('constant always matches', r.systemNoteEntries.some(x => x.id === e.id))
}
{
  const e = makeEntry({ constant: false, key: ['banana'], content: 'B' })
  const r = scanWorldInfo({ messages: [{ content: 'I love apples' }], worldInfo: [e] })
  t('non-constant with non-matching key does not match', !r.systemNoteEntries.some(x => x.id === e.id))
}
{
  const e = makeEntry({ key: ['apple'], content: 'A' })
  const r = scanWorldInfo({ messages: [{ content: 'I love apples' }], worldInfo: [e] })
  t('keyword match', r.systemNoteEntries.some(x => x.id === e.id))
}
{
  const e = makeEntry({ key: ['Apple'], caseSensitive: true, content: 'A' })
  const r1 = scanWorldInfo({ messages: [{ content: 'I love apple' }], worldInfo: [e] })
  const r2 = scanWorldInfo({ messages: [{ content: 'I love Apple' }], worldInfo: [e] })
  t('case-sensitive: lowercase content does not match', !r1.systemNoteEntries.some(x => x.id === e.id))
  t('case-sensitive: exact case matches', r2.systemNoteEntries.some(x => x.id === e.id))
}
{
  const e = makeEntry({ useRegex: true, key: ['a\\d{2}'], content: 'R' })
  const r = scanWorldInfo({ messages: [{ content: 'a99 b' }], worldInfo: [e] })
  t('regex key match', r.systemNoteEntries.some(x => x.id === e.id))
}

console.log('--- position bucketing ---')
{
  const e1 = makeEntry({ key: ['x'], position: 'global_note', content: 'GN' })
  const e2 = makeEntry({ key: ['x'], position: 'before_character', content: 'BC' })
  const e3 = makeEntry({ key: ['x'], position: 'after_character', content: 'AC' })
  const e4 = makeEntry({ key: ['x'], position: 'at_depth', depth: 4, content: 'AD' })
  const r = scanWorldInfo({ messages: [{ content: 'x' }], worldInfo: [e1, e2, e3, e4] })
  t('global_note bucket', r.systemNoteEntries.some(x => x.id === e1.id))
  t('before_character bucket', r.beforeCharEntries.some(x => x.id === e2.id))
  t('after_character bucket', r.afterCharEntries.some(x => x.id === e3.id))
  t('at_depth bucketed by depth=4', r.depthEntries.get(4)?.some(x => x.id === e4.id))
}

console.log('--- scanDepth ---')
{
  const e = makeEntry({ key: ['old'], content: 'R' })
  const r1 = scanWorldInfo({ messages: [{ content: 'old' }, { content: 'recent' }], worldInfo: [e], settings: { scanDepth: 1 } })
  const r2 = scanWorldInfo({ messages: [{ content: 'old' }, { content: 'recent' }], worldInfo: [e], settings: { scanDepth: 2 } })
  t('scanDepth=1 only scans last message, misses earlier key', !r1.systemNoteEntries.some(x => x.id === e.id))
  t('scanDepth=2 scans both, finds earlier key', r2.systemNoteEntries.some(x => x.id === e.id))
}

console.log('--- order sorting ---')
{
  const e1 = makeEntry({ key: ['x'], order: 200, content: 'second' })
  const e2 = makeEntry({ key: ['x'], order: 100, content: 'first' })
  const r = scanWorldInfo({ messages: [{ content: 'x' }], worldInfo: [e1, e2] })
  t('sorted by order ascending', r.systemNoteEntries[0].id === e2.id)
}

console.log(`\nResults: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
