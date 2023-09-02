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
  executeMAME: async (args) => await ipcRenderer.invoke('execute-MAME', args),
  resetWindow: async (args)=> await ipcRenderer.invoke('window-reset', args),
  getStore: async (args) => await ipcRenderer.invoke('get-store', args),
  setStore: async (args) => await ipcRenderer.invoke('set-store', args),
  
  dialog: async (args)=> await ipcRenderer.invoke('open-dialog', args),
  getRecord: async (args) => await ipcRenderer.invoke('get-record', args),
  onUpdateClock: (callback) => ipcRenderer.on('update-clock', callback),
  onDebugMessage: (callback) => ipcRenderer.on('debug-message', callback),

});
