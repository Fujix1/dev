const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld( 'myApi', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  hamachi: 'ぼくはまちちゃん',
  api1: async (...args) => await ipcRenderer.invoke('channel_ichiri', ...args),
  executeMAME: async (...args) => await ipcRenderer.invoke('executeMAME', ...args),
});


contextBridge.exposeInMainWorld( 'retrofireAPI', {
  executeMAME: async (args) => await ipcRenderer.invoke('executeMAME', args),
  resetWindow: async (args)=> await ipcRenderer.invoke('window-reset', args),
});

contextBridge.exposeInMainWorld('myvers', {
  st: 'ぼくはまちちゃん'
})
