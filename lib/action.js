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
        this.li.classList.add("is-selected");
      }
    });
    this.li.addEventListener("mouseout", (e) => {
      this.li.classList.remove("is-selected");
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

    this.li.addEventListener("click", (e) => {
      if (this.enabled) {
        this.execute(e);
      }
    });

    this.li.addEventListener("contextmenu", (e) => {
      if (this.enabled) {
        this.execute(e);
      }
    });
    this.li.appendChild(caption);
    this.li.appendChild(shortcut);
    this.li.appendChild(icon);

    // ショートカット登録
    if (this.keycode) {
      window.addEventListener("keydown", (e) => {
        if (e.key === this.keycode) {
          this.execute();
        }
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
  update() {
    this.onUpdate(this);
  }
}

class PopupMenu {
  static close(e) {
    if (document.body.classList.contains("is-popupmenu-open")) {
      document.body.classList.remove("is-popupmenu-open");
      document.querySelectorAll(".m-popup").forEach((item) => {
        item.classList.remove("is-open");
      });
    }
    window.currentPopup = null;
  }

  constructor(actions) {
    this.index = -1; // 未選択
    this.actions = actions;

    this.menu = document.createElement("ul");
    this.menu.className = "m-popup";
    this.menu.tabIndex = 0;
    this.menu.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
    this.index = -1;

    this.actions.forEach((item) => {
      if (item === "---") {
        // 分割線
        const hr = document.createElement("hr");
        hr.className = "m-popup__hr";
        this.menu.appendChild(hr);
      } else {
        if (item.checked) {
          item.li.classList.add("m-popup__item--checked");
        }
        if (!item.enabled) {
          item.li.classList.add("m-popup__item--disabled");
        }
        this.menu.appendChild(item.li);
      }
    });

    this.menu.addEventListener("keydown", (e) => {
      console.log(e.key);
      switch (e.key) {
        case "ArrowUp":
          break;
        case "ArrowDown":
          break;
      }
    });

    document.body.appendChild(this.menu);
  }

  show(e) {
    window.currentPopup = this;
    console.log(window.currentPopup);
    PopupMenu.close();

    // 各アクションの更新
    this.actions.forEach((item) => {
      if (item instanceof Object) item.caller = e; // 呼び出し大元
      if (item.update !== undefined) {
        item.update();
      }
    });

    // 更新
    let n = 0;
    this.actions.forEach((item) => {
      if (item === "---") {
      } else {
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
          item.li.removeAttribute("index");
        } else {
          item.li.classList.remove("m-popup__item--disabled");
          // インデックス
          item.li.setAttribute("index", n++);
        }
        // キャプション
        item.li.querySelector(".m-popup__itemCaption").innerHTML = item.caption;
      }
    });
    this.menu.setAttribute("length", n);

    // 表示
    this.menu.style.left = e.clientX + 0 + "px";
    this.menu.style.top = e.clientY + 0 + "px";
    this.menu.classList.add("is-open");
    document.body.classList.add("is-popupmenu-open");
    this.menu.focus();
  }
}

document.body.addEventListener("mousedown", PopupMenu.close);
//document.body.addEventListener("contextmenu", PopupMenu.close);
