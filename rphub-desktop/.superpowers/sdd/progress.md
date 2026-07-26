# SDD Progress — Presets / WI / Regex Parity

Plan: `docs/superpowers/plans/2026-07-26-presets-worldinfo-regex-parity.md`
Base commit: `78b908e` (ledger checkpoint)
Target PR1: Phases 1+2 (data + UI scaffolding)
Target PR2: Phases 3+4+5 (execution + hooks + tests)

## Tasks

- [x] 1.1 presetSchema.js (1d0021b)
- [ ] 1.2 worldInfoSchema.js
- [ ] 1.3 regexSchema.js
- [ ] 1.4 builtinPresets.js (15 seeds)
- [ ] 1.5 builtinWorldInfo.js (1 seed)
- [ ] 1.6 builtinRegex.js (2 seeds) [FIX: NAI placement is [1] not [2]]
- [ ] 1.7 seedDefaults.js
- [ ] 1.8 test-builtinSeeds.mjs + test-seedDefaults.mjs
- [ ] 1.9 stores/presets.js migration
- [ ] 1.10 stores/worldinfo.js migration
- [ ] 1.11 stores/regex.js migration
- [ ] 1.12 usePresets.js
- [ ] 1.13 useWorldInfo.js
- [ ] 1.14 useRegexScripts.js (with {{user}} watcher)
- [ ] 1.15 useSystemSeeds.js + wire to App.vue
- [ ] 1.16 PR1 phase-1 verification
- [ ] 2.1 ScopeBadge + SystemSeedBadge
- [ ] 2.2 PresetScopeTabs + PresetListItem + PresetEditorModal
- [ ] 2.3 WorldInfoScopeTabs + ListItem + EditorModal
- [ ] 2.4 RegexScopeTabs + ListItem + EditorModal
- [ ] 2.5 Refactor PresetsView.vue
- [ ] 2.6 Refactor WorldInfoView.vue
- [ ] 2.7 Refactor RegexView.vue
- [ ] 2.8 PR1 phase-2 verification
- [ ] 3.1 scopeResolver.js + test
- [ ] 3.2 presetInjector.js + test [FIX: add interpolatePresetContent for {{memoryContext}}]
- [ ] 3.3 regexEngine.js + test
- [ ] 3.4 worldInfoScanner.js + test
- [ ] 3.5 Extend chat.js#buildApiMessages (combined preset+WI+regex+prelude)
- [ ] 3.6 Apply regex to display in MessageBubble.vue
- [ ] 4.1 Wire useUserProfile.setPerson → syncPersonPresets
- [ ] 4.2 Wire imageGen toggle → syncAutoImageGenWI [FIX: hook in settings store action]
- [ ] 4.3 Wire bootSeeds into switchCharacter
- [ ] 5.1 Extend test-chatInjection.mjs
- [ ] 5.2 Add test:all-features npm script
- [ ] 5.3 Update rphub-desktop/AGENTS.md
- [ ] 5.4 Update root AGENTS.md
- [ ] 5.5 PR2 verification

## Pre-flight fixes applied

- 1.6: NAI regex `placement` changed from `[2]` to `[1]` (display only) so it actually applies
- 3.2: `presetInjector.js` will export `interpolatePresetContent(content, ctx)` for `{{memoryContext}}` substitution
- 3.5: `buildApiMessages` will call `interpolatePresetContent` for every preset before formatting
- 4.2: imageGen hook goes in `stores/settings.js` `setImageGenEnabled` action, not in `useImageGenTrigger`
