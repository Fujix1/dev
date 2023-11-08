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
    function unEscape(st) {
      return st.replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&amp;", "&");
    }

    console.log("Softlists.loadFromFile", Date.now() - tick, "ms");
  }

  // 全件数
  get length() {
    return Dataset.master.length;
  }

  // フィルタ済み件数
  get filteredLength() {
    return this.filteredTable.length;
  }

  // フィルタデータからレコード返す
  getFilteredRecord(index) {
    const masterIndex = this.filteredTable[index];
    return Dataset.master[masterIndex];
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
