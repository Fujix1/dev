const information = document.getElementById('info');
information.innerText = `This app is using Chrome (v${window.myApi.chrome()}), Node.js (v${window.myApi.node()}), and Electron (v${window.myApi.electron()})`

document.getElementById('info2').innerText = window.myApi.hamachi;


let listViewMain;

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
    
    listViewMain = new ListView('.list-view', ['ゲーム名','ZIP名','メーカー','年度','マスタ','ドライバ']);
/*    
    await initListView({
      target: '.list-view',
      numItems: 10000,
      columns: ['ゲーム名','ZIP名','メーカー','年度','マスタ','ドライバ'],
    });
*/
  });

  document.querySelector('#btn-item1').addEventListener('click', ()=>{
    listViewMain.changeItemCount(10000);
  });
  document.querySelector('#btn-item2').addEventListener('click', ()=>{
    listViewMain.changeItemCount(30);
  });
  document.querySelector('#btn-item3').addEventListener('click', ()=>{
    listViewMain.changeItemCount(2);
  });


};

/**
 * リストビュー用クラス
 *  target: string, // 対象のセレクタ
 *  columns: [string], // カラムラベル
 */
class ListView {

  // コンストラクタ
  constructor(target, columns) {
    this.numItems = 0; // 保持項目数
    this.lastHeight = 0; // リサイズ前のサイズ保持
    this.rowHeight = 0; // 列の高さ

    this.header; //
    this.main;   //
    this.ul;

    // DOM構成
    this.list = document.querySelector(target);
    this.list.classList.add('m-fujList');
    this.list.focusVisible = true;
    
    // カラムヘッダ追加
    const columnHeader = document.createElement('header');
    columnHeader.className = 'm-fujList__header';
    columns.forEach(e=>{
      const headerItem = document.createElement('div');
      headerItem.className = 'm-fujList__headerItem';
      headerItem.innerText = e;
      columnHeader.appendChild(headerItem);
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
    const li = document.createElement('li');
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
        this.updateListView();
      }
    });

    // スクロール
    var isHandlingScroll = false;
    this.main.addEventListener('scroll', async e=>{
      if (!isHandlingScroll) {
        isHandlingScroll = true;
        await this.handleScroll();
        isHandlingScroll = false;
      }
    });
    this.updateListView();
  }
  

  updateListView() {
    const numDOMs = this.ul.childElementCount; // 現在存在する要素数
    // 必要な要素数
    const neededRows = Math.ceil(this.lastHeight / this.rowHeight);
    if (numDOMs < neededRows) {
      for (let i=numDOMs; i<neededRows; i++) {
        const li = document.createElement('li');
        li.className = 'm-fujList__listItem';
        li.append(document.createTextNode('要素'+i));
        this.ul.appendChild(li);
      }
    } else 
    if (numDOMs > neededRows) {
      for (let i=numDOMs-1; i>=neededRows; i--) {
        this.ul.removeChild(this.ul.children[i]);
      }
    }
  }

  // 項目数変更時の処理
  changeItemCount(newItemCount) {

    // ステージの高さ設定
    const newHeight = newItemCount * this.rowHeight;
    if (this.main.scrollTop + this.main.offsetHeight > newHeight) {
      // ステージが短くなるときはすぐスクロールさせる
      this.main.scrollTop = newHeight;
    }
    
    this.ul.style.height = newHeight+"px";
  }

  // スクロール時の処理
  async handleScroll() {
    const scrollY = this.main.scrollTop;
    const position = Math.floor(scrollY / this.rowHeight) * this.rowHeight;
    if (this.prevPosition != position) {
      this.ul.style.paddingTop = position + 'px';
      this.prevPosition = position;
    }
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