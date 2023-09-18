"use strict";

let listViewMain; // メインリストビュー
let record; // オリジナルの全ゲーム情報
const mameinfo = {}; // mameinfo.dat 情報
const history = {}; // history.dat 情報

const LANG = { JP: 0, EN: 1 };
let config = {
  language: LANG.JP, // 言語設定
  searchWord: "", // 検索文字列
  searchTarget: "", // 検索対象
};

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
  }

  // キー入力処理
  window.addEventListener("keydown", (e) => {
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
      case "F5": // 起動
      case "F9":
        if (listViewMain.zipName !== "") {
          window.retrofireAPI.executeMAME({ zipName: listViewMain.zipName });
        }
        break;
    }
  });

  // 言語切替
  document.getElementById("language").addEventListener("change", (e) => {
    config.language = e.target.checked ? LANG.EN : LANG.JP;
    listViewMain.updateListView(true);
  });

  // empty the debug output
  document.querySelector("#debug").value = "";

  document.querySelector("#test1").addEventListener("click", () => {
    sendByApi(document.querySelector("#test1").value);
  });
  document.querySelector("#test2").addEventListener("click", () => {
    sendByApi(document.querySelector("#test2").value);
  });
  document.querySelector("#test3").addEventListener("click", () => {
    sendByApiSoft(document.querySelector("#test3").value);
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

  document.querySelector("#btn-item1").addEventListener("click", () => {});
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

  document.querySelector("#search").addEventListener("keydown", (e) => {
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
        info = line.substr(6);
      } else if (line.startsWith("$mame")) {
        st = "";
      } else if (line.startsWith("$end")) {
        st = st.replace(/\n\n\n/g, "<br><br>");
        st = st.replace(/\n\n/g, "<br>");
        mameinfo[String(info)] = st;
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
    let info = "";
    let st = "";

    fileContents.split(/\r?\n/).forEach((line) => {
      if (line.startsWith("$info=")) {
        info = line.substr(6);
      } else if (line.startsWith("$bio")) {
        st = "";
      } else if (line.startsWith("$end")) {
        st = st.replace(/\n/g, "<br>");
        history[String(info)] = st;
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

async function itemSelectHandler(dataIndex, zipName) {
  if (dataIndex === -1) {
    document.querySelector("#info").innerHTML = "";
    return;
  }

  // dat 情報表示
  let st = "";
  if (history.hasOwnProperty(zipName)) {
    st += history[zipName];
  } else {
    // クローンのときは親を見る
    const masterId = this.data[dataIndex].masterid;
    if (masterId !== -1 && history.hasOwnProperty(this.data[masterId].zipname)) {
      st += history[this.data[masterId].zipname];
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
    if (masterId !== -1 && mameinfo.hasOwnProperty(this.data[masterId].zipname)) {
      st += mameinfo[this.data[masterId].zipname];
    }
  }

  document.querySelector("#info").innerHTML = st;
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

//
async function sendByApi(zip) {
  result = await window.retrofireAPI.executeMAME({
    zipName: zip,
  });
}

async function sendByApiSoft(zip) {
  result = await window.retrofireAPI.executeMAME({
    zipName: zip,
    softName: "ys2",
  });
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
