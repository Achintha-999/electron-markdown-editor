const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let currentFile = {
  path: null,
  content: '',
  isModified: false
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('src/index.html');

  // Open dev tools if in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  updateWindowTitle();
}

function updateWindowTitle() {
  if (!mainWindow) return;
  
  const appName = 'Markdown Notes';
  if (currentFile.path) {
    const filename = path.basename(currentFile.path);
    mainWindow.setTitle(`${filename}${currentFile.isModified ? ' *' : ''} - ${appName}`);
  } else {
    mainWindow.setTitle(`Untitled${currentFile.isModified ? ' *' : ''} - ${appName}`);
  }
}

app.whenReady().then(() => {
  createWindow();

  // File Operations
  ipcMain.handle('save-file', async (_, content, filePath) => {
    try {
      const savePath = filePath || await showSaveDialog();
      if (!savePath) return { cancelled: true };
      
      await fs.promises.writeFile(savePath, content);
      currentFile = { path: savePath, content, isModified: false };
      updateWindowTitle();
      return { success: true, path: savePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('open-file', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Open Markdown File',
      filters: [{ name: 'Markdown Files', extensions: ['md', 'markdown'] }],
      properties: ['openFile']
    });

    if (filePaths?.length) {
      try {
        const content = await fs.promises.readFile(filePaths[0], 'utf-8');
        currentFile = { path: filePaths[0], content, isModified: false };
        updateWindowTitle();
        return { success: true, content, path: filePaths[0] };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
    return { cancelled: true };
  });

  ipcMain.handle('new-file', () => {
    currentFile = { path: null, content: '', isModified: false };
    updateWindowTitle();
    return { success: true };
  });

  ipcMain.handle('get-file-info', () => currentFile);

  // Dialog Handlers
  ipcMain.handle('show-about-dialog', async () => {
    const aboutWindow = new BrowserWindow({
      width: 400,
      height: 500,
      resizable: false,
      parent: mainWindow,
      modal: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    
    aboutWindow.removeMenu();
    aboutWindow.loadFile('src/about.html');
  });

  ipcMain.handle('show-save-dialog', async (_, options) => {
    const { response } = await dialog.showMessageBox({
      type: 'question',
      buttons: options.buttons || ['Save', 'Discard', 'Cancel'],
      title: options.title || 'Unsaved Changes',
      message: options.message || 'You have unsaved changes. Save before continuing?',
      defaultId: 0,
      cancelId: 2
    });
    return { response };
  });

  // State Management
  ipcMain.on('set-modified', (_, isModified) => {
    currentFile.isModified = isModified;
    updateWindowTitle();
  });
});

// Helper function for save dialog
async function showSaveDialog() {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Save Markdown File',
    defaultPath: 'untitled.md',
    filters: [{ name: 'Markdown Files', extensions: ['md'] }]
  });
  return filePath;
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});