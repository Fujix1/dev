"use strict";

const APPNAME = "Retrofire Neo";
let listViewMain; // メインリストビュー
let listViewSub;

let mamedb; // ゲーム情報管理用オブジェクト
const mameinfo = {}; // mameinfo.dat 情報
const history = {}; // history.dat 情報

const screenShot = new ScreenShot();
const command = new Command();

let dataIndex = -1;
let dataSubIndex = -1;
let dataSubZipname = "";
let dataSubTable = [];

let updatingListView = false;

const LANG = { JP: 0, EN: 1 };
let config = {
  language: LANG.JP, // 言語設定
  searchWord: "", // 検索文字列
  searchFields: "", // 検索対象
  keepAspect: true, // スクリーンショットアスペクト比
  splitter: [
    // スプリッタの幅高初期値
    { id: "info", dimension: "360px" },
    { id: "tree", dimension: "200px" },
    { id: "bottom", dimension: "100px" },
  ],
  zipName: "", // 選択中の zip 名
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

const actKensaku = new Action({
  caption: "選択文字列をウェブ検索...",
  onExecute: async (self) => {
    const target = self.caller.target;
    await window.retrofireAPI.openURL("https://duckduckgo.com/?q=" + String(document.getSelection()).trim());
  },
  onUpdate: async (self) => {
    const target = self.caller.target;
    self.enabled = String(document.getSelection()).length > 0;
    self.caption = "選択文字列をウェブ検索...";
  },
});

// 編集用ポップアップメニュー
const pmEdit = new PopupMenu([{ action: actCut }, { action: actCopy }, { action: actPaste }]);
document.querySelector("#search").addEventListener("contextmenu", (e) => {
  e.stopPropagation();
  e.preventDefault();
  pmEdit.show(e);
});

const pmInfo = new PopupMenu([{ action: actCopy }, { action: actKensaku }]);
document.querySelector("#info").addEventListener("contextmenu", (e) => {
  e.stopPropagation();
  e.preventDefault();
  pmInfo.show(e);
});

//------------------------------------------------------------
const actRun = new Action({
  caption: "起動",
  keycode: "F5",
  iconFont: "fontello",
  iconChar: "E803",
  onExecute: async (self) => {
    await window.retrofireAPI.executeMAME({
      zipName: config.zipName,
    });
  },
  onUpdate: async (self) => {
    self.enabled = config.zipName !== "";
    self.caption = config.zipName !== "" ? "「" + config.zipName + "」を起動" : "起動";
  },
});

const actDriver = new Action({
  caption: "ドライバで絞り込み",
  iconFont: "fontello",
  iconChar: "E802",
  onExecute: async (self) => {
    //const currentTarget = self.caller.currentTarget;
    document.getElementById("search").value = Dataset.master[dataIndex].source;
    config.searchFields = ""; // 検索対象リセット
    document.querySelector(".p-search__dropboxRadio[value='']").checked = true;
    config.searchWord = Dataset.master[dataIndex].source;
    updateListView();
  },
  onUpdate: async (self) => {
    //const currentTarget = self.caller.currentTarget;
    self.enabled = dataIndex !== -1;
    if (dataIndex === -1) {
      self.caption = "ドライバ名で絞り込む";
    } else {
      self.caption = "「" + Dataset.master[dataIndex].source + "」で絞り込む";
    }
  },
});

const actGithub = new Action({
  caption: "GitHubを開く",
  iconFont: "fontello",
  iconChar: "F308",
  onExecute: async (self) => {
    //const currentTarget = self.caller.currentTarget;
    await window.retrofireAPI.openURL(
      "https://github.com/mamedev/mame/blob/master/src/mame/" + Dataset.master[dataIndex].source
    );
  },
  onUpdate: async (self) => {
    //const currentTarget = self.caller.currentTarget;
    self.enabled = dataIndex !== -1;
    if (dataIndex === -1) {
      self.caption = "GitHubを開く";
    } else {
      self.caption = "「" + Dataset.master[dataIndex].source + "」をGitHubで開く";
    }
  },
});

const actDeleteSettings = new Action({
  caption: "設定ファイル削除",
  iconFont: "themify",
  iconChar: "e605",
  parent: true,
  onUpdate: async (self) => {
    if (config.zipName === "") {
      self.enabled = false;
    } else {
      self.enabled = await window.retrofireAPI.nvcfgExists(config.zipName);
    }
  },
});

const actDeleteCfg = new Action({
  caption: "cfg ファイル",
  onExecute: async (self) => {
    //const currentTarget = self.caller.currentTarget;
    await window.retrofireAPI.cfgDelete(config.zipName);
  },
  onUpdate: async (self) => {
    //const currentTarget = self.caller.currentTarget;
    self.enabled = await window.retrofireAPI.cfgExists(config.zipName);
  },
});

const actDeleteNvram = new Action({
  caption: "nvram ファイル",
  onExecute: async (self) => {
    //const currentTarget = self.caller.currentTarget;
    if (config.zipName === "") {
      return;
    } else {
      await window.retrofireAPI.nvramDelete(config.zipName);
    }
  },
  onUpdate: async (self) => {
    //const currentTarget = self.caller.currentTarget;
    if (config.zipName === "") {
      self.enabled = false;
    } else {
      self.enabled = await window.retrofireAPI.nvramExists(config.zipName);
    }
  },
});

const actDeleteNvCfg = new Action({
  caption: "すべて",
  keycode: "Delete",
  onExecute: async (self) => {
    //const currentTarget = self.caller.currentTarget;
    if (config.zipName === "") {
      return;
    } else {
      await window.retrofireAPI.nvcfgDelete(config.zipName);
    }
  },
  onUpdate: async (self) => {
    if (config.zipName === "") {
      self.enabled = false;
    } else {
      self.enabled = await window.retrofireAPI.nvcfgExists(config.zipName);
    }
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
document.querySelector(".list-sub").addEventListener("contextmenu", async (e) => {
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
  iconFont: "fontello",
  iconChar: "e806",
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

//---------------------------------------------------------------------
// Window Onload
window.addEventListener("DOMContentLoaded", onLoad);
async function onLoad() {
  // 設定読み込みと適用
  const readConfig = await window.retrofireAPI.getStore("config");
  console.log("readConfig", readConfig);
  if (readConfig) {
    if (readConfig.hasOwnProperty("searchWord")) {
      config.searchWord = readConfig.searchWord;
      document.getElementById("search").value = readConfig.searchWord;
    }
    if (readConfig.hasOwnProperty("language")) {
      config.language = readConfig.language;
      document.getElementById("language").checked = readConfig.language == LANG.EN;
    }
    if (readConfig.hasOwnProperty("searchFields")) {
      config.searchFields = readConfig.searchFields;
      document.querySelector('input[name="searchRadio"][value="' + readConfig.searchFields + '"]').checked = true;
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
    // zipName
    if (readConfig.hasOwnProperty("zipName")) {
      config.zipName = readConfig.zipName;
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
          switch (e.key) {
            case "F12":
              break;
            default:
              e.stopPropagation();
          }
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
        if (!e.repeat) {
          config.language = config.language == LANG.JP ? LANG.EN : LANG.JP;
          document.getElementById("language").checked = config.language == LANG.EN;
          console.log(updatingListView);
          updateListView();
        }

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
  document.getElementById("language").addEventListener("change", async (e) => {
    config.language = e.target.checked ? LANG.EN : LANG.JP;
    updateListView();
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
    console.log(window.retrofireAPI.parseListxml(""));
  });

  // 検索欄入力イベント
  document.querySelector("#search").addEventListener("input", (e) => {
    if (e.target.getAttribute("IME") !== "true") {
      config.searchWord = e.target.value;
      updateListView();
    }
  });
  document.querySelector("#search").addEventListener("cut", (e) => {
    config.searchWord = e.target.value;
    updateListView();
  });
  document.querySelector("#search").addEventListener("paste", (e) => {
    config.searchWord = e.target.value;
    updateListView();
  });
  document.querySelector("#search").addEventListener("keydown", (e) => {
    // ポップアップメニュー あり
    if (document.body.classList.contains("is-popupmenu-open")) {
      e.preventDefault();
      return;
    }
    if (e.code === "Tab") {
      listViewMain.makeVisible();
      e.preventDefault();
      return;
    }
    if (e.target.getAttribute("IME") == "true") {
    } else {
      if (e.code === "Enter" || e.code === "NumpadEnter") {
        listViewMain.makeVisible();
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
    config.searchWord = e.target.value;
    updateListView();
  });

  // 検索対象
  document.getElementsByName("searchRadio").forEach((item) => {
    item.addEventListener("change", (e) => {
      config.searchFields = document.querySelector('input[name="searchRadio"]:checked').value;
      config.searchWord = document.querySelector("#search").value;
      mamedb.filter({ word: config.searchWord, fields: config.searchFields });
      mamedb.sort();
      listViewMain.itemCount = mamedb.filteredLength;
      updateListView();
    });
  });

  //----------------------------------------------------------------------
  mamedb = new Dataset();
  await mamedb.loadFromFile();
  mamedb.filter(config.searchWord, config.searchFields);

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
    slug: "main",
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
    orderByIndex: 1,
    sortDirection: "asc",
    index: -1,
    onColumnClick: async (property, direction) => {
      const idx = mamedb.getDataIndex(listViewMain.itemIndex);
      mamedb.sort({ field: property, direction: direction });
      // ソート後の dataIndex
      listViewMain.itemIndex = mamedb.filteredTable.indexOf(idx);
      listViewMain.updateRowTexts();
      listViewMain.makeVisible();
    },
    onSelect: async (index) => {
      if (index === -1) return;
      const row = mamedb.getFilteredRecord(index);
      const dataIndex = mamedb.getDataIndex(index);
      await itemSelectHandler(dataIndex, row.zipname);
    },
    onData: (index) => {
      const row = { classList: ["m-listView__cellIcon"], cloneof: "" };
      Object.assign(row, mamedb.getFilteredRecord(index));
      if (config.language == LANG.JP) {
        row.desc = row.descJ;
      }
      // アイコン
      if (row.cloneof) {
        row.classList.push("m-listView__cellIcon--clone");
      }
      if (!row.status) {
        row.classList.push("m-listView__cellIcon--nowork");
      }
      return row;
    },
    onEnter: (index) => {
      const row = mamedb.getFilteredRecord(index);
      console.log("onEnter", index);
      window.retrofireAPI.executeMAME({ zipName: row.zipname });
    },
    onKeyDown: (e) => {
      switch (e.code) {
        case "Tab":
          if (e.shiftKey) {
            document.querySelector("#search").focus();
          }
          e.preventDefault();
          break;
      }
    },
    onFocus: (e, index) => {
      // 起動用のセット名更新
      dataIndex = mamedb.getDataIndex(index);
      config.zipName = Dataset.master[dataIndex].zipname;
    },
  });

  await listViewMain.init();

  listViewSub = new ListView({
    slug: "sub",
    target: ".list-sub",
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
      {
        label: "訳",
        data: "translated",
        order: 6,
        width: 30,
        defaultSort: "asc",
      },
    ],
    orderByIndex: 1,
    sortDirection: "asc",
    index: -1,
    columnClickable: false,
    onColumnClick: async (property, direction) => {
      // 何もしない
    },
    onSelect: async (index) => {
      if (index === -1) return;

      const dataIndex = dataSubTable[index];
      subItemSelectHandler(dataIndex);
    },
    onData: (index) => {
      const row = { classList: ["m-listView__cellIcon"], cloneof: "" };
      Object.assign(row, Dataset.master[dataSubTable[index]]);
      if (config.language == LANG.JP) {
        row.desc = row.descJ;
      }
      // アイコン
      if (row.cloneof) {
        row.classList.push("m-listView__cellIcon--clone");
      }
      if (!row.status) {
        row.classList.push("m-listView__cellIcon--nowork");
      }
      // 訳
      row.translated = row.desc !== row.descJ || row.desc !== row.kana ? "✓" : "";
      return row;
    },
    onEnter: (index) => {
      const row = Dataset.master[dataSubTable[index]];
      window.retrofireAPI.executeMAME({ zipName: row.zipname });
    },
    onKeyDown: (e) => {
      switch (e.code) {
        case "Tab":
          if (e.shiftKey) {
            document.querySelector("#search").focus();
          }
          e.preventDefault();
          break;
      }
    },
    onFocus: (e, index) => {
      // 起動用のセット名更新
      dataIndex = dataSubTable[index];
      config.zipName = Dataset.master[dataIndex].zipname;
    },
  });
  await listViewSub.init();

  updateListView();

  window.retrofireAPI.windowIsReady();
}

// リストビューを更新
async function updateListView() {
  var tick = Date.now();
  await mamedb.filter({
    word: config.searchWord,
    fields: config.searchFields,
  });
  await mamedb.sort({
    field: listViewMain.columns[listViewMain.orderByIndex].data,
    direction: listViewMain.sortDirection,
  });
  listViewMain.itemCount = mamedb.filteredLength;
  listViewMain.itemIndex = mamedb.getFilterdIndexByZip(config.zipName);

  // 全項目再描画
  await listViewMain.updateRowTexts();

  // 項目再選択
  await itemSelectHandler(mamedb.getDataIndex(listViewMain.itemIndex), config.zipName);
  await listViewMain.makeVisible(false);

  // 項目数表示
  document.getElementById("footerNum").innerText = mamedb.filteredLength + " / " + Dataset.master.length;

  //

  console.log("updateListView", Date.now() - tick, "ms");
}

// 項目選択時の処理
async function itemSelectHandler(argDataIndex, argZipName) {
  config.zipName = argZipName;
  dataIndex = argDataIndex;
  let masterZip = "";

  // 項目なし
  if (mamedb.filteredLength === 0) {
    document.querySelector("#info").innerHTML = "";
    screenShot.show("");
    command.show("");
    config.zipName = "";
    dataIndex = -1;

    // サブリスト
    dataSubIndex = -1;
    dataSubZipname = "";
    dataSubTable = [];
    updateSubList();
    return;
  }

  // 選択肢ない場合は選択リセット
  if (argDataIndex === -1) {
    const row = mamedb.getFilteredRecord(0);
    config.zipName = row.zipname;
    dataIndex = mamedb.getDataIndex(0);
    listViewMain.itemIndex = 0;
    argDataIndex = dataIndex;
    argZipName = config.zipName;
  }

  //console.log("itemSelectHandler", argZipName);

  const masterId = Dataset.master[argDataIndex].masterid;

  if (masterId !== -1) {
    masterZip = Dataset.master[masterId].zipname;
  }

  updateSubList();

  async function updateSubList() {
    // サブリスト更新
    if (masterZip === "") {
      listViewSub.itemCount = dataSubTable.length;
      listViewSub.updateRowTexts();
    } else {
      if (dataSubZipname !== masterZip) {
        dataSubZipname = masterZip;
        dataSubIndex = masterId;

        // ファミリ抽出
        dataSubTable = [masterId];
        for (let i = 0; i < Dataset.master.length; i++) {
          if (Dataset.master[i].masterid === masterId && Dataset.master[i].master === 0) {
            dataSubTable.push(i);
          }
        }
        listViewSub.itemCount = dataSubTable.length;
      }

      // サブリストの選択項目が見つからない場合は選び直し
      if (listViewSub.itemIndex !== dataSubTable.indexOf(dataIndex)) {
        listViewSub.itemIndex = dataSubTable.indexOf(dataIndex);
        listViewSub.makeVisible(false);
      }
      listViewSub.updateRowTexts();
    }
  }

  showInfo(argZipName);
  screenShot.show(argZipName);
  command.show(argZipName);
}

async function subItemSelectHandler(argDataIndex) {
  config.zipName = Dataset.master[argDataIndex].zipname;
  dataIndex = argDataIndex;
  showInfo(config.zipName);
  screenShot.show(config.zipName);
  command.show(config.zipName);
}

/**
 * DATとコマンド表示
 * @param {*} zipName
 */
async function showInfo(zipName) {
  const index = Dataset.indexOfZip(zipName);
  const masterId = Dataset.master[index].masterid;
  let masterZip = "";

  let st = "";

  if (masterId !== -1) {
    masterZip = Dataset.master[masterId].zipname;
  }

  if (history.hasOwnProperty(zipName)) {
    st += history[zipName];
  } else {
    // クローンのときは親を見る
    if (masterId !== -1 && history.hasOwnProperty(masterZip)) {
      st += history[masterZip];
    }
  }
  if (st !== "") {
    st += "<br>";
  }

  if (mameinfo.hasOwnProperty(zipName)) {
    st += mameinfo[zipName];
  } else {
    // クローンのときは親を見る
    if (masterId !== -1 && mameinfo.hasOwnProperty(masterZip)) {
      st += mameinfo[masterZip];
    }
  }
  document.querySelector("#info").innerHTML = st;
}

// ウインドウ終了前
window.addEventListener("beforeunload", (e) => {
  saveFormConfig();
  listViewMain.saveSettings();
  listViewSub.saveSettings();
});

// 検索クリア
document.getElementById("clear").addEventListener("click", clearSearch);
function clearSearch() {
  document.querySelector("#search").value = "";
  //listViewMain.updateListViewSearch({ searchWord: "" });
  config.searchWord = "";
  updateListView();
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
  screenShot.show(config.zipName);
});

// -------------------------------------
function mod(i, j) {
  return i % j < 0 ? (i % j) + 0 + (j < 0 ? -j : j) : (i % j) + 0;
}
