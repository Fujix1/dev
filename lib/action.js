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
    this.target = args.target;
    this.keycode = args.keycode === undefined ? "" : args.keycode;
    this.control = args.control === undefined ? false : args.control;
    this.shift = args.shift === undefined ? false : args.shift;

    this.caller = undefined;

    // prepare dom
    this.li = document.createElement("li");
    this.li.className = "m-popup__item";
    const caption = document.createElement("div");
    caption.innerText = this.caption;
    caption.className = "m-popup__itemCaption";
    const shortcut = document.createElement("div");
    shortcut.className = "m-popup__itemShortcut";
    const sc = [];
    if (this.control) sc.push("Ctrl");
    if (this.shift) sc.push("Shift");
    if (this.keycode) sc.push(this.keycode.toUpperCase());
    shortcut.innerHTML = sc.join("+");
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
  }
  execute() {
    this.onExecute(this);
  }
  update() {
    this.onUpdate(this);
  }
}

class PopupMenu {
  constructor(actions) {
    this.actions = actions;
    this.menu = document.createElement("ul");
    this.menu.className = "m-popup";

    let n = 0;
    this.actions.forEach((item) => {
      if (item === "---") {
        // 分割線
        const hr = document.createElement("hr");
        hr.className = "m-popup__hr";
        this.menu.appendChild(hr);
      } else {
        console.log("Constructor", item);
        item.li.tabIndex = n++;
        if (item.checked) {
          item.li.classList.add("m-popup__item--checked");
        }
        if (!item.enabled) {
          item.li.classList.add("m-popup__item--disabled");
        }
        this.menu.appendChild(item.li);
      }
    });
    document.body.appendChild(this.menu);
  }
  show(e) {
    console.log("PopupMenu: show", e);
    // 各アクションの更新
    this.actions.forEach((item) => {
      if (item instanceof Object) item.caller = e; // 呼び出し大元
      if (item.update !== undefined) {
        item.update();
      }
    });

    // 更新
    this.actions.forEach((item) => {
      if (item === "---") {
      } else {
        if (item.checked) {
          item.li.classList.add("m-popup__item--checked");
        } else {
          item.li.classList.remove("m-popup__item--checked");
        }
        if (!item.enabled) {
          item.li.classList.add("m-popup__item--disabled");
        } else {
          item.li.classList.remove("m-popup__item--disabled");
        }
      }
    });

    // メヌー閉じる
    const closeMenu = (e) => {
      this.menu.classList.remove("is-open");
      document.body.classList.remove("is-menu-open");
      e.stopPropagation();
      e.preventDefault();
    };

    document.body.addEventListener("click", closeMenu);
    document.body.addEventListener("contextmenu", closeMenu);

    // 表示
    this.menu.style.left = e.clientX + 0 + "px";
    this.menu.style.top = e.clientY + 0 + "px";
    this.menu.classList.add("is-open");
    document.body.classList.add("is-menu-open");
  }
}
