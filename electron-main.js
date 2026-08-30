// Electron entry point. Boots the existing Express server in-process, then
// opens a native window pointed at it — no separate terminal/browser needed.

const { app, BrowserWindow } = require('electron');
const path = require('path');

const PORT = process.env.PORT || 3000;

function createWindow() {
  const win = new BrowserWindow({
    width: 720,
    height: 900,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'public', 'icons', 'icon-512.png'),
    webPreferences: {
      contextIsolation: true,
    },
  });

  win.loadURL(`http://localhost:${PORT}`);
}

app.whenReady().then(() => {
  // Reuse the same server.js used for the web version. Requiring it starts
  // the Express app and its app.listen() call immediately.
  require('./server.js');

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
