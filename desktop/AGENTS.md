# AGENTS.md — Roleplay Hub Desktop（Electron 桌面端）

## 架构

- **Electron 桌面包装**（仅 Windows），不修改 Web 仓任何文件。宿主 Web 应用是 `../` 下的 `index.html` + `assets/js/app.js`（Vue 3 Options API），见根目录 `AGENTS.md`。
- `desktop/` 是独立子项目（`package.json` 独立、依赖隔离），核心文件：
  - `main.js` — 主进程：创建 `BrowserWindow`、注入 CSP header、移除默认菜单
  - `preload.js` — 预加载脚本，首版无 IPC 桥接（仅占位注释）
  - `copy-web.js` — 打包前把 Web 资源（`index.html`、`assets`、`character`）拷贝到 `dist-stage/`
  - `copy-web.test.js` — `copy-web.js` 的 `node --test` 单元测试
  - `scripts/build.ps1` — 一键打包脚本（受限网络镜像 + 7za 包装器）
  - `dist-stage/` — `copy-web.js` 的临时产物目录（每次 stage 全量重建）
  - `release/` — electron-builder 输出目录（NSIS 安装包 + 便携版 exe）

## 安全配置现状（重点）

`main.js` 的 `BrowserWindow` webPreferences：

- `webSecurity: false` — **关闭同源策略**，允许 fetch/XHR 跨域（桌面版唯一能跨域调 API 的方式；纯浏览器打开 Web 版仍受 CORS 限制）
- `nodeIntegration: false`、`contextIsolation: true`、`sandbox: true` — 渲染进程隔离
- CSP 通过 `onHeadersReceived` 注入：`default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;`（刻意放宽以适配 CDN 依赖与数据内联）

调整安全配置时注意权衡：收窄 `webSecurity`/CSP 会破坏 CDN 资源加载或跨域 API 调用。

## 开发

- 无 linter、无 typecheck。改 `main.js` 后重启应用验证（`Ctrl+C` 后重新 `npm run start`）。
- 语法检查：`node --check main.js`。
- 测试：`npm test`（`node --test copy-web.test.js`，覆盖拷贝/跳过规则）。
- 开发模式（`npm run start`）直接加载 `../index.html`，不经过 stage 流程。

```sh
cd desktop
npm install
npm run start
```

## 打包 / 部署

```sh
npm run stage            # 仅执行 copy-web.js，检查 dist-stage/ 内容
npm run dist:nsis        # stage + NSIS 安装包
npm run dist:portable    # stage + 便携版 exe
```

- 产物在 `desktop/release/`；`package.json` 的 `build` 段只打包 `main.js`、`preload.js`、`package.json` 和 `dist-stage/**`。
- **受限网络 / 未开开发者模式**时用 `scripts/build.ps1`（自动设置 `ELECTRON_MIRROR`、`ELECTRON_BUILDER_BINARIES_MIRROR` 为 npmmirror 镜像）。
- `winCodeSign` 解压需 Windows symlink：开启开发者模式，或提供真实 `7za.exe` 包装器到 `%TEMP%\rphub-7za-wrapper\` 并设 `USE_SYSTEM_7ZA=1`（`.cmd`/`.bat` 不行，必须是 `.exe`）。

## 约定

- `copy-web.js` 的 `SKIP_NAMES` 会跳过 `node_modules`、`.git`、`desktop`、`docs`、`README.md`、`AGENTS.md`、`selfUse.md` 等——新增仓库根目录文件时若不想进包，需确认已在跳过列表。
- 依赖固定 Electron ^32、electron-builder ^25；升级前确认打包脚本兼容性。
- 注释/文档中文为主，UI 语言 zh-CN。License：CC BY-NC 4.0。
