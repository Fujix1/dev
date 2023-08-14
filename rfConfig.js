//-------------------------------------------------------------------
// 状態管理と変数
//-------------------------------------------------------------------

const child_process = require('node:child_process');
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');

// ウインドウ管理
let mainWindow;

// ゲーム情報管理
let record = {}

const rfConfig = {
  currentProfile: 0, // 現在選択中のプロファイル番号
};

/**
 * プロファイル
    Title   : string;
    ExePath : string;
    WorkDir : string;
    Option  : string;
    OptEnbld: boolean;
 *
 */

const rfProfiles = [
  { title: 'テスト',
    exePath: 'd:/mame/mame.exe',
    workDir: 'd:/mame/',
    option: '-mouse',
    optEnabled: false,
  }
];


/**
 * MAME 起動処理
 * @param {{ zipName: string, softName: string }}
 * @return { string }
 */

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
 * デバッグメッセージ送信
 */
function sendDebug(text) {
  //mainWindow.webContents.send('debug-message', text);
}

module.exports = {
  mainWindow,
  record,
  rfExecuteMAME,
  rfProfiles,
  sendDebug,
};
