const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("myApi", {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  hamachi: "ぼくはまちちゃん",
  api1: async (...args) => await ipcRenderer.invoke("channel_ichiri", ...args),
  executeMAME: async (...args) => await ipcRenderer.invoke("executeMAME", ...args),
});

contextBridge.exposeInMainWorld("retrofireAPI", {
  executeMAME: async (args) => await ipcRenderer.invoke("execute-MAME", args),
  resetWindow: async (args) => await ipcRenderer.invoke("window-reset", args),
  windowIsReady: async (args) => await ipcRenderer.invoke("window-is-ready", args),
  getStore: async (args) => await ipcRenderer.invoke("get-store", args),
  setStore: async (args) => await ipcRenderer.invoke("set-store", args),
  setStoreTemp: async (args) => await ipcRenderer.invoke("set-store-temp", args),
  openURL: async (args) => await ipcRenderer.invoke("open-url", args),

  dialog: async (args) => await ipcRenderer.invoke("open-dialog", args),
  deleteScreenShot: async (args) => await ipcRenderer.invoke("delete-screen-shot", args),
  renameScreenShot: async (args) => await ipcRenderer.invoke("rename-screen-shot", args),
  getRecord: async (args) => await ipcRenderer.invoke("get-record", args),
  getMame32j: async (args) => await ipcRenderer.invoke("get-mame32j", args),
  getMameInfo: async (args) => await ipcRenderer.invoke("get-mameinfo", args),
  getHistory: async (args) => await ipcRenderer.invoke("get-history", args),
  getCommand: async (args) => await ipcRenderer.invoke("get-command", args),
  getScreenshot: async (args) => await ipcRenderer.invoke("get-screenshot", args),
  cfgExists: async (args) => await ipcRenderer.invoke("cfg-exists", args),
  nvramExists: async (args) => await ipcRenderer.invoke("nvram-exists", args),

  onUpdateClock: (callback) => ipcRenderer.on("update-clock", callback),
  onDebugMessage: (callback) => ipcRenderer.on("debug-message", callback),
  onBlur: (callback) => ipcRenderer.on("blur", callback),
  onFocus: (callback) => ipcRenderer.on("focus", callback),
});
