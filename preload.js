const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  printBill: (billData) => ipcRenderer.invoke("print-bill", billData),
  printKot:  (kotData)  => ipcRenderer.invoke("print-kot",  kotData),
  printStatement: (statementData) => ipcRenderer.invoke("print-statement", statementData),
});