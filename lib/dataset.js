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

  static getRowByZip(zipName) {
    return Dataset.master[Dataset.indexOfZip(zipName)];
  }

  constructor() {
    // フィルタ済みのリレーションテーブル
    this.filteredTable = [];
    this.filterWord = "";
    this.filterFields = [];
    this.sortField = "zipname";
    this.sortDirection = "asc";
    this.version = ""; // mame version
  }

  // ファイルから読み込み
  async loadFromFile() {
    var tick = Date.now();
    const resource = JSON.parse(await window.retrofireAPI.getRecord());
    this.version = resource.version;
    console.log(this.version);
    Dataset.master = resource.listinfos;

    // descJ と kana 追加, エスケープ
    for (let i = 0; i < Dataset.master.length; i++) {
      Dataset.master[i].kana = Dataset.master[i].desc;
      Dataset.master[i].descJ = Dataset.master[i].desc;
      Dataset.master[i].descHiragana = Dataset.master[i].desc;
      Dataset.master[i].desc = unEscape(Dataset.master[i].desc);
      Dataset.master[i].maker = unEscape(Dataset.master[i].maker);
    }
    function unEscape(st) {
      return st.replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&amp;", "&");
    }

    // mame32j 読み込み
    let mame32j = await window.retrofireAPI.getMame32j();
    mame32j = mame32j.split("\n");

    //ソート
    const mame32jobj = [];
    for (let i = 0; i < mame32j.length; i++) {
      const item = mame32j[i].split("\t");
      if (item[0] !== "") {
        mame32jobj.push({ zipname: item[0], descj: item[1], kana: item[2] });
      }
    }
    mame32jobj.sort((a, b) => {
      return a.zipname > b.zipname ? 1 : -1;
    });

    let n = 0;
    for (let i = 0; i < mame32jobj.length; i++) {
      for (let j = n; j < Dataset.master.length; j++) {
        if (Dataset.master[j].zipname === mame32jobj[i].zipname) {
          Dataset.master[j].descJ = mame32jobj[i].descj;
          // 検索用のひらがな変換
          const hiragana = mame32jobj[i].descj.replace(/[ァ-ン]/g, function (s) {
            return String.fromCharCode(s.charCodeAt(0) - 0x60);
          });
          Dataset.master[j].descHiragana = hiragana;
          Dataset.master[j].kana = mame32jobj[i].kana.trim();
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
