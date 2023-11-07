const { contextBridge, ipcRenderer } = require("electron");

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

  // 設定削除
  cfgExists: async (args) => await ipcRenderer.invoke("cfg-exists", args),
  cfgDelete: async (args) => await ipcRenderer.invoke("cfg-delete", args),
  nvramExists: async (args) => await ipcRenderer.invoke("nvram-exists", args),
  nvramDelete: async (args) => await ipcRenderer.invoke("nvram-delete", args),
  nvcfgExists: async (args) => await ipcRenderer.invoke("nvcfg-exists", args),
  nvcfgDelete: async (args) => await ipcRenderer.invoke("nvcfg-delete", args),

  // list.xml 解析
  parseListxml: async (args) => await ipcRenderer.invoke("parse-listxml", args),

  // listsoft.xml解析
  parseListsoft: async (args) => await ipcRenderer.invoke("parse-listsoft", args),

  // デバッグメッセージ返す
  onDebugMessage: (callback) => ipcRenderer.on("debug-message", callback),

  // focus
  onBlur: (callback) => ipcRenderer.on("blur", callback),
  onFocus: (callback) => ipcRenderer.on("focus", callback),
});
