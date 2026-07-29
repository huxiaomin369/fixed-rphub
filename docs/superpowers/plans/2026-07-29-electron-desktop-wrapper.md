# Electron Desktop Wrapper — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `desktop/` 子目录里为 RP-Hub Web 仓加上 Electron 基础包装，套壳运行原 Web 应用、`webSecurity: false` 解决 CORS、产出 NSIS 安装包 + Portable 便携版两个 .exe。

**Architecture:** 新增 `desktop/` 子项目，零侵入 Web 仓。`desktop/main.js` 加载 `../index.html`（dev）或 `resources/app/index.html`（prod）；`copy-web.js` 把 Web 资源拷到 `dist-stage/` 供打包；electron-builder 出 NSIS + Portable 双 target。

**Tech Stack:** Electron 32、electron-builder 25、Node.js 内置 `node:test`（copy-web.js 单元测试）

## Global Constraints

- 来自 spec §2：`desktop/` 子目录隔离，Web 仓零修改
- 来自 spec §3：`webSecurity: false`，CORS 放行；`nodeIntegration: false`、`contextIsolation: true`、`sandbox: true`
- 来自 spec §3：宽松 CSP 占位 `default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;`，通过主进程 `webRequest.onHeadersReceived` 设置（不污染 `index.html`）
- 来自 spec §4：build target 为 `nsis` + `portable`，arch `x64`
- 来自 spec §6：App 名 `Roleplay Hub`，包 ID `com.rphub.desktop`
- 来自 spec §9：`desktop/.gitignore` 排除 `node_modules/`、`dist-stage/`、`release/`

---

## File Structure

```
desktop/
├── package.json              # 唯一 package.json；devDeps: electron, electron-builder
├── main.js                   # Electron 主进程；创建 BrowserWindow + CSP header
├── preload.js                # 占位空文件（首版不用，预留）
├── copy-web.js               # 拷贝 ../{index.html,assets,character} → dist-stage/
├── copy-web.test.js          # node:test 单元测试
├── .gitignore                # node_modules/, dist-stage/, release/
├── README.md                 # Electron 子项目说明
├── build/
│   └── icon.ico              # 占位 ico（首版可用 1x1 透明或 electron-builder 默认）
└── scripts/
    └── (空，首版不需要)
```

---

## Task 1: 创建 desktop/ 目录骨架 + .gitignore + README

**Files:**
- Create: `desktop/.gitignore`
- Create: `desktop/README.md`

**Interfaces:**
- Produces: `desktop/.gitignore` 文件存在（影响后续 task 的 git 状态）
- Produces: `desktop/README.md` 文件存在

- [ ] **Step 1: 创建 `desktop/.gitignore`**

文件内容：

```gitignore
node_modules/
dist-stage/
release/
*.log
.DS_Store
Thumbs.db
```

写文件路径：`C:\jmc\05-selfProj\RP-Hub\desktop\.gitignore`

- [ ] **Step 2: 创建 `desktop/README.md`**

文件内容：

```markdown
# Roleplay Hub — Desktop (Electron)

RP-Hub 的 Electron 桌面端包装。仅 Windows。

## 开发

```sh
cd desktop
npm install
npm run start
```

启动 Electron 窗口加载 `../index.html`（原 Web 仓，不打包）。

## 打包

```sh
npm run dist:nsis       # NSIS 安装包
npm run dist:portable   # 便携版 exe
```

产物在 `desktop/release/`。

## Web 仓零侵入

`desktop/` 是独立子项目，不修改 Web 仓任何文件。打包时通过 `copy-web.js` 把 Web 资源拷到 `dist-stage/`，electron-builder 把它塞进 `resources/app/`。
```

写文件路径：`C:\jmc\05-selfProj\RP-Hub\desktop\README.md`

- [ ] **Step 3: 提交**

```bash
git add desktop/.gitignore desktop/README.md
git commit -m "feat(desktop): scaffold directory with gitignore and readme"
```

---

## Task 2: TDD copy-web.js 资源拷贝脚本

**Files:**
- Create: `desktop/copy-web.js`
- Test: `desktop/copy-web.test.js`

**Interfaces:**
- `copy-web.js` 导出 `copyWeb({ src, dst })` 函数：
  - `src` 默认值：`path.join(__dirname, '..', '..')`（即 Web 仓根）
  - `dst` 默认值：`path.join(__dirname, '..', 'dist-stage')`
  - 行为：清空 dst 目录，递归拷贝 src 下的 `index.html`、`assets/`、`character/`；跳过 `proxy-worker.js`、`node_modules/`、`.git/`、`.wrangler/`、`.superpowers/`、`desktop/`、`docs/`、`tests/` 以及根目录的 `LICENSE`、`README.md`、`AGENTS.md`、`selfUse.md`、`.gitignore`
- `copy-web.js` 当 `require.main === module` 时直接执行 `copyWeb()` 并打印 `[copy-web] staged to <dst>`

- [ ] **Step 1: 写失败的测试 `desktop/copy-web.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { copyWeb } = require('./copy-web.js');

function makeFakeSource() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-web-src-'));
  fs.writeFileSync(path.join(tmp, 'index.html'), '<html></html>');
  fs.mkdirSync(path.join(tmp, 'assets', 'js'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'assets', 'js', 'app.js'), 'console.log(1)');
  fs.mkdirSync(path.join(tmp, 'character'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'character', 'index.html'), '<html></html>');
  fs.writeFileSync(path.join(tmp, 'proxy-worker.js'), '// worker');
  fs.mkdirSync(path.join(tmp, 'node_modules'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'node_modules', 'junk.js'), 'junk');
  fs.writeFileSync(path.join(tmp, 'LICENSE'), 'CC BY-NC');
  fs.writeFileSync(path.join(tmp, 'README.md'), '# readme');
  return tmp;
}

test('copyWeb copies index.html, assets, character to dst', () => {
  const src = makeFakeSource();
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-web-dst-'));
  copyWeb({ src, dst });
  assert.ok(fs.existsSync(path.join(dst, 'index.html')), 'index.html should exist');
  assert.ok(fs.existsSync(path.join(dst, 'assets', 'js', 'app.js')), 'assets/js/app.js should exist');
  assert.ok(fs.existsSync(path.join(dst, 'character', 'index.html')), 'character/index.html should exist');
});

test('copyWeb skips proxy-worker.js, node_modules, LICENSE, README.md', () => {
  const src = makeFakeSource();
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-web-dst-'));
  copyWeb({ src, dst });
  assert.ok(!fs.existsSync(path.join(dst, 'proxy-worker.js')), 'proxy-worker.js should NOT be copied');
  assert.ok(!fs.existsSync(path.join(dst, 'node_modules')), 'node_modules should NOT be copied');
  assert.ok(!fs.existsSync(path.join(dst, 'LICENSE')), 'LICENSE should NOT be copied');
  assert.ok(!fs.existsSync(path.join(dst, 'README.md')), 'README.md should NOT be copied');
});

test('copyWeb creates fresh dst (removes existing contents)', () => {
  const src = makeFakeSource();
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-web-dst-'));
  fs.writeFileSync(path.join(dst, 'stale.txt'), 'stale');
  copyWeb({ src, dst });
  assert.ok(!fs.existsSync(path.join(dst, 'stale.txt')), 'stale file should be cleaned');
});
```

- [ ] **Step 2: 运行测试确认失败**

运行：
```bash
cd desktop && node --test copy-web.test.js
```

预期：FAIL，因为 `./copy-web.js` 不存在，报 `Cannot find module './copy-web.js'`。

- [ ] **Step 3: 实现 `desktop/copy-web.js`**

```js
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_SRC = path.join(__dirname, '..');
const DEFAULT_DST = path.join(__dirname, '..', 'dist-stage');

// 顶层需要拷贝的条目
const TOP_LEVEL_COPY = ['index.html', 'assets', 'character'];

// 任何层级都要跳过的目录/文件名
const SKIP_NAMES = new Set([
  'proxy-worker.js',
  'node_modules',
  '.git',
  '.wrangler',
  '.superpowers',
  'desktop',
  'docs',
  'tests',
  'LICENSE',
  'README.md',
  'AGENTS.md',
  'selfUse.md',
  '.gitignore',
]);

function copyRecursive(src, dst) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      if (SKIP_NAMES.has(entry)) continue;
      copyRecursive(path.join(src, entry), path.join(dst, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
}

function copyWeb({ src = DEFAULT_SRC, dst = DEFAULT_DST } = {}) {
  if (fs.existsSync(dst)) fs.rmSync(dst, { recursive: true, force: true });
  fs.mkdirSync(dst, { recursive: true });
  for (const item of TOP_LEVEL_COPY) {
    const srcPath = path.join(src, item);
    if (!fs.existsSync(srcPath)) continue;
    copyRecursive(srcPath, path.join(dst, item));
  }
}

if (require.main === module) {
  copyWeb();
  console.log('[copy-web] staged to', DEFAULT_DST);
}

module.exports = { copyWeb, TOP_LEVEL_COPY, SKIP_NAMES: [...SKIP_NAMES] };
```

- [ ] **Step 4: 运行测试确认通过**

运行：
```bash
cd desktop && node --test copy-web.test.js
```

预期：PASS，3 个 test 全过。

- [ ] **Step 5: 在真实 Web 资源上冒烟测试**

运行：
```bash
cd desktop && node copy-web.js
```

预期：打印 `[copy-web] staged to <desktop绝对路径>/dist-stage`，并产生 `dist-stage/index.html`、`dist-stage/assets/js/app.js`、`dist-stage/character/index.html`。检查：

```bash
ls dist-stage/
ls dist-stage/assets/js/
ls dist-stage/character/
```

不应有 `dist-stage/proxy-worker.js`、`dist-stage/node_modules/` 等。

清理：

```bash
rm -rf dist-stage/
```

（注：Windows PowerShell 下用 `Remove-Item -Recurse -Force dist-stage`。）

- [ ] **Step 6: 提交**

```bash
git add desktop/copy-web.js desktop/copy-web.test.js
git commit -m "feat(desktop): copy-web script with TDD coverage"
```

---

## Task 3: package.json（依赖 + scripts + build 配置）

**Files:**
- Create: `desktop/package.json`

**Interfaces:**
- `npm install` 在 `desktop/` 目录安装 electron + electron-builder
- `npm run start` → `electron .`（启动 dev）
- `npm run stage` → `node copy-web.js`（仅拷贝，不打包）
- `npm run dist` → `npm run stage && electron-builder`（出当前平台默认产物）
- `npm run dist:nsis` → `npm run stage && electron-builder --win nsis`
- `npm run dist:portable` → `npm run stage && electron-builder --win portable`

- [ ] **Step 1: 写 `desktop/package.json`**

```json
{
  "name": "roleplay-hub-desktop",
  "version": "0.1.0",
  "description": "Electron desktop wrapper for RP-Hub",
  "main": "main.js",
  "private": true,
  "scripts": {
    "start": "electron .",
    "stage": "node copy-web.js",
    "test": "node --test copy-web.test.js",
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

- [ ] **Step 2: 安装依赖**

```bash
cd desktop && npm install
```

预期：成功安装 electron 与 electron-builder，可能产生 `node_modules/`、`package-lock.json`。`node_modules/` 已被 `.gitignore` 排除。

- [ ] **Step 3: 验证 npm scripts 列出正确**

```bash
cd desktop && npm run
```

预期：列出 `start`, `stage`, `test`, `dist`, `dist:nsis`, `dist:portable` 6 个脚本。

- [ ] **Step 4: 提交**

```bash
git add desktop/package.json
git commit -m "feat(desktop): package.json with electron and electron-builder"
```

（注意：不要 add `package-lock.json` 之外的 lockfile；目前 git 还没追踪 node_modules/.gitignore 应已忽略。）

---

## Task 4: main.js（Electron 主进程 + 窗口 + CSP）

**Files:**
- Create: `desktop/main.js`

**Interfaces:**
- `app.whenReady()` → `createWindow()`
- `createWindow()`：创建 1280×800 BrowserWindow，最小 900×600，`webPreferences`：`nodeIntegration: false`、`contextIsolation: true`、`sandbox: true`、`webSecurity: false`
- 加载路径：dev → `../index.html`；prod → `process.resourcesPath/app/index.html`
- 设置 `session.defaultSession.webRequest.onHeadersReceived` 注入 CSP 头 `default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;`
- dev 模式下自动开 DevTools（`Ctrl+Shift+I` 也能开）
- `app.on('window-all-closed')`：非 macOS 平台 `app.quit()`

- [ ] **Step 1: 写 `desktop/main.js`**

```js
const { app, BrowserWindow, session } = require('electron');
const path = require('node:path');

const isDev = !app.isPackaged;

const CSP_HEADER = "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;";

function setupCsp() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [CSP_HEADER],
      },
    });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Roleplay Hub',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: false,
    },
  });

  const indexPath = isDev
    ? path.join(__dirname, '..', 'index.html')
    : path.join(process.resourcesPath, 'app', 'index.html');

  win.loadFile(indexPath);

  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(() => {
  setupCsp();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

- [ ] **Step 2: 写 `desktop/preload.js`（占位空文件）**

```js
// 首版无 IPC 桥接，预留。
```

- [ ] **Step 3: 启动 dev 验证**

```bash
cd desktop && npm run start
```

预期：弹出 Electron 窗口，加载 RP-Hub 主页（聊天/侧边栏正常显示）。检查清单：
- 窗口标题是 `Roleplay Hub`
- 侧边栏所有导航按钮可点击
- DevTools 窗口自动打开
- 在设置页填入 LLM API Key，能成功对话（说明 CORS 已放行）

如果窗口打不开或有 JS 报错，停下来排查。

- [ ] **Step 4: 关闭 Electron 窗口**

直接关窗即可（`window-all-closed` 事件会 quit）。

- [ ] **Step 5: 提交**

```bash
git add desktop/main.js desktop/preload.js
git commit -m "feat(desktop): electron main process with relaxed webSecurity and CSP"
```

---

## Task 5: 占位图标 build/icon.ico

**Files:**
- Create: `desktop/build/icon.ico`

**Interfaces:**
- `electron-builder` 在打包时读取 `build/icon.ico` 作为 Windows 应用图标
- 首版可使用最小有效 .ico（256×256 单帧）

- [ ] **Step 1: 创建 `desktop/build/` 目录**

```bash
mkdir -p desktop/build
```

（Windows PowerShell：`New-Item -ItemType Directory -Path desktop/build -Force | Out-Null`）

- [ ] **Step 2: 生成占位 ico**

没有现成 ico 时，可临时用以下任一方式：

- **方式 A（推荐）**：从 `assets/css/styles.css` 或仓库内的 `logo.jpg` 之类的现成图片转 ico（若有 imagemagick：`magick convert logo.jpg -resize 256x256 build/icon.ico`）
- **方式 B**：用 `https://www.icoconverter.com/` 在线转一个 256×256 png 为 ico
- **方式 C**：先放一个空 `build/icon.ico`（electron-builder 找不到时会用其内置默认图标，不阻断打包，但产物 exe 图标会是 Electron 默认）

最简：先放占位 1×1 透明 ico，路径 `desktop/build/icon.ico`。可用 PowerShell 生成一个最小 ico：

```powershell
$bytes = [byte[]](
  0,0, 1,0, 1,0, 0,0, 1,0, 1,0, 16,0,
  0x80,0,0,0, 0x80,0,0,0, 0,0,0,0, 0,0,0,0,
  22,0,0,0,
  0,0, 0,0, 1,0, 32,0,
  0x80,0x04,0,0, 0x80,0x04,0,0,
  0,0,0,0, 0,0,0,0,
  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
  0,0,0,0, 0,0,0,0
)
[System.IO.File]::WriteAllBytes("desktop\build\icon.ico", $bytes)
```

如果嫌麻烦，跳过此步直接到 Task 6，electron-builder 会用默认图标。

- [ ] **Step 3: 提交（如有 .ico）**

```bash
git add desktop/build/icon.ico
git commit -m "feat(desktop): placeholder app icon"
```

---

## Task 6: 验证 — 完整跑通 build 与运行

**Files:** 无（纯验证）

**Interfaces:** 完整跑通 spec §7 验证清单的 8 项。

- [ ] **Step 1: 运行单元测试**

```bash
cd desktop && npm test
```

预期：3 个 test 全过（来自 Task 2）。

- [ ] **Step 2: 启动 dev**

```bash
cd desktop && npm run start
```

预期：窗口正常打开，RP-Hub 所有功能可用。在设置里填 API Key 试一次对话（spec §7 验证项 4）。

- [ ] **Step 3: 关闭 dev Electron，验证 stage 脚本**

```bash
cd desktop && npm run stage
ls dist-stage/
ls dist-stage/assets/js/
ls dist-stage/character/
```

预期：dist-stage 包含 index.html、assets/、character/；没有 proxy-worker.js、node_modules/。

清理：
```bash
rm -rf dist-stage/
```

- [ ] **Step 4: 打包 NSIS 安装包**

```bash
cd desktop && npm run dist:nsis
```

预期：在 `desktop/release/` 出现 `Roleplay Hub-Setup-0.1.0.exe`（或类似命名）。

- [ ] **Step 5: 打包 Portable 便携版**

```bash
cd desktop && npm run dist:portable
```

预期：在 `desktop/release/` 出现 `RoleplayHub-Portable-0.1.0.exe`。

- [ ] **Step 6: 安装/运行 NSIS 安装包**

双击 `Roleplay Hub-Setup-0.1.0.exe`，按提示安装到任意目录。安装后：
- 桌面有 `Roleplay Hub` 快捷方式
- 开始菜单有 `Roleplay Hub` 项
- 双击启动，能正常加载 RP-Hub

- [ ] **Step 7: 运行 Portable**

双击 `RoleplayHub-Portable-0.1.0.exe`，能直接启动 RP-Hub，无需安装。

- [ ] **Step 8: 跨域 API 验证**

在两种产物里都填入 LLM API Key（OpenAI/Anthropic/Gemini 任一），发起一次对话。
预期：API 调用无 CORS 报错（控制台无 "Access to fetch ... has been blocked by CORS policy"）。

- [ ] **Step 9: 提交 release 状态（可选）**

`desktop/release/` 已在 `.gitignore` 排除，不应 commit。如果 `desktop/.gitignore` 没生效，确认 `git status` 不显示 release/ 下的二进制。

---

## Self-Review 摘要

- **Spec 覆盖**：
  - §2 架构（desktop 子目录、进程模型、加载策略）→ Task 1、3、4
  - §3 CORS / CSP（webSecurity: false + 宽松 CSP + 保留 proxy-worker.js）→ Task 4（proxy-worker.js 保留由 spec §3.3 决定，无需 Electron 改动）
  - §4 打包（NSIS + Portable、copy-web、package.json）→ Task 2、3、6
  - §5 数据持久化（localforage 不动）→ 无需 Electron task（Web 应用行为）
  - §6 元数据（App 名 / 包 ID）→ Task 3（package.json）
  - §7 验证清单 8 项 → Task 6
  - §8 未决项 → 不实现（首版范围外）
  - §9 风险与回退 → `desktop/.gitignore` 排除 release/（Task 1）
- **类型/命名一致性**：`copyWeb` 在 Task 2 中定义并导出；Task 3 中 `npm run stage` 调用 `node copy-web.js`（即 CLI 入口）；Task 6 中再次复用。三处一致。
- **占位扫描**：无 TBD/TODO。`build/icon.ico` 标注为"占位/可省"。
- **范围检查**：单计划聚焦"基础包装"，可独立交付。
