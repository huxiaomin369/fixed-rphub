# Design — Presets / World Info / Regex Global Config Parity

**Date:** 2026-07-26
**Status:** Draft (pre-implementation)
**Tag (target):** `v1-presets-wi-regex-parity`
**Author:** Generated from brainstorming session

## Problem

The web version (`/`) ships with **18 built-in "global" entries** (15 presets, 1 world info entry, 2 regex scripts) that auto-seed on first load and persist across reloads. They drive the roleplay experience: system prompt composition, world knowledge injection, and message transformation. The desktop version (`rphub-desktop/`) has the three corresponding views (CRUD UI), but:

- **No built-in seeds** — every user starts with empty presets / WI / regex
- **No execution layer** — `chat.js#buildApiMessages` does not read any of the three stores
- **Presets have no scope concept** at all
- **WorldInfo and Regex have an orphaned `globalXxx` array** in the store that the UI never touches
- **Hooks are incomplete** — `useUserProfile.setPerson` toggles presets, but no preset with name `第二人称`/`第三人称` exists in the seed; `useImageGenTrigger` parses `<auto_image_gen>` tags, but no WI entry exists

This breaks feature parity. A desktop user gets a much weaker RP experience than a web user with the same character card.

## Goal

Bring the desktop version to feature parity with the web version for these three features:

1. Ship the 18 built-in entries as auto-seeded defaults
2. Wire them into the chat pipeline so they actually take effect
3. Unify the `global` / `character` scope model across all three
4. Wire the three known hooks (person toggle, auto image gen, `{{user}}` replacement)
5. Add test coverage following the existing service-layer mock-fetch pattern

## Non-Goals

- Changing the character card data model (out of scope; no per-character preset/WI/regex binding beyond what web has)
- Adding new settings UI (e.g. global defaults editor) — built-ins are read-only at the entry level, content remains user-editable
- Changing the `.rphub` export format — additive changes only, old exports still import
- Refactoring the existing views beyond what's needed for scope tabs and seed locking

## Architecture

Strict 4-layer pattern (per `rphub-desktop/AGENTS.md`): **Service → Composable → Component → View**.

### Layer 1: Pure Services (`src/services/`)

**Seed data (3 files, pure JS objects):**

| File | Exports |
|---|---|
| `builtinPresets.js` | `BUILTIN_PRESETS` (15 entries), `BUILTIN_PRESET_NAMES` (Set), `PERSON_PRESET_NAMES` (`{'第二人称', '第三人称'}`) |
| `builtinWorldInfo.js` | `BUILTIN_WORLD_INFO` (1 entry: 自动生图), `BUILTIN_WORLD_INFO_NAMES` (Set) |
| `builtinRegex.js` | `BUILTIN_REGEX` (2 entries), `BUILTIN_REGEX_NAMES` (Set), `USER_REPLACE_REGEX_NAME` (`'Auto Replace {{user}}'`), `NAI_IMAGE_REGEX_NAME` (`'NAI画图正则'`) |

**Schemas (3 files, normalizers + type guards):**

| File | Exports |
|---|---|
| `presetSchema.js` | `normalizePreset(p)`, `isBuiltinPresetName(name)` |
| `worldInfoSchema.js` | `normalizeWorldInfoEntry(e)`, `isBuiltinWorldInfoName(name)` |
| `regexSchema.js` | `normalizeRegexScript(s)`, `isBuiltinRegexName(name)` |

**Seed enforcement (1 file):**

| File | Exports |
|---|---|
| `seedDefaults.js` | `ensureSeedPresets(list)`, `ensureSeedWorldInfo(list)`, `ensureSeedRegex(list)`, `isSeededEntry(entry, type)` |

**Execution logic (4 files, pure functions, Node-testable):**

| File | Exports |
|---|---|
| `presetInjector.js` | `formatPresetsForSystemPrompt(presets)`, `buildPreludeMessages(presets)`, `isSystemPreset(p)` |
| `worldInfoScanner.js` | `scanWorldInfo({ messages, worldInfo, settings })` |
| `regexEngine.js` | `applyRegexScripts({ text, scripts, options })` |
| `scopeResolver.js` | `resolveScopedEntries({ global, character })`, `mergeByScope(flat)` |

### Layer 2: Composables (`src/composables/`)

| Composable | Wraps | Reactive state |
|---|---|---|
| `usePresets.js` | `stores/presets.js` + `builtinPresets.js` + `seedDefaults.js` | `{ presets, addPreset, updatePreset, removePreset, movePreset, togglePreset, syncPersonPresets, ensureSeeds }` |
| `useWorldInfo.js` | `stores/worldinfo.js` + `builtinWorldInfo.js` + `seedDefaults.js` | `{ worldInfo, globalWorldInfo, settings, ...actions, syncAutoImageGenWI, ensureSeeds }` |
| `useRegexScripts.js` | `stores/regex.js` + `builtinRegex.js` + `seedDefaults.js` | `{ regexScripts, globalRegexScripts, ...actions, syncUserNameReplacement, ensureSeeds }` |
| `useSystemSeeds.js` | all 3 seed services | `{ bootSeeds() }` (calls all three `ensureSeeds` + dynamic syncs) |

### Layer 3: Components (`src/components/<feature>/`)

| Component | Purpose |
|---|---|
| `common/ScopeBadge.vue` | Pill: "全局" (blue) / "绑定当前角色卡" (purple) |
| `common/SystemSeedBadge.vue` | Lock icon + tooltip "内置条目" |
| `presets/PresetScopeTabs.vue` | 3 tabs: 全部 / 全局 / 绑定 |
| `presets/PresetListItem.vue` | One row with all controls |
| `presets/PresetEditorModal.vue` | Modal form (name, role, content, scope) |
| `worldinfo/WorldInfoScopeTabs.vue` | Same as preset tabs |
| `worldinfo/WorldInfoListItem.vue` | Same pattern |
| `worldinfo/WorldInfoEditorModal.vue` | All fields + scope |
| `regex/RegexScopeTabs.vue` | Same |
| `regex/RegexListItem.vue` | Same |
| `regex/RegexEditorModal.vue` | All fields + scope |

### Layer 4: Views

- `PresetsView.vue` — composes `usePresets` + scope tabs + list + modal
- `WorldInfoView.vue` — composes `useWorldInfo` + scope tabs + list + modal + 全局设置 sliders
- `RegexView.vue` — composes `useRegexScripts` + scope tabs + list + modal

Stores become thin persistence wrappers. They keep the localforage keys unchanged.

## Data Shapes

### Preset

```js
{
  name: String,             // 'New Preset' default
  content: String,          // '' default
  role: 'system' | 'user' | 'assistant',  // 'system' default
  enabled: Boolean,         // true default
  scope: 'global' | 'character',  // 'global' default (added vs current)
  systemSeed: Boolean,      // true only for built-ins (added)
  order: Number,            // sort key, lower = earlier (added)
}
```

### World Info Entry

```js
{
  id: String,               // UUID (added)
  comment: String,
  content: String,
  key: String[],            // primary keys
  secondaryKeys: String[],  // (added)
  selectiveLogic: Number,   // 0 default
  caseSensitive: Boolean,
  useRegex: Boolean,
  constant: Boolean,
  enabled: Boolean,
  position: 'global_note' | 'before_character' | 'after_character' | 'at_depth' | 'user_only' | 'assistant_only',
  depth: Number,            // 4 default
  order: Number,            // 100 default
  probability: Number,      // 100 default
  group: String,
  groupOverride: Boolean,
  groupWeight: Number,      // (added)
  scanDepth: Number | null,
  note: String,
  disableAddedEntryNotifications: Boolean,
  scope: 'global' | 'character',
  systemSeed: Boolean,      // (added)
}
```

### Regex Script

```js
{
  id: String,               // UUID (added)
  name: String,             // unified: web had both name and scriptName
  regex: String,            // find pattern
  flags: String,            // 'g' default
  replacement: String,      // unified: web had replacement and replaceString
  placement: Number[],      // [1, 2] default; 1=display, 2=prompt
  markdownOnly: Boolean,
  promptOnly: Boolean,
  runOnEdit: Boolean,
  minDepth: Number | null,
  maxDepth: Number | null,
  scope: 'global' | 'character',
  enabled: Boolean,
  systemSeed: Boolean,      // (added)
  order: Number,            // (added)
}
```

## Seed Enforcement Algorithm

Idempotent, name-keyed, preserves user edits. Lives in `src/services/seedDefaults.js`.

```js
function ensureSeedPresets(existingList) {
  const result = existingList.map(p => normalizePreset(p))
  const byName = new Map(result.map(p => [p.name, p]))
  for (const seed of BUILTIN_PRESETS) {
    if (!byName.has(seed.name)) {
      result.push({ ...seed, systemSeed: true, order: seed.order ?? 0 })
    }
    // If user already has an entry with the same name, leave it alone.
    // This preserves user's content edits AND enabled toggle.
  }
  return result.sort((a, b) => a.order - b.order)
}
```

Three rules:
1. **Never delete user entries** — only add or skip-if-exists.
2. **Never overwrite user content** — even if the seed file is updated later.
3. **Preserve user's `enabled` toggle** — disabled built-ins stay disabled.

The `Auto Replace {{user}}` regex's `replacement` is dynamic — synced to `activeProfile.name` via a watcher in `useRegexScripts` (mirrors web lines 2451–2457).

## Seeded Items (exact list)

| # | Name | Type | systemSeed | enabled default | order | scope |
|---|---|---|---|---|---|---|
| 1 | 破限 | preset (system) | ✅ | true | 0 | global |
| 2 | 破限预注入 · User 1 | preset (user) | ✅ | true | 100 | global |
| 3 | 破限预注入 · AI 1 | preset (assistant) | ✅ | true | 101 | global |
| 4 | 破限预注入 · User 2 | preset (user) | ✅ | true | 102 | global |
| 5 | 破限预注入 · AI 2 | preset (assistant) | ✅ | true | 103 | global |
| 6 | 色情内容增强 | preset (system) | ✅ | true | 200 | global |
| 7 | 防抢话 | preset (system) | ✅ | true | 201 | global |
| 8 | 防神化 | preset (system) | ✅ | true | 202 | global |
| 9 | 防重复 | preset (system) | ✅ | true | 203 | global |
| 10 | 人格内核 | preset (system) | ✅ | true | 204 | global |
| 11 | 文风（抗八股） | preset (system) | ✅ | true | 205 | global |
| 12 | 第二人称 | preset (system) | ✅ | conditional on `user.person !== 'third'` | 300 | global |
| 13 | 第三人称 | preset (system) | ✅ | conditional on `user.person === 'third'` | 301 | global |
| 14 | 禁止规则 | preset (system) | ✅ | true | 400 | global |
| 15 | COT | preset (system) | ✅ | true | 500 | global |
| 16 | 自动生图 | world info (at_depth 4) | ✅ | false | n/a | global |
| 17 | Auto Replace `{{user}}` | regex | ✅ | true | n/a | global |
| 18 | NAI画图正则 | regex | ✅ | false | n/a | global |

Notes 12, 13, 18 default to `enabled: false` per the web version. Initial state on first boot reflects the active profile's `person` setting (mirrors web's initial preset enforcement at lines 10940–10979).

**COT dynamic content:** the `COT` preset (item 15) contains a template string with `{{memory}}` / `{{chatHistory}}` placeholders. At runtime in `chat.js`, the placeholders are interpolated from `useMemoryStore()` and the current chat history before the preset is added to the system prompt. This is the only preset with runtime interpolation; all others are static strings.

## Scope Model Unification

All three features share one model:

- Each entry has `scope: 'global' | 'character'`
- World Info and Regex stores persist a **dual array** (`<feature>` + `global<Feature>`); the `<feature>` list is the union, the `global<Feature>` list is the global-only mirror used for export stripping
- Presets have **no character binding** (per web) — always `scope: 'global'`

### Default scope on create

"Character loaded" = `useCharactersStore().currentCharacterId != null`.

| Feature | No character loaded | Character loaded |
|---|---|---|
| Preset | global | global (no per-character) |
| World Info | global | character |
| Regex | global | character |

### Migration (idempotent, runs on first boot after this lands)

For each of the three stores, after loading from localforage:

```js
function migrateStore(flat) {
  for (const entry of flat) {
    if (entry.scope == null) entry.scope = 'global'  // legacy default
  }
  return flat
}
```

Legacy entries (created before scope existed) all default to `'global'`. Matches web behavior. Documented in changelog. **This migration runs in Phase 1, inside the store's `loadXxx` action, before `ensureSeeds` is called.**

### Merge order in `resolveScopedEntries`

When a character is loaded, character-scoped entries appear **first** in the merged list, followed by global entries. This matches web's `switchCharacter` (lines 9837–9894) where character WI/regex is loaded before the global mirror is appended. The merged order matters for regex (scripts run in order) and for WI in the same-position bucket.

## Execution Layer

### Service contracts

**`formatPresetsForSystemPrompt(presets)`** — `src/services/presetInjector.js`
- Input: `presets` array, all `enabled: true`, role `'system'`
- Output: `string`
- 破限 is excluded (consumed as system lead by chat.js)
- Wraps remaining in `[System Presets]\n` header + numbered list
- Returns `''` if no enabled system presets

**`buildPreludeMessages(presets)`** — same file
- Input: `presets` array
- Output: `[{ role, content }, ...]`
- Returns 0–4 messages in fixed order: User 1, AI 1, User 2, AI 2

**`scanWorldInfo({ messages, worldInfo, settings })`** — `src/services/worldInfoScanner.js`
- Returns `{ systemNoteEntries, beforeCharEntries, afterCharEntries, depthEntries: Map<depth, Entry[]> }`
- Logic per entry:
  1. `constant: true` → always match
  2. `useRegex: true` → test each key as regex
  3. else → substring test (case-sensitive flag)
  4. Apply `selectiveLogic` for multi-key
  5. Apply `probability` (deterministic given seed)
- Buckets by `position` field, sorts by `order` ascending
- Respects `scanDepth` and `maxDepth` caps

**`applyRegexScripts({ text, scripts, options })`** — `src/services/regexEngine.js`
- `options.applyTo`: `'display' | 'prompt'`
- Filters: `enabled`, `placement`, `min/maxDepth`, `markdownOnly`/`promptOnly`
- Applies in `order` order; try/catch per script (log + continue on error)

**`resolveScopedEntries({ global, character })`** — `src/services/scopeResolver.js`
- Always includes global entries
- Always includes character entries (caller decides character scope)

### Chat pipeline integration — `src/stores/chat.js#buildApiMessages`

```
1. System prompt (in order):
   a. 破限 preset content (if enabled) — exact content as lead
   b. formatPresetsForSystemPrompt(enabledSystemPresets - 破限) → "[System Presets]" block
   c. scanWorldInfo(...).systemNoteEntries → appended
   d. settings.systemPrompt
   e. Character card (name, description, personality) + mes_example
   f. User Info block (existing)

2. buildPreludeMessages(enabledPresets) → 0–4 messages inserted
   AFTER system, BEFORE character greeting

3. Per-message injection:
   - For each message at depth N, scanWorldInfo returns depthEntries
     → injected as system notes at configured depth (default 4)

4. Regex transform:
   - Outgoing: applyRegexScripts(text, scopedRegex, { applyTo: 'prompt' })
   - Display: applyRegexScripts(text, scopedRegex, { applyTo: 'display' })
```

The existing `buildApiMessages` is **extended** additively. Existing tests in `scripts/test-chatInjection.mjs` continue to pass.

## Hooks

### Person → Preset

`useUserProfile.setPerson(person)`:
- Existing: updates `activeProfile.person`
- New: also calls `usePresets().syncPersonPresets(person)`:
  - `第二人称` → `enabled = (person === 'second')`
  - `第三人称` → `enabled = (person === 'third')`
- Idempotent

### Auto image gen → WI

`useImageGenTrigger`:
- New: when image-gen enabled/disabled, calls `useWorldInfo().syncAutoImageGenWI(enabled)`:
  - `自动生图` entry → `enabled = !!imageGenEnabled`
- Mirrors web `setAutoImageGen` (line 12133)

### `{{user}}` → username sync

`useRegexScripts`:
- Watches `useSettingsStore().activeProfile.name` (deep)
- On change, updates `Auto Replace {{user}}` script's `replacement`

### Character switch → re-sync

`useSystemSeeds.bootSeeds()`:
- Called from `App.vue` on first load
- Called from `stores/characters.js#switchCharacter` on every character switch
- Idempotent: re-runs `ensureSeedXxx` for all three
- After enforcement, runs `syncPersonPresets` and `syncAutoImageGenWI`

## UI Changes

### Locking behavior for system-seeded entries

- Show `SystemSeedBadge` (lock icon)
- Delete button **disabled** (tooltip: "内置条目不可删除")
- Content fields remain **editable** (user can override)
- `systemSeed: true` stays true forever — we never try to re-overwrite

### View refactor (line count targets)

| View | Current | Target | Reason |
|---|---|---|---|
| `PresetsView.vue` | 364 | ~150 | Extract 3 child components |
| `WorldInfoView.vue` | 528 | ~200 | Extract 3 child components |
| `RegexView.vue` | 488 | ~180 | Extract 3 child components |

The 全局设置 sliders in `WorldInfoView` are preserved (settings remain in `store.worldInfoSettings`).

## Tests

### New test scripts

| File | Covers | Approx. test count |
|---|---|---|
| `scripts/test-builtinSeeds.mjs` | 3 builtin*.js files | ~20 |
| `scripts/test-seedDefaults.mjs` | seedDefaults.js | ~12 |
| `scripts/test-presetInjector.mjs` | presetInjector.js | ~10 |
| `scripts/test-worldInfoScanner.mjs` | worldInfoScanner.js | ~20 |
| `scripts/test-regexEngine.mjs` | regexEngine.js | ~15 |
| `scripts/test-scopeResolver.mjs` | scopeResolver.js | ~8 |

### Extended test scripts

- `scripts/test-chatInjection.mjs` — add 5–8 tests for preset/WI/regex integration in `buildApiMessages`

### New npm scripts

```json
{
  "test:seeds": "node scripts/test-builtinSeeds.mjs",
  "test:seedDefaults": "node scripts/test-seedDefaults.mjs",
  "test:presetInjector": "node scripts/test-presetInjector.mjs",
  "test:worldInfoScanner": "node scripts/test-worldInfoScanner.mjs",
  "test:regexEngine": "node scripts/test-regexEngine.mjs",
  "test:scopeResolver": "node scripts/test-scopeResolver.mjs",
  "test:all-features": "npm run test:generator && npm run test:chat && node scripts/test-settingsServices.mjs && npm run test:seeds && npm run test:seedDefaults && npm run test:presetInjector && npm run test:worldInfoScanner && npm run test:regexEngine && npm run test:scopeResolver"
}
```

## Phasing

| Phase | Scope | Verification |
|---|---|---|
| **1: Data + Stores** | 3 builtin*.js + 3 schema.js + seedDefaults.js. Migrate 3 stores (backfill `scope` field on legacy entries, see Scope Model Unification § Migration). Add `useSystemSeeds`. | Dev: 3 views show 18 seeded items, locked delete works |
| **2: UI Components** | 12 new components. Refactor 3 views. | Dev: scope tabs filter, editor modals work |
| **3: Execution Layer** | 4 execution services. Extend `chat.js#buildApiMessages`. | Dev: chat shows 破限 lead + System Presets + prelude + WI at_depth + regex `{{user}}` |
| **4: Hooks** | Wire `useUserProfile.setPerson`, `useImageGenTrigger`, `{{user}}` watcher. Call `bootSeeds` from `App.vue` + `switchCharacter`. | Dev: toggles propagate; rename profile updates `{{user}}` replacement |
| **5: Tests + Docs** | 6 new test scripts. Extend `test:chat`. Update AGENTS.md. Run all tests. | `npm run test:all-features` passes |

## Risks

| Risk | Mitigation |
|---|---|
| 15 preset strings are long; porting risk | Copy block verbatim from web commit; exact-match test on `破限` content |
| Existing user data lacks `scope` field | Migration backfills to `'global'` (matches web); documented in changelog |
| Regex engine crashes on invalid pattern | Wrap each script in try/catch, log + continue; tested |
| World info scanner has many flags | Implement incrementally per Phase 3 sub-step; tests cover flag subsets |
| `{{user}}` replacement diverges from active profile | Watcher in `useRegexScripts` keeps them in sync |
| Performance — WI scan per message | Cap by `maxDepth`; memoize merged array per character switch |
| `.rphub` export format breakage | Additive only; new fields default to safe values; import uses normalizers |
| Vue/Pinia runtime not unit-testable | Execution logic in pure services; Vue layer verified by manual dev walkthrough |

## Estimated Effort

| Phase | Hours |
|---|---|
| 1 | 4–6 |
| 2 | 3–4 |
| 3 | 6–8 |
| 4 | 2–3 |
| 5 | 4–6 |
| **Total** | **~20–25** |

Recommend splitting into 2 PRs: PR1 = Phases 1+2, PR2 = Phases 3+4+5. Reviewability over speed.

## Open Questions

None at this time. All design decisions were resolved during brainstorming.
