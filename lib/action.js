/**
 * Action クラス
 */

class Action {
  static instances = [];

  // 選択状態を更新する
  static highLight(parentUL) {
    const activeIndex = parentUL.getAttribute("activeIndex");
    window.requestAnimationFrame(() => {
      for (let i = 0; i < parentUL.childElementCount; i++) {
        const child = parentUL.children[i];
        if (child.getAttribute("index") == activeIndex) {
          child.classList.add("is-selected");
        } else {
          child.classList.remove("is-selected");
        }
      }
    });
  }

  // 該当メニューの項目を非選択状態にする
  static unHighlight(targetUL) {
    targetUL.setAttribute("activeIndex", -1);
    window.requestAnimationFrame(() => {
      for (let i = 0; i < targetUL.childElementCount; i++) {
        targetUL.children[i].classList.remove("is-selected");
      }
    });
  }

  constructor(args) {
    Action.instances.push(this); // インスタンスのコレクション

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
    this.isEditItem = args.isEditItem === undefined ? false : args.isEditItem;

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

    // 項目クリック
    // click はフォーカス移るので使わない
    this.li.addEventListener("mousedown", (e) => {
      if (this.enabled) {
        // 右クリックのとき
        if (e.button === 2) {
          PopupMenu.executedByContextmenu = true; // 右クリックで発動
        }
        this.execute(e);
        if (!this.parent) PopupMenu.close(); // 子メニュー持つ場合以外は閉じる
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    });

    // 子メニューあり
    if (this.parent) {
      this.li.classList.add("m-popup__item--hasChildren");

      // 子メニューを開く処理
      this.li.showChildren = async () => {
        clearTimeout(document.popupTimer); // マニュアルで開いたときはタイマー消す
        const child = this.li.querySelector(":scope>.m-popup");
        if (child === null) {
          return;
        }
        const rect = this.li.getBoundingClientRect();
        child.style.left = rect.right + window.scrollX + 4 + "px";
        child.style.top = rect.top + window.scrollY - 4 + "px";

        // はみ出しチェック
        const childRect = child.getBoundingClientRect();
        if (childRect.right + window.scrollX > window.innerWidth) {
          child.style.left = rect.left + window.scrollX - 4 - childRect.width + "px";
        }
        if (childRect.bottom + window.scrollY > window.innerHeight) {
          child.style.top = rect.bottom + window.scrollY + 4 - childRect.height + "px";
        }

        child.classList.add("is-open");
        this.li.classList.add("is-child-open");
        PopupMenu.currentPopupMenu = child; // 現在アクティブな PopUp メニュー
      };

      this.li.addEventListener("mouseenter", async (e) => {
        document.popupTimer = setTimeout(async () => {
          await this.li.showChildren();
        }, 300);
      });

      this.li.addEventListener("mouseleave", async (e) => {
        if (document.popupTimer) {
          clearTimeout(document.popupTimer);
        }
      });
    }

    // mouse enter 処理
    this.li.addEventListener("mouseenter", (e) => {});

    // mouseover
    this.li.addEventListener("mouseover", (e) => {
      const menuUL = this.li.parentElement;

      // 項目 index を抽出
      const index = this.li.getAttribute("index");
      const activeIndex = menuUL.getAttribute("activeIndex");
      if (index !== null && index !== activeIndex) {
        menuUL.setAttribute("activeIndex", index);
        Action.highLight(menuUL);
      }

      // 自分の兄弟の子メニューを閉じる
      menuUL.querySelectorAll(":scope > *.is-child-open").forEach((hit) => {
        if (hit !== this.li) {
          // 自分は除く
          hit.querySelector(":scope > ul.m-popup").classList.remove("is-open");
          hit.classList.remove("is-child-open");
          PopupMenu.currentPopupMenu = menuUL; // 現在アクティブな PopUp メニュー
          // 孫で開いてるものも閉じる
          const mago = hit.querySelector(":scope > ul.m-popup ul.m-popup li.is-child-open");
          if (mago) {
            mago.querySelector(":scope > ul.m-popup").classList.remove("is-open");
            mago.classList.remove("is-child-open");
          }
        }
      });
    });

    this.li.appendChild(caption);
    this.li.appendChild(shortcut);
    this.li.appendChild(icon);

    // ショートカット登録
    /// →まとめて登録するように変更
    /*    if (this.keycode) {
      window.addEventListener(
        "keyup",
        (e) => {
          console.log("keyup");
          if (e.key !== this.keycode) return;
          if (this.control && !e.ctrlKey) return;
          if (this.shift && !e.shiftKey) return;
          this.execute(e);
          e.preventDefault();
        },
        true // 第 3 引数の true は、このリスナーが他のリスナーよりも必ず優先してキー押下を受け取ることを示しています。そのため、このリスナー内で stopPropagation() を呼び出さないでください。
      );
    }
  */
  }

  /**
   * ショートカットをまとめて登録する
   */
  static addShortCuts() {
    window.addEventListener(
      "keydown",
      (e) => {
        //console.log("keydown", e.key, e.shiftKey, e.ctrlKey);
        Action.instances.forEach((item) => {
          if (item.keycode) {
            if (e.key === item.keycode && e.shiftKey === item.shift && e.ctrlKey === item.control) {
              item.execute(e);
              e.preventDefault();
            }
          }
        });
      },
      true
    );
  }

  async execute(e) {
    if (this.parent) {
      // 子メニューすぐ開く
      this.li.showChildren();
      return;
    }

    await this.update(this);
    if (this.enabled) {
      if (typeof this.onExecute === "function") {
        if (e.type === "keyup" && this.isEditItem) {
          // 編集項目は二重で起こるのを防止
        } else {
          await this.onExecute(this);
        }
        PopupMenu.close();
      }
    }
  }

  async update() {
    if (typeof this.onUpdate === "function") await this.onUpdate(this);

    // 最新状態をDOMに反映
    if (this.parent) {
      // グループ親をリセット
      this.li.classList.remove("is-child-open");
    }
    // チェックボックス
    if (this.checked) {
      this.li.classList.add("m-popup__item--checked");
    } else {
      this.li.classList.remove("m-popup__item--checked");
    }
    // キャプション
    this.li.querySelector(":scope > .m-popup__itemCaption").innerHTML = this.caption;

    // 選択解除
    this.li.classList.remove("is-selected");

    // 有効化
    if (this.enabled) {
      this.li.classList.remove("m-popup__item--disabled");
    } else {
      this.li.classList.add("m-popup__item--disabled");
    }
  }

  // 選択状態を更新する
  highLight(parentUL) {
    const activeIndex = parentUL.getAttribute("activeIndex");
    for (let i = 0; i < parentUL.childElementCount; i++) {
      const child = parentUL.children[i];
      if (child.getAttribute("index") == activeIndex) {
        child.classList.add("is-selected");
      } else {
        child.classList.remove("is-selected");
      }
    }
  }
}

/**
 * PopupMenu コレクション
 */
class PopupMenu {
  static executedByContextmenu = false; // 右クリックで実行されたときは新規メニューは開かない
  static currentPopupMenu = null; // 操作対象のメニュー
  static nextPopup = null; // 次に開くメニュー
  static contextMenuEventArgs = null; // electron のコンテキストメニューイベントの返値

  // 全部閉じる
  static close(e) {
    document.body.classList.remove("is-popupmenu-open");
    PopupMenu.currentPopupMenu = null;
    document.querySelectorAll(".m-popup.is-open").forEach((ul) => {
      ul.classList.remove("is-open");
    });
  }

  constructor(args) {
    this.caller = null; // 呼び出しもと
    this.index = -1; // 未選択
    if (args.items) {
      this.items = args.items;
    } else {
      this.items = args;
    }
    this.menuIndex = -1;

    // menu の DOM 作る
    this.ul = document.createElement("ul");
    this.ul.className = "m-popup";
    this.ul.classList.add("m-popup--root");

    this.ul.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });

    this.ul.addEventListener("mouseleave", (e) => {
      Action.unHighlight(this.ul);
    });
    document.body.appendChild(this.ul);

    if (args.targets) {
      for (let i = 0; i < args.targets.length; i++) {
        document.querySelector(args.targets[i]).addEventListener("contextmenu", (e) => {
          PopupMenu.contextMenuEventArgs = null; // 一旦 null にする
          if (PopupMenu.executedByContextmenu) {
            // 右クリック実行直後は開かない
            PopupMenu.executedByContextmenu = false;
          } else {
            this.caller = e; // 呼び出しイベント
            PopupMenu.nextPopup = this; // 次開くのは自分
            PopupMenu.close(); // 既存を閉じる
          }
          e.stopPropagation();
        });
      }
    }
  }

  async show() {
    PopupMenu.currentPopupMenu = this.ul; // 現在アクティブな PopUp メニュー
    PopupMenu.currentActions = this.items; //

    // メニューを作る
    this.addItems(this.ul, this.items, this);

    // 表示
    this.ul.style.left = this.caller.clientX + 0 + "px";
    this.ul.style.top = this.caller.clientY + 0 + "px";

    if (this.caller.clientX + this.ul.offsetWidth + 30 > window.innerWidth) {
      this.ul.style.left = this.caller.clientX - this.ul.offsetWidth + "px";
    }
    if (this.caller.clientY + this.ul.offsetHeight + 30 > window.innerHeight) {
      this.ul.style.top = this.caller.clientY - this.ul.offsetHeight + "px";
    }
    this.ul.classList.add("is-open");
    document.body.classList.add("is-popupmenu-open");
  }

  async realShow(args) {
    PopupMenu.nextPopup = null;
    PopupMenu.contextMenuEventArgs = args;

    //
    PopupMenu.currentPopupMenu = this.ul; // 現在アクティブな PopUp メニュー
    PopupMenu.currentActions = this.items; //

    // メニューを作る
    this.addItems(this.ul, this.items, this);

    // 表示
    this.ul.style.left = this.caller.clientX + 0 + "px";
    this.ul.style.top = this.caller.clientY + 0 + "px";

    if (this.caller.clientX + this.ul.offsetWidth + 30 > window.innerWidth) {
      this.ul.style.left = this.caller.clientX - this.ul.offsetWidth + "px";
    }
    if (this.caller.clientY + this.ul.offsetHeight + 30 > window.innerHeight) {
      this.ul.style.top = this.caller.clientY - this.ul.offsetHeight + "px";
    }
    this.ul.classList.add("is-open");
    document.body.classList.add("is-popupmenu-open");
  }

  // liアイテムを追加する
  async addItems(ul, items, parent) {
    // Update実行
    for (let i = 0; i < items.length; i++) {
      if (items[i].action instanceof Object) {
        items[i].action.caller = this.caller; // 呼び出し元
      }
      if (items[i].action !== "---") {
        await items[i].action.update();
      }
    }

    // 掃除
    ul.parent = parent;
    ul.innerHTML = "";
    ul.openingChild = null;
    ul.actions = items;

    let n = 0;

    for (let i = 0; i < items.length; i++) {
      if (items[i].action === "---") {
        // 分割線
        const hr = document.createElement("hr");
        hr.className = "m-popup__hr";
        ul.appendChild(hr);
      } else {
        ul.appendChild(items[i].action.li);

        // 有効化
        if (!items[i].action.enabled) {
          // インデックス
          items[i].index = undefined;
          items[i].action.li.removeAttribute("index");
        } else {
          // インデックス
          items[i].action.li.setAttribute("index", n);
          items[i].index = n++;
        }

        // グループ親
        if (items[i].action.parent && items[i]) {
          // 子メニュー割当て
          if (items[i].action.li.querySelector("ul")) {
            items[i].action.li.querySelector("ul").remove(); // 削除
          }
          if (items[i].action.enabled) {
            // 子メニュー用 ul 生成
            const ulChild = document.createElement("ul");
            ulChild.classList.add("m-popup");
            ulChild.classList.add("m-popup--child");
            ulChild.parent = items[i].action.li;
            items[i].action.li.appendChild(ulChild);
            ulChild.addEventListener("mouseleave", (e) => {
              Action.unHighlight(ulChild);
            });
            // 子メニュー再帰追加
            await this.addItems(ulChild, items[i].children, items[i].action.li);
          }
        }
      }
    }

    ul.setAttribute("length", n);
  }
}

document.body.addEventListener("mousedown", PopupMenu.close);

window.retrofireAPI.onContextMenu((event, args) => {
  if (PopupMenu.nextPopup !== null) {
    PopupMenu.contextMenuEventArgs = args;
    PopupMenu.nextPopup.realShow(args);
  }
});
