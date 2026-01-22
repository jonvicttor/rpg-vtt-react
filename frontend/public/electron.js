// public/electron.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

function createWindow() {
  // Cria a janela do navegador
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Em produção, idealmente seria true com preload, mas para facilitar agora deixe false
    },
    icon: path.join(__dirname, 'favicon.ico') // Opcional: seu ícone
  });

  // Remove a barra de menu padrão (Arquivo, Editar...)
  win.setMenuBarVisibility(false);

  // Carrega a URL do React (Localhost em dev, arquivo index.html em prod)
  win.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  // Abre o DevTools apenas se estiver em modo desenvolvimento
  if (isDev) {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});