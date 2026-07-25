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
npm run test:generator     # Run mock-fetch tests for the AI service (27 tests)
```

- No linter, no typecheck, no test framework. `npm run test:generator` is a **manual mock-fetch script** (`scripts/test-characterGenerator.mjs`) that exercises `src/services/characterGenerator.js` — run it whenever you change that file. It does not cover UI or Vue components; verify those by hand via `npm run dev`.
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
| `src/composables/useGenerator.js` | Vue composable wrapping `runNewGeneration` with reactive state |
| `src/stores/*.js` | 8 Pinia stores (chat, characters, settings, ui, memory, presets, worldinfo, regex) |
| `src/views/*.vue` | 12 page-level Vue components (Chat, Character, Memory, Tool, Usage, Square, Generator, UITemplates, Presets, WorldInfo, Regex, Settings) |
| `src/components/` | Shared components: `chat/`, `common/`, `sidebar/`, `characters/`, `generator/` |
| `src/components/common/ConfirmModal.vue` | Global confirm dialog driven by `ui.confirmDialog` state |
| `src/api/index.js` | `fetch()` API wrapper, supports SSE streaming via `ReadableStreamDefaultReader` |
| `src/utils/` | ESM versions of original browser utilities (card-utils, ui-select, utils) |
| `src/package.json` | **ESM marker** — `{"type": "module"}`. Required so Node can ESM-import from `src/` in the test script. Do not remove. |
| `character/` | Vite second entry — workshop window. Loads its own `app.js` + `diff-modal.js`. |
| `character/ai-assistant.js` | Self-contained copy of the diff-mode AI service for the workshop window |
| `character/diff-modal.js` | Workshop AI assistant modal UI (streaming diff cards) |
| `scripts/test-characterGenerator.mjs` | Mock-fetch test script — 27 tests covering `characterGenerator.js` |
| `scripts/extract-prompt.mjs` | One-shot re-sync of `SINGLE_PLAYER_SYSTEM_PROMPT` from web's `character/index.html` |

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
