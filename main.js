
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const { spawn, exec } = require("child_process");
const fs = require("fs");
const os = require("os");
const axios = require("axios");

// ✅ File logger — har error file mein save hogi
const logFile = path.join(app.getPath('userData'), 'print-log.txt');
function log(...args) {
  const msg = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
  console.log(msg.trim());
  try { fs.appendFileSync(logFile, msg); } catch (e) { }
}

// EPIPE error handle karo
process.stdout.on('error', (err) => { if (err.code === 'EPIPE') return; });
process.stderr.on('error', (err) => { if (err.code === 'EPIPE') return; });

const escpos = require("escpos");
escpos.Network = require("escpos-network");

let backendProcess;
let mainWindow;

const API_BASE = "http://localhost:9047";

// ✅ Auto detect node.exe based on Windows version
function getNodeExec() {
  if (app.isPackaged) {
    const release = parseFloat(os.release());
    if (release < 6.3) {
      return path.join(process.resourcesPath, "node_win7.exe");
    } else {
      return path.join(process.resourcesPath, "node.exe");
    }
  }
  return process.execPath;
}

// ✅ Backend start with fallback window creation
function startBackend() {
  const backendPath = app.isPackaged
    ? path.join(process.resourcesPath, "backend", "server.js")
    : path.join(__dirname, "..", "backend", "index.js");

  const nodeExec = getNodeExec();

  const envPath = app.isPackaged
    ? path.join(process.resourcesPath, "backend", ".env")
    : path.join(__dirname, "..", "backend", ".env");

  const dotenv = require("dotenv");
  const envConfig = dotenv.config({ path: envPath }).parsed || {};

  log(`Using node: ${nodeExec}`);

  backendProcess = spawn(nodeExec, [backendPath], {
    env: {
      ...process.env,
      ...envConfig,
      PORT: "9047",
      NODE_SKIP_PLATFORM_CHECK: "1",
    },
  });

  let windowCreated = false;

  backendProcess.stdout.on("data", (data) => {
    const msg = data.toString();
    log("Backend:", msg.trim());
    if (
      !windowCreated &&
      (msg.includes("SERVER_READY") || msg.includes("Server listening on port"))
    ) {
      windowCreated = true;
      createWindow();
    }
  });

  backendProcess.stderr.on("data", (data) => {
    log("Backend Error:", data.toString().trim());
  });

  backendProcess.on("error", (err) => {
    log("Backend spawn error:", err.message);
  });

  // ✅ Fallback — 8 second baad bhi window nahi bani toh force karo
  setTimeout(() => {
    if (!windowCreated) {
      log("Fallback: force creating window after timeout");
      windowCreated = true;
      createWindow();
    }
  }, 8000);

  log("Backend starting...");
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
    mainWindow.loadURL("http://localhost:3001");
  }

  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 3000);
}

app.whenReady().then(() => {
  log("App ready, log file:", logFile);
  startBackend();
  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'A new update has been downloaded. Restart now to install?',
      buttons: ['Install Now', 'Later']
    }).then((res) => {
      if (res.response === 0) autoUpdater.quitAndInstall();
    });
  });
});

app.on("window-all-closed", () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== "darwin") app.quit();
});

// ✅ Printer list fetch — API + offline cache fallback
async function fetchPrinters(token) {
  try {
    const res = await axios.get(`${API_BASE}/api/v1/printer-list`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeout: 3000,
    });
    log("Printers fetched from API:", JSON.stringify(res.data?.result));
    return res.data?.result || [];

  } catch (err) {
    log("Online printer fetch failed:", err.message, "— trying local cache...");

    try {
      const localDB = require("../backend/config/localdatabase");
      const [[row]] = await localDB.query(
        "SELECT data FROM offline_printer_config LIMIT 1"
      );
      if (row?.data) {
        const printers = JSON.parse(row.data);
        log("Cached printer use ho raha hai —", printers.length, "printers");
        return printers;
      }
    } catch (e) {
      log("Local printer cache bhi nahi mila:", e.message);
    }

    return [];
  }
}

// ✅ Main print function — Network: escpos | USB: node-thermal-printer
async function printOnPrinter(printer, buildContent) {
  log(`printOnPrinter called: type=${printer.printer_type} value=${printer.printer_value}`);

  if (printer.printer_type === "network") {
    // ── NETWORK — escpos ──────────────────────────────
    let device = new escpos.Network(printer.printer_value, 9100);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const msg = `Printer timeout - ${printer.printer_value} not reachable `;
        log("ERROR:", msg);
        reject(new Error(msg));
      }, 8000);

      device.open((err) => {
        clearTimeout(timer);
        if (err) {
          log("Network device open error:", err.message);
          return reject(err);
        }
        log("Network device opened successfully");
        const printerObj = new escpos.Printer(device);
        try {
          buildContent(printerObj);
          printerObj.cut().close(() => {
            log("Network print done");
            resolve({ success: true });
          });
        } catch (e) {
          log("Network print content error:", e.message);
          reject(e);
        }
      });
    });

  }
  else {
    return new Promise((resolve, reject) => {
      const printerName = printer.printer_value;
      const lines = [];

      const textBuilder = {
        align: () => textBuilder,
        style: () => textBuilder,
        size: () => textBuilder,
        raw: () => textBuilder,
        drawLine: () => { lines.push("-".repeat(48)); return textBuilder; },
        text: (t) => { lines.push(t || ""); return textBuilder; },
        cut: () => { lines.push("\n\n\n"); return textBuilder; },
        close: (cb) => { if (cb) cb(); },
      };

      try {
        buildContent(textBuilder);
      } catch (e) {
        log("buildContent error:", e.message);
        return reject(e);
      }

      const textContent = lines.join("\r\n");
      const txtFile = path.join(os.tmpdir(), `print_${Date.now()}.txt`);
      fs.writeFileSync(txtFile, textContent, 'utf8');
      log("Text file written:", txtFile);

      const safeFile = txtFile.replace(/\\/g, '\\\\');
      const psScript = `
      Add-Type -AssemblyName System.Drawing
      $content = [System.IO.File]::ReadAllText('${safeFile}')
      $pd = New-Object System.Drawing.Printing.PrintDocument
      $pd.PrinterSettings.PrinterName = '${printerName}'
      $pd.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0,0,0,0)
      $font = New-Object System.Drawing.Font('Courier New', 8)
      $pd.Add_PrintPage({
        param($sender, $e)
        $e.Graphics.DrawString($content, $font, [System.Drawing.Brushes]::Black, 0, 0)
      })
      $pd.Print()
      Write-Host "Done"
      `.trim();

      const psFile = path.join(os.tmpdir(), `print_${Date.now()}.ps1`);
      fs.writeFileSync(psFile, psScript, 'utf8');
      log("Running PrintDocument ps1:", psFile);

      exec(`powershell -ExecutionPolicy Bypass -File "${psFile}"`, { timeout: 15000 }, (err, stdout, stderr) => {
        try { fs.unlinkSync(txtFile); } catch (e) { }
        try { fs.unlinkSync(psFile); } catch (e) { }

        if (err) {
          log("PrintDocument failed:", err.message, stderr);
          return reject(new Error("Print failed: " + err.message));
        }
        log("PrintDocument success:", stdout);
        resolve({ success: true });
      });
    });
  }
}



// ✅ Bill print content builder 
function buildBillContent(p, billData) {
  p.raw(Buffer.from([0x1D, 0x4C, 0x08, 0x00]));
  const name = billData.restaurant_name || "";
  const address = billData.restaurant_address || "";
  const gstin = billData.gstin || "";
  const PAD = "  ";

  p.raw(Buffer.from([0x1B, 0x6C, 0x04]));
  p.text(name.trim().padStart(Math.floor((48 + name.trim().length) / 2)));
  p.text(address.trim().padStart(Math.floor((48 + address.trim().length) / 2)));
  p.drawLine();

  p.align("CT");
  p.text(`GSTIN - ${gstin}`);
  p.text(`INVOICE NO. - ${billData.uniqueOrderId}`);
  p.text(`TABLE NO. - ${billData.table_no || "Takeaway"}`);
  p.drawLine();

  p.align("LT");
  p.text(`${PAD}Captain Name : ${billData.captain_name || "—"}`);
  p.text(`${PAD}Time         ${billData.date_time}`);
  p.drawLine();

  if (billData.customer_name || billData.customer_phone) {
    if (billData.customer_name)
      p.text(`${PAD}Customer     : ${billData.customer_name}`);
    if (billData.customer_phone)
      p.text(`${PAD}Mobile       : ${billData.customer_phone}`);
    p.drawLine();
  }

  p.align("LT").style("B");
  p.text(`${PAD}ITEM             QTY    RATE   AMOUNT`);
  p.style("NORMAL").drawLine();

  p.align("LT").style("B").text(`${PAD}Food`).style("NORMAL");

  billData.items.forEach((item) => {
    const fullName = item.name || "";
    const qty = String(item.qty).padStart(4);
    const rate = Number(item.price || item.rate || 0).toFixed(2).padStart(7);
    const total = Number(item.total || 0).toFixed(2).padStart(8);
    const firstName = fullName.substring(0, 16).padEnd(16);
    p.text(`${PAD}${firstName} ${qty}  ${rate} ${total}`);
    if (fullName.length > 16) p.text(`${PAD}  ${fullName.substring(16)}`);
    if (item.remark) p.text(`${PAD}  Note: ${item.remark}`);
  });

  p.drawLine();

  p.align("LT");
  const subLabel = `${PAD}Sub Total :`;
  const subVal = Number(billData.subtotal || 0).toFixed(2);
  p.text(`${subLabel.padEnd(28)}${subVal.padStart(10)}`);
  p.drawLine();

  if (billData.tax_breakdown?.length > 0) {
    billData.tax_breakdown.forEach((t) => {
      const label = `${PAD}${t.name}(${t.pct}%):`;
      const amount = Number(t.amount).toFixed(2);
      p.align("LT").text(`${label.padEnd(28)}${amount.padStart(10)}`);
    });
  }

  if (billData.charge_breakdown?.length > 0) {
    billData.charge_breakdown.forEach((c) => {
      const label = `${PAD}${c.name}:`;
      const amount = Number(c.amount).toFixed(2);
      p.align("LT").text(`${label.padEnd(28)}${amount.padStart(10)}`);
    });
  }

  if (parseFloat(billData.discount || 0) > 0) {
    const discLabel = `${PAD}Discount:`;
    const discVal = `-${Number(billData.discount).toFixed(2)}`;
    p.align("LT").text(`${discLabel.padEnd(28)}${discVal.padStart(10)}`);
  }

  p.drawLine();

  p.align("LT");
  p.text(`${"      Total :".padEnd(28)}${String(billData.total_amount).padStart(10)}`);
  const rv = billData.round_off || 0;
  p.text(`${"      Round Off :".padEnd(28)}${String(rv).padStart(10)}`);

  if (billData.payment_splits?.length > 0) {
    billData.payment_splits.forEach((s) => {
      if (s.mode && s.amount) {
        const modeLabel = `${PAD}${String(s.mode)}`;
        const modeAmt = `: ${String(s.amount)}`;
        p.text(`${modeLabel.padEnd(28)}${modeAmt.padStart(10)}`);
      }
    });
  }

  if (parseFloat(billData.wallet_used || 0) > 0)
    p.text(`${"      Wallet Applied :".padEnd(28)}${("-" + billData.wallet_used).padStart(10)}`);

  if (parseFloat(billData.advance_used || 0) > 0)
    p.text(`${"      Advance Applied :".padEnd(28)}${("-" + billData.advance_used).padStart(10)}`);

  if (billData.is_lending && parseFloat(billData.remaining_amount || 0) > 0) {
    p.drawLine();
    p.align("CT").style("B").text(`DUE: Rs.${billData.remaining_amount}`).style("NORMAL");
  }

  p.drawLine();
  const gt = `Grand Total:(INR) ${Number(billData.total_amount).toFixed(2)}`;
  p.text(gt.padStart(Math.floor((48 + gt.length) / 2)));
  p.drawLine();
  const ty = "Thank You..";
  const va = "Visit Again!!!";
  p.text(ty.padStart(Math.floor((48 + ty.length) / 2)));
  p.text(va.padStart(Math.floor((48 + va.length) / 2)));
  p.drawLine();
  const powered = "powered by FerryRestro v1.0.1";
  p.align("CT").text(powered);
}

// ✅ KOT print content builder
function buildKotContent(p, kotData) {
  p.raw(Buffer.from([0x1D, 0x4C, 0x08, 0x00]));

  p.align("CT").style("B").size(1, 1);
  p.text("KOT");
  p.raw(Buffer.from([0x1D, 0x21, 0x00]));
  p.size(0, 0).style("NORMAL");
  p.drawLine();

  p.align("LT");
  p.text(`ORDER NO.-    ${kotData.orderId || kotData.orderNo || "—"}`);
  p.text(`TABLE NO.-    ${kotData.table_no || kotData.tableNo || "Takeaway"}`);
  p.text(`KOT NO.-      ${kotData.kotNo || "1"}`);
  p.text(`CAPTAIN NAME- ${kotData.captainName || kotData.captain_name || "—"}`);
  p.text(`TYPE-         ${kotData.type || "New"}`);
  p.text(`DATE & TIME-  ${kotData.dateTime || kotData.date_time || new Date().toLocaleString("en-IN")}`);
  p.drawLine();

  p.align("LT").style("B");
  p.text("ITEM                           QTY");
  p.style("NORMAL").drawLine();

  (kotData.items || []).forEach((item) => {
    const fullName = item.name || "";
    const qty = String(item.qty || 1);

    if (fullName.length <= 30) {
      p.style("B").text(`${fullName.padEnd(30)} ${qty.padStart(3)}`).style("NORMAL");
    } else {
      const first = fullName.substring(0, 30);
      const rest = fullName.substring(30);
      p.style("B").text(`${first.padEnd(30)} ${qty.padStart(3)}`).style("NORMAL");
      p.text(`  ${rest}`);
    }

    if (item.predefinedRemarks?.length > 0) {
      item.predefinedRemarks.forEach((r) => p.text(`  -> ${r}`));
    }
    if (item.qtyRemark?.trim()) p.text(`  -> ${item.qtyRemark.trim()}`);
    const gRemark = item.globalRemark || item.remark;
    if (gRemark?.trim()) p.text(`  Note: ${gRemark.trim()}`);
  });

  p.drawLine();
}

// ✅ IPC — BILL PRINT
ipcMain.handle("print-bill", async (event, { billData, token }) => {
  log("print-bill IPC received, orderId:", billData?.orderId);
  try {
    const printers = await fetchPrinters(token);
    const billPrinters = printers.filter((p) => p.printer_tab === "BILL");
    log("BILL printers found:", billPrinters.length, JSON.stringify(billPrinters));

    if (billPrinters.length === 0)
      return { success: false, message: "No BILL printer configured in backend!" };

    const errors = [];
    for (const printer of billPrinters) {
      try {
        await printOnPrinter(printer, (p) => buildBillContent(p, billData));
        log(`Bill printed successfully on ${printer.printer_value}`);
      } catch (err) {
        log(`FAILED on ${printer.printer_value}:`, err.message);
        errors.push(err.message);
      }
    }
    return errors.length
      ? { success: false, message: errors.join(" | ") }
      : { success: true };
  } catch (err) {
    log("print-bill top-level error:", err.message);
    return { success: false, message: err.message };
  }
});

// ✅ IPC — KOT PRINT
ipcMain.handle("print-kot", async (event, { kotData, token }) => {
  log("print-kot IPC received, orderId:", kotData?.orderId);
  try {
    const printers = await fetchPrinters(token);
    const kotPrinters = printers.filter((p) => p.printer_tab === "KOT");
    log("KOT printers found:", kotPrinters.length, JSON.stringify(kotPrinters));

    if (kotPrinters.length === 0)
      return { success: false, message: "No KOT printer configured in backend!" };

    const errors = [];
    for (const printer of kotPrinters) {
      try {
        await printOnPrinter(printer, (p) => buildKotContent(p, kotData));
        log(`KOT printed successfully on ${printer.printer_value}`);
      } catch (err) {
        log(`FAILED on ${printer.printer_value}:`, err.message);
        errors.push(err.message);
      }
    }
    return errors.length
      ? { success: false, message: errors.join(" | ") }
      : { success: true };
  } catch (err) {
    log("print-kot top-level error:", err.message);
    return { success: false, message: err.message };
  }
});

// ✅ IPC — Log file path frontend ko bata do
ipcMain.handle("get-log-path", () => logFile);