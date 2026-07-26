// scripts/test-regexEngine.mjs
import { applyRegexScripts } from '../src/services/regexEngine.js'

let passed = 0, failed = 0
function t(name, cond) { if (cond) { passed++; console.log('  ✓', name) } else { failed++; console.log('  ✗', name) } }

console.log('--- basic apply ---')
t('empty scripts returns text unchanged', applyRegexScripts({ text: 'hello', scripts: [] }) === 'hello')
t('disabled scripts skipped', applyRegexScripts({ text: 'hi', scripts: [{ regex: 'hi', flags: 'g', replacement: 'bye', enabled: false, placement: [1,2] }] }) === 'hi')
t('simple replace', applyRegexScripts({ text: 'foo bar', scripts: [{ regex: 'foo', flags: 'g', replacement: 'baz', enabled: true, placement: [1,2] }] }) === 'baz bar')

console.log('--- placement filter ---')
{
  const s = { regex: 'a', flags: 'g', replacement: 'b', enabled: true, placement: [2] }
  t('placement [2] applies to prompt', applyRegexScripts({ text: 'a', scripts: [s], options: { applyTo: 'prompt' } }) === 'b')
  t('placement [2] skipped in display', applyRegexScripts({ text: 'a', scripts: [s], options: { applyTo: 'display' } }) === 'a')
}
{
  const s = { regex: 'a', flags: 'g', replacement: 'b', enabled: true, placement: [1] }
  t('placement [1] applies to display', applyRegexScripts({ text: 'a', scripts: [s], options: { applyTo: 'display' } }) === 'b')
  t('placement [1] skipped in prompt', applyRegexScripts({ text: 'a', scripts: [s], options: { applyTo: 'prompt' } }) === 'a')
}

console.log('--- markdownOnly / promptOnly ---')
{
  const s = { regex: 'x', flags: 'g', replacement: 'y', enabled: true, placement: [1,2], markdownOnly: true }
  t('markdownOnly skipped in prompt', applyRegexScripts({ text: 'x', scripts: [s], options: { applyTo: 'prompt' } }) === 'x')
  t('markdownOnly applied in display', applyRegexScripts({ text: 'x', scripts: [s], options: { applyTo: 'display' } }) === 'y')
}
{
  const s = { regex: 'x', flags: 'g', replacement: 'y', enabled: true, placement: [1,2], promptOnly: true }
  t('promptOnly applied in prompt', applyRegexScripts({ text: 'x', scripts: [s], options: { applyTo: 'prompt' } }) === 'y')
  t('promptOnly skipped in display', applyRegexScripts({ text: 'x', scripts: [s], options: { applyTo: 'display' } }) === 'x')
}

console.log('--- minDepth / maxDepth ---')
{
  const s = { regex: 'x', flags: 'g', replacement: 'y', enabled: true, placement: [1,2], minDepth: 2 }
  t('below minDepth skipped', applyRegexScripts({ text: 'x', scripts: [s], options: { depth: 1 } }) === 'x')
  t('at minDepth applied', applyRegexScripts({ text: 'x', scripts: [s], options: { depth: 2 } }) === 'y')
  t('above minDepth applied', applyRegexScripts({ text: 'x', scripts: [s], options: { depth: 5 } }) === 'y')
}
{
  const s = { regex: 'x', flags: 'g', replacement: 'y', enabled: true, placement: [1,2], maxDepth: 3 }
  t('above maxDepth skipped', applyRegexScripts({ text: 'x', scripts: [s], options: { depth: 5 } }) === 'x')
  t('at maxDepth applied', applyRegexScripts({ text: 'x', scripts: [s], options: { depth: 3 } }) === 'y')
}

console.log('--- error tolerance ---')
t('invalid regex does not throw', applyRegexScripts({ text: 'hello', scripts: [{ regex: '[invalid', flags: 'g', replacement: 'X', enabled: true, placement: [1,2] }] }) === 'hello')
t('good script after bad one still runs', applyRegexScripts({ text: 'a b', scripts: [
  { regex: '[invalid', flags: 'g', replacement: 'X', enabled: true, placement: [1,2] },
  { regex: 'b', flags: 'g', replacement: 'c', enabled: true, placement: [1,2] },
] }) === 'a c')

console.log('--- {{user}} replacement ---')
{
  const s = { name: 'Auto Replace {{user}}', regex: '{{user}}', flags: 'gi', replacement: 'Alice', enabled: true, placement: [1,2] }
  t('replaces {{user}} with name', applyRegexScripts({ text: 'Hello {{user}}!', scripts: [s] }) === 'Hello Alice!')
  t('case-insensitive flag', applyRegexScripts({ text: 'Hello {{User}}!', scripts: [s] }) === 'Hello Alice!')
}

console.log('--- NAI image strip ---')
{
  const s = { name: 'NAI画图正则', regex: '/@image@[\\s\\S]*?@imageEnd@/g', flags: 'g', replacement: '', enabled: true, placement: [1] }
  t('strips image tag in display', applyRegexScripts({
    text: 'before @image@prompt@imageEnd@ after',
    scripts: [s],
    options: { applyTo: 'display' },
  }) === 'before  after')
  t('preserves image tag in prompt', applyRegexScripts({
    text: 'before @image@prompt@imageEnd@ after',
    scripts: [s],
    options: { applyTo: 'prompt' },
  }) === 'before @image@prompt@imageEnd@ after')
}

console.log(`\nResults: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
