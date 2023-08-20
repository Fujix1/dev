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
    await initListView({
      target: '.list-view',
      numItems: 10000,
      columns: ['ゲーム名','ZIP名','メーカー','年度','マスタ','ドライバ'],

    });
/*    
    const fragment = document.createDocumentFragment('tbody');
    for (let i=0; i<40000; i++) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.append(document.createTextNode('要素'+i));
      const td2 = document.createElement('td');
      td2.append(document.createTextNode('テキスト'));
      const td3 = document.createElement('td');
      td3.append(document.createTextNode('テキスト'));
      const td4 = document.createElement('td');
      td4.append(document.createTextNode('テキスト'));
      const td5 = document.createElement('td');
      td5.append(document.createTextNode('テキスト'));
      const td6 = document.createElement('td');
      td6.append(document.createTextNode('テキスト'));
      const td7 = document.createElement('td');
      td7.append(document.createTextNode('テキスト'));

      tr.appendChild(td);
      tr.appendChild(td2);
      tr.appendChild(td3);
      tr.appendChild(td4);
      tr.appendChild(td5);
      tr.appendChild(td6);
      tr.appendChild(td7);
      fragment.appendChild(tr);
    }
    document.querySelector('#mainList').append(fragment);
    */
  });
};

/**
 * リストビューの初期化
 * @param options {{
 *  target: string, // 対象のセレクタ
 *  numItems: integer, // 行数
 *  columns: [string], // カラムラベル
 *  
 *  }}
 */
async function initListView(options) {

  // props
  let lastHeight; // リサイズ前のサイズ保持
  let rowHeight;  // 列の高さ 

  const list = document.querySelector(options.target);
  list.numItems = options.numItems;
  list.columns = options.columns;
  list.classList.add('m-fujList');

  // カラムヘッダ追加
  const columnHeader = document.createElement('header');
  columnHeader.className = 'm-fujList__header';
  options.columns.forEach(e=>{
    const headerItem = document.createElement('div');
    headerItem.className = 'm-fujList__headerItem';
    headerItem.innerText = e;
    columnHeader.appendChild(headerItem);
  });
  list.appendChild(columnHeader);

  // カラムボディ追加
  const columnBody = document.createElement('main');
  columnBody.className = 'm-fujList__body';
  
  const ul = document.createElement('ul');
  ul.className = 'm-fujList__list';
  columnBody.appendChild(ul);
  list.appendChild(columnBody);

  // 列の高さ取得
  const li = document.createElement('li');
  li.className = 'm-fujList__listItem';
  li.append(document.createTextNode('要素'));
  ul.appendChild(li);
  rowHeight = li.offsetHeight;
  li.remove();

  /*
  for (let i=0; i<10000; i++) {
    const li = document.createElement('li');
    li.className = 'm-fujList__listItem';
    li.append(document.createTextNode('要素'+i));
    ul.appendChild(li);
  }*/

  lastHeight = columnBody.offsetHeight;
  update();

  window.addEventListener('resize', (e)=>{
    if (lastHeight!=columnBody.offsetHeight) {
      lastHeight = columnBody.offsetHeight;
      //console.log('resized: '+lastHeight);
      update();
    }
  });

  function update() {
    const numDOMs = ul.childElementCount; // 現在存在する要素数

    // 必要な要素数
    const neededRows = Math.ceil(lastHeight / rowHeight);

    //console.log(numDOMs,neededRows,);

    if (numDOMs < neededRows) {
      for (let i=numDOMs; i<neededRows; i++) {
        const li = document.createElement('li');
        li.className = 'm-fujList__listItem';
        li.append(document.createTextNode('要素'+i));
        ul.appendChild(li);
      }
    } else 
    if (numDOMs > neededRows) {
      for (let i=numDOMs-1; i>=neededRows; i--) {
        ul.removeChild(ul.children[i]);
      }
    }

  }



}

async function sendByApi(zip) {
  //result = await window.myApi.api1(zip);
  result = await window.retrofireAPI.executeMAME({
    zipName: zip,
  });
}
async function sendByApiSoft(zip) {
  //result = await window.myApi.api1(zip);
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