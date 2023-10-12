/**
 * Data クラス
 */
"use strict";

class Database {
  static master = []; // マスタデータ

  constructor() {
    // ソート済みのリレーションテーブル
    this.sortedTable = [];
    // フィルタ済みのリレーションテーブル
    this.filteredTable = [];
  }

  // ファイルから読み込み
  async loadFromFile() {
    var tick = Date.now();
    this.master = JSON.parse(await window.retrofireAPI.getRecord());

    // descJ と kana 追加
    for (let i = 0; i < this.master.length; i++) {
      this.master[i].kana = this.master[i].desc;
      this.master[i].descJ = this.master[i].desc;
      this.master[i].descHiragana = this.master[i].desc;
    }

    // mame32j 読み込み
    let mame32j = await window.retrofireAPI.getMame32j();
    mame32j = mame32j.split("\n");
    let n = 0;
    for (let i = 0; i < mame32j.length; i++) {
      const item = mame32j[i].split("\t");
      for (let j = n; j < this.master.length; j++) {
        if (this.master[j].zipname === item[0]) {
          this.master[j].descJ = item[1];
          // 検索用のひらがな変換
          const hiragana = item[1].replace(/[ァ-ン]/g, function (s) {
            return String.fromCharCode(s.charCodeAt(0) - 0x60);
          });
          this.master[j].descHiragana = hiragana;
          this.master[j].kana = item[2];
          n = j + 1;
          break;
        }
      }
    }

    console.log("Database.loadFromFile", Date.now() - tick, "ms");
  }

  // 全件数
  get length() {
    return this.master.length;
  }

  /**
   * ソート
   * @param {string} field フィールド名
   * @param {string} direction "asc" | "desc"
   */
  sort(field, direction) {}

  /**
   * フィルタ
   * @param {
   *  word: {string},
   *  fields: [string]
   * } args
   */
  filter(args) {
    console.log(args);
    // 検索文字列
    let word = "";
    if (args.hasOwnProperty("word")) {
      word = args.word;
    }
    word = word.trim().toLowerCase();
    word = word.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function (s) {
      return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
    });
    word = word.replace(/[ァ-ン]/g, function (s) {
      return String.fromCharCode(s.charCodeAt(0) - 0x60);
    });

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
      for (let i = 0; i < this.master.length; i++) {
        this.filteredTable.push(this.master[i]);
      }
    } else {
      if (config.language === LANG.JP) {
        for (let i = 0; i < fields.length; i++) {
          if (fields[i] === "desc") {
            fields[i] = "descHiragana";
            break;
          }
        }
      }
      for (let i = 0; i < this.master.length; i++) {
        for (let j = 0; j < fields.length; j++) {
          if (this.master[i][fields[j]].toLowerCase().indexOf(word) != -1) {
            this.filteredTable.push(this.master[i]);
            break;
          }
        }
      }
    }

    console.log("length", this.filteredTable.length);
  }

  // ヘルパー
  // zip 名からインデックス取得
  indexOfZip(zipName) {}
}
