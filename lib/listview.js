/**
 * listView モジュール
 */
'use strict';

  /**
   * リストビュー用クラス
   * args:
   *  data: {}, // 元データ
   *  target:   string,   // 対象のセレクタ
   *  columns: [{label: string, data: string, width: integer, order: integer, defaultSort: "asc"|"desc"}] // カラム
   *  slug:     string,   // スラグ
   *  orderByIndex:  integer,  // ソート対象の index
   *  sortDirection: "asc"|"desc", // ソート順
   *  index: integer, // 選択中のインデックス (-1 選択なし)
   *  zipName: string. // 選択中 zip 名（未選択は空）
   */
  class ListView {

    constructor(args) {
      // 引数保持
      this.data = args.data;
      this.columns = args.columns;
      this.slug = args.slug;
      this.orderByIndex = args.orderByIndex;
      this.sortDirection = args.sortDirection;
      this.zipName = args.zipName;

      // 状態保持
      this.sortedData = []; // ソート済みの参照テーブル
      for(let i = 0;i < this.data.length;i++) {
        this.sortedData.push(i);
      }
      this.filteredData = []; // フィルタ済みの参照テーブル
      this.numItems = 0; // 保持項目数
      this.lastHeight = 0; // リサイズ前のサイズ保持
      this.rowHeight = 0; // 列の高さ
      this.dataIndex = -1; // 選択中のデータインデックス
      
      // DOM構成
      this.header; //
      this.main;   //
      this.ul;
      this.list = document.querySelector(args.target);
      this.list.classList.add('m-fujList');
      this.list.classList.add('m-fujList__slug--'+this.slug);
    }

    // 初期化
    async init() {

      //------------------------------------------------------------------------------
      // 設定復旧
      const settings = await window.retrofireAPI.getStore("listview-"+this.slug);

      if (settings) {
        // 整合性チェック
        let updated = false;
        if (settings.columns.length != this.columns.length) { // カラム数が違う
          updated = true;
        } else {
          for (let i=0; i<settings.columns.length; i++) { 
            if (Object.keys(settings.columns[i]).length !== Object.keys(this.columns[i]).length) { // キー数違う
              updated = true;
              break;
            }
            if (settings.columns[i].label !== this.columns[i].label || settings.columns[i].data !== this.columns[i].data) { // ラベルと参照データ違う
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
          console.log("メインリストビュー: カラム設定デフォルト設定復旧");
          this.saveSettings();
        }
      }


      //------------------------------------------------------------------------------
      // ヘッダ追加
      const columnHeader = document.createElement('header');
      this.header = columnHeader;
      columnHeader.className = 'm-fujList__header';
      let n = 0;
      const root = document.querySelector(':root');
      let columnWasDragged = false;
    
      // ヘッダカラム追加
      let totalWidth = 0;
      this.columns.forEach(item=>{
        // 変数埋め込み
        root.style.setProperty("--listiview-" + this.slug + "-col-"+n+"-width", item.width+"px");
        if ('order' in item) {
          root.style.setProperty("--listiview-" + this.slug + "-col-"+n+"-order", item.order);
        }
        totalWidth += item.width;

        // 要素追加
        const headerItem = document.createElement('div');
        headerItem.className = 'm-fujList__headerItem';
        headerItem.setAttribute('col-index', n);
        headerItem.setAttribute('data', item.data);
        headerItem.style.width = "var(--listiview-" + this.slug + "-col-"+n+"-width)";
        headerItem.style.order = "var(--listiview-" + this.slug + "-col-"+n+"-order)";

        const headerText = document.createElement('span');
        headerText.className = 'm-fujList__headerText';
        headerText.innerText = item.label;
        headerItem.appendChild(headerText);
        
        const headerSplitter = document.createElement('div');
        headerSplitter.className = 'm-fujList__headerSplitter';
        headerSplitter.setAttribute('col-index', n);


        /// -------------------------------------------------------------------------
        /// ヘッダカラムクリック
        headerItem.addEventListener('click', e=>{
          // ドラッグされたときはキャンセル
          if (columnWasDragged) {
            e.preventDefault();
            return;
          }
          const clickedIndex = e.currentTarget.getAttribute('col-index');
          let newOrderByIndex, newDirection;
          newOrderByIndex = clickedIndex;

          if (this.orderByIndex == clickedIndex) {
            newDirection = (this.sortDirection=='asc')?'desc':'asc';
          } else {
            newDirection = this.columns[clickedIndex].defaultSort;
          }
          this.setSortArrow(newOrderByIndex, newDirection);
          this.updateListView();
          this.saveSettings();
          
        });

        /// -------------------------------------------------------------------------
        /// ヘッダカラムリサイズ ドラッグ＆ドロップ
        let resizeStart = {};
        let resizingColumnIndex;
        let startWidth;

        // ドラッグ中処理
        const mouseMoveHandler = e => {
          document.body.style.cursor = 'col-resize';
          const delta = {x: e.pageX - resizeStart.x, y: e.pageY - resizeStart.y};
          
          // 親要素のスクロールXを考慮
          delta.x += this.list.scrollLeft;

          // 埋め込み変数更新
          const newWidth = startWidth + delta.x;
          if (newWidth>=20) {
            this.columns[resizingColumnIndex].width = startWidth + delta.x; 
            root.style.setProperty("--listiview-" + this.slug + "-col-"+ resizingColumnIndex +"-width", startWidth + delta.x +"px");
          }

          // ラッパーの幅更新
          let totalWidth = 0;
          this.columns.forEach(item => {
            totalWidth += item.width;
          });
          this.header.style.width = totalWidth + 'px';
        }

        // ドラッグ完了
        const mouseUpHandler = e => {
          document.body.style.cursor = '';
          this.list.classList.remove('is-header-resizing');
          Array.from(this.header.children).forEach( item=>item.classList.remove('is-resizing'));
          document.removeEventListener('mousemove', mouseMoveHandler);
          window.removeEventListener('mouseup', mouseUpHandler);
          
          if (e.pageX + this.list.scrollLeft !== resizeStart.x) { // 移動した
            console.log('resized');
            // 設定保存
            this.saveSettings();
          }
        }

        // ドラッグ開始
        headerSplitter.addEventListener('mousedown', e=>{ 
          this.list.classList.add('is-header-resizing');
          e.target.parentNode.classList.add('is-resizing');
          
          resizeStart = {x: e.pageX, y: e.pageY}; // 開始位置
          // 親要素のスクロールXを考慮
          resizeStart.x += this.list.scrollLeft;

          columnWasDragged = true; // クリックイベント抑制

          resizingColumnIndex = e.target.getAttribute('col-index'); // ドラッグ中のカラムインデックス
          startWidth = this.columns[resizingColumnIndex].width; // 開始の幅
          document.addEventListener('mousemove', mouseMoveHandler);
          window.addEventListener('mouseup', mouseUpHandler);
        });

        headerSplitter.addEventListener('dragstart', e => false);

        headerItem.appendChild(headerSplitter);
        columnHeader.appendChild(headerItem);

        // ダブルクリック
        headerSplitter.addEventListener('dblclick', e=>{
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
        const dragMouseMoveHandler = e => {
          const delta = {x: e.pageX - dragStart.x, y: e.pageY - dragStart.y};
          // 親要素のスクロールXを考慮
          delta.x += this.list.scrollLeft;

          // 閾値以上動いたら ドラッグされた
          if (Math.abs(delta.x) > DRAGTHRESHOLD) {
            columnWasDragged = true;
          } else {
            columnWasDragged = false;
            draggingItem.style.left = '0px';
            return;
          }
          
          // ドラッグ移動
          draggingItem.style.left = delta.x + 'px';
          
          // 他のヘッダカラム上か確認
          for (let i=0; i<this.header.childElementCount; i++) {
            hoverOnIndex = -1;
            for (let j=0; j<this.header.childElementCount; j++) {
              this.header.children[j].classList.remove('is-hovered-left');
              this.header.children[j].classList.remove('is-hovered-right');
            }
            if (i==draggingColumnIndex) {
              continue;
            }
            const targetRect = this.header.children[i].getBoundingClientRect();
            if (e.pageX >= targetRect.left && e.pageX <= targetRect.right) {
              if (targetRect.right <= dragStart.x) { // 左向き
                this.header.children[i].classList.add('is-hovered-left');
                hoverOnIndex = i;
              } else {
                this.header.children[i].classList.add('is-hovered-right');
                hoverOnIndex = i;
              }
              break;
            }
          }
        }

        // ドラッグ完了
        const dragMouseUpHandler = async e => {
          //console.log('dragged. from',  draggingColumnIndex, 'to',hoverOnIndex,)

          // 一時クラス削除
          this.list.classList.remove('is-header-dragging');
          Array.from(this.header.children).forEach( item=>item.classList.remove('is-dragging'));

          // イベント削除
          document.removeEventListener('mousemove', dragMouseMoveHandler);
          window.removeEventListener('mouseup', dragMouseUpHandler);

          // from の元カラムインデックス
          const fromIndex = this.columns[draggingColumnIndex].order;
          
          // 並び替え処理
          if (hoverOnIndex != -1) {
            this.header.children[hoverOnIndex].classList.remove('is-hovered-left');
            this.header.children[hoverOnIndex].classList.remove('is-hovered-right');
            
            // to の元カラムインデックス
            const toIndex = this.columns[hoverOnIndex].order;

            // 並び替え
            const order = [];
            for (let i=0; i<this.columns.length; i++) {
              order[this.columns[i].order] = i;
            }
            array_move(order, fromIndex, toIndex);
            for (let i=0; i<order.length; i++) {
              this.columns[order[i]].order = i;
              // 変数埋め直し
              root.style.setProperty("--listiview-" + this.slug + "-col-"+order[i]+"-order", i);
            }
            // 設定保存
            await this.saveSettings();

          }

          draggingItem.style.left = '';
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
        }
        
        // ドラッグ開始
        headerText.addEventListener('mousedown', e=>{
          columnWasDragged = false; // ドラッグ済みリセット

          dragStart = {x: e.pageX, y: e.pageY}; // 開始位置
          // 親要素のスクロールXを考慮
          dragStart.x += this.list.scrollLeft;
          
          draggingItem = e.target.parentNode;

          draggingColumnIndex = e.target.parentNode.getAttribute('col-index'); // ドラッグ中のカラムインデックス

          this.list.classList.add('is-header-dragging');
          e.target.parentNode.classList.add('is-dragging');
          document.addEventListener('mousemove', dragMouseMoveHandler);
          window.addEventListener('mouseup', dragMouseUpHandler);
        });

        n++;
      });

      this.list.appendChild(columnHeader);

      // ステージの幅指定
      this.header.style.width = totalWidth + 'px';

      //-----------------------------------------------------------------------------
      // ボディ追加
      this.main = document.createElement('main');
      this.main.className = 'm-fujList__main';
      this.ul = document.createElement('ul');
      this.ul.className = 'm-fujList__list';
      this.main.appendChild(this.ul);
      this.list.appendChild(this.main);

      // 行の高さ取得
      const li = document.createElement('li');
      li.className = 'm-fujList__listItem';
      li.append(document.createTextNode('要素'));
      this.ul.appendChild(li);
      this.rowHeight = li.offsetHeight;
      li.remove();
      this.lastHeight = this.main.offsetHeight;

      // スクロールイベント
      var isHandlingScroll = false;
      this.list.addEventListener('scroll', async e=>{
        if (!isHandlingScroll) {
          isHandlingScroll = true;
          this.updateRowDOMs();
          isHandlingScroll = false;
        }
      });

      // リサイズオブザーバ
      this.resizeObserver = new window.ResizeObserver( entries =>{
        if (entries[0].target == this.list) {
          // ステージの高さ
          const stageHeight = this.list.offsetHeight - this.header.offsetHeight;
          if (this.lastHeight != stageHeight) {
            this.lastHeight = stageHeight;
            this.updateVirtualDoms();
            this.updateRowDOMs();
          }
        }
      });
      this.resizeObserver.observe(this.list);
      
      // 初期表示
      this.setSortArrow(this.orderByIndex, this.sortDirection);
      this.sort();
      this.filter();
      this.changeItemCount();
      this.updateVirtualDoms();
      this.updateRowDOMs();

      // zip 名から dataIndex 再検索
      this.dataIndex = this.data.findIndex(e=>e.zipname===this.zipName);
      this.makeVisible();
    }

  
    // 仮想要素をリストビューサイズに合わせて追加・削除
    updateVirtualDoms() {
      console.log('updateVirtualDoms');
      const numDOMs = this.ul.childElementCount; // 現在存在する要素数
      let neededRows = Math.ceil(this.lastHeight / this.rowHeight) + 1; // 必要な要素数


      // 不足分追加
      if (numDOMs < neededRows) {
        for (let i=numDOMs; i<neededRows; i++) {
          const li = document.createElement('li');
          li.setAttribute('tabindex', "0");
          li.className = 'm-fujList__listItem';
          
          /*li.addEventListener('keydown', e=>{
            console.log(e.code);
            switch(e.code) {
              case "Space":
                break;
            }
          });*/

          for (let j=0; j<this.columns.length; j++) {
            const div = document.createElement('div');
            div.classList.add('m-fujList__listItemCell');
            if (j == 0) {
              div.classList.add('m-fujList__listItemCell--bold');
            }
            div.classList.add('m-fujList__listItemCell--'+j);
            div.setAttribute('cellindex', j);
            div.setAttribute('celldata', this.columns[j].data);
            div.style.width = "var(--listiview-" + this.slug + "-col-"+j+"-width)";
            div.style.order = "var(--listiview-" + this.slug + "-col-"+j+"-order)";
            li.appendChild(div);
          }
          this.ul.appendChild(li);
          li.addEventListener('dblclick', async e=>await this.onDubleClick(e)); 
          li.addEventListener('click', async e=>await this.onClick(e));
          li.addEventListener('focus', async e=>await this.onFocus(e));
          li.addEventListener('blur', e=>{});
        }
      } else if (numDOMs > neededRows) {
        console.log('remove')
        for (let i=numDOMs-1; i>=neededRows; i--) {
          this.ul.removeChild(this.ul.children[i]);
        }
      }
    }

    async onDubleClick(e) { // セルでイベント発生
      const dataIndex = e.currentTarget.getAttribute('data-index');
      const zipName =  this.data[dataIndex].zipname;
      this.zipName = this.data[dataIndex].zipname;
      await window.retrofireAPI.executeMAME({ zipName: zipName });
    }

    async onClick(e) {
      //console.log(e);
    }

    async onFocus(e) { // 行でイベント発生

      // 直前まで選択されていたものの処理
      // e.relatedTarget は取りこぼしがある
      const previousSelected = document.querySelector('.m-fujList__slug--'+this.slug + ' .m-fujList__listItem--selected');

      // 同じものが選択されていたら何もしない
      if (this.dataIndex == e.target.getAttribute('data-index')) {
        return;
      }

      // 選択中クラス外す
      if (previousSelected !== null) {
        previousSelected.classList.remove('m-fujList__listItem--selected');
      }

      // 新しい選択肢
      e.target.classList.add('m-fujList__listItem--selected');
      this.dataIndex = e.target.getAttribute('data-index');
      this.zipName = this.data[this.dataIndex].zipname;
      console.log('data-index = ', this.dataIndex);
    }

    // this.dataIndex を見えるところへスクロール
    makeVisible() {
      console.log('makeVisible: data-index = ', this.dataIndex);
      // 0件のとき
      if (this.filteredData.length == 0) {
        this.dataIndex = -1;
        this.zipName = '';
        return false;
      }

      // 表示項目に見つからないとき
      this.virtualIndex = this.filteredData.indexOf(Number(this.dataIndex)); 
      if (this.virtualIndex === -1) { // 選択項目リセット
        this.dataIndex = this.filteredData[0];
        this.zipName = this.data[this.dataIndex].zipname;
        this.virtualIndex = 0;
        console.log('再選択 this.dataIndex', this.dataIndex);
        this.ul.childNodes[0].classList.add('m-fujList__listItem--selected');
      }

      // スクロール先
      const newPos = this.virtualIndex * this.rowHeight;
      if (this.list.scrollTop <= newPos && this.list.scrollTop >= newPos - this.list.offsetHeight + this.rowHeight*2) {
        console.log('表示範囲内');
        this.refreshSelection(); 
      } else {
        if (this.list.scrollTop < newPos) { // 下向きスクロール
          this.list.scrollTop = newPos - this.list.offsetHeight + this.header.offsetHeight + this.rowHeight;
        } else {
          this.list.scrollTop = newPos;
        }
      }
    }

    // 項目数変更
    changeItemCount() {
      this.filteredData.length;
      console.log('changeItemCount')
      // ステージの高さ設定
      const newHeight = (this.filteredData.length) * this.rowHeight;
      if (this.list.scrollTop + this.list.offsetHeight > newHeight) {
        // ステージが短くなるときはすぐスクロールさせる
        this.list.scrollTop = newHeight;
      }
      this.ul.style.height = newHeight+"px";
      
      // ゼロ件のとき
      if (this.filteredData.length == 0) {
        this.dataIndex = -1;
        this.zipName = "";
      }
    }

    // 行の仮想DOMをスクロール位置に合わせて再配置
    updateRowDOMs() {
      console.log('updateRowDOMs');

      // DOM 項目の再配置
      const start = Math.floor(this.list.scrollTop / this.rowHeight);
      const end = start + this.ul.childElementCount;

      for (let i=start; i<end; i++) {
        const domIndex = i % this.ul.childElementCount;
        const oldTop = this.ul.children[domIndex].style.top;
        const newTop =  i * this.rowHeight + 'px';

        if (oldTop != newTop) {
          
          // DOM移動
          this.ul.children[domIndex].style.top = newTop;
          this.ul.children[domIndex].setAttribute('virtual-index', i);
          
          // 表示内容更新
          if (this.filteredData.length > i) {
            const li = this.ul.children[domIndex];
            this.updateRow(li);
          }
          // 選択中処理
          if (this.ul.children[domIndex].getAttribute('data-index') == this.dataIndex && !this.ul.children[domIndex].hasFocus) {
            this.ul.children[domIndex].classList.add('m-fujList__listItem--selected');
          } else {
            this.ul.children[domIndex].blur();
            this.ul.children[domIndex].classList.remove('m-fujList__listItem--selected');
          }
        }
      }
    }

    // 選択状態のリフレッシュ
    refreshSelection() {
      console.log('refreshSelection')
      this.ul.childNodes.forEach(item=>{
        if (item.getAttribute('data-index') == this.dataIndex) {
          item.classList.add('m-fujList__listItem--selected');
        } else {
          item.classList.remove('m-fujList__listItem--selected');
        }
      });
    }

    // 表示項目更新
    updateRowTexts(forceUpdate = false) {
      console.log('updateRowTexts');
      for (let i=0; i<this.ul.childElementCount; i++) {
        this.updateRow(this.ul.children[i], forceUpdate);
      }
    }

    // 一行の更新
    updateRow(li, forceUpdate = false) {
      const virtualIndex = li.getAttribute('virtual-index');
      const dataIndex = li.getAttribute('data-index');

      if (!dataIndex || forceUpdate || this.filteredData[virtualIndex] != dataIndex) {
        const filteredIndex = this.filteredData[virtualIndex];
        if (filteredIndex !== undefined) {
          li.setAttribute('data-index', filteredIndex);

          for (let i=0; i<li.childElementCount; i++) {
            let text;

            if (this.columns[i].data == 'desc') { // アイコン
              li.children[i].classList.add('m-fujList__cellIcon');
              if (this.data[filteredIndex].cloneof) {
                li.children[i].classList.add('m-fujList__cellIcon--clone');
              } else {
                li.children[i].classList.remove('m-fujList__cellIcon--clone');  
              }
              if (!this.data[filteredIndex].status) {
                li.children[i].classList.add('m-fujList__cellIcon--nowork');
              } else {
                li.children[i].classList.remove('m-fujList__cellIcon--nowork');  
              }

            }
            if (config.language == LANG.JP && this.columns[i].data == 'desc') {
              text = this.data[filteredIndex].descJ;
            } else {
              text = this.data[filteredIndex][this.columns[i].data];
            }
            li.children[i].innerText = text ? text : '';
          }
          
        } else {
          li.setAttribute('data-index', "-1");
          li.classList.remove('m-fujList__listItem--selected');
        }
      }
    }

    // ソート矢印の表示と変数の更新
    setSortArrow(orderByIndex, sortDirection) {

      // クラスリセット
      if (this.orderByIndex != orderByIndex) {
        this.header.childNodes[this.orderByIndex].classList.remove('m-fujList__sort');
        this.header.childNodes[this.orderByIndex].classList.remove('m-fujList__sort--asc');
        this.header.childNodes[this.orderByIndex].classList.remove('m-fujList__sort--desc');
      }
      
      // クラス追加
      this.orderByIndex = orderByIndex;
      this.sortDirection = sortDirection;
      this.header.childNodes[this.orderByIndex].classList.add('m-fujList__sort');
      if (this.sortDirection=="asc") {
        this.header.childNodes[this.orderByIndex].classList.add('m-fujList__sort--asc');
        this.header.childNodes[this.orderByIndex].classList.remove('m-fujList__sort--desc');
      } else {
        this.header.childNodes[this.orderByIndex].classList.add('m-fujList__sort--desc');
        this.header.childNodes[this.orderByIndex].classList.remove('m-fujList__sort--asc');
      }

      this.orderByIndex = orderByIndex;
      this.sortDirection = sortDirection;
    }

    // ソートと検索と表示更新
    updateListView(forceUpdate = false) {
      this.sort();
      this.filter();
      this.changeItemCount();
      this.updateVirtualDoms();
      this.updateRowTexts(forceUpdate);
      this.makeVisible();
    }

    // 検索と表示更新
    updateListViewSearch() {
      this.filter();
      this.changeItemCount();
      this.updateVirtualDoms();
      this.updateRowTexts(); 
      this.makeVisible();
    }
    
    // ソート
    sort() {
      var tick = Date.now();

      this.sortedData.sort((a,b) => {

        // 大元のデータでソート
        let itemA, itemB;

        // 日本語のゲーム名はかなでソート
        if (config.language === LANG.JP && this.columns[this.orderByIndex].data === 'desc') {
          itemA = this.data[a].kana;
          itemB = this.data[b].kana;
        } else {
        
        itemA = this.data[a][this.columns[this.orderByIndex].data];
          itemB = this.data[b][this.columns[this.orderByIndex].data];
        }
        itemA = (itemA)? itemA.toUpperCase(): '';
        itemB = (itemB)? itemB.toUpperCase(): '';
        
        let result = 0;
        if (itemA < itemB) {
          result = -1;
        } else if (itemA > itemB) {
          result = 1;
        }
        if (this.sortDirection=="desc") {
          result *= -1;
        }
        return result;
      });
      console.log('sort:', Date.now() - tick,"ms");
    }

    // 検索
    filter() {

      let word = config.searchWord;
      var tick = Date.now();
      word = word.trim().toLowerCase();
      word = word.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
      });
      /*word = word.replace(/[ァ-ン]/g, function(s) {
        return String.fromCharCode(s.charCodeAt(0) - 0x60);
      });*/
      
      this.filteredData = [];

      if (word === '') { // 検索文字列が空のとき
        for(let i = 0; i < this.sortedData.length; i++) {
          this.filteredData.push(this.sortedData[i]);
        }
      } else {
        const properties = []; // 検索対象のプロパティ

        if (config.searchTarget == '') {
          properties.push('desc');
          properties.push('zipname');
          properties.push('maker');
          properties.push('source');
        } else {
          properties.push(config.searchTarget);
        }

        if (config.language === LANG.JP) {
          for (let i=0; i<properties.length; i++) {
            if (properties[i] === 'desc') {
              properties[i] = 'descJ';
              break;
            }
          }
        }

        for(let i = 0; i < this.sortedData.length; i++) {
          /*const hiragana = this.data[this.sortedData[i]].descJ.toLowerCase().replace(/[ァ-ン]/g, function(s) {
            return String.fromCharCode(s.charCodeAt(0) - 0x60);
          });*/

          for(let j=0; j < properties.length; j++) {
            if (this.data[this.sortedData[i]][properties[j]].toLowerCase().indexOf(word)!=-1) {
              this.filteredData.push(this.sortedData[i]);
              break;
            }
          }
        }
      }

      console.log('search:', Date.now() - tick,"ms");
      console.log(this.filteredData.length+ '件')
    }

    

    // listviewの設定保存
    async saveSettings() {
      const settings = {
        columns: this.columns,
        orderByIndex: this.orderByIndex,
        sortDirection: this.sortDirection,
      }
      try {
        window.retrofireAPI.setStoreTemp({key: "listview-"+this.slug, val: settings});
        console.log('setting sent to main.js');
      } catch (e) {
        console.log(e);
      }
    }
  }