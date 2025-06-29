const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {

  saveFile: (content, filePath) => ipcRenderer.invoke('save-file', content, filePath),
  openFile: () => ipcRenderer.invoke('open-file'),
  getFileInfo: () => ipcRenderer.invoke('get-file-info'),
  newFile: () => ipcRenderer.invoke('new-file'),
  setModified: (isModified) => ipcRenderer.send('set-modified', isModified),
  
 
  showAboutDialog: () => ipcRenderer.invoke('show-about-dialog'),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options)
});