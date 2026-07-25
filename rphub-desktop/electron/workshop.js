import { BrowserWindow } from 'electron'
import { join } from 'path'

let workshopWindow = null

function openWorkshop(characterData) {
  if (workshopWindow) {
    workshopWindow.focus()
    return
  }

  workshopWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: '角色卡工坊',
    webPreferences: {
      webSecurity: false,
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, '../preload/index.js')
    }
  })

  // Load from Vite dev server or production build
  if (process.env.ELECTRON_RENDERER_URL) {
    workshopWindow.loadURL(
      process.env.ELECTRON_RENDERER_URL.replace('/index.html', '/character/index.html')
    )
  } else {
    workshopWindow.loadFile(join(__dirname, '../renderer/character/index.html'))
  }

  workshopWindow.on('closed', () => { workshopWindow = null })

  // Send character data once page is ready
  workshopWindow.webContents.on('did-finish-load', () => {
    workshopWindow.webContents.send('workshop:load', characterData)
  })
}

function closeWorkshop() {
  if (workshopWindow && !workshopWindow.isDestroyed()) {
    workshopWindow.close()
  }
}

export { openWorkshop, closeWorkshop }
