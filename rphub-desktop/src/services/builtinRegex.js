// src/services/builtinRegex.js
// Built-in regex scripts. Ported from web (assets/js/app.js lines 9870-9875, 9606-9615).

import { normalizeRegexScript, isBuiltinRegexName, USER_REPLACE_REGEX_NAME, NAI_IMAGE_REGEX_NAME } from './regexSchema.js'

const AutoReplaceUser = normalizeRegexScript({
  name: USER_REPLACE_REGEX_NAME,
  regex: '{{user}}',
  flags: 'gi',
  replacement: 'user',   // placeholder; useRegexScripts.syncUserNameReplacement updates this at runtime
  placement: [1, 2],     // applies to display + prompt
  scope: 'global',
  enabled: true,
  systemSeed: true,
  order: 0,
})

const NAIImageRegex = normalizeRegexScript({
  name: NAI_IMAGE_REGEX_NAME,
  regex: '/@image@([\\s\\S]*?)@imageEnd@/g',
  flags: 'g',
  replacement: '',
  placement: [1],        // display only: strip the tag from the rendered message
  scope: 'global',
  enabled: false,         // opt-in
  systemSeed: true,
  order: 1,
})

export const BUILTIN_REGEX = [AutoReplaceUser, NAIImageRegex]
export const BUILTIN_REGEX_NAMES = new Set(BUILTIN_REGEX.map(s => s.name))

export { isBuiltinRegexName, USER_REPLACE_REGEX_NAME, NAI_IMAGE_REGEX_NAME }
