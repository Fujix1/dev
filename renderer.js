"use strict";

const APPNAME = "Retrofire Neo";
let listViewMain; // メインリストビュー
let record; // オリジナルの全ゲーム情報
const mameinfo = {}; // mameinfo.dat 情報
const history = {}; // history.dat 情報

const screenShot = new ScreenShot();
const command = new Command();
let zipName = "";
let dataIndex = -1;

const LANG = { JP: 0, EN: 1 };
let config = {
  language: LANG.JP, // 言語設定
  searchWord: "", // 検索文字列
  searchTarget: "", // 検索対象
  keepAspect: true, // スクリーンショットアスペクト比
  splitter: [
    // スプリッタの幅高初期値
    { id: "info", dimension: "360px" },
    { id: "tree", dimension: "200px" },
    { id: "bottom", dimension: "100px" },
  ],
};

const root = document.querySelector(":root");

// --------------------------------------------------------------------------
// アクションのこと
const actCut = new Action({
  caption: "切り取り",
  onExecute: (self) => {
    const target = self.caller.target;
    navigator.clipboard.writeText(target.value.substr(target.selectionStart, target.selectionEnd));
    target.value = target.value.substr(0, target.selectionStart) + target.value.substr(target.selectionEnd);
    target.dispatchEvent(new Event("cut"));
  },
  onUpdate: (self) => {
    const target = self.caller.target;
    self.enabled = target.selectionEnd - target.selectionStart > 0;
  },
});

const actCopy = new Action({
  caption: "コピー",
  onExecute: (self) => {
    const target = self.caller.target;
    navigator.clipboard.writeText(document.getSelection());
    target.dispatchEvent(new Event("copy"));
  },
  onUpdate: (self) => {
    const target = self.caller.target;
    self.enabled = String(document.getSelection()).length > 0;
  },
});

const actPaste = new Action({
  caption: "貼り付け",
  onExecute: async (self) => {
    const st = await navigator.clipboard.readText();
    const target = self.caller.target;
    target.value = target.value.substr(0, target.selectionStart) + st + target.value.substr(target.selectionEnd);
    target.dispatchEvent(new Event("paste"));
  },
  onUpdate: async (self) => {
    const st = await navigator.clipboard.readText();
    self.enabled = st !== "";
  },
});

// 編集用ポップアップメニュー
const pmEdit = new PopupMenu([{ action: actCut }, { action: actCopy }, { action: actPaste }]);
document.querySelector("#search").addEventListener("contextmenu", (e) => {
  e.stopPropagation();
  e.preventDefault();
  pmEdit.show(e);
});

const pmInfo = new PopupMenu([{ action: actCopy }]);
document.querySelector("#info").addEventListener("contextmenu", (e) => {
  e.stopPropagation();
  e.preventDefault();
  pmInfo.show(e);
});

//------------------------------------------------------------
const actRun = new Action({
  caption: "起動",
  keycode: "F5",
  iconFont: "microns",
  iconChar: "e71c",
  onExecute: async (self) => {
    //const currentTarget = self.caller.currentTarget;
    await window.retrofireAPI.executeMAME({
      zipName: zipName,
    });
  },
  onUpdate: async (self) => {
    //const currentTarget = self.caller.currentTarget;
    self.enabled = zipName !== "";
    self.caption = zipName !== "" ? "「" + zipName + "」を起動" : "起動";
  },
});

const actDriver = new Action({
  caption: "ドライバで絞り込み",
  iconFont: "microns",
  iconChar: "e744",
  onExecute: async (self) => {
    //const currentTarget = self.caller.currentTarget;
    document.getElementById("search").value = record[dataIndex].source;
    config.searchTarget = ""; // 検索対象リセット
    document.querySelector(".p-search__dropboxRadio[value='']").checked = true;
    listViewMain.updateListViewSearch({ searchWord: record[dataIndex].source, searchTarget: config.searchTarget });
  },
  onUpdate: async (self) => {
    //const currentTarget = self.caller.currentTarget;
    self.enabled = dataIndex !== -1;
    if (dataIndex === -1) {
      self.caption = "ドライバ名で絞り込む";
    } else {
      self.caption = "「" + record[dataIndex].source + "」で絞り込む";
    }
  },
});

const actGithub = new Action({
  caption: "GitHubを開く",
  iconFont: "themify",
  iconChar: "e73f",
  onExecute: async (self) => {
    //const currentTarget = self.caller.currentTarget;
    await window.retrofireAPI.openURL(
      "https://github.com/mamedev/mame/blob/master/src/mame/" + record[dataIndex].source
    );
  },
  onUpdate: async (self) => {
    //const currentTarget = self.caller.currentTarget;
    self.enabled = dataIndex !== -1;
    if (dataIndex === -1) {
      self.caption = "GitHubを開く";
    } else {
      self.caption = "「" + record[dataIndex].source + "」をGitHubで開く";
    }
  },
});

const actDeleteSettings = new Action({
  caption: "設定ファイル削除",
  iconFont: "themify",
  iconChar: "e605",
  parent: true,
});

const actDeleteCfg = new Action({
  caption: "cfg ファイル",
  onExecute: async (self) => {
    //const currentTarget = self.caller.currentTarget;
    await window.retrofireAPI.cfgDelete(zipName);
  },
  onUpdate: async (self) => {
    //const currentTarget = self.caller.currentTarget;
    self.enabled = await window.retrofireAPI.cfgExists(zipName);
  },
});

const actDeleteNvram = new Action({
  caption: "nvram ファイル",
  onExecute: async (self) => {
    //const currentTarget = self.caller.currentTarget;
    await window.retrofireAPI.nvramDelete(zipName);
  },
  onUpdate: async (self) => {
    //const currentTarget = self.caller.currentTarget;
    self.enabled = await window.retrofireAPI.nvramExists(zipName);
  },
});

const actDeleteNvCfg = new Action({
  caption: "すべて",
  keycode: "Delete",
  onExecute: async (self) => {
    //const currentTarget = self.caller.currentTarget;
    await window.retrofireAPI.nvcfgDelete(zipName);
  },
  onUpdate: async (self) => {
    //const currentTarget = self.caller.currentTarget;
    self.enabled = await window.retrofireAPI.nvcfgExists(zipName);
  },
});

const pmMainList = new PopupMenu([
  { action: actRun },
  { action: "---" },
  { action: actDriver },
  { action: actGithub },
  { action: "---" },
  {
    action: actDeleteSettings,
    children: [{ action: actDeleteCfg }, { action: actDeleteNvram }, { action: "---" }, { action: actDeleteNvCfg }],
  },
]);
document.querySelector(".list-view").addEventListener("contextmenu", async (e) => {
  e.stopPropagation();
  e.preventDefault();
  await pmMainList.show(e);
});

//------------------------------------------------------------
const actKeepAspect = new Action({
  caption: "アスペクト比を保持",
  onExecute: async (self) => {
    screenShot.keepAspect = !screenShot.keepAspect;
    screenShot.setAspect();
  },
  onUpdate: async (self) => {
    self.checked = screenShot.keepAspect;
  },
});

const actDeleteScreenShot = new Action({
  caption: "削除",
  iconFont: "themify",
  iconChar: "e605",
  onExecute: async (self) => {
    await window.retrofireAPI.deleteScreenShot(screenShot.zipName);
    screenShot.show(screenShot.zipName);
  },
  onUpdate: async (self) => {
    self.enabled = screenShot.index !== -1;
  },
});

const actTakeOutFromFolder = new Action({
  caption: "フォルダから出す",
  iconFont: "microns",
  iconChar: "e777",
  onExecute: async (self) => {
    await window.retrofireAPI.renameScreenShot(screenShot.zipName);
    screenShot.show(screenShot.zipName);
  },
  onUpdate: async (self) => {
    self.enabled = screenShot.index !== -1 && screenShot.infolder;
  },
});

const pmScreenshot = new PopupMenu([
  { action: actKeepAspect },
  { action: "---" },
  { action: actDeleteScreenShot },
  { action: "---" },
  { action: actTakeOutFromFolder },
]);
document.querySelector(".p-info__screenshot").addEventListener("contextmenu", (e) => {
  console.log("contextmenu");
  e.stopPropagation();
  e.preventDefault();
  pmScreenshot.show(e);
});

//---------------------------------------------------------------------------
// Window Onload
window.addEventListener("DOMContentLoaded", onLoad);
async function onLoad() {
  // 設定読み込みと適用
  const readConfig = await window.retrofireAPI.getStore("config");
  if (readConfig) {
    if (readConfig.hasOwnProperty("searchWord")) {
      config.searchWord = readConfig.searchWord;
      document.getElementById("search").value = readConfig.searchWord;
    }

    if (readConfig.hasOwnProperty("language")) {
      config.language = readConfig.language;
      document.getElementById("language").checked = readConfig.language == LANG.EN;
    }

    if (readConfig.hasOwnProperty("searchTarget")) {
      config.searchTarget = readConfig.searchTarget;
      document.querySelector('input[name="searchRadio"][value="' + readConfig.searchTarget + '"]').checked = true;
    }
    // スクリーンショット設定
    if (readConfig.hasOwnProperty("keepAspect")) {
      screenShot.keepAspect = readConfig.keepAspect;
    }
    // スプリッター設定
    if (readConfig.hasOwnProperty("splitter")) {
      config.splitter = readConfig.splitter;
    }
    // コマンドタブ
    if (readConfig.hasOwnProperty("infoTab")) {
      document.querySelector(".m-tab__radio[value='" + readConfig.infoTab + "']").checked = true;
    }
    // コマンドオプション
    if (readConfig.hasOwnProperty("command")) {
      config.command = readConfig.command;
    }
  }

  // スプリッター初期設定
  config.splitter.forEach((item) => {
    if (item.dimension !== "") {
      config.splitter[item.id] = item.dimension;
      root.style.setProperty("--splitter-" + item.id + "-dimension", item.dimension);
    }
  });

  // 検索オプション
  document.querySelector(".p-search__dropbox").addEventListener("mouseenter", (e) => {
    PopupMenu.close();
  });

  // キー入力処理
  // input は優先
  document
    .querySelectorAll(
      "input[type='search'],input[type='text'],input[type='number'],input[type='url'],input[type='password']"
    )
    .forEach((item) => {
      item.addEventListener(
        "keydown",
        (e) => {
          e.stopPropagation();
        },
        false
      );
    });

  window.addEventListener("keydown", async (e) => {
    // ポップアップメニュー表示中 のキー処理
    if (document.body.classList.contains("is-popupmenu-open")) {
      const popup = PopupMenu.currentPopupMenu; // 現在のポップアップメニュー
      const activeIndex = popup.getAttribute("activeIndex") ? parseInt(popup.getAttribute("activeIndex")) : -1; // 選択中の有効なアクション Index
      const actionLength = parseInt(popup.getAttribute("length")); // メニュー内の有効アクション数
      let targetAction; // 選択されているアクションオブジェクト
      for (let i = 0; i < popup.actions.length; i++) {
        if (popup.actions[i].index === activeIndex) {
          targetAction = popup.actions[i].action;
        }
      }

      switch (e.key) {
        case "Enter":
          if (targetAction) targetAction.execute();
          break;
        case "ArrowUp": {
          if (activeIndex === -1) {
            popup.setAttribute("activeIndex", actionLength - 1);
          } else {
            popup.setAttribute("activeIndex", mod(activeIndex - 1, actionLength));
          }
          Action.highLight(popup);
          break;
        }
        case "ArrowDown": {
          if (activeIndex === -1) {
            popup.setAttribute("activeIndex", 0);
          } else {
            popup.setAttribute("activeIndex", mod(activeIndex + 1, actionLength));
          }
          Action.highLight(popup);
          break;
        }
        case "ArrowRight": {
          // 子メニューを開く
          if (activeIndex !== -1) {
            if (targetAction.parent) {
              await targetAction.li.showChildren();
              // 先頭を選択
              const childUL = targetAction.li.querySelector(":scope>ul.m-popup");
              if (childUL && childUL.getAttribute("length") > 0) {
                childUL.setAttribute("activeIndex", 0);
                Action.highLight(childUL);
              }
            }
          }
          break;
        }
        case "ArrowLeft": {
          // 子自分メニューを閉じる
          const parentItem = popup.parentNode;
          if (parentItem.tagName !== "BODY") {
            parentItem.classList.remove("is-child-open");
            popup.classList.remove("is-open");
            popup.setAttribute("activeIndex", -1);
            PopupMenu.currentPopupMenu = parentItem.parentNode;
          }
          break;
        }
        case "Escape":
          PopupMenu.close();
          break;
      }
      return;
    }

    // 平時
    switch (e.key) {
      case "F12": // 言語切替
        config.language = config.language == LANG.JP ? LANG.EN : LANG.JP;
        document.getElementById("language").checked = config.language == LANG.EN;
        listViewMain.updateListView(true);
        break;
      case "Backspace": // 検索ボックスフォーカス
        const search = document.getElementById("search");
        if (e.target !== search) {
          search.focus();
          e.preventDefault();
        }
        break;
      case "f": {
        if (e.ctrlKey) {
          const search = document.getElementById("search");
          if (e.target !== search) {
            search.focus();
          }
          break;
        }
      }
      case "Escape": // 検索リセット
        clearSearch();
        break;
    }
  });

  // ウィンドウリサイズ
  window.addEventListener("resize", (e) => {
    PopupMenu.close(); // ポップアップ閉じる
  });

  // 言語切替
  document.getElementById("language").addEventListener("change", (e) => {
    config.language = e.target.checked ? LANG.EN : LANG.JP;
    listViewMain.updateListView(true);
  });

  // empty the debug output
  document.querySelector("#debug").value = "";

  document.querySelector("#test3").addEventListener("click", () => {
    executeMAME({ zipName: document.querySelector("#test3").value, softName: "ys2" });
  });

  document.querySelector("#btn-reset").addEventListener("click", async () => {});

  document.querySelector("#btn-dialog").addEventListener("click", async () => {
    // メインプロセスを呼び出し
    const result = await window.retrofireAPI.dialog("");
    if (result && result.result == true) {
      window.requestAnimationFrame(() => {
        document.querySelector(".p-info__img").src = "data:image/png;base64," + result.img;
      });
    }
  });

  document.querySelector("#btn-item2").addEventListener("click", () => {
    console.log(listViewMain.dataIndex);
    listViewMain.makeVisible();
  });

  // 検索欄入力イベント
  document.querySelector("#search").addEventListener("input", (e) => {
    if (e.target.getAttribute("IME") !== "true") {
      listViewMain.updateListViewSearch({ searchWord: e.target.value });
    }
  });
  document.querySelector("#search").addEventListener("cut", (e) => {
    listViewMain.updateListViewSearch({ searchWord: e.target.value });
  });
  document.querySelector("#search").addEventListener("paste", (e) => {
    listViewMain.updateListViewSearch({ searchWord: e.target.value });
  });
  document.querySelector("#search").addEventListener("keydown", (e) => {
    // ポップアップメニュー あり
    if (document.body.classList.contains("is-popupmenu-open")) {
      e.preventDefault();
      return;
    }
    if (e.code === "Tab") {
      listViewMain.setFocusOnItem();
      e.preventDefault();
      return;
    }
    if (e.target.getAttribute("IME") == "true") {
    } else {
      if (e.code === "Enter" || e.code === "NumpadEnter") {
        listViewMain.setFocusOnItem();
        e.preventDefault();
        return;
      }
    }
  });
  document.querySelector("#search").addEventListener("focus", (e) => {
    e.target.select();
  });

  // IME 変換中
  document.querySelector("#search").addEventListener("compositionstart", (e) => {
    e.target.setAttribute("IME", true);
  });

  // IME 変換確定
  document.querySelector("#search").addEventListener("compositionend", (e) => {
    e.target.setAttribute("IME", false);
    listViewMain.updateListViewSearch({ searchWord: e.target.value });
  });

  // 検索対象
  document.getElementsByName("searchRadio").forEach((item) => {
    item.addEventListener("change", (e) => {
      config.searchTarget = document.querySelector('input[name="searchRadio"]:checked').value;
      listViewMain.updateListViewSearch({ searchTarget: config.searchTarget });
    });
  });

  const mamedb = new Database();
  await mamedb.loadFromFile();

  // ゲームデータ読み込み
  var tick = Date.now();
  record = JSON.parse(await window.retrofireAPI.getRecord());
  // descJ と kana 追加
  for (let i = 0; i < record.length; i++) {
    record[i].kana = record[i].desc;
    record[i].descJ = record[i].desc;
    record[i].descHiragana = record[i].desc;
  }
  console.log(Date.now() - tick);
  console.log("resources.json:", record.length);

  // mame32j読み込み
  var tick = Date.now();
  let mame32j = await window.retrofireAPI.getMame32j();
  mame32j = mame32j.split("\n");

  let n = 0;
  for (let i = 0; i < mame32j.length; i++) {
    const item = mame32j[i].split("\t");
    for (let j = n; j < record.length; j++) {
      if (record[j].zipname === item[0]) {
        record[j].descJ = item[1];
        // 検索用のひらがな変換
        const hiragana = item[1].replace(/[ァ-ン]/g, function (s) {
          return String.fromCharCode(s.charCodeAt(0) - 0x60);
        });
        record[j].descHiragana = hiragana;
        record[j].kana = item[2];
        n = j + 1;
        break;
      }
    }
  }
  console.log("mame32j:", Date.now() - tick, "ms");

  // mameinfo.dat読み込み
  var tick = Date.now();
  let fileContents = await window.retrofireAPI.getMameInfo();
  if (fileContents) {
    let info = "";
    let st = "";

    fileContents.split(/\r?\n/).forEach((line) => {
      if (line.startsWith("$info=")) {
        info = line.substr(6).split(",");
      } else if (line.startsWith("$mame")) {
        st = "";
      } else if (line.startsWith("$end")) {
        st = st.replace(/\n\n\n/g, "<br><br>");
        st = st.replace(/\n\n/g, "<br>");
        info.forEach((item) => {
          mameinfo[String(item).trim()] = st;
        });
      } else {
        st += line + "\n";
      }
    });
  }
  fileContents = "";

  // history.dat読み込み
  var tick = Date.now();
  fileContents = await window.retrofireAPI.getHistory();
  if (fileContents) {
    let info = [];
    let st = "";

    fileContents.split(/\r?\n/).forEach((line) => {
      if (line.startsWith("$info=")) {
        info = line.substr(6).split(",");
      } else if (line.startsWith("$bio")) {
        st = "";
      } else if (line.startsWith("$end")) {
        st = st.replace(/\n/g, "<br>");
        info.forEach((item) => {
          history[String(item).trim()] = st;
        });
      } else {
        st += line + "\n";
      }
    });
  }

  console.log("history:", Date.now() - tick, "ms");

  // Command.dat 読み込み
  command.init(config.command);

  // リストビュー初期化
  var tick = Date.now();
  listViewMain = new ListView({
    data: record,
    target: ".list-view",
    columns: [
      {
        label: "ゲーム名",
        data: "desc",
        order: 0,
        width: 380,
        defaultSort: "asc",
      },
      {
        label: "ZIP名",
        data: "zipname",
        order: 1,
        width: 100,
        defaultSort: "asc",
      },
      {
        label: "メーカー",
        data: "maker",
        order: 2,
        width: 160,
        defaultSort: "asc",
      },
      { label: "年度", data: "year", order: 3, width: 55, defaultSort: "asc" },
      {
        label: "マスタ",
        data: "cloneof",
        order: 4,
        width: 100,
        defaultSort: "asc",
      },
      {
        label: "ドライバ",
        data: "source",
        order: 5,
        width: 180,
        defaultSort: "asc",
      },
    ],
    slug: "main",
    orderByIndex: 1,
    sortDirection: "asc",
    index: -1,
    searchWord: config.searchWord,
    searchTarget: config.searchTarget,
    onSelect: itemSelectHandler,
  });

  await listViewMain.init();
  console.log("listview init:", Date.now() - tick, "ms");
  window.retrofireAPI.windowIsReady();
}

// 項目選択時の処理
async function itemSelectHandler(argDataIndex, argZipName) {
  zipName = argZipName;
  dataIndex = argDataIndex;

  // 項目なし
  if (argDataIndex === -1) {
    document.querySelector("#info").innerHTML = "";
    screenShot.show("");
    command.show("");
    return;
  }

  const masterId = parseInt(this.data[argDataIndex].masterid);
  const isMaster = this.data[argDataIndex].master === -1;

  let masterZip = "";
  if (masterId !== -1) {
    masterZip = this.data[masterId].zipname;
  }

  // dat 情報表示
  let st = "";
  if (history.hasOwnProperty(argZipName)) {
    st += history[argZipName];
  } else {
    // クローンのときは親を見る
    if (!isMaster && history.hasOwnProperty(masterZip)) {
      st += history[masterZip];
    }
  }
  if (st !== "") {
    st += "<br>";
  }

  if (mameinfo.hasOwnProperty(argZipName)) {
    st += mameinfo[argZipName];
  } else {
    // クローンのときは親を見る
    const masterId = this.data[argDataIndex].masterid;
    if (!isMaster && mameinfo.hasOwnProperty(this.data[masterId].zipname)) {
      st += mameinfo[this.data[masterId].zipname];
    }
  }
  window.requestAnimationFrame(() => {
    document.querySelector("#info").innerHTML = st;
  });

  screenShot.show(argZipName);
  command.show(argZipName);
}

// ウインドウ終了前
window.addEventListener("beforeunload", (e) => {
  saveFormConfig();
  listViewMain.saveSettings();
});

// 検索クリア
document.getElementById("clear").addEventListener("click", clearSearch);
function clearSearch() {
  document.querySelector("#search").value = "";
  listViewMain.updateListViewSearch({ searchWord: "" });
}

//------------------------------------------------------------------------------
// フォームの config 送信
function saveFormConfig() {
  try {
    // 検索文字列
    config.searchWord = document.querySelector("#search").value.trim();

    // スプリッター設定
    config.splitter = [];
    document.querySelectorAll(".l-splitter").forEach((item) => {
      const id = item.getAttribute("splitter-id");
      const dimension = root.style.getPropertyValue("--splitter-" + id + "-dimension");
      if (dimension !== undefined) {
        config.splitter.push({ id: id, dimension: dimension });
      }
    });

    // スクリーンショットアスペクト比
    config.keepAspect = screenShot.keepAspect;

    // コマンドタブ
    config.infoTab = parseInt(document.querySelector(".m-tab__radio:checked").value);

    // コマンド設定
    config.command = command.getConfig;

    config.splitter = window.retrofireAPI.setStoreTemp({ key: "config", val: config });
    console.log("フォーム設定 main.js に送信");
  } catch (e) {
    console.log(e);
  }
}

//------------------------------------------------------------------------------
// スクリーンショットフィット切り替え
document.querySelector(".p-info__screenshot").addEventListener("click", (e) => {
  screenShot.keepAspect = !screenShot.keepAspect;
  screenShot.setAspect();
});

// 起動
async function executeMAME(args) {
  console.log("executeMAME", args);
  const result = await window.retrofireAPI.executeMAME(args);
}

//------------------------------------
// メインスレッドから受信
//------------------------------------
window.retrofireAPI.onDebugMessage((_event, text) => {
  console.log("onDebugMessage", text);
  const debug = document.querySelector("#debug");
  debug.value = debug.value + text + "\n";
  debug.scrollTop = debug.scrollHeight;
});

// フォーカスロスト
window.retrofireAPI.onBlur((_event, text) => {
  console.log("onBlur");
  // ポップアップ閉じる
  PopupMenu.close();
});

// フォーカス
window.retrofireAPI.onFocus((_event, text) => {
  console.log("onFocus");
  // スクリーンショット読み直す
  screenShot.show(zipName);
});

// -------------------------------------
function mod(i, j) {
  return i % j < 0 ? (i % j) + 0 + (j < 0 ? -j : j) : (i % j) + 0;
}
