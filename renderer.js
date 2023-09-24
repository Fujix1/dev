"use strict";

let listViewMain; // メインリストビュー
let record; // オリジナルの全ゲーム情報
const mameinfo = {}; // mameinfo.dat 情報
const history = {}; // history.dat 情報
const screenshot = { index: -1, zip: "", width: 0, height: 0 };
let zipName = "";
let currentPopup;

const LANG = { JP: 0, EN: 1 };
let config = {
  language: LANG.JP, // 言語設定
  searchWord: "", // 検索文字列
  searchTarget: "", // 検索対象
  screenshotFit: true, // スクリーンショットのフィット表示
};

// --------------------------------------------------------------------------------
const actCut = new Action({
  caption: "切り取り",
  control: true,
  keycode: "x",
  enabled: true,
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
  control: true,
  keycode: "c",
  onExecute: (self) => {
    const target = self.caller.target;
    navigator.clipboard.writeText(target.value.substr(target.selectionStart, target.selectionEnd));
    target.dispatchEvent(new Event("copy"));
  },
  onUpdate: (self) => {
    const target = self.caller.target;
    self.enabled = target.selectionEnd - target.selectionStart > 0;
  },
});

const actPaste = new Action({
  caption: "貼り付け",
  control: true,
  keycode: "v",
  checked: false,
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
const pmEdit = new PopupMenu([actCut, actCopy, actPaste]);

document.querySelector("#search").addEventListener("contextmenu", (e) => {
  e.stopPropagation(); // 大事
  pmEdit.show(e);
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

const pmMainList = new PopupMenu([actRun, "---"]);
document.querySelector(".list-view").addEventListener("contextmenu", (e) => {
  e.stopPropagation(); // 大事
  pmMainList.show(e);
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

    if (readConfig.hasOwnProperty("screenshotFit")) {
      config.screenshotFit = readConfig.screenshotFit;
    }
  }

  // キー入力処理
  window.addEventListener("keydown", (e) => {
    // ポップアップメニュー のキー処理
    if (document.body.classList.contains("is-popupmenu-open")) {
      const popup = currentPopup;
      switch (e.key) {
        case "Enter":
          if (popup.index !== -1) {
            popup.actions.forEach((action) => {
              if (action.index == popup.index) {
                action.execute();
              }
            });
          }
          break;
        case "ArrowUp": {
          if (popup.index === -1) {
            popup.view(popup.length - 1);
          } else {
            popup.view(mod(popup.index - 1, popup.length));
          }
          break;
        }
        case "ArrowDown": {
          if (popup.index === -1) {
            popup.view(0);
          } else {
            popup.view(mod(popup.index + 1, popup.length));
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

  document.querySelector("#test1").addEventListener("click", () => {
    executeMAME({ zipName: document.querySelector("#test1").value });
  });
  document.querySelector("#test2").addEventListener("click", () => {
    executeMAME({ zipName: document.querySelector("#test2").value });
  });
  document.querySelector("#test3").addEventListener("click", () => {
    executeMAME({ zipName: document.querySelector("#test3").value, softName: "ys2" });
  });

  document.querySelector("#btn-reset").addEventListener("click", async () => {
    // メインプロセスを呼び出し
    result = await window.retrofireAPI.resetWindow("reset");
    console.log(result);
  });

  document.querySelector("#btn-dialog").addEventListener("click", async () => {
    // メインプロセスを呼び出し
    const result = await window.retrofireAPI.dialog("");
    if (result && result.result == true) {
      document.querySelector(".p-info__img").src = "data:image/png;base64," + result.img;
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

  // ゲームデータ読み込み
  var tick = Date.now();
  record = JSON.parse(await window.retrofireAPI.getRecord());
  // descJ と kana 追加
  for (let i = 0; i < record.length; i++) {
    record[i].kana = record[i].desc;
    record[i].descJ = record[i].desc;
  }
  console.log(Date.now() - tick);
  console.log("resources.json:", record.length);

  // mame32j読み込み
  var tick = Date.now();
  let mame32j = await window.retrofireAPI.getMame32j();
  mame32j = mame32j.split("\r\n");

  let n = 0;
  for (let i = 0; i < mame32j.length; i++) {
    const item = mame32j[i].split("\t");
    for (let j = n; j < record.length; j++) {
      if (record[j].zipname === item[0]) {
        record[j].descJ = item[1];
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
async function itemSelectHandler(dataIndex, zipName) {
  // 項目なし
  if (dataIndex === -1) {
    document.querySelector("#info").innerHTML = "";
    screenshot.zip = "";
    screenshot.width = 0;
    screenshot.height = 0;
    screenshot.index = -1;
    document.querySelector(".p-info__img").removeAttribute("src");
    return;
  }

  const masterId = parseInt(this.data[dataIndex].masterid);
  const isMaster = this.data[dataIndex].master === -1;

  let masterZip = "";
  if (masterId !== -1) {
    masterZip = this.data[masterId].zipname;
  }

  // dat 情報表示
  let st = "";
  if (history.hasOwnProperty(zipName)) {
    st += history[zipName];
  } else {
    // クローンのときは親を見る
    if (!isMaster && history.hasOwnProperty(masterZip)) {
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
    const masterId = this.data[dataIndex].masterid;
    if (!isMaster && mameinfo.hasOwnProperty(this.data[masterId].zipname)) {
      st += mameinfo[this.data[masterId].zipname];
    }
  }
  document.querySelector("#info").innerHTML = st;

  // スクリーンショット
  let result;

  if (screenshot.zip !== zipName) {
    result = await window.retrofireAPI.getScreenshot(zipName);
    if (result.result) {
      screenshot.zip = zipName;
      screenshot.width = parseInt(result.width);
      screenshot.height = parseInt(result.height);
      screenshot.index = dataIndex;
      document.querySelector(".p-info__img").setAttribute("src", "data:image/png;base64," + result.img);
      setScreenshotAspect();
    } else {
      // 親セットのショット確認
      if (screenshot.zip !== masterZip) {
        result = await window.retrofireAPI.getScreenshot(masterZip);
        if (result.result) {
          document.querySelector(".p-info__img").setAttribute("src", "data:image/png;base64," + result.img);
          screenshot.zip = masterZip;
          screenshot.width = parseInt(result.width);
          screenshot.height = parseInt(result.height);
          screenshot.index = masterId;
          setScreenshotAspect();
        } else {
          screenshot.zip = "";
          screenshot.width = 0;
          screenshot.height = 0;
          screenshot.index = -1;
          document.querySelector(".p-info__img").removeAttribute("src");
        }
      }
    }
  }
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

// フォームの config 送信
function saveFormConfig() {
  console.log("saveFormConfig: config.zipName", config.zipName);
  try {
    config.searchWord = document.querySelector("#search").value.trim();
    window.retrofireAPI.setStoreTemp({ key: "config", val: config });
    console.log("フォーム設定 main.js に送信");
  } catch (e) {
    console.log(e);
  }
}

// スクリーンショットフィット切り替え
document.querySelector(".p-info__screenshot").addEventListener("click", (e) => {
  config.screenshotFit = !config.screenshotFit;
  setScreenshotAspect();
});

function setScreenshotAspect() {
  if (screenshot.index === -1) return;
  if (config.screenshotFit) {
    let aspectX, aspectY;
    if (record[screenshot.index].vertical) {
      aspectX = "3";
      aspectY = "4";
    } else {
      aspectX = "4";
      aspectY = "3";
    }

    // 特殊画面比率
    // 横3画面と2画面 (ギャップ対応)
    const OrgResX = record[screenshot.index].resx;
    const OrgResY = record[screenshot.index].resy;
    const NumScreens = record[screenshot.index].numscreens;

    if (
      NumScreens === 3 &&
      screenshot.height === OrgResX &&
      (screenshot.width === OrgResX * 3 || screenshot.width === OrgResX * 3 + 4)
    ) {
      aspectX = "12";
      aspectY = "3";
    } else if (
      NumScreens === 2 &&
      screenshot.height === OrgResY &&
      (screenshot.width === OrgResX * 2 ||
        screenshot.width === OrgResX * 2 + 2 ||
        screenshot.width === OrgResX * 2 + 3 ||
        screenshot.width === OrgResX * 4 + 4)
    ) {
      aspectX = "8";
      aspectY = "3";
    } else if (
      NumScreens === 2 &&
      screenshot.width === OrgResX &&
      (screenshot.height === OrgResY * 2 || screenshot.height === OrgResY * 2 + 2)
    ) {
      // 縦2画面
      aspectX = "2";
      aspectY = "3";
    } else if (
      NumScreens === 3 &&
      screenshot.width === 512 &&
      (screenshot.height === 704 || screenshot.height === 368)
    ) {
      // 対家ﾏﾇｶﾝ
      aspectX = "28";
      aspectY = "33";
    } else if (
      // 2画面横汎用
      NumScreens === 2 &&
      screenshot.width >= 620 &&
      screenshot.width <= 1156 &&
      screenshot.height >= 220 &&
      screenshot.height <= 256
    ) {
    } else if (
      // kbm
      NumScreens === 2 &&
      screenshot.width == 772 &&
      screenshot.height == 512
    ) {
      aspectX = "6";
      aspectY = "4";
    } else if (
      // 3画面横汎用
      NumScreens === 3 &&
      screenshot.width >= 620 &&
      screenshot.width <= 1156 &&
      screenshot.height >= 220 &&
      screenshot.height <= 256
    ) {
      aspectX = "4";
      aspectY = "1";
    } else if (NumScreens === 3 && screenshot.width === 1544 && screenshot.height === 384) {
      // racedrivpan
      aspectX = "12";
      aspectY = "3";
    } else if (screenshot.width === 512 && screenshot.height === 128) {
      // pinball
      aspectX = "4";
      aspectY = "1";
    } else if (screenshot.width === 950 && screenshot.height === 1243) {
      // game watch
      aspectX = "950";
      aspectY = "1243";
    } else if (screenshot.width === 906 && screenshot.height === 1197) {
      // game watch
      aspectX = "906";
      aspectY = "1197";
    } else if (NumScreens === 2 && screenshot.width === 642 && screenshot.height === 224) {
      aspectX = "8";
      aspectY = "3";
    } else if (NumScreens === 2 && screenshot.width === 320 && screenshot.height === 416) {
      aspectX = "4";
      aspectY = "6";
    }

    document.querySelector(".p-info__img").style.aspectRatio = aspectX + "/" + aspectY;
    if (aspectX > aspectY) {
      document.querySelector(".p-info__img").style.width = "100%";
      document.querySelector(".p-info__img").style.height = "";
    } else {
      document.querySelector(".p-info__img").style.width = "";
      document.querySelector(".p-info__img").style.height = "100%";
    }
  } else {
    document.querySelector(".p-info__img").removeAttribute("style");
  }
}

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

window.retrofireAPI.onBlur((_event, text) => {
  console.log("onBlur");
  // ポップアップ閉じる
  PopupMenu.close();
});

// -------------------------------------
function mod(i, j) {
  return i % j < 0 ? (i % j) + 0 + (j < 0 ? -j : j) : (i % j) + 0;
}
