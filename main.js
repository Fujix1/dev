const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');

const { rfExecuteMAME } = require('./rfConfig');

const createWindow = () => {
  const win = new BrowserWindow({
    minWidth: 800,
    minHeight: 600,
    x: 100,
    y: 100,
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('index.html');

}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})


ipcMain.handle('channel_ichiri', async(event, ...args) => {
  console.log(...args);
  
  exec( path.join("d:","mame","mame.exe " + args[0]), {
    cwd: path.join("d:","mame"),
  }, (err, stdout, stderr)=>{
    if (err) {
      console.log(err);
    }
    console.log(stdout);
  });

  return 'return from main';
});



/**
 * MAME 起動処理 
 */
ipcMain.handle('executeMAME', rfExecuteMAME);
