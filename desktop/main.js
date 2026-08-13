const { app, BrowserWindow, session, Menu } = require('electron');
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
    title: 'aiRolePlay',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: false,
    },
  });

  // 打包后 main.js 位于 app.asar 内，__dirname 解析为 .../resources/app.asar，
  // 拼接出的路径含 app.asar，Chromium file 协议才能读取归档内文件
  // （写成 resources/app/... 不会自动重定向到 app.asar，会白屏）
  const indexPath = isDev
    ? path.join(__dirname, '..', 'index.html')
    : path.join(__dirname, 'dist-stage', 'index.html');

  win.loadFile(indexPath);

  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  setupCsp();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
