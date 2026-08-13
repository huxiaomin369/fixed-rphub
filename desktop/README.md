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

## Building：一键打包（镜像 + 7za 包装器）

`npm run dist:nsis` 与 `npm run dist:portable` 依赖 GitHub Releases 下载 Electron / electron-builder 二进制，且 `winCodeSign` 解压需要 Windows symlink 支持。在**受限网络**或**未开启开发者模式 / 无管理员权限**的机器上建议用一键脚本：

```powershell
# 从 desktop/ 目录运行
powershell -ExecutionPolicy Bypass -File scripts\build.ps1
```

脚本会设置以下环境变量后依次执行 `npm run dist:nsis`、`npm run dist:portable`：

- `ELECTRON_MIRROR` = `https://npmmirror.com/mirrors/electron/` — Electron 二进制下载镜像。
- `ELECTRON_BUILDER_BINARIES_MIRROR` = `https://npmmirror.com/mirrors/electron-builder-binaries/` — electron-builder 运行期二进制（`winCodeSign`、`nsis` 等）下载镜像。

手动打包时也需先设这两个变量：

```powershell
$env:ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
$env:ELECTRON_BUILDER_BINARIES_MIRROR = 'https://npmmirror.com/mirrors/electron-builder-binaries/'
npm run dist:nsis
npm run dist:portable
```

### 7za / winCodeSign symlink 问题

`winCodeSign` 压缩包内含 macOS symlink。electron-builder 用 `app-builder-bin` 自带的 7za 抽取时，在未开启开发者模式 / 无管理员权限的 Windows 上会因 symlink 支持不足失败（收到 `-snld` 参数、退出码 2）。两种解法：

1. **开启 Windows 开发者模式**（设置 → 隐私和安全性 → 开发者选项），然后重跑打包。
2. **准备 7za 包装器**：把真实 `7za.exe`（7-Zip 官方安装后从安装目录取，或自行编译一个 C 包装器，剥掉 `-snld` 并把退出码 2 映射为 0）放到 `%TEMP%\rphub-7za-wrapper\`，再执行：

```powershell
$env:USE_SYSTEM_7ZA = '1'
powershell -ExecutionPolicy Bypass -File scripts\build.ps1
```

`scripts/build.ps1` 会在设置 `USE_SYSTEM_7ZA` 时把 `%TEMP%\rphub-7za-wrapper`（可用 `RPHUB_7ZA_DIR` 覆盖）自动置入 PATH 最前。注意：`.cmd` / `.bat` 包装器**不够**——Node 的 `execFile` 不能按 PATHEXT 解析它们，必须是真正的 `.exe`。

## Web 仓零侵入

`desktop/` 是独立子项目，不修改 Web 仓任何文件。打包时通过 `copy-web.js` 把 Web 资源拷到 `dist-stage/`，electron-builder 把它塞进 `resources/app/`。


## 默认角色卡

放入你的卡：把命名好的 PNG v2 卡拷到 cards/default/（目录已 gitignore，不会提交）
重新生成：python build_default_cards.py（会输出每张卡的 ok/skip 摘要），把 assets/js/default-cards.js 的变化提交
