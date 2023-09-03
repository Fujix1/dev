
let listViewMain; // メインリストビュー
let record; // 全ゲーム情報


//const information = document.getElementById('info');
//information.innerText = `This app is using Chrome (v${window.myApi.chrome()}), Node.js (v${window.myApi.node()}), and Electron (v${window.myApi.electron()})`

//document.getElementById('info2').innerText = window.myApi.hamachi;

// Window Onload ハンドラ
window.addEventListener('DOMContentLoaded', onLoad);
async function onLoad() {

  // empty the debug output
  document.querySelector('#debug').value = '';

  document.querySelector('#test1').addEventListener('click', () => {
    sendByApi(document.querySelector('#test1').value);
  });
  document.querySelector('#test2').addEventListener('click', () => {
    sendByApi(document.querySelector('#test2').value);
  });
  document.querySelector('#test3').addEventListener('click', () => {
    sendByApiSoft(document.querySelector('#test3').value);
  });

  document.querySelector('#btn-reset').addEventListener('click', async()=>{
    // メインプロセスを呼び出し
    result = await window.retrofireAPI.resetWindow('reset');
    console.log(result);
  });

  document.querySelector('#btn-dialog').addEventListener('click', async()=>{
    // メインプロセスを呼び出し
    result = await window.retrofireAPI.dialog('');
    if (result.result == true) {
      document.querySelector('#openImage').src = 'data:image/png;base64,'+result.img;
    }
    console.log(result);
  });

  document.querySelector('#btn-item1').addEventListener('click', ()=>{
    var tick = Date.now();
    let data = [];
    for (i=0; i<40000; i++) {
      data.push('項目'+i);
    }
    listViewMain.updateList(data);
    console.log(Date.now() - tick);
  });
  document.querySelector('#btn-item2').addEventListener('click', ()=>{
    let data = [];
    for (i=0; i<30; i++) {
      data.push('アイテム'+i);
    }

  });
  document.querySelector('#btn-item3').addEventListener('click', ()=>{
    var tick = Date.now();
    listViewMain.sort();
    console.log(Date.now() - tick);
  });

  document.querySelector('#btn-getrecord').addEventListener('click', async()=>{
    var tick = Date.now();
    record = JSON.parse(await window.retrofireAPI.getRecord());;
    console.log(Date.now() - tick);
    console.log(record.length);
    var tick = Date.now();
    listViewMain.updateList(record);
    console.log(Date.now() - tick);
  });


  // リストビュー初期化
  listViewMain = new ListView({
    target: '.list-view',
    columns: [
      {label:'ゲーム名', data: "desc", order: 0, width: 380, defaultSort: "asc"},
      {label:'ZIP名', data: "zipname", order: 1, width: 100, defaultSort: "asc"},
      {label:'メーカー', data: "maker", order:2, width: 150, defaultSort: "asc"},
      {label:'年度', data: "year", order: 3, width: 60, defaultSort: "asc"},
      {label:'マスタ', data: "cloneof", order: 4, width: 100, defaultSort: "asc"},
      {label:'ドライバ', data: "source", order: 5, width: 180, defaultSort: "asc"}
    ],
    slug: 'main',
    orderByIndex: 1,
    direction: "asc"
    });
  await listViewMain.init();
}



/**
 * リストビュー用クラス
 * args:
 *  target:   string,   // 対象のセレクタ
 *  columns: [{label: string, data: string, width: integer, order: integer, defaultSort: "asc"|"desc"}] // カラム
 *  slug:     string,   // スラグ
 *  orderByIndex:  integer,  // ソート対象の index
 *  direction: "asc"|"desc", //
 */
class ListView {

  // コンストラクタ
  constructor(args) {
    this.columns = args.columns;
    this.slug = args.slug;
    this.orderByIndex = args.orderByIndex;
    this.direction = args.direction;

    this.numItems = 0; // 保持項目数
    this.lastHeight = 0; // リサイズ前のサイズ保持
    this.rowHeight = 0; // 列の高さ
    this.itemIndex = -1; // 選択中の項目インデックス

    this.header; //
    this.main;   //
    this.ul;
    //------------------------------------------------------------------------------
    // DOM構成
    this.list = document.querySelector(args.target);
    this.list.classList.add('m-fujList');
    this.list.classList.add('m-fujList__slug--'+this.slug);

  }

  // 初期化 同期
  async init() {

    //------------------------------------------------------------------------------
    // 設定復旧

    // メインカラム
    const store = await window.retrofireAPI.getStore("listview-"+this.slug+"-columns");
    if (store.result) {
      // 整合性チェック
      let updated = false;
      if (store.data.length != this.columns.length) { // カラム数が違う
        updated = true;
      } else {
        for (let i=0; i<store.data.length; i++) { 
          if (Object.keys(store.data[i]).length !== Object.keys(this.columns[i]).length) { // キー数違う
            updated = true;
            break;
          }
          if (store.data[i].label !== this.columns[i].label || store.data[i].data !== this.columns[i].data) { // ラベルと参照データ違う
            updated = true;
            break;
          }
        }
      }
      if (!updated) this.columns = store.data; else {
        console.log("メインリストビュー: 設定デフォルト設定復旧");
        window.retrofireAPI.setStore({key: "listview-"+this.slug+"-columns", val: this.columns});
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
          newDirection = (this.direction=='asc')?'desc':'asc';
        } else {
          newDirection = this.columns[clickedIndex].defaultSort;
        }
        this.setSortArrow(newOrderByIndex, newDirection);
        
        this.sort();
        this.updateDisplay(true);
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

        console.log('resized');
        document.removeEventListener('mousemove', mouseMoveHandler);
        window.removeEventListener('mouseup', mouseUpHandler);

        // 設定保存
        window.retrofireAPI.setStore({key: "listview-"+this.slug+"-columns", val: this.columns});
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
      const dragMouseUpHandler = e => {
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
          window.retrofireAPI.setStore({key: "listview-"+this.slug+"-columns", val: this.columns});

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

    // リサイズイベント
    window.addEventListener('resize', (e)=>{
      if (this.lastHeight != this.list.offsetHeight) {
        this.lastHeight = this.list.offsetHeight;
        this.updateItemDoms();
        this.handleScroll();
      }
    });

    // スクロールイベント
    var isHandlingScroll = false;
    this.list.addEventListener('scroll', async e=>{
      if (!isHandlingScroll) {
        isHandlingScroll = true;
        this.handleScroll();
        isHandlingScroll = false;
      }
    });

    // 初期表示
    this.updateItemDoms();
    this.setSortArrow(this.orderByIndex, this.direction);
    this.updateList();
    
  }

  // 仮想要素の更新
  updateItemDoms() {
    const numDOMs = this.ul.childElementCount; // 現在存在する要素数
    const neededRows = Math.ceil(this.lastHeight / this.rowHeight) +1 ; // 必要な要素数

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
          //console.log(j)
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
      for (let i=numDOMs-1; i>=neededRows; i--) {
        this.ul.removeChild(this.ul.children[i]);
      }
    }
  }

  async onDubleClick(e) { // セルでイベント発生
    const index = e.currentTarget.getAttribute('data-index');
    const zipName =  this.data[index].zipname;
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
    if (this.itemIndex == e.target.getAttribute('data-index')) {
      return;
    }

    // 選択中クラス外す
    if (previousSelected !== null) {
      previousSelected.classList.remove('m-fujList__listItem--selected');
    }
    // 新しい選択肢
    e.target.classList.add('m-fujList__listItem--selected');
    this.itemIndex = e.target.getAttribute('data-index');
    console.log('itemIndex = ', this.itemIndex);
  }

  // 項目数変更
  changeItemCount(newItemCount) {

    // ステージの高さ設定
    const newHeight = (newItemCount) * this.rowHeight;
    if (this.list.scrollTop + this.list.offsetHeight > newHeight) {
      // ステージが短くなるときはすぐスクロールさせる
      this.list.scrollTop = newHeight;
    }
    this.ul.style.height = newHeight+"px";
    
    // 空のときは未選択にする
    if (newItemCount == 0) {
      this.itemIndex = -1;
    }
  }

  // スクロール時の処理
  handleScroll() {

    const start = Math.floor(this.list.scrollTop / this.rowHeight);
    const end = start + this.ul.childElementCount;

    for (let i=start; i<end; i++) {
      const domIndex = i % this.ul.childElementCount;
      const oldTop = this.ul.children[domIndex].style.top;
      const newTop =  i * this.rowHeight + 'px';

      if (oldTop != newTop) {
        
        // DOM移動
        this.ul.children[domIndex].style.top = newTop;
        this.ul.children[domIndex].setAttribute('data-index',i);
        
        // 選択中クラス外す
        this.ul.children[domIndex].classList.remove('m-fujList__listItem--selected');
        this.ul.children[domIndex].setAttribute('selected', false);

        // フォーカス外す
        this.ul.children[domIndex].blur();

        // 表示内容更新
        if (this.data.length > i) {
          const li = this.ul.children[domIndex];
          for (let j=0; j<li.childElementCount; j++) {
            const text = this.data[li.getAttribute('data-index')][this.columns[j].data];
            li.children[j].innerText = text ? text : '';
          }
        }
      
        // フォーカスの復旧
        if (this.ul.children[domIndex].getAttribute('data-index') == this.itemIndex && !this.ul.children[domIndex].hasFocus) {
          this.ul.children[domIndex].focus();
          this.ul.children[domIndex].classList.add('m-fujList__listItem--selected');
        }
      }

    }
  }

  // 表示項目更新
  updateDisplay(forceUpdate = false) {

    // 表示中項目のインデックスを求める
    let start = Math.floor(this.list.scrollTop / this.rowHeight);
    let end = start + this.ul.childElementCount;
    if (end > this.data.length) end = this.data.length;

    // データ書き換え
    let n = 0;
    for (let i=start; i<end; i++) {
      if (forceUpdate || this.ul.children[n].dataIndex != i) {
        const li = this.ul.children[n];

        if (forceUpdate || li.getAttribute('data-index') != i) {
          li.setAttribute('data-index', i);
          for (let j=0; j<li.childElementCount; j++) {
            const text = this.data[li.getAttribute('data-index')][this.columns[j].data];
            li.children[j].innerText = text ? text : '';
          }
        }
      }
      n++;
    }
  }

  // データを入れ替え
  updateList(newData = []) {
    this.data = newData;
    this.changeItemCount(this.data.length);
    this.handleScroll();
    this.updateDisplay(true);
  }

  // ソート矢印の表示と変数の更新
  setSortArrow(orderByIndex, direction) {

    // クラスリセット
    if (this.orderByIndex != orderByIndex) {
      this.header.childNodes[this.orderByIndex].classList.remove('m-fujList__sort');
      this.header.childNodes[this.orderByIndex].classList.remove('m-fujList__sort--asc');
      this.header.childNodes[this.orderByIndex].classList.remove('m-fujList__sort--desc');
    }
    
    // クラス追加
    this.orderByIndex = orderByIndex;
    this.direction = direction;
    this.header.childNodes[this.orderByIndex].classList.add('m-fujList__sort');
    if (this.direction=="asc") {
      this.header.childNodes[this.orderByIndex].classList.add('m-fujList__sort--asc');
      this.header.childNodes[this.orderByIndex].classList.remove('m-fujList__sort--desc');
    } else {
      this.header.childNodes[this.orderByIndex].classList.add('m-fujList__sort--desc');
      this.header.childNodes[this.orderByIndex].classList.remove('m-fujList__sort--asc');
    }

    this.orderByIndex = orderByIndex;
    this.direction = direction;

  }

  // 配列ソート
  sort() {
    var tick = Date.now();
    this.data.sort((a,b)=>{
      let itemA = a[this.columns[this.orderByIndex].data];
      let itemB = b[this.columns[this.orderByIndex].data];
      itemA = (itemA)? itemA.toUpperCase(): '';
      itemB = (itemB)? itemB.toUpperCase(): '';
      
      let result = 0;
      if (itemA < itemB) {
        result = -1;
      } else if (itemA > itemB) {
        result = 1;
      }
      if (this.direction=="desc") {
        result *= -1;
      }
      return result;
    });
    console.log('sort:', Date.now() - tick,"ms");
  }
}

function onRun(e) {
  console.log(e);
}

async function sendByApi(zip) {
  result = await window.retrofireAPI.executeMAME({
    zipName: zip,
  });
}
async function sendByApiSoft(zip) {
  result = await window.retrofireAPI.executeMAME({
    zipName: zip,
    softName: 'ys2'
  });
}



//------------------------------------
// メインスレッドから受信
//------------------------------------
window.retrofireAPI.onDebugMessage((_event, text) => {
  console.log("onDebugMessage", text);
  const debug = document.querySelector('#debug');
  debug.value = debug.value + text + "\n";
  debug.scrollTop = debug.scrollHeight;
});
