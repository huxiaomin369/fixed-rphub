// scripts/test-builtinSeeds.mjs
// Mock-import tests for builtinPresets.js / builtinWorldInfo.js / builtinRegex.js
import {
  BUILTIN_PRESETS, BUILTIN_PRESET_NAMES, PERSON_PRESET_NAMES, isBuiltinPresetName
} from '../src/services/builtinPresets.js'
import {
  BUILTIN_WORLD_INFO, BUILTIN_WORLD_INFO_NAMES, AUTO_IMAGE_GEN_WI_NAME, isBuiltinWorldInfoName
} from '../src/services/builtinWorldInfo.js'
import {
  BUILTIN_REGEX, BUILTIN_REGEX_NAMES, isBuiltinRegexName,
  USER_REPLACE_REGEX_NAME, NAI_IMAGE_REGEX_NAME
} from '../src/services/builtinRegex.js'

let passed = 0, failed = 0
function t(name, cond) {
  if (cond) { passed++; console.log('  ✓', name) }
  else { failed++; console.log('  ✗', name) }
}

console.log('--- BUILTIN_PRESETS ---')
t('count is 15', BUILTIN_PRESETS.length === 15)
t('all names unique', new Set(BUILTIN_PRESETS.map(p => p.name)).size === 15)
t('all have non-empty content', BUILTIN_PRESETS.every(p => p.content.length > 0))
t('all have systemSeed=true', BUILTIN_PRESETS.every(p => p.systemSeed === true))
t('all have valid role', BUILTIN_PRESETS.every(p => ['system','user','assistant'].includes(p.role)))
t('all have scope=global', BUILTIN_PRESETS.every(p => p.scope === 'global'))
t('破限 is first by order', BUILTIN_PRESETS[0].name === '破限')
t('破限 has order=0', BUILTIN_PRESETS[0].order === 0)
t('BUILTIN_PRESET_NAMES is a Set of 15', BUILTIN_PRESET_NAMES instanceof Set && BUILTIN_PRESET_NAMES.size === 15)
t('PERSON_PRESET_NAMES contains both', PERSON_PRESET_NAMES.has('第二人称') && PERSON_PRESET_NAMES.has('第三人称'))
t('isBuiltinPresetName(破限) is true', isBuiltinPresetName('破限'))
t('isBuiltinPresetName(NotABuiltin) is false', !isBuiltinPresetName('NotABuiltin'))
t('第二人称 default enabled=false', BUILTIN_PRESETS.find(p => p.name === '第二人称').enabled === false)
t('第三人称 default enabled=false', BUILTIN_PRESETS.find(p => p.name === '第三人称').enabled === false)
t('破限 default enabled=true', BUILTIN_PRESETS.find(p => p.name === '破限').enabled === true)

console.log('--- BUILTIN_WORLD_INFO ---')
t('count is 1', BUILTIN_WORLD_INFO.length === 1)
t('name is 自动生图', BUILTIN_WORLD_INFO[0].comment === '自动生图')
t('has systemSeed=true', BUILTIN_WORLD_INFO[0].systemSeed === true)
t('position is at_depth', BUILTIN_WORLD_INFO[0].position === 'at_depth')
t('key is empty (constant)', BUILTIN_WORLD_INFO[0].key.length === 0)
t('constant=true', BUILTIN_WORLD_INFO[0].constant === true)
t('scope=global', BUILTIN_WORLD_INFO[0].scope === 'global')
t('default enabled=false', BUILTIN_WORLD_INFO[0].enabled === false)
t('AUTO_IMAGE_GEN_WI_NAME constant', AUTO_IMAGE_GEN_WI_NAME === '自动生图')
t('isBuiltinWorldInfoName(自动生图) is true', isBuiltinWorldInfoName('自动生图'))

console.log('--- BUILTIN_REGEX ---')
t('count is 2', BUILTIN_REGEX.length === 2)
t('names unique', new Set(BUILTIN_REGEX.map(s => s.name)).size === 2)
t('contains Auto Replace {{user}}', BUILTIN_REGEX.some(s => s.name === USER_REPLACE_REGEX_NAME))
t('contains NAI画图正则', BUILTIN_REGEX.some(s => s.name === NAI_IMAGE_REGEX_NAME))
t('USER_REPLACE_REGEX_NAME constant', USER_REPLACE_REGEX_NAME === 'Auto Replace {{user}}')
t('NAI_IMAGE_REGEX_NAME constant', NAI_IMAGE_REGEX_NAME === 'NAI画图正则')
t('all have systemSeed=true', BUILTIN_REGEX.every(s => s.systemSeed === true))
t('all have scope=global', BUILTIN_REGEX.every(s => s.scope === 'global'))
t('Auto Replace has placement [1,2]', JSON.stringify(BUILTIN_REGEX.find(s => s.name === USER_REPLACE_REGEX_NAME).placement) === '[1,2]')
t('NAI has placement [1]', JSON.stringify(BUILTIN_REGEX.find(s => s.name === NAI_IMAGE_REGEX_NAME).placement) === '[1]')
t('NAI has markdownOnly=false', BUILTIN_REGEX.find(s => s.name === NAI_IMAGE_REGEX_NAME).markdownOnly === false)
t('NAI default enabled=false', BUILTIN_REGEX.find(s => s.name === NAI_IMAGE_REGEX_NAME).enabled === false)
t('Auto Replace default enabled=true', BUILTIN_REGEX.find(s => s.name === USER_REPLACE_REGEX_NAME).enabled === true)
t('isBuiltinRegexName(Auto Replace {{user}}) is true', isBuiltinRegexName(USER_REPLACE_REGEX_NAME))

console.log(`\nResults: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
