
//-------------------------------------------------------------------
// モジュール
//-------------------------------------------------------------------
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const { exec } = require('child_process');
//const { rfExecuteMAME, rfProfiles } = require('./rfConfig');
const readline = require("node:readline");
const child_process = require('child_process');

const Store = require('electron-store');

const store = new Store();
/*const store = new Store({
  cwd: path.dirname(app.getPath('userData')),  // 保存先のディレクトリ
  name: 'config',                // ファイル名
  fileExtension: 'json'          // 拡張子
});
*/

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


const rfConfig = {
  currentProfile: 0, // 現在選択中のプロファイル番号
};

const rfProfiles = [
  { title: 'テスト',
    exePath: 'C:/Users/tfuji/Desktop/mame/mame.exe',
    workDir: 'C:/Users/tfuji/Desktop/mame/',
    option: '-mouse',
    optEnabled: false,
  }
];

const rfExecuteMAME = async(event, ...args) => {
  
  // プロファイル未選択時
  if (rfConfig.currentProfile == -1) {
    sendDebug("rfExecuteMAME(): No Profile Set.");
  }

  let mameArgs = [args[0].zipName];

  // ソフト選択時
  if (args[0].softName !== undefined) {
    mameArgs.push(args[0].softName);
  }
  // オプション
  if (rfProfiles[rfConfig.currentProfile].optEnabled) {
    mameArgs.push(rfProfiles[rfConfig.currentProfile].option);
  }

  // 起動処理
  /*child_process.execFile( 
    rfProfiles[rfConfig.currentProfile].exePath,
    mameArgs,
  { cwd: rfProfiles[rfConfig.currentProfile].workDir }, 
    (err, stdout, stderr)=>{
    if (err) {
      console.log(err);
      sendDebug(err);
    }
    if (stderr) {
      sendDebug(stderr);
    }
    console.log(stdout);
    sendDebug(stdout);
  });
  */
  const subprocess  = child_process.spawn( rfProfiles[rfConfig.currentProfile].exePath, mameArgs, 
    { cwd: rfProfiles[rfConfig.currentProfile].workDir,
      detached: true,
     });

  sendDebug( rfProfiles[rfConfig.currentProfile].exePath + ' ' + mameArgs.join(' '));
  subprocess.unref();
  subprocess.stdout.setEncoding('utf8');
  subprocess.stdout.on('data', (data)=> {
    console.log(data);
    sendDebug(data);
  });
  subprocess.stderr.setEncoding('utf8');
  subprocess.stderr.on('data',(data)=>{
    console.log(data);
    sendDebug(data);
  });
  subprocess.on('close', (code)=>{
    console.log(`child process exited with code ${code}`);
    //sendDebug(`child process exited with code ${code}`);
  });

  subprocess.on('error', (err)=>{
    shell.beep();
    sendDebug(`${err}`);
    //sendDebug(`child process exited with code ${code}`);
  });

  return "return";

};


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
  mainWindow.webContents.openDevTools();

  // 準備が整ったら表示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
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
      createWindow();
    }
  });

  /*
  setInterval(() => {
    //mainWindow.webContents.send('update-clock', Date.now());
    sendDebug(Date.now())
  }, 1000);
  */
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
ipcMain.handle('window-reset', async(event, data)=>{
  console.log(data);
  mainWindow.setSize(MAIN_FORM_DEFAULT.width, MAIN_FORM_DEFAULT.height);
  mainWindow.setPosition(MAIN_FORM_DEFAULT.x, MAIN_FORM_DEFAULT.y);
  sendDebug("ウインドウリセット")
  return(true);
});

/**
 * MAME 起動処理 
 */
ipcMain.handle('execute-MAME', rfExecuteMAME);

/**
 * デバッグメッセージ送信
 */
function sendDebug(text) {
  mainWindow.webContents.send('debug-message', text);
}

