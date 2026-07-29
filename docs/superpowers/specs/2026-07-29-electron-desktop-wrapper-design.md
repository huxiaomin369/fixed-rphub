# Roleplay Hub — Electron 桌面端基础包装设计

**日期**：2026-07-29
**状态**：草案，待用户审阅
**范围**：首版最小可用包装（套壳 + 解决 CORS + 双形态打包）

---

## 1. 目标与背景

`RP-Hub` 当前是纯前端 Web 应用，无构建工具，CDN 加载 Vue/Tailwind/marked/DOMPurify/SortableJS，localforage（IndexedDB）持久化，附带 Cloudflare Worker 解决 LLM API 跨域。

**本次目标**：把 Web 应用包装成 Windows 桌面应用（Electron），能离线使用（首版不优化此项，依赖仍在 CDN），能打包为 NSIS 安装包和便携版 `.exe`，解决跨域问题。

**首版不做**（后续优化期再处理）：
- 依赖本地化（CDN → `assets/vendor/`）
- 自动更新
- 代码签名
- 收紧 CSP
- 系统托盘 / 全局快捷键 / 文件对话框等原生能力

---

## 2. 架构

### 2.1 文件结构

```
RP-Hub/                          ← 原 Web 仓（零修改）
├── index.html
├── assets/
├── character/
├── proxy-worker.js
└── ...
└── desktop/                      ← 新增：Electron 子项目
    ├── package.json              ← 唯一 package.json，仅 desktop/ 范围
    ├── main.js                   ← Electron 主进程
    ├── preload.js                ← 占位（首版空文件）
    ├── build/
    │   ├── icon.ico              ← Windows 应用图标（首版可占位）
    │   └── installer.nsh         ← （首版可省）
    ├── scripts/
    │   └── copy-web.js           ← 把 ../index.html, ../assets, ../character 拷到 dist-stage/
    ├── .gitignore                ← node_modules/, dist-stage/, release/
    └── README.md                 ← Electron 版单独说明
```

### 2.2 进程模型

- **主进程**：`desktop/main.js`，创建 `BrowserWindow` 加载 `index.html`
- **渲染进程**：原 `app.js` 不动，照常跑
- **Node integration**：`nodeIntegration: false`、`contextIsolation: true`（保持隔离）
- **沙箱**：`sandbox: true`（Electron 渲染进程沙箱）

### 2.3 加载策略

- **开发期**：`npm run start` 在 `desktop/` 目录跑，加载 `../index.html`（原 Web 仓）
- **打包后**：electron-builder 把 `dist-stage/`（由 `copy-web.js` 拷贝）塞进 `resources/app/`，加载 `process.resourcesPath/app/index.html`

```js
// main.js 关键片段
const isDev = !app.isPackaged;
const indexPath = isDev
  ? path.join(__dirname, '..', 'index.html')
  : path.join(process.resourcesPath, 'app', 'index.html');
```

---

## 3. CORS 与安全策略

### 3.1 解决 CORS

```js
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  webSecurity: false   // ← 关闭，跨域放行
}
```

`webSecurity: false` 同时让：
- `fetch` 跨域 API（OpenAI/Anthropic/Gemini 等）直连无需代理
- 本地 `file://` 资源自由加载
- 字体/外链图片正常

### 3.2 CSP（响应头占位声明）

通过 `session.defaultSession.webRequest.onHeadersReceived` 在主进程设置，**不污染 `index.html`**（Web 仓零侵入）。

```
Content-Security-Policy: default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;
```

**说明**：首版 CSP 为占位声明，不提供实际安全保护（与 `webSecurity: false` 配对后已是"裸奔"状态）。后续优化期再收紧为 CDN 白名单 + `connect-src` 限制。

### 3.3 proxy-worker.js

- 首版**保留**原文件不动（Web 仓零侵入）
- Electron 设置里若用户填了 `workerProxyUrl`（指向 cf-worker），仍走反代；不填则直连 API
- 后续优化期再决定是否移除

### 3.4 已知风险

- `webSecurity: false` + 宽松 CSP 让渲染进程可加载任意远程脚本
- 此项目为本地工具，受众是开发者本人，API Key 私有，关闭 webSecurity 在此场景风险可控
- **不**适合分发给不可信终端用户

---

## 4. 打包与发布

### 4.1 目标产物

- **NSIS 安装包**：`Roleplay Hub-Setup-0.1.0.exe`（一键安装、桌面/开始菜单快捷方式、可选安装路径）
- **Portable 便携版**：`RoleplayHub-Portable-0.1.0.exe`（双击即用，不写注册表）

### 4.2 build 配置要点

```jsonc
// desktop/package.json
{
  "name": "roleplay-hub-desktop",
  "version": "0.1.0",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "stage": "node scripts/copy-web.js",
    "dist": "npm run stage && electron-builder",
    "dist:nsis": "npm run stage && electron-builder --win nsis",
    "dist:portable": "npm run stage && electron-builder --win portable"
  },
  "devDependencies": {
    "electron": "^32.0.0",
    "electron-builder": "^25.0.0"
  },
  "build": {
    "appId": "com.rphub.desktop",
    "productName": "Roleplay Hub",
    "directories": {
      "output": "release",
      "buildResources": "build"
    },
    "files": [
      "main.js",
      "preload.js",
      "package.json",
      "dist-stage/**/*"
    ],
    "win": {
      "target": [
        { "target": "nsis", "arch": ["x64"] },
        { "target": "portable", "arch": ["x64"] }
      ],
      "icon": "build/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "perMachine": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    },
    "portable": {
      "artifactName": "RoleplayHub-Portable-${version}.exe"
    }
  }
}
```

### 4.3 copy-web.js 行为

把 `../index.html`、`../assets/`、`../character/` 拷到 `desktop/dist-stage/`：

- `index.html` → `dist-stage/index.html`
- `assets/` → `dist-stage/assets/`（递归）
- `character/` → `dist-stage/character/`（递归）
- 不拷 `proxy-worker.js`（仅 Web 部署使用，与 Electron 无关）
- 不拷 `node_modules/`、`.wrangler/`、`.git/` 等

### 4.4 图标

首版可用占位 `.ico`（electron-builder 默认或一个临时 256x256 ico）。后续替换正式图标。

---

## 5. 数据持久化

`localforage` 用 IndexedDB，按 origin 隔离。在 Electron 中：
- `file://` 协议下 IndexedDB 正常工作
- 路径：`%APPDATA%/Roleplay Hub/`（NSIS 安装）/ `Roleplay Hub.exe 同目录/data`（Portable）
- 现有数据可平滑迁移（同 origin 行为）

**首版不做的迁移工具**：用户已有 Web 端 IndexedDB 数据若需导入，需要手动导出/导入（后续优化期做迁移助手）。

---

## 6. 元数据

- **App 名**：`Roleplay Hub`（沿用原名）
- **包标识**：`com.rphub.desktop`（占位，可改）
- **作者/版权**：沿用 README
- **版本**：与 Web 仓解耦，`desktop/package.json` 单独管

---

## 7. 验证（首版完成判定）

- [ ] `cd desktop && npm install` 成功
- [ ] `npm run start` 启动 Electron 窗口，加载 Web 页面，所有功能（聊天、角色卡、设置）正常
- [ ] 关闭网络后，页面仍能加载（CDN 仍需联网；首版接受此项）
- [ ] 在设置中填入 LLM API Key 后，能直连 API（不走 cf-worker）成功对话
- [ ] `npm run dist:nsis` 产出 `release/Roleplay Hub-Setup-0.1.0.exe`，能在 Windows 10/11 上安装运行
- [ ] `npm run dist:portable` 产出 `release/RoleplayHub-Portable-0.1.0.exe`，能双击直接运行
- [ ] 跨域 API 调用无 CORS 报错
- [ ] 渲染进程开发者工具能开（`Ctrl+Shift+I`）便于调试

---

## 8. 未决项（首版不解决）

1. **CDN 依赖本地化**：把 Vue/Tailwind/marked/DOMPurify/SortableJS/Google Fonts 全部下载到 `assets/vendor/`
2. **CSP 收紧**：CDN 白名单 + `connect-src` 限制
3. **proxy-worker.js 去留**：评估是否完全移除
4. **数据迁移助手**：Web 端 IndexedDB → Electron 端导入工具
5. **自动更新**：`electron-updater` 集成
6. **代码签名**：避免 SmartScreen 警告
7. **原生能力**：系统托盘、全局快捷键、文件对话框、剪贴板图片粘贴等
8. **macOS/Linux 支持**：当前仅 Windows

---

## 9. 风险与回退

- **回退方案**：若 Electron 体验不佳，删除 `desktop/` 目录即可，Web 仓完全不受影响
- **Web 仓零侵入承诺**：`desktop/` 是独立子项目，零文件改动 Web 仓
- **Git 影响**：`desktop/package-lock.json`、`desktop/node_modules/` 加入 `desktop/.gitignore`
