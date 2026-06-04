const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");

// ✅ EPIPE 
process.stdout.on('error', (err) => { if (err.code === 'EPIPE') return; });
process.stderr.on('error', (err) => { if (err.code === 'EPIPE') return; });

const escpos = require("escpos");
escpos.USB = require("escpos-usb");
escpos.Network = require("escpos-network");

let backendProcess;
let mainWindow;

const API_BASE = app.isPackaged
  ? "http://localhost:9047"
  : "https://cbc.ferryinfotech.in";

function startBackend() {
  const backendPath = app.isPackaged
    ? path.join(process.resourcesPath, "backend", "server.js")
    : path.join(__dirname, "..", "backend", "index.js");


  // ✅ Packaged mein apna node.exe use karo
  const nodeExec = app.isPackaged
    ? path.join(process.resourcesPath, "node.exe")
    : process.execPath;

  backendProcess = spawn(nodeExec, [backendPath], {
    env: {
      ...process.env,
      PORT: "9047",
    },
  });

  backendProcess.stdout.on("data", (data) => {
    const msg = data.toString();
    console.log("Backend:", msg);
    if (!mainWindow && (msg.includes("SERVER_READY") || msg.includes("Server listening on port"))) {
      createWindow();
    }
  });

  backendProcess.stderr.on("data", (data) => {
    console.error("Backend Error:", data.toString());
  });

  backendProcess.on("error", (err) => {
    console.error("❌ Backend spawn error:", err.message);
  });

  console.log("✅ Backend starting...");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, "build/index.html"));
  } else {
    mainWindow.loadURL("http://localhost:3000");
  }
}

app.whenReady().then(() => { startBackend(); });

app.on("window-all-closed", () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== "darwin") app.quit();
});