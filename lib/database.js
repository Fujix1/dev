/**
 * Data クラス
 */
"use strict";

class Database {
  static record = []; // マスタデータ

  constructor() {
    // ソート済みのリレーションテーブル
    this.sortedTable = [];
    // フィルタ済みのリレーションテーブル
    this.filteredTable = [];
  }

  // ファイルから読み込み
  async loadFromFile() {
    var tick = Date.now();
    this.record = JSON.parse(await window.retrofireAPI.getRecord());

    // descJ と kana 追加
    for (let i = 0; i < this.record.length; i++) {
      this.record[i].kana = this.record[i].desc;
      this.record[i].descJ = this.record[i].desc;
      this.record[i].descHiragana = this.record[i].desc;
    }

    // mame32j 読み込み
    let mame32j = await window.retrofireAPI.getMame32j();
    mame32j = mame32j.split("\n");
    let n = 0;
    for (let i = 0; i < mame32j.length; i++) {
      const item = mame32j[i].split("\t");
      for (let j = n; j < this.record.length; j++) {
        if (this.record[j].zipname === item[0]) {
          this.record[j].descJ = item[1];
          // 検索用のひらがな変換
          const hiragana = item[1].replace(/[ァ-ン]/g, function (s) {
            return String.fromCharCode(s.charCodeAt(0) - 0x60);
          });
          this.record[j].descHiragana = hiragana;
          this.record[j].kana = item[2];
          n = j + 1;
          break;
        }
      }
    }

    console.log("Database.loadFromFile", Date.now() - tick, "ms");
  }

  // 全件数
  get length() {
    return this.record.length;
  }

  /**
   * ソート
   * @param {*} field フィールド名
   * @param {*} direction "asc" | "desc"
   */
  sort(field, direction) {}

  // フィルタ
  filter() {}

  // ヘルパー
  // zip 名からインデックス取得
  indexOfZip(zipName) {}
}
