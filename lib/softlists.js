/**
 * Softlists クラス
 */
"use strict";

class Softlists {
  static master; // マスタデータ

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
    this.lastSelects = {}; // 最後に選択したもの

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
      if (settings.lastSelects) {
        this.lastSelects = settings.lastSelects;
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
      lastSelects: this.lastSelects,
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

  // ファイルから読み込み
  async loadFromFile() {
    var tick = Date.now();
    Softlists.master = JSON.parse(await window.retrofireAPI.getSoftlist());

    // alt_title と kana 追加
    let n = 0;
    for (let softlist in Softlists.master) {
      n++;
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
        option.text = Softlists.master[option.value].description + " (" + this.currentSoftlists[i].name + ")";
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

  // 個別リスト選択
  async showEntry(newSoftlist) {
    if (newSoftlist === undefined) return;

    document.querySelector(".m-tab__label--softlist span").innerText =
      "Software List (" + (this.dropdown.selectedIndex + 1) + "/" + this.currentSoftlists.length + ")";
    document.querySelector(".m-tab__label--softlist").classList.add("highlight");

    if (this.currentSoftlist !== newSoftlist) {
      // 選択ヒストリー更新
      this.history.unshift(newSoftlist);
      this.history = Array.from(new Set(this.history));
      this.history = this.history.splice(0, this.MAXHISTORY);

      this.currentSoftlist = newSoftlist;

      var tick = Date.now();
      // データ準備
      this.filter({ word: "" });
      this.sort({
        field: listViewSoftlist.columns[listViewSoftlist.orderByIndex].data,
        direction: listViewSoftlist.sortDirection,
      });

      listViewSoftlist.itemCount = this.filteredLength;

      // 全項目再描画
      listViewSoftlist.updateRowTexts();

      // 項目再選択
      // 0件のとき
      if (this.filteredLength === 0) {
        this.currentSoft = "";
        listViewSoftlist.itemIndex = -1;
      } else {
        // ヒストリチェック
        let itemIndex = 0;

        if (this.lastSelects.hasOwnProperty(this.currentSoftlist)) {
          // ヒストリがあれば
          const lastSoftware = this.lastSelects[this.currentSoftlist];
          for (let i = 0; i < this.filteredLength; i++) {
            // フィルタ済みテーブルのインデックス求める
            if (Softlists.master[this.currentSoftlist].softwares[this.filteredTable[i]].name === lastSoftware) {
              itemIndex = i;
              break;
            }
          }
        }

        listViewSoftlist.itemIndex = itemIndex;
        await listViewSoftlist.makeVisible(false);
      }
    }
  }

  async selectSoft(itemIndex) {
    this.lastSelects[this.currentSoftlist] =
      Softlists.master[this.currentSoftlist].softwares[this.filteredTable[itemIndex]].name;
  }

  // 項目クリア
  clear() {
    document.querySelector(".m-tab__label--softlist span").innerText = "Software List";
    document.querySelector(".m-tab__label--softlist ").classList.remove("highlight");

    this.dropdown.disabled = true;
    this.currentSoftlist = "";
    this.currentSoft = "";
    for (let i = this.dropdown.options.length - 1; i >= 0; i--) {
      this.dropdown.remove(i);
    }
    listViewSoftlist.itemCount = 0;
  }

  // フィルタ済み件数
  get filteredLength() {
    return this.filteredTable.length;
  }

  // フィルタデータからレコード返す
  getFilteredRecord(index) {
    const masterIndex = this.filteredTable[index];
    return Softlists.master[this.currentSoftlist].softwares[masterIndex];
  }

  // フィルタインデックスからデータインデックス返す
  getDataIndex(filteredIndex) {
    if (filteredIndex === -1) return -1;
    return this.filteredTable[filteredIndex];
  }

  /**
   * フィルタ
   * @param {
   *  word: {string}
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
    let fields = ["description", "name", "publisher"];
    this.filteredTable = [];

    // 検索文字列別
    if (word === "") {
      for (let i = 0; i < Softlists.master[this.currentSoftlist].softwares.length; i++) {
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
          if (fields[i] === "description") {
            fields[i] = "kana";
            break;
          }
        }
      }
      for (let i = 0; i < Softlists.master[this.currentSoftlist].softwares.length; i++) {
        for (let j = 0; j < fields.length; j++) {
          if (Softlists.master[this.currentSoftlist].softwares[i][fields[j]].toLowerCase().indexOf(word) != -1) {
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
      if (config.language === LANG.JP && field == "description") {
        itemA = Softlists.master[this.currentSoftlist].softwares[a].kana;
        itemB = Softlists.master[this.currentSoftlist].softwares[b].kana;
      } else {
        itemA = Softlists.master[this.currentSoftlist].softwares[a][field];
        itemB = Softlists.master[this.currentSoftlist].softwares[b][field];
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