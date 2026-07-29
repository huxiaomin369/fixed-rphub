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
