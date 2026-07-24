# AGENTS.md — RPHub Desktop (Electron)

## Architecture

- **electron-vite** build toolchain. `npm run dev` starts dev server + Electron window.
- Two processes:
  - `electron/main/index.js` — Electron main process, creates `BrowserWindow` with `webSecurity: false`
  - `electron/preload/index.js` — `contextBridge` exposing `window.electronAPI`
- Renderer is a Vue 3 SPA (Options API, `setup()` returning reactive state).
- State managed via **Pinia** stores, persisted via `localforage` (IndexedDB).
- **No Vue Router.** View switching via `<component :is>` with `currentView` computed.

## Development

```bash
npm run dev    # Start Electron dev mode (Vite HMR + Electron window)
npm run build  # Build for production
```

- No linter, no typecheck, no tests. Edit source files directly, reload Electron window to verify.
- `src/` is the renderer source. `electron/` is the main process source.
- Tailwind CSS via Vite plugin (`@tailwindcss/vite`). Use Tailwind utility classes directly in templates.

## Key Files

| Path | Role |
|------|------|
| `electron/main/index.js` | BrowserWindow with `webSecurity: false` |
| `electron/preload/index.js` | IPC bridge: `window.electronAPI.*` |
| `electron/ipc-handlers.js` | IPC handlers for dialog, fs, data backup |
| `electron/workshop.js` | Workshop window management |
| `src/main.js` | Vue entry + Pinia setup + `window.__getAllDataForExport` |
| `src/App.vue` | Root component: sidebar + `<component :is>` routing |
| `src/stores/*.js` | 8 Pinia stores (chat, characters, settings, ui, memory, presets, worldinfo, regex) |
| `src/views/*.vue` | 12 page-level Vue components |
| `src/components/` | Shared components (chat/, common/, sidebar/, characters/) |
| `src/api/index.js` | `fetch()` API wrapper (no CORS issues) |
| `src/utils/` | ESM versions of original browser utilities |

## CORS

`webSecurity: false` in BrowserWindow — renderer `fetch()` can call any API domain without restriction. No proxy, no IPC forwarding. Users can configure any third-party API endpoint freely.

## Workshop Window

`character/index.html` is built as a second Vite entry point. The workshop opens a separate `BrowserWindow` and communicates back via IPC:
- Main window sends character data via `workshop:load`
- Workshop saves via `saveWorkshop()` → main window receives `workshop:update`

## Data Persistence

- All user data stored via `localforage` (IndexedDB). Same keys as original browser app.
- Full backup/restore via `.rphub` file (native OS dialogs).
- Export path: `window.electronAPI.exportAllData()` → main process collects all localforage data → writes `.rphub` file.
- Import path: reads `.rphub` → validates format → restores to localforage → reloads all stores.

## Conventions

- UI language is zh-CN. Comments may be Chinese or English.
- All components use Vue 3 Options API (`export default { name, props, setup() {} }`) — no Composition API.
- Each Pinia store uses `defineStore('name', () => { ... })` setup function style.
- Import stores via `useXxxStore()` from the component's `setup()`.
- `window.electronAPI` methods always return `{ success, data/error }` shaped objects.

## Packaging

```bash
npm run package:linux   # AppImage + deb
npm run package:win     # NSIS installer + portable
npm run package:mac     # DMG
```

Output goes to `release/`. Config: `electron-builder.yml`.

## License

CC BY-NC 4.0 — no commercial use.
