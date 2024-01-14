//-------------------------------------------------------------------
// モジュール
//-------------------------------------------------------------------
const child_process = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const { Worker } = require("node:worker_threads");

const { app, BrowserWindow, dialog, ipcMain, shell, Menu, roleList, MenuItem } = require("electron");
const Store = require("electron-store");
const store = new Store();

const { validateBufferMIMEType } = require("validate-image-type");
const sizeOf = require("image-size");

const { CONSTS, rfConfig, rfProfiles, rfPath, softlistTitleJ } = require("./rfConfig");
const glob = require("glob");
const Parser = require("node-xml-stream");

//-------------------------------------------------------------------
// 初期設定
//-------------------------------------------------------------------
app.disableHardwareAcceleration(); // ハードウェアアクセラレーション無効
const APPNAME = "RETROFIRE DEVELOPMENT";
const APPVERSION = "0.00a";

//-------------------------------------------------------------------
// 定数
//-------------------------------------------------------------------
// ウィンドウデフォルト設定
const MAIN_FORM_DEFAULT = {
  x: 50,
  y: 50,
  width: 1600,
  height: 980,
};

const PATH_LISTXML = "./temp/list.xml";
const PATH_LISTSOFT = "./temp/listsoft.xml";

//-------------------------------------------------------------------
// 変数
//-------------------------------------------------------------------
// ウインドウ管理
let mainWindow;
let frmAbout;

// 受信した設定
let settingsToBeStored = {};

// 編集済み
let isEdited = false;

let pathMame32j = ""; // mame32j 保存先

// メインメニュー
const isMac = process.platform === "darwin";
const template = [
  // { role: 'appMenu' }
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            //{ role: "quit" },
          ],
        },
      ]
    : []),
  // { role: 'fileMenu' }
  {
    label: "File",
    //submenu: [isMac ? { role: "close" } : { role: "quit" }],
  },
  // { role: 'editMenu' }
  {
    label: "Edit",
    submenu: [
      /*      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      ...(isMac
        ? [
            { role: "pasteAndMatchStyle" },
            { role: "delete" },
            { role: "selectAll" },
            { type: "separator" },
            {
              label: "Speech",
              submenu: [{ role: "startSpeaking" }, { role: "stopSpeaking" }],
            },
          ]
        : [{ role: "delete" }, { type: "separator" }, { role: "selectAll" }]),
        */
    ],
  },
  // { role: 'viewMenu' }
  {
    label: "View",
    submenu: [
      { role: "reload" },
      { role: "forceReload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" },
    ],
  },
  // { role: 'windowMenu' }
  {
    label: "Window",
    submenu: [
      { role: "minimize" },
      { role: "zoom" },
      /*...(isMac
        ? [{ type: "separator" }, { role: "front" }, { type: "separator" }, { role: "window" }]
        : [{ role: "close" }]),*/
    ],
  },
  {
    role: "help",
    submenu: [
      {
        label: "Learn More",
        click: async () => {
          const { shell } = require("electron");
          await shell.openExternal("https://www.google.co.jp");
        },
      },
    ],
  },
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

// ウインドウ生成
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
  mainWindow.on("close", async (e) => {
    console.log("CLOSE", "isEdited", isEdited);
    if (isEdited) {
      const result = dialog.showMessageBoxSync(mainWindow, {
        title: "確認",
        message: "ゲーム名が編集されています。\n\n変更を mame32j.lst に保存しますか?",
        buttons: ["Yes", "No", "Cancel"],
        type: "question",
        defaultId: 0,
        cancelId: 2,
      });

      switch (result) {
        case 0: {
          break;
        }
        case 1: {
          break;
        }
        case 2: {
          e.preventDefault();
          break;
        }
        default: {
          e.preventDefault();
        }
      }
      console.log(result);
    }

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

  // コンテキストメニューイベント
  mainWindow.webContents.on("context-menu", (event, args) => {
    console.log("context-menu");
    mainWindow.webContents.send("context-menu", args);
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

// 終了前
app.on("before-quit", async (e) => {
  console.log("BEFORE QUIT");
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

  // 子プロセス生成
  const subprocess = child_process.spawn(rfProfiles[rfConfig.currentProfile].exePath, mameArgs, {
    cwd: rfProfiles[rfConfig.currentProfile].workDir,
    detached: true, // 親プロセスと接続しない
  });

  sendDebug(rfProfiles[rfConfig.currentProfile].exePath + " " + mameArgs.join(" "));
  subprocess.unref(); // 親プロセスが子プロセスの終了を待機しない

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
  });
  subprocess.on("error", (err) => {
    shell.beep();
    sendDebug(`${err}`);
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

// beep
ipcMain.handle("beep", async (event, data) => {
  shell.beep();
});

// コンテキストメニュー
ipcMain.handle("cut", async (event, data) => {
  return mainWindow.webContents.cut();
});
ipcMain.handle("copy", async (event, data) => {
  return mainWindow.webContents.copy();
});
ipcMain.handle("paste", async (event, data) => {
  return mainWindow.webContents.paste();
});
ipcMain.handle("delete", async (event, data) => {
  return mainWindow.webContents.delete();
});
ipcMain.handle("selectAll", async (event, data) => {
  return mainWindow.webContents.selectAll();
});
ipcMain.handle("undo", async (event, data) => {
  return mainWindow.webContents.undo();
});
ipcMain.handle("redo", async (event, data) => {
  return mainWindow.webContents.redo();
});

//
ipcMain.handle("window-reset", async (event, data) => {
  /*  console.log(data);
  mainWindow.setSize(MAIN_FORM_DEFAULT.width, MAIN_FORM_DEFAULT.height);
  mainWindow.setPosition(MAIN_FORM_DEFAULT.x, MAIN_FORM_DEFAULT.y);
  sendDebug("ウインドウリセット");
  */

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

// Mame32j.lst 保存処理開始
ipcMain.handle("save-mame32j", async (event, data) => {
  const result = await dialog.showSaveDialogSync(mainWindow, {
    title: "mame32j.lstを保存",
    defaultPath: "mame32j.lst",
    filters: [{ name: "mame32j.lst", extensions: ["lst"] }],
  });

  if (result !== undefined) {
    // renderer にデータリクエスト
    pathMame32j = result;
    mainWindow.webContents.send("request-mame32j");
    return true;
  } else return false;
});

// renderer から mame32j データ受け取り
ipcMain.handle("send-mame32j", async (event, data) => {
  await saveMame32j(data);
});

async function saveMame32j(data) {
  try {
    fs.writeFileSync(pathMame32j, data.join("\n"));
    pathMame32j = "";
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

// 編集済み受信
ipcMain.handle("send-edit-condition", async (event, data) => {
  console.log("send-edit-condition", data);
  if (data.hasOwnProperty("isEdited")) {
    isEdited = data.isEdited;
  }
  console.log("send-edit-condition", isEdited);
});

// 終了
ipcMain.handle("quit", async (event, data) => {
  mainWindow.close();
});

// 最小化
ipcMain.handle("minimize", async (event, data) => {
  mainWindow.minimize();
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

// softlistを返す
ipcMain.handle("get-softlist", async (event, data) => {
  const res = loadFile(CONSTS.PATH_SOFTLISTS);
  if (res.result === true) {
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
    return "";
  }
});

// history.datを返す
ipcMain.handle("get-history", async (event, data) => {
  const res = loadFile(rfPath.dats + "/history.dat");
  if (res.result) {
    return res.data;
  } else {
    return "";
  }
});

// mameinfo.datを返す
ipcMain.handle("get-mameinfo", async (event, data) => {
  const res = loadFile(rfPath.dats + "/mameinfo.dat");
  if (res.result) {
    return res.data;
  } else {
    return "";
  }
});

// command.datを返す
ipcMain.handle("get-command", async (event, data) => {
  const res = loadFile(rfPath.dats + "/command.dat");
  if (res.result) {
    return res.data;
  } else {
    return "";
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
  //console.log("setting received", data);
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
 *  cfgファイル削除
 */
ipcMain.handle("cfg-delete", async (event, zipName) => {
  const targetPath = path.join(rfPath.cfg, zipName + ".cfg");
  const result = dialog.showMessageBoxSync(mainWindow, {
    title: APPNAME,
    type: "question",
    message: "次の cfg ファイルを削除しますか？\n\n" + targetPath,
    buttons: ["OK", "Cancel"],
  });

  // 削除
  if (result === 0) {
    if (fs.existsSync(targetPath)) {
      try {
        fs.unlinkSync(targetPath);
        sendDebug("cfg ファイル削除: " + targetPath);
      } catch (error) {
        sendDebug("cfg ファイル削除失敗: " + targetPath);
      }
    }
  }
  return;
});

/**
 * nvram フォルダの存在確認
 */
ipcMain.handle("nvram-exists", async (event, zipName) => {
  return fs.existsSync(path.join(rfPath.nvram, zipName));
});

/**
 * nvram フォルダ削除
 */
ipcMain.handle("nvram-delete", async (event, zipName) => {
  const targetPath = path.join(rfPath.nvram, zipName);
  const result = dialog.showMessageBoxSync(mainWindow, {
    title: APPNAME,
    type: "question",
    message: "次の nvram フォルダを削除しますか？\n\n" + targetPath,
    buttons: ["OK", "Cancel"],
  });

  // 削除
  if (result === 0) {
    if (fs.existsSync(targetPath)) {
      try {
        fs.rmSync(targetPath, { recursive: true });
        sendDebug("nvram フォルダ削除: " + targetPath);
      } catch (error) {
        sendDebug("nvram フォルダ削除失敗: " + targetPath);
      }
    }
  }
  return;
});

/**
 * cfg nvram 両方確認
 */
ipcMain.handle("nvcfg-exists", async (event, zipName) => {
  return fs.existsSync(path.join(rfPath.nvram, zipName)) || fs.existsSync(path.join(rfPath.cfg, zipName + ".cfg"));
});

/**
 * cfg nvram 両方削除
 */
ipcMain.handle("nvcfg-delete", async (event, zipName) => {
  const cfgPath = path.join(rfPath.cfg, zipName + ".cfg");
  const nvramPath = path.join(rfPath.nvram, zipName);

  let st = [];
  if (fs.existsSync(cfgPath)) st.push(cfgPath);
  if (fs.existsSync(nvramPath)) st.push(nvramPath);

  const result = dialog.showMessageBoxSync(mainWindow, {
    title: APPNAME,
    type: "question",
    message: "次の設定ファイルを削除しますか？\n\n" + st.join("\n"),
    buttons: ["OK", "Cancel"],
  });

  // 削除
  if (result === 0) {
    if (fs.existsSync(cfgPath)) {
      try {
        fs.unlinkSync(cfgPath);
        sendDebug("cfg ファイル削除: " + cfgPath);
      } catch (error) {
        sendDebug("cfg ファイル削除失敗: " + cfgPath);
      }
    }
    if (fs.existsSync(nvramPath)) {
      try {
        fs.rmSync(nvramPath, { recursive: true });
        sendDebug("nvram フォルダ削除: " + nvramPath);
      } catch (error) {
        sendDebug("nvram フォルダ削除失敗: " + nvramPath);
      }
    }
  }
});

/**
 * listsoft.xml 解析
 */

ipcMain.handle("parse-listsoft", async (event, arg) => {
  sendDebug("listsoft.xml 解析準備");

  // ファイルチェック
  if (fs.existsSync(PATH_LISTSOFT) === false) {
    sendDebug("listsoft.xml 解析失敗：ファイルなし");
    return { result: false, error: "listsoft.xml was not found." };
  }
  const stat = fs.statSync(PATH_LISTSOFT);
  if (stat.size < 90000000) {
    sendDebug("listsoft.xml 解析失敗：ファイル無効");
    return { result: false, error: "listsoft.xml file is too small." };
  }

  const parser = new Parser();
  const softwarelists = {};
  let currentTag = ""; //
  let newSoftwareList;
  let newSoftware;
  let inSoftware = false;
  const regex = /(\(.*\))$/g;

  // 開始タグが見つかった
  parser.on("opentag", (name, attrs) => {
    switch (name) {
      case "softwarelists": {
        break;
      }
      case "softwarelist": {
        for (let i = 0; i < softlistTitleJ.length; i++) {
          attrs.description = attrs.description.replace(softlistTitleJ[i].from, softlistTitleJ[i].to);
        }
        newSoftwareList = { description: unEscape(attrs.description), softwares: [] };
        //newSoftwareList = { name: attrs.name, description: unEscape(attrs.description), softwares: [] };
        softwarelists[attrs.name] = newSoftwareList;
        //softwarelists.push(newSoftwareList);
        console.log("softwarelist:", attrs.name);
        break;
      }
      case "software": {
        newSoftware = {
          name: "",
          cloneof: "",
          supported: "",
          description: "",
          alt_title: "",
          year: "",
          publisher: "",
        };

        inSoftware = true;
        newSoftware.name = attrs.name;
        if (attrs.cloneof) {
          newSoftware.cloneof = attrs.cloneof;
        }
        if (attrs.supported) {
          newSoftware.supported = attrs.supported;
        }
        newSoftwareList.softwares.push(newSoftware);
        break;
      }
    }

    // in Software tag
    if (inSoftware) {
      switch (name) {
        case "description": {
          currentTag = "description";
          break;
        }
        case "year": {
          currentTag = "year";
          break;
        }
        case "publisher": {
          currentTag = "publisher";
          break;
        }
        case "info": {
          // 日本語タイトル
          if (attrs.name === "alt_title") {
            for (const prop in attrs) {
              if (attrs[prop].slice(-1) === "/") {
                attrs[prop] = attrs[prop].slice(0, -1);
              }
            }
            attrs.value = zenToHan(attrs.value);
            newSoftware.alt_title = unEscape(attrs.value);

            // 括弧の移設
            // .... (...) ~ ... (.. Japan ..) (alt) のパターン
            let result = /^(.*? \(.*?\)) ~ (.*?)( \(.*?Japan.*?\))( \(.*?\)|)$/gi.exec(newSoftware.description);
            if (result !== null) {
              newSoftware.alt_title = newSoftware.alt_title + result[3] + " / " + result[1] + result[4];
            } else {
              let result = /^(.*?)( \(.*?Japan.*?\)) ~ (.*\(.*\))$/gi.exec(newSoftware.description);
              if (result !== null) {
                newSoftware.alt_title = newSoftware.alt_title + result[2] + " / " + result[3];
              } else {
                let kakko = newSoftware.description.match(regex);
                if (kakko !== null) {
                  newSoftware.alt_title += " " + kakko[0];
                }
              }
            }
          }
          break;
        }
        case "part": {
          if (attrs.interface) {
            newSoftware.interface = attrs.interface;
          }
        }
      }
    }
  });

  // 終了タグが見つかった
  parser.on("closetag", (name) => {
    switch (name) {
      case "software": {
        inSoftware = false;
        break;
      }
      case "description": {
        currentTag = "";
        break;
      }
      case "year": {
        currentTag = "";
        break;
      }
      case "publisher": {
        currentTag = "";
        break;
      }
    }
  });

  // テキストが見つかった
  parser.on("text", (text) => {
    if (inSoftware) {
      switch (currentTag) {
        case "description": {
          newSoftware.description = unEscape(text);
          break;
        }
        case "year": {
          newSoftware.year = text;
          break;
        }
        case "publisher": {
          newSoftware.publisher = zenToHan(unEscape(text));
          break;
        }
      }
    }
  });

  // 読み込みが完了した
  parser.on("finish", () => {
    console.log("XML parse completed.");
    // ソート
    sendDebug("ソート中...");
    for (let prop in softwarelists) {
      softwarelists[prop].softwares.sort((a, b) => {
        return a.name > b.name ? 1 : -1;
      });
    }
    console.log("Writing a file.");
    fs.writeFileSync("./temp/softlist.json", JSON.stringify(softwarelists, null, 1));
    sendDebug("softlist.json 出力完了");
  });

  // error
  parser.on("error", (err) => {
    console.log(err);
    return { result: false, error: "xml parser error: " + err };
  });

  // Streamとパーサーを接続してファイルを読み込んでいく
  const stream = fs.createReadStream(PATH_LISTSOFT);
  stream.pipe(parser);
  sendDebug("listsoft.xml 解析開始");
  console.log("after pipe");
  return { result: true };
});

/**
 * list.xml 解析
 */
const GameStatus = { gsGood: 0, gsImperfect: 1, gsPreliminary: 2, gsUnknown: 3 };

ipcMain.handle("parse-listxml", async (event, arg) => {
  sendDebug("list.xml 解析準備");

  // ファイルチェック
  if (fs.existsSync(PATH_LISTXML) === false) {
    sendDebug("list.xml 解析失敗：ファイルなし");
    return { result: false, error: "list.xml was not found." };
  }
  const stat = fs.statSync(PATH_LISTXML);
  if (stat.size < 200000000) {
    sendDebug("list.xml 解析失敗：ファイル無効");
    return { result: false, error: "list.xml file is too small." };
  }

  const parser = new Parser();
  let version = "";

  const listInfos = [];

  class ListInfo {
    constructor() {
      this.zipname = "";
      this.desc = "";
      this.maker = "";
      this.year = "????";
      this.cloneof = "";
      this.masterid = -1;
      this.master = true;
      this.romof = "";
      this.sampleof = "";
      this.vector = false;
      this.lightgun = false;
      this.analog = false;
      this.status = false;
      this.driverstatus = GameStatus.gsUnknown; // 新規
      this.channels = 0;
      this.vertical = false;

      this.cpus = "";
      this.sounds = "--";
      this.screens = "--";
      this.numscreens = 0;
      this.resx = 0;
      this.resy = 0;

      this.palette = GameStatus.gsUnknown; // color -> palette 改名
      this.sound = GameStatus.gsUnknown;
      this.graphics = GameStatus.gsUnknown; // gfx -> graphics 改名
      this.protection = GameStatus.gsUnknown; // protect -> protection 改名
      this.cocktail = GameStatus.gsUnknown;
      this.savestate = GameStatus.gsUnknown;

      this.source = "";
      this.chd = "";
      this.chdonly = true;
      this.chdmerge = false;
      this.ld = false;
      this.chdnodump = false;
      this.ismechanical = false;

      this.softlists = [];
      this.cpuList = [];
      this.soundList = [];
      this.screenList = [];
    }
  }

  /*
  type //
    PListInfo = ^TListInfo;
    TListInfo = record

      ZipName : string;     // Zip名
      DescE   : string;     // 英語名
      Maker   : string;     // メーカー
      Year    : string;     // 製造年

      CloneOf : string;     // マスタ名
      MasterID: integer;    // マスタのID
      Master  : boolean;    // マスタ

      RomOf   : string;     //  RomOf

      SampleOf: string;     // サンプル名

      Vector  : boolean;    // ベクター
      LightGun: boolean;    // 光線銃
      Analog  : boolean;    // アナログ操作
      Status  : boolean;    // ステータス Good=True
      Channels: integer;    // サウンドチャンネル数
      Vertical: boolean;    // 縦画面

      CPUs    : string;     // CPUs
      Sounds  : string;     // Sound chips
      Screens : string;     // 画面情報
      NumScreens: integer;  // 画面数
      Palettesize :integer; // 色数
      ResX    : Word;       // 解像度X
      ResY    : Word;       // 解像度Y
      ScanRate: string;     // スキャンレート
      Color   : TGameStatus;// 色ステータス
      Sound   : TGameStatus;// 音ステータス
      GFX     : TGameStatus;// GFXステータス
      Protect : TGameStatus;// プロテクトステータス
      Cocktail: TGameStatus;// カクテルステータス
      SaveState:TGameStatus;// セーブステート
      Source  : string;     // ソースファイル
      CHD     : string;     // CHD
      CHDOnly : boolean;    // CHDのみのゲーム
      CHDMerge: boolean;    // CHDのマージ指定あり
      LD      : boolean;    // レーザーディスク
      CHDNoDump: boolean;   // CHD未吸い出し
      isMechanical: boolean;// メカニカルゲーム

      Flag    : boolean;    // 汎用
  end;
*/

  let currentTag = ""; //
  let newItem;
  let inMachine = false;

  // 開始タグが見つかった
  parser.on("opentag", (name, attrs) => {
    switch (name) {
      case "mame": {
        version = attrs.build.slice(0, attrs.build.indexOf(" ("));
        break;
      }
      case "machine": {
        if (!attrs.runnable && !attrs.isbios) {
          inMachine = true;
          newItem = new ListInfo();
          listInfos.push(newItem);
          if (attrs.name) newItem.zipname = attrs.name; // zipname
          if (attrs.cloneof) {
            newItem.cloneof = attrs.cloneof;
            newItem.master = false;
          }
          if (attrs.romof) newItem.romof = attrs.romof;
          if (attrs.sampleof) newItem.sampleof = attrs.sampleof;
          if (attrs.sourcefile) newItem.source = attrs.sourcefile; // source
          if (attrs.ismechanical) newItem.ismechanical = attrs.ismechanical === "yes";
        }
        break;
      }
    }

    // machineタグ内だけ拾う
    if (inMachine) {
      switch (name) {
        case "description": {
          currentTag = "description";
          break;
        }
        case "year": {
          currentTag = "year";
          break;
        }
        case "manufacturer": {
          currentTag = "manufacturer";
          break;
        }
        case "rom": {
          if (newItem.chdonly && !attrs.hasOwnProperty("merge")) {
            newItem.chdonly = false;
          }
          break;
        }
        case "sound": {
          newItem.channels = parseInt(attrs.channels);
          break;
        }
        case "disk": {
          newItem.chd = attrs.name;
          if (attrs.merge) newItem.chdmerge = true;
          if (attrs.status) newItem.chdnodump = attrs.status === "nodump";
          if (attrs.region) newItem.ld = attrs.region === "laserdisc";
          break;
        }
        case "control": {
          if (attrs.type) newItem.lightgun = attrs.type === "lightgun";
          if (attrs.minimum) newItem.analog = true;
          break;
        }
        case "softwarelist": {
          newItem.softlists.push({ tag: attrs.tag, name: attrs.name });
          break;
        }
        case "driver": {
          for (const prop in attrs) {
            if (attrs[prop].slice(-1) === "/") {
              attrs[prop] = attrs[prop].slice(0, -1);
            }
          }
          newItem.status = attrs.status === "good";
          switch (newItem.status) {
            case "good":
              newItem.driverstatus = GameStatus.gsGood;
              break;
            case "imperfect":
              newItem.driverstatus = GameStatus.gsImperfect;
              break;
            case "preliminary":
              newItem.driverstatus = GameStatus.gsPreliminary;
              break;
          }

          if (attrs.savestate) {
            if (attrs.savestate.slice(-1) === "/") {
              attrs.savestate = attrs.savestate.slice(0, -1);
            }
            switch (attrs.savestate) {
              case "supported":
                newItem.savestate = GameStatus.gsGood;
                break;
              case "unsupported":
                newItem.savestate = GameStatus.gsPreliminary;
                break;
            }
          }

          if (attrs.cocktail) {
            if (attrs.cocktail === "preliminary") newItem.cocktail = GameStatus.gsPreliminary;
          }
          break;
        }

        case "feature": {
          for (const prop in attrs) {
            if (attrs[prop].slice(-1) === "/") {
              attrs[prop] = attrs[prop].slice(0, -1);
            }
          }

          let status;
          switch (attrs.status) {
            case "unemulated":
              status = GameStatus.gsPreliminary;
              break;
            case "imperfect":
              status = GameStatus.gsImperfect;
              break;
          }

          switch (attrs.type) {
            case "sound": {
              newItem.sound = status;
              break;
            }
            case "graphics": {
              newItem.graphics = status;
              break;
            }
            case "protection": {
              newItem.protection = status;
              break;
            }
            case "palette": {
              newItem.palette = status;
              break;
            }
          }

          break;
        }
        case "chip": {
          for (const prop in attrs) {
            if (attrs[prop].slice(-1) === "/") {
              attrs[prop] = attrs[prop].slice(0, -1);
            }
          }
          switch (attrs.type) {
            case "cpu": {
              let st = attrs.name;
              let clock = parseInt(attrs.clock);
              if (clock < 1000000) {
                st += " @ " + clock / 1000 + " KHz";
              } else {
                st += " @ " + clock / 1000000 + " MHz";
              }
              if (attrs.tag && attrs.tag !== "") {
                st += " (" + attrs.tag + ")";
              }
              newItem.cpuList.push(st);
              break;
            }
            case "audio": {
              if (attrs.name !== "Speaker") {
                let st = attrs.name;
                if (attrs.clock) {
                  let clock = parseInt(attrs.clock);
                  if (clock < 1000000) {
                    st += " @ " + clock / 1000 + " KHz";
                  } else {
                    st += " @ " + clock / 1000000 + " MHz";
                  }
                }
                newItem.soundList.push(st);
                break;
              }
              break;
            }
          }
          break;
        }
        case "display": {
          let w, h, r;
          if (attrs.type && attrs.type === "vector") newItem.vector = true;

          if (attrs.rotate && (attrs.rotate === "90" || attrs.rotate === "270")) {
            newItem.vertical = true;
            w = parseInt(attrs.height);
            h = parseInt(attrs.width);
          } else {
            w = parseInt(attrs.width);
            h = parseInt(attrs.height);
          }
          r = parseFloat(attrs.refresh);

          if (newItem.vector) {
            newItem.screenList.push("Vector @ " + r + " Hz");
          } else {
            newItem.screenList.push(w + "x" + h + " @ " + r + " Hz");
          }
          if (newItem.resx === 0) {
            newItem.resx = w;
            newItem.resy = h;
          }
          newItem.numscreens++;
        }
        default: {
        }
      }
    }
  });

  // 終了タグが見つかった
  parser.on("closetag", (name) => {
    switch (name) {
      case "machine": {
        if (inMachine) {
          inMachine = false; // <machine></machine>ぬけた

          // CPUまとめ
          // tag があるので現在はすべてユニーク
          let count = {};
          for (let i = 0; i < newItem.cpuList.length; i++) {
            let elm = newItem.cpuList[i];
            count[elm] = (count[elm] || 0) + 1;
          }

          let items = [];
          for (let key in count) {
            if (count[key] === 1) {
              items.push(key);
            } else {
              items.push(count[key] + " x " + key);
            }
          }
          newItem.cpus = items.join("<br>");

          // Soundsまとめ
          count = {};
          for (let i = 0; i < newItem.soundList.length; i++) {
            let elm = newItem.soundList[i];
            count[elm] = (count[elm] || 0) + 1;
          }

          items = [];
          for (let key in count) {
            if (count[key] === 1) {
              items.push(key);
            } else {
              items.push(count[key] + " x " + key);
            }
          }
          newItem.sounds = items.join("<br>");

          // Screens まとめ
          count = {};
          for (let i = 0; i < newItem.screenList.length; i++) {
            let elm = newItem.screenList[i];
            count[elm] = (count[elm] || 0) + 1;
          }

          items = [];
          for (let key in count) {
            if (count[key] === 1) {
              items.push(key);
            } else {
              items.push(count[key] + " x " + key);
            }
          }

          if (newItem.vector) {
            newItem.screens = "ベクタ, ";
          } else {
            newItem.screens = "ラスタ, ";
          }

          if (newItem.vertical) {
            newItem.screens += "縦表示, ";
          } else {
            newItem.screens += "横表示, ";
          }

          if (newItem.numscreens > 0) {
            newItem.screens += newItem.numscreens + "画面";
            newItem.screens += "<br>" + items.join(", ");
          } else {
            newItem.screens = "--";
          }
        }

        // 節約
        delete newItem.cpuList;
        delete newItem.soundList;
        delete newItem.screenList;

        break;
      }
      case "description": {
        currentTag = "";
        break;
      }
      case "year": {
        currentTag = "";
        break;
      }
      case "manufacturer": {
        currentTag = "";
        break;
      }
    }
  });

  // テキストが見つかった
  parser.on("text", (text) => {
    if (inMachine) {
      switch (currentTag) {
        case "description": {
          newItem.desc = text;
          break;
        }
        case "year": {
          newItem.year = text;
          break;
        }
        case "manufacturer": {
          newItem.maker = text;
          if (newItem.maker === "unknown") {
            newItem.maker = "<unknown>";
          } else if (newItem.maker === "(bootleg)") {
            newItem.maker = "bootleg";
          }
          break;
        }
      }
    }
  });

  // 読み込みが完了した
  parser.on("finish", async () => {
    console.log("XML parse completed.");

    const worker = new Worker("./worker.js", { workerData: "" });
    worker.on("message", (msg) => {
      console.log(msg);
    });
    worker.on("error", (err) => {
      console.error(err.message);
    });

    // マスタ ID の検索
    console.log("Finding Master IDs");
    for (let i = 0; i < listInfos.length; i++) {
      if (!listInfos[i].master) {
        const cloneof = listInfos[i].cloneof;
        let masterid = listInfos.findIndex((item) => item.zipname === cloneof);
        if (masterid !== -1) listInfos[i].masterid = masterid;
      } else {
        listInfos[i].masterid = i;
      }
    }
    //
    const resource = {
      version: version,
      listinfos: listInfos,
    };
    console.log("Writing a file.");
    fs.writeFileSync("./temp/resource.json", JSON.stringify(resource, null, 1));
    sendDebug("resource.json 出力完了");
  });

  // error
  parser.on("error", (err) => {
    console.log(err);
    return { result: false, error: "xml parser error: " + err };
  });

  // Streamとパーサーを接続してファイルを読み込んでいく
  const stream = fs.createReadStream(PATH_LISTXML);
  stream.pipe(parser);
  sendDebug("list.xml 解析開始");
  console.log("after pipe");
  return { result: true };
});

function zenToHan(st) {
  let han = st.replace(/[！-～]/g, (tmpStr) => {
    return String.fromCharCode(tmpStr.charCodeAt(0) - 0xfee0);
  });
  return han
    .replace(/”/g, '"')
    .replace(/’/g, "'")
    .replace(/‘/g, "`")
    .replace(/　/g, " ")
    .replace(/〜/g, "～")
    .replace(/．/g, ".");
}

function unEscape(st) {
  return st.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&amp;", "&");
}

///----------------------------------------------------------------------------------
/// About フォーム
function makeFromAbout() {
  // About メニュー
  frmAbout = new BrowserWindow({
    parent: mainWindow,
    modal: true,
    show: false,
    minWidth: 640,
    minHeight: 480,
    width: 640,
    height: 480,
    minimizable: false,
    maximizable: false,
    resizable: false,
    fullscreenable: false,
    title: "About",
    titleBarStyle: "hidden",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  // frmAbout.removeMenu();
  frmAbout.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  frmAbout.loadFile("about.html");
  frmAbout.once("ready-to-show", () => {
    frmAbout.show();
  });
}

ipcMain.handle("get-process-info", async (event, arg) => {
  return {
    appname: APPNAME,
    appversion: APPVERSION,
    platform: process.platform,
    node: process.version,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    os: require("os").release(),
    type: require("os").type(),
  };
});

ipcMain.handle("show-form-about", async (event, arg) => {
  makeFromAbout();
});

ipcMain.handle("close-form-about", async (event, arg) => {
  frmAbout.close();
});
