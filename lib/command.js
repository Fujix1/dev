/**
 * command.dat 用
 */
"use strict";

class Command {
  static icons = {
    "_<": "dialine",
    "_>": "dia",
    _A: "a",
    _B: "b",
    _C: "c",
    _D: "d",
    "@A-button": "a",
    "@B-button": "b",
    "@C-button": "c",
    "@D-button": "d",
    "@E-button": "e",
    "@F-button": "f",
    "@G-button": "g",
    "@H-button": "h",
    "@I-button": "i",
    "@J-button": "j",
    "@K-button": "k",
    "@L-button": "l",
    "@M-button": "m",
    "@N-button": "n",
    "@O-button": "o",
    "@P-button": "p",
    "@Q-button": "q",
    "@R-button": "r",
    "@S-button": "s",
    "^s": "s",
    "@T-button": "t",
    "@U-button": "u",
    "@V-button": "v",
    "@W-button": "w",
    "@X-button": "x",
    "@Y-button": "y",
    "@Z-button": "z",
    _Z: "z",
    "_+": "plus",
    "_.": "dash",
    _1: "downleft",
    _2: "down",
    _3: "downright",
    _4: "left",
    _5: "ball",
    "@BALL": "ball",
    _6: "right",
    _7: "upleft",
    _8: "up",
    _9: "upright",
    _N: "neutral",
    _a: "1",
    _b: "2",
    _c: "3",
    _d: "4",
    _e: "5",
    _f: "6",
    _g: "7",
    _h: "8",
    _i: "9",
    _j: "10",
    "@decrease": "plus",
    "@increase": "minus",
    _S: "start",
    "@start": "start",
    "^S": "select",
    "@select": "select",
    _P: "punch",
    "@punch": "punch",
    _K: "kick",
    "@kick": "kick",
    _G: "guard",
    "@guard": "guard",
    "^E": "lp",
    "@L-punch": "lp",
    "^F": "mp",
    "@M-punch": "mp",
    "^G": "sp",
    "@S-punch": "sp",
    "^H": "lk",
    "@L-kick": "lk",
    "^I": "mk",
    "@M-kick": "mk",
    "^J": "sk",
    "@S-kick": "sk",
    "_`": "dot",
    "_@": "dc",
    "_)": "circle",
    "_(": "oval",
    "_*": "starline",
    "_&": "star",
    "_%": "triangleline",
    _$: "triangle",
    "_#": "doublebox",
    "_]": "boxline",
    "_[": "box",
    "_{": "itriangleline",
    "_}": "itriangle",
    _k: "hcb",
    "@hcb": "hcb",
    _l: "huf",
    "@huf": "huf",
    _m: "hcf",
    "@hcf": "hcf",
    _n: "hub",
    "@hub": "hub",
    _o: "qfd",
    "@qfd": "qfd",
    _p: "qdb",
    "@qdb": "qdb",
    _q: "qbu",
    "@qbu": "qbu",
    _r: "quf",
    "@quf": "quf",
    _s: "qbd",
    "@qbd": "qbd",
    _t: "qdf",
    "@qdf": "qdf",
    _u: "qfu",
    "@qfu": "qfu",
    _v: "qub",
    "@qub": "qub",
    _w: "fdf",
    "@fdf": "fdf",
    _x: "fub",
    "@fub": "fub",
    _y: "fuf",
    "@fuf": "fuf",
    _z: "fdb",
    "@fdb": "fdb",
    _L: "xff",
    "@xff": "xff",
    _M: "xbb",
    "@xbb": "xbb",
  };
  static icons2 = {
    "_<": "dialine",
    "_>": "dia",
    _A: "a",
    _B: "b",
    _C: "c",
    _D: "d",
    "@A-button": "a",
    "@B-button": "b",
    "@C-button": "c",
    "@D-button": "d",
    "@E-button": "e",
    "@F-button": "f",
    "@G-button": "g",
    "@H-button": "h",
    "@I-button": "i",
    "@J-button": "j",
    "@K-button": "k",
    "@L-button": "l",
    "@M-button": "m",
    "@N-button": "n",
    "@O-button": "o",
    "@P-button": "p",
    "@Q-button": "q",
    "@R-button": "r",
    "@S-button": "s",
    "^s": "s",
    "@T-button": "t",
    "@U-button": "u",
    "@V-button": "v",
    "@W-button": "w",
    "@X-button": "x",
    "@Y-button": "y",
    "@Z-button": "z",
    _Z: "z",
    "_+": "plus",
    "_.": "dash",
    _1: "downright",
    _2: "down",
    _3: "downleft",
    _4: "right",
    _5: "ball",
    "@BALL": "ball",
    _6: "left",
    _7: "upright",
    _8: "up",
    _9: "upleft",
    _N: "neutral",
    _a: "1",
    _b: "2",
    _c: "3",
    _d: "4",
    _e: "5",
    _f: "6",
    _g: "7",
    _h: "8",
    _i: "9",
    _j: "10",
    "@decrease": "plus",
    "@increase": "minus",
    _S: "start",
    "@start": "start",
    "^S": "select",
    "@select": "select",
    _P: "punch",
    "@punch": "punch",
    _K: "kick",
    "@kick": "kick",
    _G: "guard",
    "@guard": "guard",
    "^E": "lp",
    "@L-punch": "lp",
    "^F": "mp",
    "@M-punch": "mp",
    "^G": "sp",
    "@S-punch": "sp",
    "^H": "lk",
    "@L-kick": "lk",
    "^I": "mk",
    "@M-kick": "mk",
    "^J": "sk",
    "@S-kick": "sk",
    "_`": "dot",
    "_@": "dc",
    "_)": "circle",
    "_(": "oval",
    "_*": "starline",
    "_&": "star",
    "_%": "triangleline",
    _$: "triangle",
    "_#": "doublebox",
    "_]": "boxline",
    "_[": "box",
    "_{": "itriangleline",
    "_}": "itriangle",
    _k: "hcf",
    "@hcb": "hcf",
    _l: "hub",
    "@huf": "hub",
    _m: "hcb",
    "@hcf": "hcb",
    _n: "huf",
    "@hub": "huf",
    _o: "qbd",
    "@qfd": "qbd",
    _p: "qdf",
    "@qdb": "qdf",
    _q: "qfu",
    "@qbu": "qfu",
    _r: "qub",
    "@quf": "qub",
    _s: "qfd",
    "@qbd": "qfd",
    _t: "qdb",
    "@qdf": "qdb",
    _u: "qbu",
    "@qfu": "qbu",
    _v: "quf",
    "@qub": "quf",
    _w: "fdb",
    "@fdf": "fdb",
    _x: "fuf",
    "@fub": "fuf",
    _y: "fub",
    "@fuf": "fub",
    _z: "fdf",
    "@fdb": "fdf",
    _L: "xbb",
    "@xff": "xbb",
    _M: "xff",
    "@xbb": "xff",
  };

  constructor() {
    this.master = []; // コマンドマスタ情報
    this.table = {}; // zip名マスタリレーション
    this.currentIndex = -1;
    this.title = document.getElementById("commandTitle");
    this.body = document.getElementById("commandBody");
  }

  /**
   * @param {
   *  flip: boolean,   // 左右反転
   *  wordwrap: false, // 折返し
   *  zenhan: false,   // 全角英数を半角に
   * }
   */

  async init(args) {
    var tick = Date.now();
    let items = [];
    let st = "";
    let entry = "";
    let n = 0;
    let info = [];

    const fileContents = await window.retrofireAPI.getCommand();
    fileContents.split(/\r?\n/).forEach((line) => {
      if (line.startsWith("$info=")) {
        if (items.length > 0) {
          this.master[n] = { pages: items, info: info.join(","), lastPage: 0 };
          info.forEach((item) => {
            this.table[item.trim()] = n;
          });
          n++;
        }

        // 新しいエントリ
        st = "";
        info = line.substr(6).split(",");
        items = [];
      } else if (line.startsWith("$cmd")) {
        st = "";
      } else if (line.startsWith("$end")) {
        st = st.trim();
        const title = st.slice(0, st.indexOf("\n"));
        st = st.trim().replace(/\n/g, "<br>");
        entry = st;
        items.push({ title, entry });
      } else {
        st += line + "\n";
      }
    });
    // EOF処理
    if (items.length > 0) {
      info.forEach((item) => {
        this.table[item.trim()] = n;
      });
      this.master[n] = { pages: items, info: info.join(","), lastPage: 0 };
    }

    // ホイール操作
    const _self = this;
    document.getElementById("commandTitle").addEventListener("wheel", function (e) {
      if (this.hasFocus) {
        return;
      }
      if (e.deltaY < 0) {
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        _self.showEntry();
      }
      if (e.deltaY > 0) {
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.length - 1);
        _self.showEntry();
      }
    });

    // 変更イベント
    this.title.addEventListener("change", (e) => {
      this.showEntry();
    });

    // オプション
    this.flip = args.flip;
    this.wordwrap = args.wordwrap;
    this.zenhan = args.zenhan;
    document.getElementById("flipCommand").checked = args.flip;
    document.getElementById("wrapCommand").checked = args.wordwrap;
    document.getElementById("zenhanCommand").checked = args.zenhan;
    document.getElementById("flipCommand").addEventListener("change", (e) => {
      this.flip = document.getElementById("flipCommand").checked;
      this.showEntry();
    });
    document.getElementById("wrapCommand").addEventListener("change", (e) => {
      this.wordwrap = document.getElementById("wrapCommand").checked;
      this.doWrap();
    });
    document.getElementById("zenhanCommand").addEventListener("change", (e) => {
      this.zenhan = document.getElementById("zenhanCommand").checked;
      this.showEntry();
    });

    this.doWrap();

    console.log("Command:", Date.now() - tick, "ms");
  }

  doWrap() {
    if (this.wordwrap) {
      this.body.classList.add("wrap");
    } else {
      this.body.classList.remove("wrap");
    }
  }

  clear() {
    document.querySelector(".m-tab__label--command").classList.remove("highlight");
    document.querySelector(".m-tab__label--command span").innerHTML = "Command";
    this.title.disabled = true;
    this.body.innerHTML = "";
    this.currentIndex = -1;
    this.table.selectedIndex = -1;
    for (let i = this.title.options.length - 1; i >= 0; i--) {
      this.title.remove(i);
    }
  }

  show(zipName) {
    if (zipName === "") {
      this.clear();
      return;
    } else if (!(zipName in this.table)) {
      // 親セットで再確認
      const dataIndex = record.findIndex((e) => e.zipname === zipName);
      const masterId = parseInt(record[dataIndex].masterid);
      if (masterId === -1) {
        this.clear();
        return;
      } else if (!(record[masterId].zipname in this.table)) {
        this.clear();
        return;
      } else {
        zipName = record[masterId].zipname;
      }
    }

    // 別なものが選択された
    if (this.currentIndex !== this.table[zipName]) {
      for (let i = this.title.options.length - 1; i >= 0; i--) {
        this.title.remove(i);
      }
      const commands = this.master[this.table[zipName]].pages;
      const lastPage = this.master[this.table[zipName]].lastPage;
      document.querySelector(".m-tab__label--command").classList.add("highlight");

      // オプション追加
      for (let i = 0; i < commands.length; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.text = commands[i].title;

        // ページ選択ヒストリ
        if (i == lastPage) {
          option.selected = true;
          this.table.selectedIndex = i;
        }

        this.title.appendChild(option);
      }

      this.currentIndex = this.table[zipName];
      this.title.removeAttribute("disabled");
      this.showEntry();
    }
  }

  showEntry() {
    document.querySelector(".m-tab__label--command span").innerHTML =
      "Command (" + (this.title.selectedIndex + 1) + "/" + this.title.childElementCount + ")";
    let st = this.master[this.currentIndex].pages[this.title.selectedIndex].entry;
    if (this.flip) {
      for (let key in Command.icons2) {
        st = st.replaceAll(key, '<i class="c c-' + Command.icons2[key] + '"></i>');
      }
    } else {
      for (let key in Command.icons) {
        st = st.replaceAll(key, '<i class="c c-' + Command.icons[key] + '"></i>');
      }
    }
    st = st.substr(st.indexOf("<br>") + 4);

    // 全角英数→半角
    if (this.zenhan) {
      st = st.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function (s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
      });
    }
    this.body.innerHTML = st;

    // 選択ヒストリ
    this.master[this.currentIndex].lastPage = this.title.selectedIndex;
  }
}
