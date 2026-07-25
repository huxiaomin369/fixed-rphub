import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // File dialogs
  openFileDialog: (options) => ipcRenderer.invoke('dialog:openFile', options),
  saveFileDialog: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDir'),

  // File I/O
  readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
  writeFile: (path, data) => ipcRenderer.invoke('fs:writeFile', path, data),

  // Data export/import
  exportAllData: () => ipcRenderer.invoke('data:exportAll'),
  importAllData: () => ipcRenderer.invoke('data:importAll'),

  // Workshop
  openWorkshop: (characterData) => ipcRenderer.invoke('workshop:open', characterData),
  onWorkshopUpdate: (callback) => {
    ipcRenderer.on('workshop:update', (_, data) => callback(data))
  },
  saveWorkshop: (characterData) => ipcRenderer.send('workshop:save', characterData),
  onWorkshopLoad: (callback) => {
    ipcRenderer.on('workshop:load', (_, data) => callback(data))
  },

  // App info
  getVersion: () => ipcRenderer.invoke('app:version')
})
