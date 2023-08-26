
let listViewMain; // メインリストビュー
let record; // 全ゲーム情報


const information = document.getElementById('info');
information.innerText = `This app is using Chrome (v${window.myApi.chrome()}), Node.js (v${window.myApi.node()}), and Electron (v${window.myApi.electron()})`

document.getElementById('info2').innerText = window.myApi.hamachi;

// Window Onload ハンドラ
window.addEventListener('DOMContentLoaded', onLoad);
function onLoad() {

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

  document.querySelector('#btn-add').addEventListener('click', async()=>{
    
    listViewMain = new ListView('.list-view', 
      [{label:'ゲーム名', data: "desc", orderby: "desc", width: 380},
       {label:'ZIP名', data: "zipname", orderby: "zipname", width: 100},
       {label:'メーカー', data: "maker", orderby: "maker", width: 150},
       {label:'年度', data: "year", orderby: "year", width: 60},
       {label:'マスタ', data: "cloneof", orderby: "cloneof", width: 100},
       {label:'ドライバ', data: "source", orderby: "source", width: 180}],
       'main'
      );

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
    var tick = Date.now();
    let data = [];
    for (i=0; i<30; i++) {
      data.push('アイテム'+i);
    }
    listViewMain.updateList(data);
    console.log(Date.now() - tick);  
  });
  document.querySelector('#btn-item3').addEventListener('click', ()=>{
    var tick = Date.now();
    listViewMain.updateList(record);
    console.log(Date.now() - tick);
  });

  document.querySelector('#btn-getrecord').addEventListener('click', async()=>{
    var tick = Date.now();
    record = JSON.parse(await window.retrofireAPI.getRecord());;
    console.log(Date.now() - tick);
    console.log(record.length);
  });
};

/**
 * リストビュー用クラス
 *  target: string, // 対象のセレクタ
 *  columns: [{label: string, data: string, orderby: string, width: integer}] // カラム
 *  slug: string, // スラグ
 */
class ListView {

  // コンストラクタ
  constructor(target, columns, slug) {
    this.numItems = 0; // 保持項目数
    this.lastHeight = 0; // リサイズ前のサイズ保持
    this.rowHeight = 0; // 列の高さ

    this.header; //
    this.main;   //
    this.ul;
    this.columns = columns;
    this.slug = slug;

    // DOM構成
    this.list = document.querySelector(target);
    this.list.classList.add('m-fujList');
    this.list.focusVisible = true;
    
  
    // カラムヘッダ追加
    const columnHeader = document.createElement('header');
    columnHeader.className = 'm-fujList__header';
    let n = 0;
    const root = document.querySelector(':root');
  
    this.columns.forEach(item=>{
      // 変数埋め込み
      root.style.setProperty("--listiview-" + slug + "-col-"+n+"-width", item.width+"px");
      // 要素追加
      const headerItem = document.createElement('div');
      headerItem.className = 'm-fujList__headerItem';
      headerItem.innerText = item.label;
      headerItem.setAttribute('colindex', n);
      headerItem.setAttribute('data', item.data);
      headerItem.setAttribute('orderby', item.orderby);
      headerItem.style.width = "var(--listiview-" + slug + "-col-"+n+"-width)";
      columnHeader.appendChild(headerItem);
      n++;
    });
    this.list.appendChild(columnHeader);

    // カラムボディ追加
    this.main = document.createElement('main');
    this.main.className = 'm-fujList__main';
    this.ul = document.createElement('ul');
    this.ul.className = 'm-fujList__list';
    this.main.appendChild(this.ul);
    this.list.appendChild(this.main);

    // 行の高さ取得
    const li = document.createElement('a');
    li.className = 'm-fujList__listItem';
    li.append(document.createTextNode('要素'));
    this.ul.appendChild(li);
    this.rowHeight = li.offsetHeight;
    li.remove();
    this.lastHeight = this.main.offsetHeight;

    // イベント追加
    // リサイズ
    window.addEventListener('resize', (e)=>{
      if (this.lastHeight != this.main.offsetHeight) {
        this.lastHeight = this.main.offsetHeight;
        this.updateItemDoms();
        this.handleScroll();
      }
    });

    // スクロール
    var isHandlingScroll = false;
    this.main.addEventListener('scroll', async e=>{
      if (!isHandlingScroll) {
        isHandlingScroll = true;
        this.handleScroll();
        isHandlingScroll = false;
      }
    });

    this.updateItemDoms();
    this.updateList();
  }
  
  // 仮想要素の更新
  updateItemDoms() {
    const numDOMs = this.ul.childElementCount; // 現在存在する要素数
    const neededRows = Math.ceil(this.lastHeight / this.rowHeight); // 必要な要素数

    if (numDOMs < neededRows) {
      for (let i=numDOMs; i<neededRows; i++) {
        const li = document.createElement('a');
        li.setAttribute('href', "#");
        li.className = 'm-fujList__listItem';
        li.addEventListener('keydown', e=>{
          console.log(e.code);
          switch(e.code) {
            case "Space":
              break;
          }
        })
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
          li.appendChild(div);
        }
        this.ul.appendChild(li);
      }
    } else 
    if (numDOMs > neededRows) {
      for (let i=numDOMs-1; i>=neededRows; i--) {
        this.ul.removeChild(this.ul.children[i]);
      }
    }
  }

  // 項目数変更
  changeItemCount(newItemCount) {
    // ステージの高さ設定
    const newHeight = (newItemCount) * this.rowHeight;
    if (this.main.scrollTop + this.main.offsetHeight > newHeight) {
      // ステージが短くなるときはすぐスクロールさせる
      this.main.scrollTop = newHeight;
    }
    this.ul.style.height = newHeight+"px";
  }

  // スクロール時の処理
  handleScroll() {
/*    const scrollY = this.main.scrollTop;
    const position = Math.floor(scrollY / this.rowHeight) * this.rowHeight;
    if (this.prevPosition != position) {
      // 要素ずらす
      this.ul.style.paddingTop = position + 'px';
      this.prevPosition = position;
      // 表示内容更新
      this.updateDisplay();
    }
    */

    const start = Math.floor(this.main.scrollTop / this.rowHeight);
    const end = start + this.ul.childElementCount;
    for (let i=start; i<end; i++) {
      const domIndex = i % this.ul.childElementCount;
      const oldTop = this.ul.children[domIndex].style.top;
      const newTop =  i * this.rowHeight + 'px';

      if (oldTop != newTop) {
        // DOM移動
        this.ul.children[domIndex].style.top = newTop;
        this.ul.children[domIndex].setAttribute('data-index',i);

        // 表示内容更新
        if (this.data.length > i) {
          const li = this.ul.children[domIndex];
          for (let j=0; j<li.childElementCount; j++) {
            li.children[j].innerText = this.data[i][this.columns[j].data];
          }
        }
      }
    }

    //this.updateDisplay();
  }

  // 表示項目更新
  updateDisplay(forceUpdate = false) {
    // 表示中項目のインデックスを求める
    let start = Math.floor(this.main.scrollTop / this.rowHeight);
    let end = start + this.ul.childElementCount;
    if (end > this.data.length) end = this.data.length;

    // データ書き換え
    let n = 0;
    for (let i=start; i<end; i++) {
      if (forceUpdate || this.ul.children[n].dataIndex != i) {
        const li = this.ul.children[n];

        //if (li.getAttribute('data-index') != i) {
        //  li.setAttribute('data-index', i);
          for (let j=0; j<li.childElementCount; j++) {
            li.children[j].innerText = this.data[li.getAttribute('data-index')][this.columns[j].data];
          }
        //}
      }
      n++;
    }
  }

  // 項目にデータを当てはめる
  updateList(newData = []) {
    this.data = newData;
    this.changeItemCount(this.data.length);
    this.handleScroll();
    this.updateDisplay(true);
  }
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
window.retrofireAPI.onUpdateClock((_event, value) => {
  console.log(value);
  document.querySelector('#info2').innerText = value;
});

window.retrofireAPI.onDebugMessage((_event, text) => {
  console.log("onDebugMessage", text);
  const debug = document.querySelector('#debug');
  debug.value = debug.value + text + "\n";
  debug.scrollTop = debug.scrollHeight;
});