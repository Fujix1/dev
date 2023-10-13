/**
 * Data クラス
 */
"use strict";

class Database {
  static master = []; // マスタデータ

  // ヘルパー
  // zip 名からインデックス取得
  static indexOfZip(zipName) {
    return Database.master.findIndex((item) => item.zipname === zipName);
  }

  constructor() {
    // フィルタ済みのリレーションテーブル
    this.filteredTable = [];
  }

  // ファイルから読み込み
  async loadFromFile() {
    var tick = Date.now();
    Database.master = JSON.parse(await window.retrofireAPI.getRecord());

    // descJ と kana 追加
    for (let i = 0; i < Database.master.length; i++) {
      Database.master[i].kana = Database.master[i].desc;
      Database.master[i].descJ = Database.master[i].desc;
      Database.master[i].descHiragana = Database.master[i].desc;
    }

    // mame32j 読み込み
    let mame32j = await window.retrofireAPI.getMame32j();
    mame32j = mame32j.split("\n");
    let n = 0;
    for (let i = 0; i < mame32j.length; i++) {
      const item = mame32j[i].split("\t");
      for (let j = n; j < Database.master.length; j++) {
        if (Database.master[j].zipname === item[0]) {
          Database.master[j].descJ = item[1];
          // 検索用のひらがな変換
          const hiragana = item[1].replace(/[ァ-ン]/g, function (s) {
            return String.fromCharCode(s.charCodeAt(0) - 0x60);
          });
          Database.master[j].descHiragana = hiragana;
          Database.master[j].kana = item[2].trim();
          n = j + 1;
          break;
        }
      }
    }

    console.log("Database.loadFromFile", Date.now() - tick, "ms");
  }

  // 全件数
  get length() {
    return Database.master.length;
  }

  // フィルタ済み件数
  get filteredLength() {
    return this.filteredTable.length;
  }

  /**
   * フィルタ
   * @param {
   *  word: {string},
   *  fields: [string]
   * } args
   */
  filter(args) {
    // 検索文字列
    let word = "";
    if (args.hasOwnProperty("word")) {
      word = args.word;
    }
    word = word.trim().toLowerCase();

    // 検索対象フィールド
    let fields = [];
    if (!args.hasOwnProperty("fields") || args.fields === "") {
      fields = ["desc", "zipname", "maker", "source"];
    } else {
      fields.push(args.fields);
    }

    this.filteredTable = [];

    // 検索文字列別
    if (word === "") {
      for (let i = 0; i < Database.master.length; i++) {
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
      for (let i = 0; i < Database.master.length; i++) {
        for (let j = 0; j < fields.length; j++) {
          if (Database.master[i][fields[j]].toLowerCase().indexOf(word) != -1) {
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
  sort(args) {
    // ソートフィールド
    let field = args.field;
    let direction = "asc";
    if (args.hasOwnProperty("direction") && args.direction === "desc") {
      direction = "desc";
    }
    console.log("field, direction", field, direction);
    // フィルタ済みデータをソート
    this.filteredTable.sort((a, b) => {
      let itemA, itemB;

      // 日本語ゲーム名はかなでソート
      if (config.language === LANG.JP && field == "desc") {
        itemA = Database.master[a].kana;
        itemB = Database.master[b].kana;
      } else {
        itemA = Database.master[a][field];
        itemB = Database.master[b][field];
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
