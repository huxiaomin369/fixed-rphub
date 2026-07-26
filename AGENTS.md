# AGENTS.md — Roleplay Hub

本项目包含两个版本：

| 版本 | 目录 | 技术栈 | 状态 |
|------|------|--------|------|
| **浏览器版** | `/` (当前) | Vue 3 CDN + 原生 HTML/JS | 原始版，维护模式 |
| **Electron 桌面版** | `rphub-desktop/` | electron-vite + Vue 3 + Pinia + Tailwind v4 | **重构目标 + AI 角色卡生成 + 完整设置页（用户人设 / API 预设 / 文生图）** |

---

## 浏览器版（原始，维护模式）

### Architecture

- **Zero build tools.** No `package.json`, no bundler, no `npm install`. Open `index.html` directly in a browser.
- All dependencies loaded via CDN: Vue 3, Tailwind CSS, marked, DOMPurify, SortableJS, localforage.
- Two independent SPAs share JS utilities:
  - `index.html` — main hub, powered by `assets/js/app.js` (~12K lines monolithic Vue app)
  - `character/index.html` — character card workshop, self-contained inline Vue app; uses DaisyUI "cupcake" theme

### JS file loading order (critical)

In `index.html`, scripts must load in this order:
1. `assets/js/utils.js` — pure globals (`generateUUID`, `formatTimeAgo`, `parseCot`)
2. `assets/js/card-utils.js` — IIFE, exposes `window.RPHubCardUtils`
3. `assets/js/ui-select.js` — IIFE, exposes `window.RPHubCustomSelect`
4. `assets/js/app.js` — main Vue app via `createApp()`, registers `CustomSelect` component

`character/index.html` only loads `card-utils.js` and `ui-select.js` (from `../assets/js/`).

### Development

- No linter, no typecheck, no tests. Make changes in the JS files directly and reload the browser to verify.
- `app.js` uses Vue 3 Options API (`setup()` returning reactive state). State is persisted via `localforage` (IndexedDB).
- `card-utils.js` handles character card v2/v3 spec import/export, PNG embedding, image compression.
- `assets/css/styles.css` is cache-busted via a timestamp query string in `index.html`.
- Respect existing patterns: `Proxy` wrappers for deferred module access, `window.RPHub*` namespacing for shared libs.

### Deployment

```sh
npm install -g pinme
pinme login
pinme upload .
```

---

## Electron 桌面版（重构目标 → `rphub-desktop/`）

### 重构动机

解决浏览器版的两个核心痛点：
1. **CORS / API 跨域** — 原始版需要 `proxy-worker.js` 或浏览器 CORS 扩展才能调用 AI API
2. **~12K app.js 单体** — 难以维护，功能耦合严重

### Architecture

- **electron-vite** 构建工具链，Vite HMR 开发
- `electron/main/index.js` — 主进程，`BrowserWindow` + `webSecurity: false`（CORS 根治）
- `electron/preload/index.js` — `contextBridge`，暴露 `window.electronAPI`（主窗口）和 `window.workshopAPI`（工坊窗口）
- 渲染进程：Vue 3 Options API + Pinia 状态管理 + `<component :is>` 视图路由
- **AI 角色卡生成**：`src/services/characterGenerator.js` 纯函数模块（无 Vue/Pinia 依赖），`src/composables/useGenerator.js` 包装成响应式状态，工坊窗口自包含的 `character/ai-assistant.js` 提供 diff 编辑
- **设置页与网页版对齐**（`rphub-desktop/AGENTS.md` "Settings Page" 章节）：
  - 4 个纯 service：`apiProviders`（provider 预设）/ `connectionCheck`（连接探测）/ `imageGen`（文生图）/ `userProfile`（人设 CRUD）
  - 2 个 composable：`useUserProfile` / `useImageGenTrigger`
  - 5 个 settings 组件：`UserProfileSection` / `ApiConfigSection` / `ImageGenSection` + 可复用 `ProviderDropdown` / `ConnectionStatusBadge`
  - 聊天集成：当前 active profile 的 `[User Info]` 段自动注入到 system prompt；`useImageGenTrigger` 解析 AI 回复中的 `<auto_image_gen>` 标签并在 `MessageBubble` 渲染图片网格
  - 侧边栏 user mini 实时绑定 active profile
  - 旧数据幂等迁移：`apiKey` / `imageGenKey` / `settings.user` → 新结构
- **预设 / 世界书 / 正则对齐**（`v1-presets-wi-regex-parity`）：18 个内置种子条目（15 presets / 1 WI / 2 regex），统一 `global`/`character` 范围模型跨三个功能，接入 `chat.js#buildApiMessages` 执行管线（10 步装配：破限 lead → System Presets 块 → WI global_note → systemPrompt → 角色卡 → User Info → prelude 消息 → 首条 greet → 历史 + per-message regex + per-depth WI → after-character WI），挂钩人称 / 自动文生图 / `{{user}}` 三个钩子。**200/200 测试通过**（9 个 mock-fetch 脚本）。详见 `rphub-desktop/docs/superpowers/specs/2026-07-26-presets-worldinfo-regex-parity-design.md` + `plans/2026-07-26-presets-worldinfo-regex-parity.md`。
- 所有依赖通过 npm 管理，零 CDN
- 数据持久化保留 `localforage`（IndexedDB）
- 详细分层、测试脚本、Tailwind v4 注意事项、IPC 通道见 `rphub-desktop/AGENTS.md`

### Development

```bash
cd rphub-desktop
npm run dev       # 启动开发模式
npm run build     # 构建产物
npm run package:linux  # 打包 Linux AppImage
```

详细说明见 `rphub-desktop/AGENTS.md`。

### 与浏览器版的关系

- `rphub-desktop/` 是独立项目，有独立的 `package.json`
- 源文件从 `assets/js/` 和 `index.html` 移植到 `rphub-desktop/src/`
- `rphub-desktop/character/index.html` 作为 Vite 多入口构建
- 浏览器版继续可用，但新功能优先在桌面版开发

---

## Conventions

- UI language is zh-CN. Comments may be Chinese or English.
- Main app uses raw Tailwind. Only `character/index.html` uses DaisyUI components.
- License: CC BY-NC 4.0 — no commercial use.
