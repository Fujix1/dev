/**
 * Action クラス
 */

class Action {
  constructor(args) {
    this.caption = args.caption;
    this.checked = args.checked === undefined ? false : args.checked;
    this.enabled = args.enabled === undefined ? true : args.enabled;
    this.iconFont = args.iconFont === undefined ? "" : args.iconFont;
    this.iconChar = args.iconChar === undefined ? "" : args.iconChar;
    this.onExecute = args.onExecute;
    this.onUpdate = args.onUpdate;
    this.keycode = args.keycode === undefined ? "" : args.keycode; // キーコード
    this.control = args.control === undefined ? false : args.control; // CTRLキー
    this.shift = args.shift === undefined ? false : args.shift; // シフトキー
    this.parent = args.parent === undefined ? false : args.parent; // グループ親
    this.caller = undefined;

    // DOM 作る
    this.li = document.createElement("li");
    this.li.className = "m-popup__item";

    // マウスイベント
    this.li.addEventListener("mousemove", (e) => {
      if (this.enabled) {
        this.mouseOn = true;
      }
    });
    this.li.addEventListener("mouseleave", (e) => {
      this.mouseOn = false;
    });

    // キャプション
    const caption = document.createElement("div");
    caption.className = "m-popup__itemCaption";
    caption.innerText = this.caption;

    // ショートカット
    const shortcut = document.createElement("div");
    shortcut.className = "m-popup__itemShortcut";
    const sc = [];
    if (this.control) sc.push("Ctrl");
    if (this.shift) sc.push("Shift");
    if (this.keycode) sc.push(this.keycode.toUpperCase());
    shortcut.innerHTML = sc.join("+");

    // アイコン
    const icon = document.createElement("div");
    icon.className = "m-popup__itemIcon";
    if (this.iconChar) {
      icon.innerHTML = "&#x" + this.iconChar + ";";
    } else {
      icon.innerHTML = "";
    }
    icon.style.fontFamily = this.iconFont;

    // 子メニューあり
    if (this.parent) {
      this.li.classList.add("m-popup__item--hasChildren");
    }

    // クリックで実行
    // click はフォーカス移るので使わない
    this.li.addEventListener("mousedown", (e) => {
      if (this.enabled) {
        if (e.button === 2) {
          // 右クリックで実行
          PopupMenu.executedByContextmenu = true; // 右クリックで発動
        }
        console.log("execute");
        this.execute(e);
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    });

    this.li.appendChild(caption);
    this.li.appendChild(shortcut);
    this.li.appendChild(icon);

    // ショートカット登録
    if (this.keycode) {
      window.addEventListener("keydown", (e) => {
        //console.log(e.key);
        if (e.key !== this.keycode) return;
        if (this.control && !e.ctrlKey) return;
        if (this.shift && !e.shiftKey) return;
        this.execute();
        e.preventDefault();
      });
    }
  }

  async execute() {
    this.update();
    if (this.enabled) {
      if (typeof this.onExecute === "function") await this.onExecute(this);
    }
    PopupMenu.close();
  }

  async update() {
    if (typeof this.onUpdate === "function") await this.onUpdate(this);
  }
}

/**
 * PopupMenu コレクション
 */
class PopupMenu {
  static currentUL = null; // 操作対象の UL
  static executedByContextmenu = false; // 右クリックで実行されたときは新規メニューは開かない

  static close(e) {
    document.body.classList.remove("is-popupmenu-open");
    if (PopupMenu.currentUL !== null) {
      PopupMenu.currentUL.classList.remove("is-open");
      PopupMenu.currentUL = null;
    }
  }

  constructor(items) {
    this.index = -1; // 未選択
    this.items = items;

    // menu の DOM 作る
    this.ul = document.createElement("ul");
    this.ul.className = "m-popup";

    this.ul.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
    this.menuIndex = -1;

    this.ul.addEventListener("mousemove", (e) => {
      this.items.forEach((item) => {
        if (item.action !== "---") {
          if (item.action.mouseOn) {
            this.view(item.index);
          }
        }
      });
    });

    this.ul.addEventListener("mouseleave", (e) => {
      this.view(-1);
    });
    document.body.appendChild(this.ul);
  }

  async show(e) {
    PopupMenu.close(); // 既存を閉じる
    if (PopupMenu.executedByContextmenu) {
      // 右クリック実行直後は開かない
      PopupMenu.executedByContextmenu = false;
      return;
    }

    PopupMenu.currentUL = this.ul; // ターゲットの UL

    // メニューを作る
    this.addItems(e, this.ul, this.items, undefined);

    /*
    // 各アクションの更新
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].action instanceof Object) {
        this.items[i].action.caller = e; // 呼び出し元
      }
      if (this.items[i].action.update !== undefined) {
        await this.items[i].action.update();
      }
    }

    // 更新
    this.ul.innerHTML = "";
    let n = 0;

    this.items.forEach(async (item) => {
      if (item.action === "---") {
        // 分割線
        const hr = document.createElement("hr");
        hr.className = "m-popup__hr";
        this.ul.appendChild(hr);
      } else {
        this.ul.appendChild(item.action.li);
        // チェック
        if (item.action.checked) {
          item.action.li.classList.add("m-popup__item--checked");
        } else {
          item.action.li.classList.remove("m-popup__item--checked");
        }
        // 有効化
        if (!item.action.enabled) {
          item.action.li.classList.add("m-popup__item--disabled");
          // インデックス
          item.index = undefined;
        } else {
          item.action.li.classList.remove("m-popup__item--disabled");
          // インデックス
          item.index = n++;
        }
        // キャプション
        item.action.li.querySelector(".m-popup__itemCaption").innerHTML = item.action.caption;
        //
        item.action.li.classList.remove("is-selected");
      }
    });

    this.length = n;

    this.ul.length = n;
    this.ul.index = -1;
    this.ul.setAttribute("length", n);
    this.view(-1); // ハイライトオフ
*/

    // 表示
    this.ul.style.left = e.clientX + 0 + "px";
    this.ul.style.top = e.clientY + 0 + "px";

    if (e.clientX + this.ul.offsetWidth + 30 > window.innerWidth) {
      this.ul.style.left = e.clientX - this.ul.offsetWidth + "px";
    }
    if (e.clientY + this.ul.offsetHeight + 30 > window.innerHeight) {
      this.ul.style.top = e.clientY - this.ul.offsetHeight + "px";
    }

    this.ul.classList.add("is-open");
    document.body.classList.add("is-popupmenu-open");
  }

  // liアイテムを追加する
  async addItems(caller, ul, items, parent) {
    // Update実行
    for (let i = 0; i < items.length; i++) {
      if (items[i].action instanceof Object) {
        items[i].action.caller = caller; // 呼び出し元
      }
      if (items[i].action.update !== undefined) {
        await items[i].action.update();
      }
    }

    // 掃除
    ul.parent = parent;
    ul.innerHTML = "";
    let n = 0;

    for (let i = 0; i < items.length; i++) {
      if (items[i].action === "---") {
        // 分割線
        const hr = document.createElement("hr");
        hr.className = "m-popup__hr";
        ul.appendChild(hr);
      } else {
        ul.appendChild(items[i].action.li);
        // チェック
        if (items[i].action.checked) {
          items[i].action.li.classList.add("m-popup__item--checked");
        } else {
          items[i].action.li.classList.remove("m-popup__item--checked");
        }
        // 有効化
        if (!items[i].action.enabled) {
          items[i].action.li.classList.add("m-popup__item--disabled");
          // インデックス
          items[i].index = undefined;
        } else {
          items[i].action.li.classList.remove("m-popup__item--disabled");
          // インデックス
          items[i].index = n++;
        }
        // キャプション
        items[i].action.li.querySelector(".m-popup__itemCaption").innerHTML = items[i].action.caption;

        // 選択解除
        items[i].action.li.classList.remove("is-selected");

        // グループ親
        if (items[i].action.parent) {
          // 子メニュー作る
          if (items[i].action.li.querySelector("ul")) {
            items[i].action.li.querySelector("ul").remove(); // 削除
          }
          const ulChild = document.createElement("ul");
          ulChild.classList.add("m-popup");
          ulChild.classList.add("m-popup--child");
          items[i].action.li.appendChild(ulChild);

          await this.addItems(caller, ulChild, items[i].children, ul);
        }
      }
    }
    ul.length = n;
    ul.setAttribute("length", n);
    return;
  }

  showChildren(index) {
    console.log("showchildren", index);
  }
  hideChildren() {
    console.log("hideChildren");
  }

  // 選択中ハイライト
  view(index) {
    this.index = index;
    this.items.forEach((item) => {
      if (item.action === "---") {
      } else {
        if (item.index === this.index) {
          item.action.li.classList.add("is-selected");
        } else {
          item.action.li.classList.remove("is-selected");
        }
      }
    });
  }
}

document.body.addEventListener("mousedown", PopupMenu.close);
