/**
 * Dataset クラス
 */
"use strict";

class Dataset {
  static master = []; // マスタデータ

  // ヘルパー
  // zip 名からインデックス取得
  static indexOfZip(zipName) {
    return Dataset.master.findIndex((item) => item.zipname === zipName);
  }

  constructor() {
    // フィルタ済みのリレーションテーブル
    this.filteredTable = [];
    this.filterWord = "";
    this.filterFields = [];
    this.sortField = "zipname";
    this.sortDirection = "asc";
  }

  // ファイルから読み込み
  async loadFromFile() {
    var tick = Date.now();
    Dataset.master = JSON.parse(await window.retrofireAPI.getRecord());

    // descJ と kana 追加
    for (let i = 0; i < Dataset.master.length; i++) {
      Dataset.master[i].kana = Dataset.master[i].desc;
      Dataset.master[i].descJ = Dataset.master[i].desc;
      Dataset.master[i].descHiragana = Dataset.master[i].desc;
    }

    // mame32j 読み込み
    let mame32j = await window.retrofireAPI.getMame32j();
    mame32j = mame32j.split("\n");
    let n = 0;
    for (let i = 0; i < mame32j.length; i++) {
      const item = mame32j[i].split("\t");
      for (let j = n; j < Dataset.master.length; j++) {
        if (Dataset.master[j].zipname === item[0]) {
          Dataset.master[j].descJ = item[1];
          // 検索用のひらがな変換
          const hiragana = item[1].replace(/[ァ-ン]/g, function (s) {
            return String.fromCharCode(s.charCodeAt(0) - 0x60);
          });
          Dataset.master[j].descHiragana = hiragana;
          Dataset.master[j].kana = item[2].trim();
          n = j + 1;
          break;
        }
      }
    }

    console.log("Dataset.loadFromFile", Date.now() - tick, "ms");
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

  getDataIndex(filteredIndex) {
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
    if (args.hasOwnProperty("fields")) {
      this.filterFields = args.fields;
    }

    let fields = this.filtereFields;
    if (!args.hasOwnProperty("fields") || args.fields === "") {
      fields = ["desc", "zipname", "maker", "source"];
    } else {
      fields.push(args.fields);
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

    console.log("length", this.filteredTable.length);
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

    console.log("field, direction", field, direction);
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
