//-------------------------------------------------------------------
// モジュール
//-------------------------------------------------------------------
const child_process = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const { app, BrowserWindow, dialog, ipcMain, shell, roleList, MenuItem } = require("electron");
const Store = require("electron-store");
const store = new Store();

const { validateBufferMIMEType } = require("validate-image-type");
const sizeOf = require("image-size");

const { CONSTS, rfConfig, rfProfiles, rfPath } = require("./rfConfig");
const glob = require("glob");

//-------------------------------------------------------------------
// 初期設定
//-------------------------------------------------------------------
app.disableHardwareAcceleration();
const APPNAME = "Retrofire Neo";

//-------------------------------------------------------------------
// 定数
//-------------------------------------------------------------------
// ウィンドウデフォルト設定
const MAIN_FORM_DEFAULT = {
  x: 50,
  y: 50,
  width: 1024,
  height: 768,
};

//-------------------------------------------------------------------
// 変数
//-------------------------------------------------------------------
// ウインドウ管理
let mainWindow;

// 受信した設定
let settingsToBeStored = {};

/**
 * ウインドウ生成
 */
const createWindow = () => {
  // 保存値レストア
  const pos = store.get("mainWindow.pos") || [MAIN_FORM_DEFAULT.x, MAIN_FORM_DEFAULT.y];
  const size = store.get("mainWindow.size") || [MAIN_FORM_DEFAULT.width, MAIN_FORM_DEFAULT.height];

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
      preload: path.join(__dirname, "preload.js"),
    },
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#353c41",
      //symbolColor: "#74b1be",
      symbolColor: "#aaa",
    },
  });

  // ウィンドウ内に指定HTMLを表示
  mainWindow.loadFile("index.html");
  mainWindow.webContents.openDevTools();

  // 準備が整ったら表示
  mainWindow.once("ready-to-show", () => {
    //if (maximized) mainWindow.maximize();
    mainWindow.show();
  });

  // ウインドウ閉じる直前
  mainWindow.on("close", async () => {
    console.log("mainwindow on close");
    store.set("mainWindow.pos", mainWindow.getPosition()); // ウィンドウの座標を記録
    store.set("mainWindow.size", mainWindow.getSize()); // ウィンドウのサイズを記録
    store.set("mainWindow.maximized", mainWindow.isMaximized());
  });

  // ウィンドウ閉じた後
  mainWindow.on("closed", async () => {
    console.log("mainwindow on closed");
    for (const [key, value] of Object.entries(settingsToBeStored)) {
      // 受信済み設定
      store.set(key, value);
    }
  });

  // フォーカスロスト
  mainWindow.on("blur", async () => {
    mainWindow.webContents.send("blur");
  });

  // フォーカス
  mainWindow.on("focus", async () => {
    mainWindow.webContents.send("focus");
  });
};

/**
 * 汎用ファイル読み込み
 * @param {*} path
 */
const loadFile = (path) => {
  console.log("loadFile:", path);
  var tick = Date.now();
  if (fs.existsSync(path)) {
    try {
      let st = fs.readFileSync(path, "utf8");
      if (st.charCodeAt(0) === 0xfeff) {
        // BOM削除
        st = st.substring(1);
      }
      console.log(Date.now() - tick, "ms");
      return { result: true, data: st };
    } catch (err) {
      console.log(err);
      return { result: false };
    }
  } else {
    return { result: false };
  }
};

//------------------------------------
// [app] イベント処理
//------------------------------------

// 初期化が完了
app.whenReady().then(async () => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// すべてのウィンドウが閉じられたときの処理
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

/**
 * MAME 起動処理
 * @param {{ zipName: string, softName: string }}
 * @return { string }
 */

const executeMAME = async (event, ...args) => {
  // プロファイル未選択時
  if (rfConfig.currentProfile == -1) {
    sendDebug("executeMAME(): No Profile Set.");
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

  const subprocess = child_process.spawn(rfProfiles[rfConfig.currentProfile].exePath, mameArgs, {
    cwd: rfProfiles[rfConfig.currentProfile].workDir,
    detached: true,
  });

  sendDebug(rfProfiles[rfConfig.currentProfile].exePath + " " + mameArgs.join(" "));
  subprocess.unref();
  subprocess.stdout.setEncoding("utf8");
  subprocess.stdout.on("data", (data) => {
    console.log(data);
    sendDebug(data);
  });
  subprocess.stderr.setEncoding("utf8");
  subprocess.stderr.on("data", (data) => {
    console.log(data);
    sendDebug(data);
  });
  subprocess.on("close", (code) => {
    console.log(`child process exited with code ${code}`);
    //sendDebug(`child process exited with code ${code}`);
  });

  subprocess.on("error", (err) => {
    shell.beep();
    sendDebug(`${err}`);
    //sendDebug(`child process exited with code ${code}`);
  });

  return "return";
};

/**
 * ローカル画像を開いて BASE64 で返す
 * @param {string} path ローカルパス
 * @return {{result: boolean, error: string, img: string, type: string, width: integer, height: integer }}
 */
async function openLocalImage(path) {
  let err = false;
  let errorMessage = "";
  let enc;
  let img;
  let dimensions;

  if (!fs.existsSync(path)) {
    return { result: false };
  }

  try {
    img = fs.readFileSync(path); // 開く
    const validate = await validateBufferMIMEType(img, {
      allowMimeTypes: ["image/jpeg", "image/gif", "image/png", "image/webp", "image/avif"],
    }); // 画像ファイル検証
    if (validate.ok) {
      dimensions = sizeOf(img);
      enc = img.toString("base64"); // base64
    } else {
      err = true;
      errorMessage = "INVALID IMAGE FILE.";
    }
  } catch (e) {
    err = true;
    errorMessage = e;
  }

  if (err) {
    return { result: false, error: errorMessage };
  } else {
    return {
      result: true,
      img: enc,
      type: dimensions.type,
      width: Number(dimensions.width),
      height: Number(dimensions.height),
      infolder: false, // 不定
    };
  }
}

/**
 * デバッグメッセージ送信
 */
function sendDebug(text) {
  mainWindow.webContents.send("debug-message", text);
}

//------------------------------------
// ipc通信
//------------------------------------
ipcMain.handle("window-reset", async (event, data) => {
  /*  console.log(data);
  mainWindow.setSize(MAIN_FORM_DEFAULT.width, MAIN_FORM_DEFAULT.height);
  mainWindow.setPosition(MAIN_FORM_DEFAULT.x, MAIN_FORM_DEFAULT.y);
  sendDebug("ウインドウリセット");
  */
  console.log(getFocusedWindow());
  const mi = new MenuItem({ role: "copy" });
  console.log(mi.click());
  return true;
});

// スクリーンショット開く
ipcMain.handle("get-screenshot", async (event, data) => {
  //console.log(data);
  let res = await openLocalImage(rfPath.snap + data + ".png");
  if (res.result === true) {
    res.infolder = false;
  } else {
    res = await openLocalImage(rfPath.snap + data + "/0000.png");
    if (res.result === true) {
      res.infolder = true;
    }
  }
  return res;
});

// 表示準備完了
ipcMain.handle("window-is-ready", async (event, data) => {
  console.log(data);
  console.log("window-is-ready");

  const maximized = store.get("mainWindow.maximized") || false;
  if (maximized) mainWindow.maximize();
  mainWindow.show();
  return true;
});

// ファイルオープンダイアログ処理
ipcMain.handle("open-dialog", async (event, data) => {
  const result = dialog.showOpenDialogSync(mainWindow, {
    title: "ｶﾞｿﾞｳｦｾﾝﾀｸｾﾖ",
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["jpg", "png", "gif"] }],
  });

  if (result) {
    return openLocalImage(result[0]);
  }
});

// スクリーンショット削除
ipcMain.handle("delete-screen-shot", async (event, data) => {
  const result = dialog.showMessageBoxSync(mainWindow, {
    title: APPNAME,
    type: "question",
    message: "このスクリーンショットを削除しますか？",
    buttons: ["OK", "Cancel"],
  });

  // 削除処理
  if (result === 0) {
    const path1 = path.join(rfPath.snap, data + ".png");
    const path2 = path.join(rfPath.snap, data, "0000.png");

    if (fs.existsSync(path1)) {
      try {
        await shell.trashItem(path1);
        sendDebug("スクリーンショットをゴミ箱に移動: " + path1);
      } catch (error) {
        sendDebug("スクリーンショット削除失敗: " + path1);
      }
    } else if (fs.existsSync(path2)) {
      try {
        await shell.trashItem(path2);
        sendDebug("スクリーンショットをゴミ箱に移動: " + path2);
        // 空フォルダなら削除
        const files = glob.sync(path.join(rfPath.snap, data, "*"));
        if (files.length === 0) {
          fs.rmSync(path.join(rfPath.snap, data), { recursive: true });
        }
      } catch (error) {
        sendDebug("スクリーンショット削除失敗: " + path2);
      }
    }
  }
});

// スクリーンショット改名移動
ipcMain.handle("rename-screen-shot", async (event, data) => {
  // 改名
  const path1 = path.join(rfPath.snap, data + ".png");
  const path2 = path.join(rfPath.snap, data, "0000.png");
  if (fs.existsSync(path2)) {
    try {
      fs.renameSync(path2, path1);
      // 空フォルダなら削除
      const files = glob.sync(path.join(rfPath.snap, data, "*"));
      if (files.length === 0) {
        fs.rmSync(path.join(rfPath.snap, data), { recursive: true });
      }
      sendDebug("スクリーンショットをフォルダから移動: " + path1);
    } catch (error) {
      sendDebug("スクリーンショット移動失敗: " + path1);
    }
  }
});

// ゲーム情報を返す
ipcMain.handle("get-record", async (event, data) => {
  const res = loadFile(CONSTS.PATH_RESOURCES);
  if (res.result) {
    return res.data;
  } else {
    return;
  }
});

// mame32j.lstを返す
ipcMain.handle("get-mame32j", async (event, data) => {
  const res = loadFile(CONSTS.PATH_MAME32J);
  if (res.result) {
    return res.data;
  } else {
    return;
  }
});

// history.datを返す
ipcMain.handle("get-history", async (event, data) => {
  const res = loadFile(rfPath.dats + "/history.dat");
  if (res.result) {
    return res.data;
  } else {
    return;
  }
});

// mameinfo.datを返す
ipcMain.handle("get-mameinfo", async (event, data) => {
  const res = loadFile(rfPath.dats + "/mameinfo.dat");
  if (res.result) {
    return res.data;
  } else {
    return;
  }
});

// command.datを返す
ipcMain.handle("get-command", async (event, data) => {
  const res = loadFile(rfPath.dats + "/command.dat");
  if (res.result) {
    return res.data;
  } else {
    return;
  }
});

/**
 * MAME 起動処理
 */
ipcMain.handle("execute-MAME", executeMAME);

/**
 * Store の値を返す
 */
ipcMain.handle("get-store", async (event, data) => {
  if (store.has(data)) {
    return store.get(data);
  } else {
    return;
  }
});

/**
 * Store の値を保存
 */
ipcMain.handle("set-store", async (event, data) => {
  store.set(data.key, data.val);
});

/**
 * Store の値を一時保持
 */
ipcMain.handle("set-store-temp", async (event, data) => {
  console.log("setting received", data);
  settingsToBeStored[data.key] = data.val;
});

/**
 * URL をブラウザで開く
 */
ipcMain.handle("open-url", async (event, url) => {
  shell.openExternal(url);
});

/**
 *  cfgファイルの存在を確認
 */
ipcMain.handle("cfg-exists", async (event, zipName) => {
  return fs.existsSync(path.join(rfPath.cfg, zipName + ".cfg"));
});

/**
 * nvram フォルダと内容の存在確認
 */
ipcMain.handle("nvram-exists", async (event, zipName) => {
  return fs.existsSync(path.join(rfPath.nvram, zipName));
});
