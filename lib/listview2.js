/**
 * listView モジュール
 */
"use strict";

function debuglog(...args) {
  //console.log(...args);
}
/**
 * リストビュー用クラス
 * args:
 *  target:   string,   // 対象のセレクタ
 *  columns: [{label: string, data: string, width: integer, order: integer, defaultSort: "asc"|"desc"}] // カラム
 *  columnClickable: true, // カラムクリック可能
 *  slug:     string,   // スラグ
 *  orderByIndex:  integer,  // ソート対象の index
 *  sortDirection: "asc"|"desc", // ソート順
 *  onSelect: function(dataIndex, zipName)
 */
class ListView2 {
  constructor(args) {
    this.slug = args.slug;

    // カラム設定
    this.columns = args.columns;
    this.orderByIndex = args.orderByIndex;
    this.sortDirection = args.sortDirection;
    this.columnClickable = args.columnClickable ? args.columnClickable : true;

    // 削除予定
    this.searchTarget = args.searchTarget ? args.searchTarget : ""; //削除する

    // コールバック
    this.onSelect =
      typeof args.onSelect === "function"
        ? args.onSelect
        : (index) => {
            console.log("onSelect", index);
          };
    this.onData =
      typeof args.onData === "function"
        ? args.onData
        : (index) => {
            console.log("onData", index);
          };
    this.onColumnClick =
      typeof args.onColumnClick === "function"
        ? args.onColumnClick
        : (property, direction) => {
            console.log("onColumnClick", property, direction);
          };
    this.onEnter =
      typeof args.onEnter === "function"
        ? args.onEnter
        : (index) => {
            console.log("onEnter", index);
          };
    this.onKeyDown = (event) => {
      this.onKeydownDefault(event);
      if (typeof args.onKeyDown === "function") args.onKeyDown(event);
    };

    // 状態保持
    this._itemCount = 0; // 項目数

    this.numItems = 0; // 保持項目数
    this.itemIndex = -1; // 選択中のリストビュー項目インデックス

    this.lastHeight = 0; // リサイズ前のサイズ保持
    this.rowHeight = 0; // 列の高さ
    this.dataIndex = -1; // 選択中のデータインデックス

    // DOM構成
    this.header; //
    this.main; //
    this.ul;
    this.list = document.querySelector(args.target);
    this.list.classList.add("m-listView");
    this.list.classList.add("m-listView__slug--" + this.slug);
  }

  // 初期化
  async init() {
    //------------------------------------------------------------------------------
    // 設定復旧
    const settings = await window.retrofireAPI.getStore("listview-" + this.slug);
    if (settings) {
      // 整合性チェック
      let updated = false;
      if (settings.columns.length != this.columns.length) {
        // カラム数が違う
        updated = true;
      } else {
        for (let i = 0; i < settings.columns.length; i++) {
          if (Object.keys(settings.columns[i]).length !== Object.keys(this.columns[i]).length) {
            // キー数違う
            updated = true;
            break;
          }
          if (
            settings.columns[i].label !== this.columns[i].label ||
            settings.columns[i].data !== this.columns[i].data
          ) {
            // ラベルと参照データ違う
            updated = true;
            break;
          }
        }
      }
      if (!updated) {
        this.columns = settings.columns;
        this.sortDirection = settings.sortDirection;
        this.orderByIndex = settings.orderByIndex;
      } else {
        debuglog("メインリストビュー: カラム設定デフォルト設定復旧");
      }
    }

    //------------------------------------------------------------------------------
    // ヘッダ追加
    const columnHeader = document.createElement("header");
    this.header = columnHeader;
    columnHeader.className = "m-listView__header";
    columnHeader.setAttribute("tabindex", "-1");
    let n = 0;
    const root = document.querySelector(":root");
    let columnWasDragged = false;

    // ヘッダカラム追加
    let totalWidth = 0;
    this.columns.forEach((item) => {
      // 変数埋め込み
      root.style.setProperty("--listiview-" + this.slug + "-col-" + n + "-width", item.width + "px");
      if ("order" in item) {
        root.style.setProperty("--listiview-" + this.slug + "-col-" + n + "-order", item.order);
      }
      totalWidth += item.width;

      // 要素追加
      const headerItem = document.createElement("div");
      headerItem.className = "m-listView__headerItem";
      headerItem.setAttribute("col-index", n);
      headerItem.setAttribute("data", item.data);
      headerItem.setAttribute("tabindex", "-1");
      headerItem.style.width = "var(--listiview-" + this.slug + "-col-" + n + "-width)";
      headerItem.style.order = "var(--listiview-" + this.slug + "-col-" + n + "-order)";

      const headerText = document.createElement("span");
      headerText.className = "m-listView__headerText";
      headerText.innerText = item.label;
      headerItem.appendChild(headerText);

      const headerSplitter = document.createElement("div");
      headerSplitter.className = "m-listView__headerSplitter";
      headerSplitter.setAttribute("col-index", n);

      /// -------------------------------------------------------------------------
      /// ヘッダカラムクリック
      headerItem.addEventListener("click", (e) => {
        if (this.columnClickable === false) {
          return;
        }
        if (columnWasDragged) {
          // ドラッグされたときはキャンセル
          e.preventDefault();
          return;
        }
        const clickedIndex = e.currentTarget.getAttribute("col-index");
        let newOrderByIndex, newDirection;
        newOrderByIndex = clickedIndex;

        if (this.orderByIndex == clickedIndex) {
          newDirection = this.sortDirection == "asc" ? "desc" : "asc";
        } else {
          newDirection = this.columns[clickedIndex].defaultSort;
        }
        this.setSortArrow(newOrderByIndex, newDirection);

        this.onColumnClick(this.columns[newOrderByIndex].data, newDirection);

        //this.updateListView();
      });

      /// -------------------------------------------------------------------------
      /// ヘッダカラムリサイズ ドラッグ＆ドロップ
      let resizeStart = {};
      let resizingColumnIndex;
      let startWidth;

      // ドラッグ中処理
      const mouseMoveHandler = (e) => {
        document.body.style.cursor = "col-resize";
        const delta = {
          x: e.pageX - resizeStart.x,
          y: e.pageY - resizeStart.y,
        };

        // 親要素のスクロールXを考慮
        delta.x += this.list.scrollLeft;

        // 埋め込み変数更新
        const newWidth = startWidth + delta.x;
        if (newWidth >= 20) {
          this.columns[resizingColumnIndex].width = startWidth + delta.x;
          window.requestAnimationFrame(() => {
            root.style.setProperty(
              "--listiview-" + this.slug + "-col-" + resizingColumnIndex + "-width",
              startWidth + delta.x + "px"
            );
          });
        }

        // ラッパーの幅更新
        let totalWidth = 0;
        this.columns.forEach((item) => {
          totalWidth += item.width;
        });
        window.requestAnimationFrame(() => {
          this.header.style.width = totalWidth + "px";
          this.ul.style.minWidth = totalWidth + "px";
        });
      };

      // ドラッグ完了
      const mouseUpHandler = (e) => {
        document.body.style.cursor = "";
        this.list.classList.remove("is-header-resizing");
        Array.from(this.header.children).forEach((item) => item.classList.remove("is-resizing"));
        document.removeEventListener("mousemove", mouseMoveHandler);
        window.removeEventListener("mouseup", mouseUpHandler);

        if (e.pageX + this.list.scrollLeft !== resizeStart.x) {
          // 移動した
          debuglog("resized");
        }
      };

      // ドラッグ開始
      headerSplitter.addEventListener("mousedown", (e) => {
        this.list.classList.add("is-header-resizing");
        e.target.parentNode.classList.add("is-resizing");

        resizeStart = { x: e.pageX, y: e.pageY }; // 開始位置
        // 親要素のスクロールXを考慮
        resizeStart.x += this.list.scrollLeft;

        columnWasDragged = true; // クリックイベント抑制

        resizingColumnIndex = e.target.getAttribute("col-index"); // ドラッグ中のカラムインデックス
        startWidth = this.columns[resizingColumnIndex].width; // 開始の幅
        document.addEventListener("mousemove", mouseMoveHandler);
        window.addEventListener("mouseup", mouseUpHandler);
      });

      headerSplitter.addEventListener("dragstart", (e) => false);

      headerItem.appendChild(headerSplitter);
      columnHeader.appendChild(headerItem);

      // ダブルクリック
      headerSplitter.addEventListener("dblclick", (e) => {
        // 未実装
      });

      /// -------------------------------------------------------------------------
      /// ヘッダカラム移動 ドラッグ＆ドロップ
      let draggingColumnIndex;
      let dragStart = {};
      let draggingItem;
      let hoverOnIndex = -1;
      const DRAGTHRESHOLD = 5; // ドラッグ判定する移動量

      // ドラッグ中処理
      const dragMouseMoveHandler = (e) => {
        const delta = { x: e.pageX - dragStart.x, y: e.pageY - dragStart.y };
        // 親要素のスクロールXを考慮
        delta.x += this.list.scrollLeft;

        // 閾値以上動いたら ドラッグされた
        if (Math.abs(delta.x) > DRAGTHRESHOLD) {
          columnWasDragged = true;
        } else {
          columnWasDragged = false;
          draggingItem.style.left = "0px";
          return;
        }

        // ドラッグ移動
        window.requestAnimationFrame(() => {
          draggingItem.style.left = delta.x + "px";
        });

        // 他のヘッダカラム上か確認
        for (let i = 0; i < this.header.childElementCount; i++) {
          hoverOnIndex = -1;
          for (let j = 0; j < this.header.childElementCount; j++) {
            this.header.children[j].classList.remove("is-hovered-left");
            this.header.children[j].classList.remove("is-hovered-right");
          }
          if (i == draggingColumnIndex) {
            continue;
          }
          const targetRect = this.header.children[i].getBoundingClientRect();
          if (e.pageX >= targetRect.left && e.pageX <= targetRect.right) {
            if (targetRect.right <= dragStart.x) {
              // 左向き
              this.header.children[i].classList.add("is-hovered-left");
              hoverOnIndex = i;
            } else {
              this.header.children[i].classList.add("is-hovered-right");
              hoverOnIndex = i;
            }
            break;
          }
        }
      };

      // ドラッグ完了
      const dragMouseUpHandler = async (e) => {
        // 一時クラス削除
        this.list.classList.remove("is-header-dragging");
        Array.from(this.header.children).forEach((item) => item.classList.remove("is-dragging"));

        // イベント削除
        document.removeEventListener("mousemove", dragMouseMoveHandler);
        window.removeEventListener("mouseup", dragMouseUpHandler);

        // from の元カラムインデックス
        const fromIndex = this.columns[draggingColumnIndex].order;

        // 並び替え処理
        if (hoverOnIndex != -1) {
          this.header.children[hoverOnIndex].classList.remove("is-hovered-left");
          this.header.children[hoverOnIndex].classList.remove("is-hovered-right");

          // to の元カラムインデックス
          const toIndex = this.columns[hoverOnIndex].order;

          // 並び替え
          const order = [];
          for (let i = 0; i < this.columns.length; i++) {
            order[this.columns[i].order] = i;
          }
          array_move(order, fromIndex, toIndex);
          for (let i = 0; i < order.length; i++) {
            this.columns[order[i]].order = i;
            // 変数埋め直し
            root.style.setProperty("--listiview-" + this.slug + "-col-" + order[i] + "-order", i);
          }
        }

        draggingItem.style.left = "";
        hoverOnIndex = -1;

        // 配列要素移動
        function array_move(arr, old_index, new_index) {
          if (new_index >= arr.length) {
            var k = new_index - arr.length + 1;
            while (k--) {
              arr.push(undefined);
            }
          }
          arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
          return arr; // for testing
        }
      };

      // ドラッグ開始
      headerText.addEventListener("mousedown", (e) => {
        columnWasDragged = false; // ドラッグ済みリセット

        dragStart = { x: e.pageX, y: e.pageY }; // 開始位置
        // 親要素のスクロールXを考慮
        dragStart.x += this.list.scrollLeft;

        draggingItem = e.target.parentNode;

        draggingColumnIndex = e.target.parentNode.getAttribute("col-index"); // ドラッグ中のカラムインデックス

        this.list.classList.add("is-header-dragging");
        e.target.parentNode.classList.add("is-dragging");
        document.addEventListener("mousemove", dragMouseMoveHandler);
        window.addEventListener("mouseup", dragMouseUpHandler);
      });

      n++;
    });

    this.list.appendChild(columnHeader);

    // ステージの幅指定
    this.header.style.width = totalWidth + "px";

    //-----------------------------------------------------------------------------
    // ボディ追加
    this.main = document.createElement("main");
    this.main.className = "m-listView__main";
    this.ul = document.createElement("ul");
    this.ul.className = "m-listView__list";
    this.ul.style.minWidth = totalWidth + "px";
    this.main.appendChild(this.ul);
    this.list.appendChild(this.main);

    // 行の高さ取得
    const li = document.createElement("li");
    li.className = "m-listView__listItem";
    li.append(document.createTextNode("要素"));
    this.ul.appendChild(li);
    this.rowHeight = li.offsetHeight;
    li.remove();
    this.lastHeight = this.main.offsetHeight;

    // スクロールイベント
    this.list.addEventListener("scroll", async (e) => {
      await this.updateRowDOMs();
    });

    // リサイズオブザーバ
    this.resizeObserver = new window.ResizeObserver(async (entries) => {
      if (entries[0].target == this.list) {
        // ステージの高さ
        const stageHeight = this.list.offsetHeight - this.header.offsetHeight;
        if (this.lastHeight != stageHeight) {
          this.lastHeight = stageHeight;
          this.updateVirtualDoms();
          await this.updateRowDOMs();
        }
      }
    });
    this.resizeObserver.observe(this.list);

    // キー処理
    this.list.addEventListener("keydown", (event) => this.onKeyDown(event));
    this.list.addEventListener("focus", (e) => {
      if (this._itemCount > 0) {
        this.ul.focus();
      }
    });

    this.setSortArrow(this.orderByIndex, this.sortDirection);

    /*
    this.sort();
    this.filter();

    this.updateVirtualDoms();
    await this.updateRowDOMs();

    // zip 名から dataIndex 再検索
    dataIndex = Dataset.indexOfZip(this.zipName);
    debuglog("初期表示 zipName", this.zipName);
    debuglog("初期表示 dataIndex", this.dataIndex);
    this.onSelect(this.dataIndex, this.zipName);

    */
  }

  // アイテム数をセットする
  set itemCount(count) {
    this._itemCount = count;

    // ステージの高さ設定
    const newHeight = this._itemCount * this.rowHeight;
    if (this.list.scrollTop + this.list.offsetHeight > newHeight) {
      // ステージが短くなるときはすぐスクロールさせる
      this.list.scrollTop = newHeight;
    }
    this.ul.style.height = newHeight + "px";

    // ゼロ件のとき
    if (this._itemCount === 0) {
      //this.dataIndex = -1;
      //this.zipName = "";
      //this.onSelect(this.dataIndex, this.zipName);
    }
    this.updateVirtualDoms();
    this.updateRowDOMs();
  }

  // 仮想要素をリストビューサイズに合わせて追加・削除
  updateVirtualDoms() {
    debuglog("updateVirtualDoms");
    const numDOMs = this.ul.childElementCount; // 現在存在する要素数
    let neededRows = Math.ceil(this.lastHeight / this.rowHeight) + 1; // 必要な要素数

    if (numDOMs === neededRows) return;

    // 不足分追加
    if (numDOMs < neededRows) {
      for (let i = numDOMs; i < neededRows; i++) {
        const li = document.createElement("li");
        li.setAttribute("tabindex", "0");
        li.className = "m-listView__listItem";

        for (let j = 0; j < this.columns.length; j++) {
          const div = document.createElement("div");
          div.classList.add("m-listView__listItemCell");
          if (j == 0) {
            div.classList.add("m-listView__listItemCell--bold");
          }
          div.classList.add("m-listView__listItemCell--" + j);
          div.setAttribute("cellindex", j);
          div.setAttribute("celldata", this.columns[j].data);
          div.style.width = "var(--listiview-" + this.slug + "-col-" + j + "-width)";
          div.style.order = "var(--listiview-" + this.slug + "-col-" + j + "-order)";
          li.appendChild(div);
        }
        this.ul.appendChild(li);
        li.addEventListener("dblclick", async (e) => await this.onDubleClick(e));
        li.addEventListener("click", async (e) => await this.onClick(e));
        li.addEventListener("focus", async (e) => await this.onFocus(e));
        li.addEventListener("blur", (e) => {});
      }
    } else if (numDOMs > neededRows) {
      debuglog("remove");
      for (let i = numDOMs - 1; i >= neededRows; i--) {
        this.ul.removeChild(this.ul.children[i]);
      }
    }
  }

  // 行の仮想DOMをスクロール位置に合わせて再配置
  async updateRowDOMs() {
    // DOM 項目の再配置
    const start = Math.floor(this.list.scrollTop / this.rowHeight);
    const end = start + this.ul.childElementCount;

    for (let i = start; i < end; i++) {
      const domIndex = i % this.ul.childElementCount;
      const oldTop = this.ul.children[domIndex].style.top;
      const newTop = i * this.rowHeight + "px";

      if (oldTop != newTop) {
        // DOM移動
        this.ul.children[domIndex].style.top = newTop;
        this.ul.children[domIndex].virtualIndex = i;

        // 表示内容更新
        if (this._itemCount > i) {
          const li = this.ul.children[domIndex];
          this.updateRow(li);
        }

        // 選択中項目のオンオフ
        if (this.ul.children[domIndex].virtualIndex === this.itemIndex) {
          this.ul.children[domIndex].classList.add("m-listView__listItem--selected");
          if (document.activeElement === document.body) {
            this.list.focus();
          }
        } else {
          this.ul.children[domIndex].classList.remove("m-listView__listItem--selected");
          if (document.activeElement === this.ul.children[domIndex]) {
            this.ul.children[domIndex].blur();
            this.list.focus();
          }
        }
      }
    }
    //this.refreshSelection();
  }

  onKeydownDefault(e) {
    if (document.body.classList.contains("is-popupmenu-open")) {
      e.preventDefault();
      return;
    }
    switch (e.code) {
      case "Enter":
      case "NumpadEnter":
        this.onEnter(this.itemIndex);
        break;
      case "ArrowUp":
      case "Numpad8":
        if (this._itemCount > 1 && this.itemIndex > 0) {
          this.itemIndex--;
          this.onSelect(this.itemIndex);
          this.makeVisible2();
        }
        e.preventDefault();
        break;
      case "ArrowDown":
      case "Numpad2":
        if (this._itemCount - 1 > this.itemIndex) {
          this.itemIndex++;
          this.onSelect(this.itemIndex);
          this.makeVisible2();
        }
        e.preventDefault();
        break;
      case "Home":
        if (this._itemCount > 1 && this.itemIndex > 0) {
          this.itemIndex = 0;
          this.onSelect(this.itemIndex);
          this.makeVisible2();
        }
        e.preventDefault();
        break;
      case "End":
        if (this._itemCount > 0) {
          this.itemIndex = this._itemCount - 1;
          this.onSelect(this.itemIndex);
          this.makeVisible2();
        }
        e.preventDefault();
        break;
      case "PageUp":
        if (this._itemCount > 1 && this._itemCount !== -1) {
          const count = this.ul.childElementCount - 2; // 一画面表示数
          this.itemIndex = this.itemIndex - count < 0 ? 0 : this.itemIndex - count;
          this.onSelect(this.itemIndex);
          this.makeVisible2();
        }
        e.preventDefault();
        break;
      case "PageDown":
        if (this._itemCount > 1 && this._itemCount !== -1) {
          const count = this.ul.childElementCount - 2; // 一画面表示数
          this.itemIndex = this.itemIndex + count;
          if (this.itemIndex > this._itemCount) this.itemIndex = this._itemCount - 1;
          this.onSelect(this.itemIndex);
          this.makeVisible2();
        }
        e.preventDefault();
        break;
      default:
        debuglog(e.code);
    }
  }

  async onDubleClick(e) {
    // セルでイベント発生
    this.itemIndex = e.target.parentNode.virtualIndex;
    this.onEnter(this.itemIndex);
  }

  async onClick(e) {
    //debuglog(e);
  }

  async onFocus(e) {
    // 行でイベント発生

    // 同じものが選択されていたら何もしない
    if (this.itemIndex == e.target.virtualIndex) {
      return;
    }

    // 直前まで選択されていたものの処理
    // e.relatedTarget は取りこぼしがある
    const previousSelected = document.querySelector(
      ".m-listView__slug--" + this.slug + " .m-listView__listItem--selected"
    );

    // 選択中クラス外す
    if (previousSelected !== null) {
      previousSelected.classList.remove("m-listView__listItem--selected");
    }

    // 新しい選択肢
    e.target.classList.add("m-listView__listItem--selected");
    this.itemIndex = e.target.virtualIndex;
    this.onSelect(this.itemIndex);
  }

  // this.itemIndex を見えるところへスクロール
  makeVisible2() {
    // 0件のとき
    if (this._itemCount === 0) {
      this.itemIndex = -1;
      this.onSelect(-1);
      return false;
    }

    // 選択されていないとき
    if (this.itemIndex === -1) {
      // 選択項目リセット
      this.itemIndex = 0;
      //this.ul.childNodes[0].classList.add("m-listView__listItem--selected");
    }

    // 選択解除
    const li = this.ul.querySelector(":scope .m-listView__listItem--selected");
    if (li !== null) li.classList.remove("m-listView__listItem--selected");

    // スクロール先

    // スクロールバーの高さを引く
    const isScrollBarHVisible = this.list.scrollWidth > this.list.clientWidth;
    const scrollBarHeight = isScrollBarHVisible ? this.list.offsetWidth - this.list.clientWidth : 0;

    const newPos = this.itemIndex * this.rowHeight;
    if (
      this.list.scrollTop < newPos &&
      this.list.scrollTop > newPos - this.list.offsetHeight + scrollBarHeight + this.rowHeight * 2
    ) {
      // 表示範囲内
    } else {
      // 表示範囲外
      if (this.list.scrollTop < newPos) {
        // 下向きスクロール
        this.list.scrollTop = newPos - this.list.offsetHeight + this.header.offsetHeight + this.rowHeight;
      } else {
        this.list.scrollTop = newPos;
      }
      this.updateRowDOMs();
    }

    // 再選択
    for (let i = 0; i < this.ul.childElementCount; i++) {
      if (this.ul.children[i].virtualIndex === this.itemIndex) {
        this.ul.children[i].classList.add("m-listView__listItem--selected");
        this.ul.children[i].focus();
        break;
      }
    }
  }

  // 選択状態のリフレッシュ
  refreshSelection() {
    debuglog("refreshSelection");
    this.ul.childNodes.forEach((item) => {
      if (item.getAttribute("data-index") == this.dataIndex) {
        item.classList.add("m-listView__listItem--selected");
        if (this.tempSetFocus) {
          item.focus();
          this.tempSetFocus = false;
        }
      } else {
        item.classList.remove("m-listView__listItem--selected");
      }
    });
  }

  // 表示項目更新
  updateRowTexts(forceUpdate = false) {
    for (let i = 0; i < this.ul.childElementCount; i++) {
      this.updateRow(this.ul.children[i], forceUpdate);
    }
  }

  // 一行の更新
  updateRow(li, forceUpdate = false) {
    const row = this.onData(li.virtualIndex);
    for (let i = 0; i < this.columns.length; i++) {
      li.children[i].innerText = row[this.columns[i].data];
      li.children[i].className = "m-listView__listItemCell";
    }
    row.classList.forEach((cls) => {
      li.children[0].classList.add(cls);
    });
  }

  // ソート矢印の表示と変数の更新
  setSortArrow(orderByIndex, sortDirection) {
    // クラスリセット
    if (this.orderByIndex != orderByIndex) {
      this.header.childNodes[this.orderByIndex].classList.remove("m-listView__sort");
      this.header.childNodes[this.orderByIndex].classList.remove("m-listView__sort--asc");
      this.header.childNodes[this.orderByIndex].classList.remove("m-listView__sort--desc");
    }

    // クラス追加
    this.orderByIndex = orderByIndex;
    this.sortDirection = sortDirection;
    this.header.childNodes[this.orderByIndex].classList.add("m-listView__sort");
    if (this.sortDirection == "asc") {
      this.header.childNodes[this.orderByIndex].classList.add("m-listView__sort--asc");
      this.header.childNodes[this.orderByIndex].classList.remove("m-listView__sort--desc");
    } else {
      this.header.childNodes[this.orderByIndex].classList.add("m-listView__sort--desc");
      this.header.childNodes[this.orderByIndex].classList.remove("m-listView__sort--asc");
    }

    this.orderByIndex = orderByIndex;
    this.sortDirection = sortDirection;
  }

  // listviewの設定保存
  async saveSettings() {
    const settings = {
      columns: this.columns,
      orderByIndex: this.orderByIndex,
      sortDirection: this.sortDirection,
    };
    try {
      window.retrofireAPI.setStoreTemp({
        key: "listview-" + this.slug,
        val: settings,
      });
      debuglog("ListView設定 main.js に送信");
    } catch (e) {
      debuglog(e);
    }
  }
}
