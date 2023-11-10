/**
 * Softlists クラス
 */
"use strict";

class Softlists {
  static master; // マスタデータ

  // ヘルパー
  // zip 名からインデックス取得
  static indexOfZip(zipName) {
    return Softlists.master.findIndex((item) => item.zipname === zipName);
  }

  constructor() {
    // フィルタ済みのリレーションテーブル
    this.filteredTable = [];
    this.filterWord = "";
    this.sortField = "name";
    this.sortDirection = "asc";
    this.currentSoftlists = [];
    this.currentSoftlist = "";
    this.currentSoft = "";
    this.history = []; // リスト選択ヒストリー
    this.MAXHISTORY = 64; // 最大ヒストリー数

    // DOM
    this.dropdown = document.getElementById("softlistTitle");
  }

  // 初期化
  async init() {
    // 設定復旧
    const settings = await window.retrofireAPI.getStore("softlists");
    if (settings) {
      if (settings.history) {
        this.history = settings.history;
      }
    }

    // ホイール操作
    const _self = this;
    this.dropdown.addEventListener("wheel", function (e) {
      if (this.hasFocus) {
        return;
      }
      if (e.deltaY < 0) {
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        _self.showEntry(_self.dropdown.value);
      }
      if (e.deltaY > 0) {
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.length - 1);
        _self.showEntry(_self.dropdown.value);
      }
    });

    // 変更イベント
    this.dropdown.addEventListener("change", (e) => {
      this.showEntry(this.dropdown.value);
    });
  }

  // 設定保存
  saveSettings() {
    const settings = {
      history: this.history,
    };
    try {
      window.retrofireAPI.setStoreTemp({
        key: "softlists",
        val: settings,
      });
      debuglog("Softlists 設定 main.js に送信");
    } catch (e) {
      debuglog(e);
    }
  }

  // リスト選択
  async showEntry(newSoftlist) {
    if (newSoftlist === undefined) return;

    document.querySelector(".m-tab__label--softlist span").innerText =
      "Software List (" + (this.dropdown.selectedIndex + 1) + "/" + this.currentSoftlists.length + ")";

    if (this.currentSoftlist !== newSoftlist) {
      // 選択ヒストリー更新
      this.history.unshift(newSoftlist);
      this.history = Array.from(new Set(this.history));
      this.history = this.history.splice(0, this.MAXHISTORY);

      this.currentSoftlist = newSoftlist;
    } else {
    }
  }

  // ファイルから読み込み
  async loadFromFile() {
    var tick = Date.now();
    Softlists.master = JSON.parse(await window.retrofireAPI.getSoftlist());

    // alt_title と kana 追加
    for (let softlist in Softlists.master) {
      for (let i = 0; i < Softlists.master[softlist].softwares.length; i++) {
        if (Softlists.master[softlist].softwares[i].alt_title === "") {
          Softlists.master[softlist].softwares[i].alt_title = Softlists.master[softlist].softwares[i].description;
        }
        Softlists.master[softlist].softwares[i].kana = Softlists.master[softlist].softwares[i].alt_title.replace(
          /[ァ-ン]/g,
          function (s) {
            return String.fromCharCode(s.charCodeAt(0) - 0x60);
          }
        );
      }
    }

    console.log("Softlists.loadFromFile", Date.now() - tick, "ms");
  }

  // ソフトリスト表示
  async show(softlists) {
    this.currentSoftlists = softlists;

    // 選択なし
    if (this.currentSoftlists.length === 0) {
      this.clear(); // クリア
      return;
    } else {
      // ドロップダウン更新
      for (let i = this.dropdown.options.length - 1; i >= 0; i--) {
        this.dropdown.remove(i);
      }

      let rank = this.MAXHISTORY; // ヒストリー順位
      let top = 0;
      for (let i = 0; i < this.currentSoftlists.length; i++) {
        const option = document.createElement("option");
        option.value = this.currentSoftlists[i].name;
        option.text =
          Softlists.master[this.currentSoftlists[i].name].description + " (" + this.currentSoftlists[i].name + ")";

        this.dropdown.appendChild(option);

        // ヒストリー内順位
        const thisRank = this.history.indexOf(this.currentSoftlists[i].name);
        if (thisRank !== -1 && thisRank < rank) {
          rank = thisRank;
          top = i;
        }
      }
      this.dropdown.selectedIndex = top;
      this.dropdown.removeAttribute("disabled");

      // リスト選択
      this.showEntry(this.dropdown.value);
    }
  }

  // 項目クリア
  clear() {
    document.querySelector(".m-tab__label--softlist span").innerText = "Software List";
    this.dropdown.disabled = true;
    this.currentSoftlist = "";
    this.currentSoft = "";
    for (let i = this.dropdown.options.length - 1; i >= 0; i--) {
      this.dropdown.remove(i);
    }
  }

  // 全件数
  get length() {
    return Softlists.master.length;
  }

  // フィルタ済み件数
  get filteredLength() {
    return this.filteredTable.length;
  }

  // フィルタデータからレコード返す
  getFilteredRecord(index) {
    const masterIndex = this.filteredTable[index];
    return Softlists.master[masterIndex];
  }

  // フィルタインデックスからデータインデックス返す
  getDataIndex(filteredIndex) {
    if (filteredIndex === -1) return -1;
    return this.filteredTable[filteredIndex];
  }

  getFilterdIndexByZip(zipName) {
    const masterIndex = Dataset.indexOfZip(zipName);
    return this.filteredTable.indexOf(masterIndex);
  }

  /**
   * フィルタ
   * @param {
   *  word: {string},
   *  fields: [string]
   * } args
   */
  filter(args = {}) {
    // 検索文字列
    if (args.hasOwnProperty("word")) {
      this.filterWord = args.word;
    }
    let word = this.filterWord;
    word = word.trim().toLowerCase();

    // 検索対象フィールド
    let fields = [];
    if (!args.hasOwnProperty("fields") || args.fields === "") {
      fields = ["desc", "zipname", "maker", "source"];
      this.filterFields = ["desc", "zipname", "maker", "source"];
    } else {
      fields = [args.fields];
      this.filterFields = [args.fields];
    }
    this.filteredTable = [];

    // 検索文字列別
    if (word === "") {
      for (let i = 0; i < Dataset.master.length; i++) {
        this.filteredTable.push(i);
      }
    } else {
      word = word.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function (s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
      });
      word = word.replace(/[ァ-ン]/g, function (s) {
        return String.fromCharCode(s.charCodeAt(0) - 0x60);
      });

      if (config.language === LANG.JP) {
        for (let i = 0; i < fields.length; i++) {
          if (fields[i] === "desc") {
            fields[i] = "descHiragana";
            break;
          }
        }
      }
      for (let i = 0; i < Dataset.master.length; i++) {
        for (let j = 0; j < fields.length; j++) {
          if (Dataset.master[i][fields[j]].toLowerCase().indexOf(word) != -1) {
            this.filteredTable.push(i);
            break;
          }
        }
      }
    }
  }

  /**
   * ソート
   * @param {string} field フィールド名
   * @param {string} direction "asc" | "desc"
   */
  sort(args = {}) {
    // ソートフィールド
    if (args.hasOwnProperty("field")) {
      this.sortField = args.field;
    }
    let field = this.sortField;

    if (args.hasOwnProperty("direction")) {
      this.sortDirection = args.direction;
    }
    let direction = this.sortDirection;

    // フィルタ済みデータをソート
    this.filteredTable.sort((a, b) => {
      let itemA, itemB;

      // 日本語ゲーム名はかなでソート
      if (config.language === LANG.JP && field == "desc") {
        itemA = Dataset.master[a].kana;
        itemB = Dataset.master[b].kana;
      } else {
        itemA = Dataset.master[a][field];
        itemB = Dataset.master[b][field];
      }
      itemA = itemA ? itemA.toUpperCase() : "";
      itemB = itemB ? itemB.toUpperCase() : "";

      let result = 0;
      if (itemA < itemB) {
        result = -1;
      } else if (itemA > itemB) {
        result = 1;
      }
      if (direction === "desc") result *= -1;
      return result;
    });
  }
}
