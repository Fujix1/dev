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
    this.keycode = args.keycode === undefined ? "" : args.keycode;
    this.control = args.control === undefined ? false : args.control;
    this.shift = args.shift === undefined ? false : args.shift;

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

    // クリックで実行（ click はフォーカス移る）
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

    // mousedownで見てるのでこれは起動しない
    // contextmenu は mouseup
    /*
    this.li.addEventListener("contextmenu", (e) => {
      if (this.enabled) {
        PopupMenu.executedByContextmenu = true; // 右クリックで発動
        this.execute(e);
        e.preventDefault();
        e.stopPropagation();
      }
    });
    */

    this.li.appendChild(caption);
    this.li.appendChild(shortcut);
    this.li.appendChild(icon);

    // ショートカット登録
    if (this.keycode) {
      window.addEventListener("keydown", (e) => {
        if (e.key !== this.keycode) return;
        if (this.control && !e.ctrlKey) return;
        if (this.shift && !e.shiftKey) return;
        this.execute();
        e.preventDefault();
      });
    }
  }
  execute() {
    this.update();
    if (this.enabled) {
      this.onExecute(this);
    }
    PopupMenu.close();
  }
  async update() {
    await this.onUpdate(this);
  }
}

class PopupMenu {
  static currentInstance = null; // 今開いているメニューのインスタンス
  static executedByContextmenu = false; // 右クリックで実行されたときは新規メニューは開かない

  static close(e) {
    if (PopupMenu.currentInstance !== null) {
      document.body.classList.remove("is-popupmenu-open");
      PopupMenu.currentInstance.menu.classList.remove("is-open");
      PopupMenu.currentInstance = null;
    }
  }

  constructor(actions) {
    this.index = -1; // 未選択
    this.actions = actions;
    this.menu = document.createElement("ul");
    this.menu.className = "m-popup";
    this.menu.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
    this.index = -1;

    this.menu.addEventListener("mousemove", (e) => {
      actions.forEach((action) => {
        if (action !== "---") {
          if (action.mouseOn) {
            this.view(action.index);
          }
        }
      });
    });
    this.menu.addEventListener("mouseleave", (e) => {
      this.view(-1);
    });

    document.body.appendChild(this.menu);
  }

  async show(e) {
    PopupMenu.close(); // 既存を閉じる
    if (PopupMenu.executedByContextmenu) {
      // 右クリック実行直後は開かない
      PopupMenu.executedByContextmenu = false;
      return;
    }

    PopupMenu.currentInstance = this;

    // 各アクションの更新
    for (let i = 0; i < this.actions.length; i++) {
      if (this.actions[i] instanceof Object) {
        this.actions[i].caller = e; // 呼び出し元
      }
      if (this.actions[i].update !== undefined) {
        console.log("this.actions[" + i + "].update()前");
        await this.actions[i].update();
        console.log("this.actions[" + i + "].update()後");
      }
    }

    // 更新
    this.menu.innerHTML = "";
    let n = 0;

    this.actions.forEach(async (item) => {
      if (item === "---") {
        // 分割線
        const hr = document.createElement("hr");
        hr.className = "m-popup__hr";
        this.menu.appendChild(hr);
      } else {
        this.menu.appendChild(item.li);
        // チェック
        if (item.checked) {
          item.li.classList.add("m-popup__item--checked");
        } else {
          item.li.classList.remove("m-popup__item--checked");
        }
        // 有効化
        if (!item.enabled) {
          item.li.classList.add("m-popup__item--disabled");
          // インデックス
          item.index = undefined;
        } else {
          item.li.classList.remove("m-popup__item--disabled");
          // インデックス
          item.index = n++;
        }
        // キャプション
        item.li.querySelector(".m-popup__itemCaption").innerHTML = item.caption;
        //
        item.li.classList.remove("is-selected");
      }
    });

    this.length = n;
    this.menu.setAttribute("length", n);
    this.view(-1); // ハイライトオフ

    // 表示
    this.menu.style.left = e.clientX + 0 + "px";
    this.menu.style.top = e.clientY + 0 + "px";

    if (e.clientX + this.menu.offsetWidth + 30 > window.innerWidth) {
      this.menu.style.left = e.clientX - this.menu.offsetWidth + "px";
    }
    if (e.clientY + this.menu.offsetHeight + 30 > window.innerHeight) {
      this.menu.style.top = e.clientY - this.menu.offsetHeight + "px";
    }

    this.menu.classList.add("is-open");
    document.body.classList.add("is-popupmenu-open");
  }

  // 選択中ハイライト
  view(index) {
    this.index = index;
    this.actions.forEach((action) => {
      if (action === "---") {
      } else {
        if (action.index === this.index) {
          action.li.classList.add("is-selected");
        } else {
          action.li.classList.remove("is-selected");
        }
      }
    });
  }
}

document.body.addEventListener("mousedown", PopupMenu.close);
