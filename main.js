
//-------------------------------------------------------------------
// モジュール
//-------------------------------------------------------------------
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { rfExecuteMAME, rfProfiles } = require('./rfConfig');
const readline = require("node:readline");
const Store = require('electron-store');
const store = new Store();


//-------------------------------------------------------------------
// 定数
//-------------------------------------------------------------------
// ウィンドウデフォルト設定
const MAIN_FORM_DEFAULT = {
  x: 50,
  y: 50,
  width: 1024,
  height: 768,
}


//-------------------------------------------------------------------
// グローバル変数
//-------------------------------------------------------------------
// ウインドウ管理
let mainWindow;

// ゲーム情報管理
let record = {}

/**
 * ウインドウ生成
 */
const createWindow = () => {

  // 保存値レストア
  const pos = store.get('mainWindow.pos') || [MAIN_FORM_DEFAULT.x, MAIN_FORM_DEFAULT.y];
  const size = store.get('mainWindow.size') || [MAIN_FORM_DEFAULT.width, MAIN_FORM_DEFAULT.height];

  // ウインドウ生成
  mainWindow = new BrowserWindow({
    show: false,
    minWidth: 640,
    minHeight: 480,
    x: pos[0],
    y: pos[1],
    width: size[0],
    height: size[1],
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  // ウィンドウ内に指定HTMLを表示
  mainWindow.loadFile('index.html');

  // 準備が整ったら表示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  });

  // ウィンドウが閉じられる直前に実行
  mainWindow.on('close', ()=>{
    store.set('mainWindow.pos', mainWindow.getPosition());  // ウィンドウの座標を記録
    store.set('mainWindow.size', mainWindow.getSize());     // ウィンドウのサイズを記録
  })
}

/**
 * resource.json を読み込む
 * @returns {boolean} - 読み込み完了
 */
const fs = require("node:fs");
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


//------------------------------------
// [app] イベント処理
//------------------------------------

// 初期化が完了
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

// すべてのウィンドウが閉じられたときの処理
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})



//------------------------------------
// ipc通信
//------------------------------------
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

ipcMain.handle('window-reset', async(event, data)=>{
  console.log(data);
  mainWindow.setSize(MAIN_FORM_DEFAULT.width, MAIN_FORM_DEFAULT.height);
  mainWindow.setPosition(MAIN_FORM_DEFAULT.x, MAIN_FORM_DEFAULT.y);
  return(true);
});

/**
 * MAME 起動処理 
 */
ipcMain.handle('executeMAME', rfExecuteMAME);

