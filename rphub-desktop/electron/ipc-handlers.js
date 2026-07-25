import { ipcMain, dialog, app } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { openWorkshop, closeWorkshop } from './workshop.js'

function registerHandlers(mainWindow) {
  // File dialogs
  ipcMain.handle('dialog:openFile', async (_, options) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, options)
      if (result.canceled) return null
      const content = await readFile(result.filePaths[0])
      return { path: result.filePaths[0], content }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('dialog:saveFile', async (_, options) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, options)
      if (result.canceled) return null
      return { path: result.filePath }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('dialog:selectDir', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
      })
      if (result.canceled) return null
      return result.filePaths[0]
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  // File I/O
  ipcMain.handle('fs:readFile', async (_, path) => {
    try {
      const content = await readFile(path)
      return content
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('fs:writeFile', async (_, path, data) => {
    try {
      await writeFile(path, data)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  // App info
  ipcMain.handle('app:version', () => {
    try {
      return app.getVersion()
    } catch (err) {
      return 'unknown'
    }
  })

  // Data export/import
  ipcMain.handle('data:exportAll', async () => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: `rphub-backup-${Date.now()}.rphub`,
        filters: [{ name: 'RPHub Backup', extensions: ['rphub'] }]
      })
      if (result.canceled) return { success: false }

      // Collect all data from renderer
      const data = await mainWindow.webContents.executeJavaScript(
        'window.__getAllDataForExport ? window.__getAllDataForExport() : Promise.resolve(null)',
        true
      )

      if (!data) {
        return { success: false, error: 'Failed to collect data from renderer' }
      }

      const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        data
      }

      await writeFile(result.filePath, JSON.stringify(backup, null, 2))
      return { success: true, path: result.filePath }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('data:importAll', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        filters: [{ name: 'RPHub Backup', extensions: ['rphub'] }]
      })
      if (result.canceled) return { success: false }

      const content = await readFile(result.filePaths[0], 'utf-8')
      const backup = JSON.parse(content)

      // Validate format
      if (!backup.version || !backup.data) {
        return { success: false, error: 'Invalid backup file format' }
      }

      // Send data to renderer for restore
      const restoreResult = await mainWindow.webContents.executeJavaScript(
        `window.__restoreAllData(${JSON.stringify(backup.data)})`,
        true
      )

      return { success: true, count: Object.keys(backup.data).length }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  // Workshop - open separate window
  ipcMain.handle('workshop:open', async (_, characterData) => {
    try {
      openWorkshop(characterData)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  // Receive saved character data from workshop, relay to main window
  ipcMain.on('workshop:save', (_, updatedCharacter) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('workshop:update', updatedCharacter)
    }
    closeWorkshop()
  })
}

export { registerHandlers }
