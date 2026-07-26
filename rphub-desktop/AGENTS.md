# AGENTS.md — RPHub Desktop (Electron)

## Architecture

- **electron-vite** build toolchain. `npm run dev` starts dev server + Electron window.
- Two processes:
  - `electron/main/index.js` — Electron main process, creates `BrowserWindow` with `webSecurity: false`
  - `electron/preload/index.js` — `contextBridge` exposing `window.electronAPI` (main window) + `window.workshopAPI` (workshop window)
- Renderer is a Vue 3 SPA (Options API, `setup()` returning reactive state).
- State managed via **Pinia** stores, persisted via `localforage` (IndexedDB).
- **No Vue Router.** View switching via `<component :is>` with `currentView` computed.
- **AI character generator** lives in `src/services/characterGenerator.js` — a pure, framework-agnostic LLM streaming + section parser. Wrapped by `src/composables/useGenerator.js` for the main window, and re-implemented self-contained in `character/ai-assistant.js` for the workshop window.

## Development

```bash
npm run dev                # Start Electron dev mode (Vite HMR + Electron window)
npm run build              # Build for production

# Test scripts (all are pure-Node mock-fetch; no test framework)
npm run test:generator           # 27 tests — characterGenerator.js
npm run test:chat                # 16 tests — chat.js system-prompt injection (9 original + 7 new for preset/WI/regex integration)
node scripts/test-settingsServices.mjs   # 35 tests — apiProviders / connectionCheck / imageGen / userProfile
npm run test:seeds               # 39 tests — builtinPresets/WorldInfo/Regex
npm run test:seedDefaults        # 24 tests — seedDefaults.js (idempotent merge)
npm run test:presetInjector      # 18 tests — presetInjector.js (format / prelude / interpolate)
npm run test:worldInfoScanner    # 13 tests — worldInfoScanner.js (constant/keyword/regex/bucketing)
npm run test:regexEngine         # 22 tests — regexEngine.js (placement / scope / depth / error tolerance)
npm run test:scopeResolver       #  6 tests — scopeResolver.js
npm run test:all-features        # Aggregator: runs all 9 suites (200 tests, must all pass before commit)
```

- **200/200 tests pass** across 9 mock-fetch scripts. No linter, no typecheck, no test framework.
- `src/` is the renderer source. `electron/` is the main process source.
- Tailwind CSS v4 via Vite plugin (`@tailwindcss/vite`). **Every CSS file that uses utility classes must start with `@import "tailwindcss";`** — see "Tailwind v4" below.

## Architectural Patterns

### Service → Composable → Component → View

For new features with non-trivial logic, follow this 4-layer pattern (established by the AI character generator):

1. **`src/services/<feature>.js`** — pure, framework-agnostic ESM module. No Vue, Pinia, or Electron imports. Exports plain functions taking callbacks. Testable directly via Node.
2. **`src/composables/use<Feature>.js`** — Vue 3 composable wrapping the service with `ref()` state. Imports Pinia stores as needed. Returns `{ state, actions }` for the component.
3. **`src/components/<feature>/*.vue`** — small, focused UI components. Consume the composable. Emit events to the view.
4. **`src/views/<Feature>View.vue`** — orchestrates components, holds layout, calls save/export/load. Renders the composable's state.

**Don't** inline business logic in views or components. The whole point is to make the service unit-testable and the view small.

### Workshop local modules

`character/` is a separate Vite entry — it cannot import from the main bundle. For features that need to run in the workshop window (e.g. the AI assistant), write self-contained ESM modules in `character/` (e.g. `character/ai-assistant.js`, `character/diff-modal.js`). Duplicate the prompt + parser; do not try to import from `src/`.

## Key Files

| Path | Role |
|------|------|
| `electron/main/index.js` | BrowserWindow with `webSecurity: false` |
| `electron/preload/index.js` | IPC bridge: `window.electronAPI.*` (main) + `window.workshopAPI.*` (workshop) |
| `electron/ipc-handlers.js` | IPC handlers for dialog, fs, data backup, settings sync |
| `electron/workshop.js` | Workshop window management |
| `src/main.js` | Vue entry + Pinia setup + `window.__getAllDataForExport` |
| `src/App.vue` | Root component: sidebar + `<component :is>` routing + global `<ConfirmModal>` |
| `src/services/characterGenerator.js` | **Pure** LLM streaming + section parser service (no Vue/Pinia/Electron) |
| `src/services/apiProviders.js` | **Pure** API/文生图 provider 预设表（8 个 API + 2 个文生图 + 2 个自定义槽）+ `resolveActiveApiProvider` / `resolveActiveImageGenProvider` 解析 helpers |
| `src/services/connectionCheck.js` | **Pure** `checkApiConnection` / `checkImageGenConnection` 连接探测（GET /models + HEAD /images/generations，10s AbortController） |
| `src/services/imageGen.js` | **Pure** 文生图 fetch + `IMAGE_STYLES` / `IMAGE_SIZES` / `STYLE_ARTISTS` / `sizeToDims` / `styleToArtists` / `generateImages`。STYLE_ARTISTS 字符串必须从 `assets/js/app.js:9461-9480` 整段复制，**不要凭想象写** |
| `src/services/userProfile.js` | **Pure** 人设 CRUD/迁移纯函数：`createProfile` / `ensureUserProfiles` / `buildUserInfoPrompt` / `applyPersonToggle` / `migrateLegacyUser` |
| `src/composables/useGenerator.js` | Vue composable wrapping `runNewGeneration` with reactive state |
| `src/composables/useUserProfile.js` | Vue composable wrapping `settings.userProfiles` + `switchProfile` / `setPerson` |
| `src/composables/useImageGenTrigger.js` | Vue composable 解析 AI 回复中的 `<auto_image_gen>...</auto_image_gen>` 标签并调用 `imageGen.generateImages`，串行生成，错误时设 `message.imageStatus = 'error'` 并 toast |
| `src/stores/*.js` | 8 Pinia stores (chat, characters, settings, ui, memory, **presets**, **worldinfo**, **regex**)。presets/worldinfo/regex 三个 store 在 v1-presets-wi-regex-parity 中扩展：dual-array（`worldInfo` + `globalWorldInfo` / `regexScripts` + `globalRegexScripts`）、scope 字段（`'global'\|'character'`）、`loadXxx` 时 backfill legacy `scope='global'` + 调用 `ensureSeedXxx`、CRUD 时 `systemSeed===true` 守卫禁止删除内置条目 |
| `src/stores/settings.js` | 扩展后含 6 个新字段：`userProfiles: []` / `activeProfileId` / `apiStatus` / `apiLatency` / `imageGenStatus` / `imageGenLatency`；7 个新 actions：`setUserProfiles` / `addUserProfile` / `deleteUserProfile` / `setActiveProfile` / `updateActiveProfile` / `setApiStatus` / `setImageGenStatus`；`loadSettings` 内置幂等旧数据迁移（apiKey → apiProviderKeys / imageGenKey → imageGenProviderKeys / user → userProfiles，迁移后 `delete settings.user`）；300ms 防抖的 `watch(settings, pushToMainProcess, { deep: true })` |
| `src/stores/chat.js` | 消息加 `images: []` 字段；`buildApiMessages` 10 步组装：(1) 破限 lead (2) System Presets 块 (3) WI `global_note` (4) `settings.systemPrompt` (5) 角色卡 (6) `[User Info]` 段 (7) prelude preset 消息 (8) 首条 greet (9) 历史消息 + per-message regex 转换 + per-depth WI 注入 (10) after-character WI；COT 预设的 `{{memoryContext}}` 从 `useMemoryStore().memories` 插值；`generateResponse` finally 块动态 `import('../composables/useImageGenTrigger.js')` 触发文生图，并带 `wasAborted` 守卫避免用户取消后仍生成图片 |
| `src/views/*.vue` | 12 page-level Vue components (Chat, Character, Memory, Tool, Usage, Square, Generator, UITemplates, Presets, WorldInfo, Regex, Settings) |
| `src/views/SettingsView.vue` | 装配 5 个 section：`<UserProfileSection />` / `<ApiConfigSection />` / `<ImageGenSection />` + 原有 UI 偏好 + 数据管理 |
| `src/components/` | Shared components: `chat/`, `common/`, `sidebar/`, `characters/`, `generator/`, `settings/` |
| `src/components/settings/ProviderDropdown.vue` | 可复用：下拉选 provider（带 logo/自定义槽） |
| `src/components/settings/ConnectionStatusBadge.vue` | 可复用：状态徽章（绿/红/灰 + 延迟） |
| `src/components/settings/UserProfileSection.vue` | 多 profile 管理 UI：头像条 + 当前 profile 编辑（name/description/avatar/person），切换人称自动联动 presets |
| `src/components/settings/ApiConfigSection.vue` | API provider + URL/Key/模型 + 测试连接（`ProviderDropdown` + `ConnectionStatusBadge` 复用） |
| `src/components/settings/ImageGenSection.vue` | 文生图 provider + 风格/尺寸/数量 + 测试连接（`ProviderDropdown` + `ConnectionStatusBadge` 复用） |
| `src/components/chat/MessageBubble.vue` | 渲染消息末尾 `images` 网格（2 列 + base64 dataURL），`imageStatus === 'generating'` 时显示 spinner；通过 `useRegexScripts` + `applyRegexScripts({ applyTo: 'display' })` 在渲染时执行 display 通道 regex（替换 `{{user}}`、剥离 NAI `@image@` 标签等） |
| `src/components/sidebar/Sidebar.vue` | 左下角 user mini：从 `useSettingsStore` 读 active profile，实时显示头像/名称（绑定到 reactive `computed`） |
| `src/components/common/ConfirmModal.vue` | Global confirm dialog driven by `ui.confirmDialog` state |
| `src/api/index.js` | `fetch()` API wrapper, supports SSE streaming via `ReadableStreamDefaultReader` |
| `src/utils/` | ESM versions of original browser utilities (card-utils, ui-select, utils) |
| `src/package.json` | **ESM marker** — `{"type": "module"}`. Required so Node can ESM-import from `src/` in the test script. Do not remove. |
| `character/` | Vite second entry — workshop window. Loads its own `app.js` + `diff-modal.js`. |
| `character/ai-assistant.js` | Self-contained copy of the diff-mode AI service for the workshop window |
| `character/diff-modal.js` | Workshop AI assistant modal UI (streaming diff cards) |
| `scripts/test-characterGenerator.mjs` | Mock-fetch test script — 27 tests covering `characterGenerator.js` |
| `scripts/test-settingsServices.mjs` | Mock-fetch test script — 28 tests covering `apiProviders` / `connectionCheck` / `imageGen` / `userProfile`。无 npm script，直接 `node scripts/test-settingsServices.mjs` |
| `scripts/test-chatInjection.mjs` | 9 tests 验证 `chat.js` system-prompt 注入行为（含 2 个 behavioral + 7 个 source-text regression）。`npm run test:chat` |
| `scripts/extract-prompt.mjs` | One-shot re-sync of `SINGLE_PLAYER_SYSTEM_PROMPT` from web's `character/index.html` |
| `src/services/builtinPresets.js` | 15 built-in preset seeds (破限, 人称, 文笔增强, 故事设计等) |
| `src/services/builtinWorldInfo.js` | 1 built-in WI seed (自动生图) |
| `src/services/builtinRegex.js` | 2 built-in regex seeds (Auto Replace `{{user}}`, NAI画图正则) |
| `src/services/presetSchema.js` / `worldInfoSchema.js` / `regexSchema.js` | Pure normalizers — tolerate malformed input, never throw |
| `src/services/seedDefaults.js` | Idempotent seed merge: `ensureSeedPresets` / `ensureSeedWorldInfo` / `ensureSeedRegex`; `isSeededEntry` helper (also `ensureSeedWorldInfoGlobal` / `ensureSeedRegexGlobal` for global-scope stores that live separately) |
| `src/services/presetInjector.js` | `formatPresetsForSystemPrompt` (system presets → `[System Presets]` block with `{{placeholder}}` interpolation) + `buildPreludeMessages` + `getBreakLimitContent` |
| `src/services/worldInfoScanner.js` | `scanWorldInfo` — constant / keyword / regex / AND-NOT matching, buckets into `systemNoteEntries` / `beforeCharEntries` / `afterCharEntries` by position |
| `src/services/regexEngine.js` | `applyRegexScripts` — error-tolerant regex chain (placement / scope / minDepth / maxDepth), handles `/pattern/flags` + inline `(?s)(?i)(?m)` modifiers |
| `src/services/scopeResolver.js` | `resolveScopedEntries` (character-scoped takes priority over global) + `mergeByScope` |
| `src/composables/usePresets.js` | Vue composable wrapping presets store: `syncPersonPresets` (人称 toggle), `ensureSeeds`, `isPersonPreset`, `isBuiltin` |
| `src/composables/useWorldInfo.js` | Vue composable wrapping WI store: `syncAutoImageGenWI`, `ensureSeeds` |
| `src/composables/useRegexScripts.js` | Vue composable wrapping regex store: `syncUserNameReplacement`, `ensureSeeds` |
| `src/composables/useSystemSeeds.js` | Orchestrator: `bootSeeds()` calls all three `ensureSeeds` + `syncPersonPresets` + `syncUserNameReplacement` on app boot |
| `src/components/presets/PresetScopeTabs.vue` / `PresetListItem.vue` / `PresetEditorModal.vue` | Refactored preset UI: scope tabs, list item (badge + toggle), editor modal |
| `src/components/worldinfo/WorldInfoScopeTabs.vue` / `WorldInfoListItem.vue` / `WorldInfoEditorModal.vue` | Refactored world info UI: scope tabs, list item, editor modal |
| `src/components/regex/RegexScopeTabs.vue` / `RegexListItem.vue` / `RegexEditorModal.vue` | Refactored regex UI: scope tabs, list item, editor modal |
| `src/components/common/ScopeBadge.vue` | Shared UI atom: renders `global` / `character` scope badge |
| `src/components/common/SystemSeedBadge.vue` | Shared UI atom: renders 🔒 lock badge on built-in seeds (system seeds cannot be deleted; edits are preserved) |

## Tailwind v4

This project uses Tailwind v4. Two non-obvious gotchas that bit us:

1. **Every CSS file with utilities needs `@import "tailwindcss";`** at the top. Vite's `@tailwindcss/vite` plugin does NOT auto-inject the import (unlike v3's PostCSS plugin). Without it, no utility classes are generated and the page renders as unstyled HTML.
2. **Custom color names like `primary-*` are NOT in the default palette** — you must declare them in a `@theme` block:
   ```css
   @import "tailwindcss";
   @theme {
     --color-primary-50: #eff6ff;
     --color-primary-100: #dbeafe;
     /* ... 50..900 ... */
   }
   ```
   The canonical palette is in `character/style.css` (lines 3-13). `src/assets/styles.css` mirrors it. When adding a new CSS file that uses `primary-*`, copy the `@theme` block.

## CORS

`webSecurity: false` in BrowserWindow — renderer `fetch()` can call any API domain without restriction. No proxy, no IPC forwarding. Users can configure any third-party API endpoint freely.

## Workshop Window

`character/index.html` is a second Vite entry. The workshop opens a separate `BrowserWindow` and communicates with the main window via IPC:

- **Main → Workshop:** `workshop:load` carries the full character object (not just an id)
- **Workshop → Main:** `workshop:save` (one-way `ipcRenderer.send`); main process relays to main window via `workshop:update`
- **AI assistant:** workshop has an `AI 助手` button → opens a diff-mode modal (`character/diff-modal.js`) → calls `runDiffGeneration` from `character/ai-assistant.js` → streams `<<<<<<<FIND/=======/>>>>>>>REPLACE` blocks → user can apply/reject per field
- **Settings sync:** workshop cannot read the main window's Pinia stores (separate renderers). The main window's `settings` store has a `watch()` that pushes the latest settings via `electronAPI.pushSettings(settings)` → main process caches in memory → workshop asks via `workshopAPI.requestSettings()`

## Data Persistence

- All user data stored via `localforage` (IndexedDB). Same keys as original browser app.
- Full backup/restore via `.rphub` file (native OS dialogs).
- Export path: `window.electronAPI.exportAllData()` → main process collects all localforage data → writes `.rphub` file.
- Import path: reads `.rphub` → validates format → restores to localforage → reloads all stores.

## AI Character Generator

User types a free-text description in `GeneratorView` → LLM streams a structured character card with 9 fields (Name, Description, Personality, First Message, Post History Instructions, Creator Notes, Avatar Prompt, World Info, Regex Scripts). Live progress bar with per-section status. Truncation auto-retries non-streaming. Saved cards flow into the Workshop window's AI assistant for diff-based editing.

- **System prompt:** `SINGLE_PLAYER_SYSTEM_PROMPT` in `src/services/characterGenerator.js` is a verbatim copy of the web version's `singlePlayerSystemPrompt` (in `character/index.html`). Re-sync via `node scripts/extract-prompt.mjs` if the web prompt changes.
- **Spec + plan:** `docs/superpowers/specs/2026-07-25-ai-character-generator-design.md`, `docs/superpowers/plans/2026-07-25-ai-character-generator.md`
- **Tags:** `v1-ai-character-generator` is the release tag. `phase-1-core-service` / `phase-2-generatorview` / `phase-3-workshop` mark the phase boundaries.

## Settings Page（v1-settings-page-parity）

The settings page (`SettingsView.vue`) has 5 sections matching the web version's experience:

1. **用户人设** (`UserProfileSection.vue`) — multi-profile CRUD with avatar upload, name, description, person (第二/第三人称). Switching person auto-toggles the "第二人称"/"第三人称" presets.
2. **API 配置** (`ApiConfigSection.vue`) — provider dropdown (8 built-in + 2 custom slots), URL/Key, model tiers (quality/balanced/fast), temperature, stream toggle, test connection.
3. **文生图配置** (`ImageGenSection.vue`) — provider dropdown (2 built-in + 2 custom slots), style (7 options), size (9 options), count (1-6), test connection.
4. **界面偏好** — font size, font family, character background, immersive mode, context size.
5. **数据管理** — full backup/restore via `.rphub` file.

**Sidebar binding**: the user mini at the bottom-left of `Sidebar.vue` reads from the active profile via `useSettingsStore` — switching profile in settings instantly updates the sidebar avatar/name.

**Chat integration**:
- The active profile's `[User Info]` block is injected into every chat request's system prompt via `chat.js#buildApiMessages`.
- Image gen is triggered by parsing `<auto_image_gen>...</auto_image_gen>` tags in the AI reply (via `useImageGenTrigger.js`). Generated images are attached to the message and rendered in `MessageBubble.vue` as a 2-column grid. Image gen is suppressed when the user cancels mid-generation (`wasAborted` guard).

**Legacy data migration** (in `settings.js#loadSettings`): runs once at startup, idempotent.
- `apiKey` → `apiProviderKeys[currentProviderId]`
- `imageGenKey` → `imageGenProviderKeys.agnes` (+ default model)
- `settings.user` → first `userProfiles` entry, then `delete settings.user`

**Provider preset tables** (8 API + 2 文生图) live in `src/services/apiProviders.js`. The `STYLE_ARTISTS` constants in `src/services/imageGen.js` are **copied verbatim from the web version's `assets/js/app.js:9461-9480`** — do not invent.

- **Spec + plan:** `docs/superpowers/specs/2026-07-26-settings-page-feature-parity-design.md`, `docs/superpowers/plans/2026-07-26-settings-page-feature-parity.md`
- **Tag:** `v1-settings-page-parity`

## Seed Defaults（v1-presets-wi-regex-parity）

Three new `builtin*.js` modules ship **18 built-in seed entries** (15 presets + 1 WI + 2 regex) that are automatically merged into the user's data on first boot and preserved across reloads. The work brings the desktop version to feature parity with the web version's behavior.

### Seeded items (exact list)

| # | Name | Type | `systemSeed` | `enabled` default | `scope` |
|---|---|---|---|---|---|
| 1 | 破限 | preset (system, lead) | ✅ | true | global |
| 2 | 破限预注入 · User 1 | preset (user, prelude) | ✅ | true | global |
| 3 | 破限预注入 · AI 1 | preset (assistant, prelude) | ✅ | true | global |
| 4 | 破限预注入 · User 2 | preset (user, prelude) | ✅ | true | global |
| 5 | 破限预注入 · AI 2 | preset (assistant, prelude) | ✅ | true | global |
| 6 | 色情内容增强 | preset (system) | ✅ | true | global |
| 7 | 防抢话 | preset (system) | ✅ | true | global |
| 8 | 防神化 | preset (system) | ✅ | true | global |
| 9 | 防重复 | preset (system) | ✅ | true | global |
| 10 | 人格内核 | preset (system) | ✅ | true | global |
| 11 | 文风（抗八股） | preset (system) | ✅ | true | global |
| 12 | 第二人称 | preset (system) | ✅ | false (toggled by `user.person`) | global |
| 13 | 第三人称 | preset (system) | ✅ | false (toggled by `user.person`) | global |
| 14 | 禁止规则 | preset (system) | ✅ | true | global |
| 15 | COT | preset (system, with `{{memoryContext}}` placeholder) | ✅ | true | global |
| 16 | 自动生图 | world info (constant, `at_depth: 4`) | ✅ | false (gated by imageGen) | global |
| 17 | Auto Replace `{{user}}` | regex (`{{user}}` → active profile name) | ✅ | true | global |
| 18 | NAI画图正则 | regex (strips `@image@…@imageEnd@` from display) | ✅ | false (opt-in) | global |

### Seed merge pattern (`src/services/seedDefaults.js`)

Each `ensure*` function receives the user's existing list and returns a new list with all built-in seeds guaranteed present. Matching is by unique `name` (presets/regex) or `comment` (world info). Three rules:
1. **Never delete user entries** — only add or skip-if-exists.
2. **Never overwrite user content** — even if the seed file is updated later, the user's local copy wins.
3. **Preserve user's `enabled` toggle** — disabled built-ins stay disabled.

### Lock badge (`src/components/common/SystemSeedBadge.vue`)

Renders a 🔒 icon on built-in seed entries. System seeds **cannot be deleted** — the delete button is disabled with a tooltip. Users can edit their **content** freely, and edits persist across reloads since only the presence (not the content) is re-enforced by the merge.

### Scope model

- Presets: always `scope: 'global'` (no character binding in web or desktop; web parity).
- World Info and Regex: each entry has `scope: 'global' | 'character'`. Stores persist a **dual array** (`worldInfo` + `globalWorldInfo`, `regexScripts` + `globalRegexScripts`) and a **dual key** (`'worldinfo'` + `'global_worldinfo'`, `'regex'` + `'global_regex'`) — the global-only mirror is used for export stripping. `scopeResolver.js` merges character-scoped first, then global. Legacy entries missing the `scope` field are backfilled to `'global'` on first load (idempotent migration).

Default scope on create: `'character'` if a character is currently loaded, else `'global'` (for WI/Regex). Presets are always `'global'`.

### Person preset auto-toggle (`usePresets.js#syncPersonPresets`)

When the active profile's `person` field changes between `第二人称` / `第三人称`, only the matching preset is enabled. Avoids the conflict of both person-presets being active simultaneously. Wired into `useUserProfile.setPerson()` (Task 4.1).

### Auto image-gen → 自动生图 WI sync

When the user has a non-empty `imageGenProviderKeys[imageGenProviderId]` (i.e., imageGen is configured), `useSystemSeeds.bootSeeds()` calls `useWorldInfo.syncAutoImageGenWI(true)` so the `自动生图` WI is enabled. Additionally, `ImageGenSection.vue` watches `settings.imageGenKey` and calls the same sync on toggle (Task 4.2). The pattern follows the web's `setAutoImageGen` (app.js line 12133).

### `{{user}}` → username sync (`useRegexScripts.js`)

Watches `useSettingsStore().activeProfile.name` (deep) and updates the `Auto Replace {{user}}` script's `replacement` field whenever the active profile name changes. Mirrors web lines 2451–2457.

### Character switch re-sync (`useSystemSeeds.bootSeeds`)

Called from `App.vue` `onMounted()` and from `stores/characters.js#selectCharacter` (Task 4.3). `bootSeeds()` is idempotent — running it on every character switch just re-syncs the dynamic fields (person, `{{user}}`, 自动生图). It also persists (`presets.save()`, `worldInfo.save()`/`saveGlobal()`, `regex.save()`/`saveGlobal()`).

### Chat pipeline integration (`src/stores/chat.js#buildApiMessages`)

Extended additively. New assembly order:
1. 破限 lead (via `getBreakLimitContent`, COT placeholder interpolated from `useMemoryStore.memories`)
2. System Presets block (via `formatPresetsForSystemPrompt`, excludes 破限, interpolates `{{memoryContext}}`)
3. World info `global_note` entries (from `scanWorldInfo`)
4. User's `settings.systemPrompt`
5. Character card (name + personality + description + mes_example)
6. User Info block (existing)
7. **Prelude messages** (User 1/AI 1/User 2/AI 2 from prelude presets) — inserted as separate chat messages after system, before greeting
8. Character greeting (first_mes if first message)
9. Chat history with **per-message regex transform** (`applyTo: 'prompt'`, depth-aware) and **per-depth WI injection** (`scanWorldInfo.depthEntries.get(depth)`)
10. After-character WI (rarely used)

Display side: `src/components/chat/MessageBubble.vue` applies `applyRegexScripts` with `applyTo: 'display'` so `{{user}}` is replaced in the rendered markdown.

### Critical fix history

Two issues were caught by the final whole-branch review and fixed:
- `2d603d5` — COT `{{memoryContext}}` interpolation wired (passes memory store context to preset formatter); boot-time imageGen sync uncommented in `useSystemSeeds` to use `imageGenProviderId`+`imageGenProviderKeys` lookup.

- **Spec + plan:** `docs/superpowers/specs/2026-07-26-presets-worldinfo-regex-parity-design.md`, `docs/superpowers/plans/2026-07-26-presets-worldinfo-regex-parity.md`
- **Tag (target):** `v1-presets-wi-regex-parity`

## Conventions

- UI language is zh-CN. Comments may be Chinese or English.
- All components use Vue 3 Options API (`export default { name, props, setup() {} }`) — no Composition API. The one allowed exception is `src/composables/*.js` (Vue composables wrapping pure services).
- Each Pinia store uses `defineStore('name', () => { ... })` setup function style.
- Import stores via `useXxxStore()` from the component's `setup()`.
- `window.electronAPI` methods always return `{ success, data/error }` shaped objects.
- For features needing testable business logic, follow the **Service → Composable → Component → View** pattern (see above).
- `src/package.json` exists for a reason (ESM marker) — don't delete it.

## Packaging

```bash
npm run package:linux   # AppImage + deb
npm run package:win     # NSIS installer + portable
npm run package:mac     # DMG
```

Output goes to `release/`. Config: `electron-builder.yml`.

## License

CC BY-NC 4.0 — no commercial use.
