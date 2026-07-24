# Electron Desktop App — Design Spec

**Date**: 2026-07-24
**Project**: Roleplay Hub → RPHub Desktop
**Status**: Approved Design

---

## 1. Goals

- **Primary**: Remove CORS/API cross-domain restrictions. Eliminate dependency on `proxy-worker.js` and browser CORS extensions.
- **Secondary**: Restructure monolithic ~12K `app.js` into maintainable feature modules via Vite + electron-vite build toolchain.
- **Target**: Electron-only desktop app (drop GitHub Pages / pinme web deployment).

## 2. Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Main Process                          │
│  electron/main.js                                        │
│  ├── BrowserWindow (webSecurity: false)                  │
│  ├── WorkshopWindow (独立 BrowserWindow)                  │
│  ├── ipcMain handlers (dialog, file I/O, data relay)    │
│  └── system tray / app menu                             │
│                                                          │
│  electron/preload.js                                     │
│  └── contextBridge → window.electronAPI                  │
│                                                          │
│  electron/ipc-handlers.js                                │
│  └── dialog:openFile, dialog:saveFile, fs:*, data:*     │
└──────────────────────────────────────────────────────────┘
         │ IPC contextBridge
         ▼
┌──────────────────────────────────────────────────────────┐
│                  Renderer Process                        │
│  src/ (Vue 3 Options API)                                │
│  ├── main.js → createApp(App)                            │
│  ├── App.vue (sidebar + <component :is> routing)         │
│  ├── views/ (12 page-level components)                   │
│  ├── components/ (shared UI components)                  │
│  ├── stores/ (Pinia)                                     │
│  ├── utils/ (migrated from assets/js/)                   │
│  ├── api/index.js (direct fetch, no CORS)                │
│  └── assets/styles.css                                   │
└──────────────────────────────────────────────────────────┘
```

## 3. CORS Strategy

`webPreferences.webSecurity: false` — single-line config on `BrowserWindow`. Renderer `fetch()` can call any API domain without restriction. No proxy, no IPC forwarding, no header modification.

- **No** `proxy-worker.js`
- **No** CORS browser extension
- User can configure any third-party API endpoint freely

## 4. Main Process Design

### 4.1 Window Management

```js
// electron/main.js
mainWindow = new BrowserWindow({
  webPreferences: {
    webSecurity: false,        // ← CORS fix
    contextIsolation: true,
    nodeIntegration: false,
    preload: path.join(__dirname, 'preload.js')
  }
})
```

### 4.2 Preload / contextBridge

Expose only under `window.electronAPI`:

```ts
interface ElectronAPI {
  // File dialogs
  openFileDialog(filters): Promise<{ path, content }>
  saveFileDialog(defaultName, filters): Promise<{ path }>
  selectDirectory(): Promise<string>

  // File I/O
  readFile(path): Promise<Buffer>
  writeFile(path, data): Promise<void>

  // Data import/export
  exportAllData(): Promise<void>     // triggers dialog + write
  importAllData(): Promise<void>     // triggers dialog + read + restore

  // Workshop window
  openWorkshop(characterData): Promise<void>
  onWorkshopUpdate(callback): void

  // App info
  getAppVersion(): Promise<string>
  getPlatform(): string

  // Menu / tray callbacks
  onMenuAction(callback): void
}
```

### 4.3 IPC Handler Categories

| Category | Channels | Description |
|----------|----------|-------------|
| Dialog | `dialog:openFile`, `dialog:saveFile`, `dialog:selectDir` | Native OS dialogs |
| File I/O | `fs:readFile`, `fs:writeFile`, `fs:readDir` | Read/write files |
| Data | `data:export`, `data:import` | Full backup (.rphub) |
| Workshop | `workshop:open`, `workshop:update` | Cross-window data relay |
| App | `app:version`, `app:platform` | System info |

## 5. Renderer Process Design

### 5.1 View Mapping

Each sidebar button → a `.vue` file in `src/views/`:

| currentView | File | Source from app.js |
|-------------|------|-------------------|
| chat | `ChatView.vue` | Main chat logic (biggest section) |
| memory | `MemoryView.vue` | Memory system |
| tools | `ToolView.vue` | Tools panel |
| usage | `UsageView.vue` | Usage statistics |
| characters | `CharacterView.vue` | Character management |
| generator | `GeneratorView.vue` | Character card generator |
| square | `SquareView.vue` | 万相广场 |
| uitemplates | `UITemplatesView.vue` | UI templates |
| presets | `PresetsView.vue` | Presets (advanced) |
| worldinfo | `WorldInfoView.vue` | World info (advanced) |
| regex | `RegexView.vue` | Regex scripts (advanced) |
| settings | `SettingsView.vue` | Settings |

### 5.2 Pinia Stores

| Store | Key State | Persistence |
|-------|-----------|-------------|
| `stores/chat.js` | chatHistory, currentCharacterIndex, isThinking, streaming state | localforage |
| `stores/characters.js` | characterList, CRUD operations | localforage |
| `stores/settings.js` | settings object, api config, font, theme | localforage |
| `stores/memory.js` | memory entries, extraction status | localforage |
| `stores/ui.js` | currentView, sidebarCollapsed, toasts, modals | No persist |
| `stores/presets.js` | presets list | localforage |
| `stores/worldinfo.js` | world books | localforage |
| `stores/regex.js` | regex scripts | localforage |

### 5.3 Shared Components

Extracted from app.js templates:

- `components/sidebar/Sidebar.vue`
- `components/sidebar/NavItem.vue`
- `components/chat/MessageBubble.vue`
- `components/chat/MessageInput.vue`
- `components/chat/DescriptionPanel.vue`
- `components/chat/CharacterBackground.vue`
- `components/chat/ModelSelector.vue`
- `components/common/ToastStack.vue`
- `components/common/ConfirmModal.vue`
- `components/common/LoadingSpinner.vue`
- `components/common/EmptyState.vue`
- `components/characters/CharacterCard.vue`
- `components/characters/CharacterImportModal.vue`
- `components/CustomSelect.vue` (wraps ui-select.js)

### 5.4 Utilities (ported directly)

| Original | Target | Change |
|----------|--------|--------|
| `assets/js/utils.js` | `src/utils/utils.js` | Export as ESM |
| `assets/js/card-utils.js` | `src/utils/card-utils.js` | Export as ESM |
| `assets/js/ui-select.js` | `src/utils/ui-select.js` | Export as ESM |
| `assets/css/styles.css` | `src/assets/styles.css` | CSS unchanged |

### 5.5 Routing

No Vue Router. Keep `App.vue`'s `<component :is="currentView">` pattern (matching existing `currentView` reactive state). This avoids unnecessary abstraction for an Electron app with no URL navigation.

## 6. Data Layer

### 6.1 Persistence

- **localforage** (IndexedDB) retained for all user data
- Zero data migration — existing browser data is compatible
- `localforage` loaded via `npm` instead of CDN

### 6.2 Native File Operations (new)

**Export all data as `.rphub` backup file:**

```
Backup format: JSON
{
  version: 1,
  exportedAt: "2026-07-24T...",
  data: {
    characters: [...],    // from localforage
    chats: { ... },       // all chat histories
    settings: { ... },
    presets: [...],
    worldInfo: [...],
    regex: [...],
    memories: [...]
  }
}
```

**Import flow:**
1. `dialog.showOpenDialog({ filters: ['*.rphub'] })`
2. `fs.readFile()` → JSON parse → schema validation
3. Transactional restore to localforage
4. On failure, rollback existing data

**Additional export options:**
- **Batch export character card PNGs** → user selects directory, each character saved as spec-compliant `.png`
- **Export chat as Markdown** → formatted `.md` file

## 7. Character Workshop Window

### 7.1 Strategy

Keep as **separate BrowserWindow** (not merged into main app).

- `character/index.html` content stays largely intact
- DaisyUI components remain unchanged
- Communication via IPC:
  - Main window sends character data → `workshop:open`
  - Workshop sends updates → `workshop:update` → main window refreshes Pinia store

### 7.2 Integration

```js
// Main process handles relay
ipcMain.on('workshop:open', (event, characterData) => {
  workshopWindow = new BrowserWindow({ /* config */ })
  workshopWindow.loadURL('character/index.html')
  // Send character data after window ready
  workshopWindow.webContents.on('did-finish-load', () => {
    workshopWindow.webContents.send('workshop:load', characterData)
  })
})

// Workshop updates → relay to main window
ipcMain.on('workshop:save', (event, updatedCharacter) => {
  mainWindow.webContents.send('workshop:update', updatedCharacter)
})
```

## 8. Build & Package

### 8.1 Toolchain

| Tool | Purpose |
|------|---------|
| `electron-vite` | Vite + Electron integration |
| `Vite` | Vue SFC build, HMR dev server |
| `electron-builder` | Package to exe/dmg/AppImage |

### 8.2 electron-builder Config

```yaml
appId: com.rphub.desktop
productName: Roleplay Hub
directories:
  output: release
win:
  target:
    - nsis
    - portable
mac:
  target: dmg
linux:
  target:
    - AppImage
    - deb
```

### 8.3 Dependencies (npm)

```
vue
localforage
marked
dompurify
sortablejs
pinia
```

Dev dependencies:
```
electron
electron-vite
electron-builder
vite
@vitejs/plugin-vue
```

## 9. Migration Phases

### Phase 1: Scaffold
- Initialize `electron-vite` project
- Copy `assets/` files into `src/`
- Verify dev server runs with `webSecurity: false`

### Phase 2: Pinia Stores
- Create all stores from app.js reactive state
- Replace `reactive()` calls with `useXxxStore()` in app.js
- Verify functionality

### Phase 3: View Extraction
- Create each `.vue` view file
- Move template + logic from app.js
- Priority: ChatView → CharacterView → SettingsView → others

### Phase 4: Component Extraction
- Extract shared UI components from views
- Sidebar, MessageBubble, MessageInput, ToastStack, etc.

### Phase 5: Main Process + IPC
- Preload + contextBridge
- File dialog handlers
- Data import/export
- Workshop window communication

### Phase 6: Polish
- electron-builder config
- App icon
- System tray / menu
- Final verification

## 10. Non-Goals (YAGNI)

- ❌ Composition API migration (remain Options API)
- ❌ Vue Router (keep `<component :is>` pattern)
- ❌ Electron `autoUpdater` (defer to future)
- ❌ `electron-store` replacement for localforage
- ❌ Unit tests (no test infra exists or planned)
- ❌ macOS code signing / notarization (skip initially)
