const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { rfExecuteMAME, rfProfiles } = require('./rfConfig');


const fs = require("node:fs");
const readline = require("node:readline");

let record = {}

const createWindow = () => {
  const win = new BrowserWindow({
    minWidth: 800,
    minHeight: 600,
    x: 100,
    y: 100,
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  win.loadFile('index.html');
}

/**
 * resource.json を読み込む
 * @returns {boolean} - 読み込み完了
 */
const loadResource = () => {
  if ( fs.existsSync('./resource.json')) {
    try {
      record = JSON.parse(fs.readFileSync('./resource.json', 'utf8'));
      return true;
    } catch(err) {
      console.log(err);
      return false;
    }
  } else {
    return false;
  }
}

app.whenReady().then(async () => {

  var tick = Date.now();
  loadResource();
  console.log(Date.now() - tick);  

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  });

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
