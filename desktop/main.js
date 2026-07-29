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
