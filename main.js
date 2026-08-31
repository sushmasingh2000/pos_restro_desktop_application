
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
const QRCode = require("qrcode");

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
      // Same dev/packaged split used for spawning the backend itself
      // (see startBackend) — a plain relative require resolves fine in
      // dev (backend/ sits next to panel/) but breaks once main.js is
      // bundled inside app.asar, where "../backend" no longer points at
      // resources/backend.
      const localDbPath = app.isPackaged
        ? path.join(process.resourcesPath, "backend", "config", "localdatabase")
        : path.join(__dirname, "..", "backend", "config", "localdatabase");
      const localDB = require(localDbPath);
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
    const printerName = printer.printer_value;
    const lines = [];
    const BOLD = "\x1F"; // bold marker prefix
    const QR = "\x02"; // QR image marker prefix (followed by PNG file path)
    let _bold = false;

    const textBuilder = {
      align: () => textBuilder,
      style: (s) => { _bold = (s === "B"); return textBuilder; },
      size: () => textBuilder,
      raw: () => textBuilder,
      drawLine: () => { lines.push("-".repeat(48)); return textBuilder; },
      text: (t) => { lines.push((_bold ? BOLD : "") + (t || "")); return textBuilder; },
      // Windows PrintDocument path can't render raw ESC/POS bytes (raw() is a
      // no-op there), so QR must be rendered as an actual PNG and drawn as an
      // image — pushed as a marker line, converted to a file below.
      qrImage: (data) => { lines.push({ __qr: data }); return textBuilder; },
      cut: () => { lines.push(""); lines.push(""); lines.push(""); return textBuilder; },
      close: (cb) => { if (cb) cb(); },
    };

    try {
      buildContent(textBuilder);
    } catch (e) {
      log("buildContent error:", e.message);
      throw e;
    }

    // Render any queued QR markers to temp PNG files for the PS script to draw.
    const qrFiles = [];
    const textLines = [];
    for (const item of lines) {
      if (item && typeof item === "object" && item.__qr) {
        const qrPath = path.join(os.tmpdir(), `qr_${Date.now()}_${qrFiles.length}.png`);
        try {
          await QRCode.toFile(qrPath, item.__qr, { margin: 1, width: 200 });
          qrFiles.push(qrPath);
          textLines.push(`${QR}${qrPath}`);
        } catch (e) {
          log("QR image generation failed:", e.message);
        }
      } else {
        textLines.push(item);
      }
    }

    return new Promise((resolve, reject) => {
      const textContent = textLines.join("\n");
      const txtFile = path.join(os.tmpdir(), `print_${Date.now()}.txt`);
      fs.writeFileSync(txtFile, textContent, 'utf8');
      log("Text file written:", txtFile);

      const safeFile = txtFile.replace(/\\/g, '\\\\');
      const psScript = `
Add-Type -AssemblyName System.Drawing
$lines = [System.IO.File]::ReadAllLines('${safeFile}', [System.Text.Encoding]::UTF8)
$pd = New-Object System.Drawing.Printing.PrintDocument
$pd.PrinterSettings.PrinterName = '${printerName}'
$pd.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0,0,0,0)
$fontN = New-Object System.Drawing.Font('Courier New', 8)
$fontB = New-Object System.Drawing.Font('Courier New', 8, [System.Drawing.FontStyle]::Bold)
$pd.Add_PrintPage({
  param($sender, $e)
  $y = [float]0
  $lh = $fontN.GetHeight($e.Graphics)
  $contentWidth = $e.Graphics.MeasureString(('-' * 48), $fontN).Width
  foreach ($line in $lines) {
    if ($line.Length -gt 0 -and [int][char]$line[0] -eq 2) {
      $imgPath = $line.Substring(1)
      if (Test-Path $imgPath) {
        $img = [System.Drawing.Image]::FromFile($imgPath)
        $qw = 140
        $qx = ($contentWidth - $qw) / 2
        if ($qx -lt 0) { $qx = 0 }
        $e.Graphics.DrawImage($img, [float]$qx, $y, $qw, $qw)
        $img.Dispose()
        $y += $qw + 6
      }
    } elseif ($line.Length -gt 0 -and [int][char]$line[0] -eq 31) {
      $e.Graphics.DrawString($line.Substring(1), $fontB, [System.Drawing.Brushes]::Black, [float]0, $y)
      $y += $lh
    } else {
      $e.Graphics.DrawString($line, $fontN, [System.Drawing.Brushes]::Black, [float]0, $y)
      $y += $lh
    }
  }
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
        for (const qf of qrFiles) { try { fs.unlinkSync(qf); } catch (e) { } }

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



// ✅ Bill print content builder — USB printers (original/legacy format, unchanged)
function buildBillContentUsb(p, billData) {
  p.raw(Buffer.from([0x1D, 0x4C, 0x08, 0x00]));
  const PAD = "  ";
  const businessName = billData.business_name || billData.restaurant_name || "";
  const outletName   = billData.outlet_name || "";
  const licNo        = billData.lic_no || "";
  const billTitle    = billData.bill_title || "";
  const gstin        = billData.gstin || "";

  p.raw(Buffer.from([0x1B, 0x6C, 0x04]));
  p.style("B").text(businessName.padStart(Math.floor((48 + businessName.length) / 2))).style("NORMAL");
  if (outletName) { p.text(outletName.padStart(Math.floor((48 + outletName.length) / 2))); }
  if (licNo)      { const ln = `${billTitle} - ${licNo}`; p.text(ln.padStart(Math.floor((48 + ln.length) / 2))); }
  if (gstin)      { const gl = `GSTIN - ${gstin}`;   p.text(gl.padStart(Math.floor((48 + gl.length) / 2))); }
  p.drawLine();

  const invLine = `INVOICE NO. - ${billData.uniqueOrderId}`;
  const tblLine = `TABLE NO. - ${billData.table_no || "Takeaway"}`;
  p.text(invLine.padStart(Math.floor((48 + invLine.length) / 2)));
  p.text(tblLine.padStart(Math.floor((48 + tblLine.length) / 2)));
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

  if (parseFloat(billData.given_amount || 0) > 0) {
    p.text(`${"      Given Amount :".padEnd(28)}${String(billData.given_amount).padStart(10)}`);
    p.text(`${"      Return Amount :".padEnd(28)}${String(billData.return_amount || "0.00").padStart(10)}`);
  }

  if (parseFloat(billData.wallet_used || 0) > 0)
    p.text(`${"      Wallet Applied :".padEnd(28)}${("-" + billData.wallet_used).padStart(10)}`);

  if (parseFloat(billData.advance_used || 0) > 0)
    p.text(`${"      Advance Applied :".padEnd(28)}${("-" + billData.advance_used).padStart(10)}`);

  if (billData.is_lending && parseFloat(billData.remaining_amount || 0) > 0) {
    p.drawLine();
    p.align("CT").style("B").text(`DUE: Rs.${billData.remaining_amount}`).style("NORMAL");
  }

  p.style("B").text("=".repeat(48)).style("NORMAL");
  const gt = `Grand Total:(INR) ${Number(billData.total_amount).toFixed(2)}`;
  p.style("B").text(gt.padStart(Math.floor((48 + gt.length) / 2))).style("NORMAL");
  p.style("B").text("=".repeat(48)).style("NORMAL");
  const ty = "Thank You..";
  const va = "Visit Again!!!";
  p.text(ty.padStart(Math.floor((48 + ty.length) / 2)));
  p.text(va.padStart(Math.floor((48 + va.length) / 2)));
  p.drawLine();

  // ✅ Dynamic UPI QR — only when this branch has an actual UPI ID
  // configured (Master Panel > Branches). No config = no QR block at all.
  if (billData.upi_id) {
    const upiId = billData.upi_id;
    const payeeName = encodeURIComponent(billData.upi_payee_name || businessName || "Restaurant");
    const upiAmount = Number(billData.total_amount || 0).toFixed(2);
    const qrData = `upi://pay?pa=${upiId}&pn=${payeeName}&am=${upiAmount}&cu=INR`;

    p.text("");
    const scanLabel = "Scan & Pay via UPI";
    p.text(scanLabel.padStart(Math.floor((48 + scanLabel.length) / 2)));
    p.qrImage(qrData);
    const upiLine = `UPI ID: ${upiId}`;
    p.text(upiLine.padStart(Math.floor((48 + upiLine.length) / 2)));
    p.drawLine();
  }

  // "powered by" is always the last line on the receipt.
  const powered = "powered by FerryInfotech v1.0.1";
  p.align("CT").text(powered);
}

// ✅ Helper — raw ESC/POS QR code generator (no external image lib needed)
// Model 2 QR, size aur error-correction adjustable
function qrCodeBuffer(data, size = 6) {
  const buffers = [];

  // Select Model 2
  buffers.push(Buffer.from([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]));

  // Module size (1–16)
  buffers.push(Buffer.from([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size]));

  // Error correction level: 48=L 49=M 50=Q 51=H
  buffers.push(Buffer.from([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 49]));

  // Store QR data
  const dataBuffer = Buffer.from(data, "utf8");
  const len = dataBuffer.length + 3;
  const pL = len % 256;
  const pH = Math.floor(len / 256);
  buffers.push(
    Buffer.concat([
      Buffer.from([0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30]),
      dataBuffer,
    ])
  );

  // Print QR
  buffers.push(Buffer.from([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]));

  return Buffer.concat(buffers);
}

// ✅ Bill print content builder — NETWORK (IP) printers (new format: order id,
// table, captain, customer block, taxable amt/discount/tax/sub-total breakdown)
function buildBillContentNetwork(p, billData) {
  const PAD = "  ";
  const businessName = billData.business_name || billData.restaurant_name || "";
  const outletName   = billData.outlet_name || "";
  const licNo        = billData.lic_no || "";
  const billTitle    = billData.bill_title || "";
  const gstin        = billData.gstin || "";

  p.style("B").text(businessName.padStart(Math.floor((48 + businessName.length) / 2))).style("NORMAL");
  if (outletName) { p.text(outletName.padStart(Math.floor((48 + outletName.length) / 2))); }
  if (licNo)      { const ln = `${billTitle} - ${licNo}`; p.text(ln.padStart(Math.floor((48 + ln.length) / 2))); }
  if (gstin)      { const gl = `GSTIN : ${gstin}`;   p.text(gl.padStart(Math.floor((48 + gl.length) / 2))); }
  p.drawLine();

  // ── ORDER / TABLE / CAPTAIN / CUSTOMER / DATE ─────────
  p.align("LT");
  const orderIdVal = billData.uniqueOrderId || billData.billNo || billData.orderId || "—";
  p.text(`${PAD}Order Id.:        ${orderIdVal}`);
  p.text(`${PAD}Table No.:        ${billData.table_no || "Takeaway"}`);
  p.text(`${PAD}Captain Name:     ${billData.captain_name || "—"}`);

  if (billData.customer_name?.trim()) {
    p.text(`${PAD}Customer Name:    ${billData.customer_name.trim()}`);
  }
  if (billData.customer_phone?.trim()) {
    p.text(`${PAD}Customer Mob:     ${billData.customer_phone.trim()}`);
  }
  if (billData.customer_address?.trim() && billData.customer_address.trim() !== "Not Available") {
    p.text(`${PAD}Customer Address: ${billData.customer_address.trim()}`);
  }

  p.text(`${PAD}Date :            ${billData.date_time}`);
  p.drawLine();

  // ── ITEMS ──────────────────────────────────────────────
  p.align("LT").style("B");
  p.text(`${PAD}Name             Qty  Rate   Amt`);
  p.style("NORMAL").drawLine();

  billData.items.forEach((item) => {
    const fullName = item.name || "";
    const qty = String(item.qty).padStart(3);
    const rate = Number(item.price || item.rate || 0).toFixed(2).padStart(6);
    const total = Number(item.total || 0).toFixed(2).padStart(7);
    const firstName = fullName.substring(0, 16).padEnd(16);
    p.text(`${PAD}${firstName} ${qty} ${rate} ${total}`);
    if (fullName.length > 16) p.text(`${PAD}  ${fullName.substring(16)}`);
    if (item.remark) p.text(`${PAD}  Note: ${item.remark}`);
  });

  p.drawLine();

  // ── TAXABLE AMT / DISCOUNT / TAX / SUB TOTAL / ROUND OFF ──
  p.align("LT");
  const taxableLabel = `${PAD}Total Taxable Amt:`;
  const taxableVal = Number(billData.subtotal || 0).toFixed(2);
  p.text(`${taxableLabel.padEnd(28)}${taxableVal.padStart(10)}`);

  const discLabel = `${PAD}Discount:`;
  const discVal = Number(billData.discount || 0).toFixed(2);
  p.text(`${discLabel.padEnd(28)}${discVal.padStart(10)}`);

  if (billData.tax_breakdown?.length > 0) {
    const rank = (name) => {
      const n = (name || "").toUpperCase();
      if (n.includes("CGST")) return 0;
      if (n.includes("SGST")) return 1;
      return 2;
    };
    [...billData.tax_breakdown]
      .sort((a, b) => rank(a.name) - rank(b.name))
      .forEach((t) => {
        const label = `${PAD}${t.name} (${t.pct}%):`;
        const amount = Number(t.amount).toFixed(2);
        p.text(`${label.padEnd(28)}${amount.padStart(10)}`);
      });
  }

  if (billData.charge_breakdown?.length > 0) {
    billData.charge_breakdown.forEach((c) => {
      const label = `${PAD}${c.name}:`;
      const amount = Number(c.amount).toFixed(2);
      p.text(`${label.padEnd(28)}${amount.padStart(10)}`);
    });
  }

  p.drawLine();

  const roundOff = Number(billData.round_off || 0);
  const preRoundTotal = Number(billData.total_amount || 0) - roundOff;
  p.text(`${`${PAD}Sub Total:`.padEnd(28)}${preRoundTotal.toFixed(2).padStart(10)}`);
  const roundOffStr = (roundOff >= 0 ? "+" : "") + roundOff.toFixed(2);
  p.text(`${`${PAD}Round Off:`.padEnd(28)}${roundOffStr.padStart(10)}`);

  if (billData.payment_splits?.length > 0) {
    billData.payment_splits.forEach((s) => {
      if (s.mode && s.amount) {
        const modeLabel = `${PAD}${String(s.mode)}`;
        const modeAmt = `: ${String(s.amount)}`;
        p.text(`${modeLabel.padEnd(28)}${modeAmt.padStart(10)}`);
      }
    });
  }

  if (parseFloat(billData.given_amount || 0) > 0) {
    p.text(`${`${PAD}Given Amount:`.padEnd(28)}${String(billData.given_amount).padStart(10)}`);
    p.text(`${`${PAD}Return Amount:`.padEnd(28)}${String(billData.return_amount || "0.00").padStart(10)}`);
  }

  if (parseFloat(billData.wallet_used || 0) > 0)
    p.text(`${"      Wallet Applied :".padEnd(28)}${("-" + billData.wallet_used).padStart(10)}`);

  if (parseFloat(billData.advance_used || 0) > 0)
    p.text(`${"      Advance Applied :".padEnd(28)}${("-" + billData.advance_used).padStart(10)}`);

  if (billData.is_lending && parseFloat(billData.remaining_amount || 0) > 0) {
    p.drawLine();
    p.align("CT").style("B").text(`DUE: Rs.${billData.remaining_amount}`).style("NORMAL");
  }

  p.style("B").text("=".repeat(48)).style("NORMAL");
  const gt = `Grand TOTAL (INR): ${Number(billData.total_amount || 0).toFixed(2)}`;
  p.style("B").text(gt.padStart(Math.floor((48 + gt.length) / 2))).style("NORMAL");
  p.style("B").text("=".repeat(48)).style("NORMAL");
  const ty = "Thank You..";
  const va = "Visit Again!!!";
  p.text(ty.padStart(Math.floor((48 + ty.length) / 2)));
  p.text(va.padStart(Math.floor((48 + va.length) / 2)));
  p.drawLine();
  const powered = "powered by FerryInfotech v1.0.1";
  p.align("CT").text(powered);

  // ✅ Dynamic UPI QR — only when this branch has an actual UPI ID
  // configured (Master Panel > Branches). No config = no QR block at all.
  if (billData.upi_id) {
    const upiId = billData.upi_id;
    const payeeName = encodeURIComponent(billData.upi_payee_name || businessName || "Restaurant");
    const upiAmount = Number(billData.total_amount || 0).toFixed(2);
    const qrData = `upi://pay?pa=${upiId}&pn=${payeeName}&am=${upiAmount}&cu=INR`;

    p.text("");
    p.align("CT").text("Scan & Pay via UPI");
    p.raw(qrCodeBuffer(qrData, 6));
    p.align("CT").text(`UPI ID: ${upiId}`);
    p.drawLine();
  }
}

// ✅ KOT print content builder
function buildKotContent(p, kotData) {
  p.raw(Buffer.from([0x1D, 0x4C, 0x08, 0x00]));

  p.text("KOT".padStart(Math.floor((48 + 3) / 2)));
  p.drawLine();

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
        // USB = purana/legacy format (jo pehle se sahi chal raha tha, chhua
        // nahi). Network (IP) printers naya format use karte hain — dono
        // types ek hi function share nahi karte, isliye ek fix doosre ko
        // kabhi todhta nahi.
        const buildContent = printer.printer_type === "network"
          ? (p) => buildBillContentNetwork(p, billData)
          : (p) => buildBillContentUsb(p, billData);
        await printOnPrinter(printer, buildContent);
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

// ✅ Due Statement print content builder
function buildStatementContent(p, statementData) {
  const PAD = "  ";
  const businessName = statementData.business_name || statementData.restaurant_name || "";
  const outletName   = statementData.outlet_name || "";
  const address      = statementData.address || "";
  const gstin        = statementData.gstin || "";

  p.style("B").text(businessName.padStart(Math.floor((48 + businessName.length) / 2))).style("NORMAL");
  if (outletName) p.text(outletName.padStart(Math.floor((48 + outletName.length) / 2)));
  if (address)    p.text(address.padStart(Math.floor((48 + address.length) / 2)));
  if (gstin)      { const gl = `GSTIN: ${gstin}`; p.text(gl.padStart(Math.floor((48 + gl.length) / 2))); }
  p.drawLine();

  p.style("B").text("DUE STATEMENT".padStart(Math.floor((48 + 13) / 2))).style("NORMAL");
  const gen = `Generated: ${statementData.generatedAt || new Date().toLocaleString("en-IN")}`;
  p.text(gen.padStart(Math.floor((48 + gen.length) / 2)));
  p.drawLine();

  p.align("LT");
  p.text(`${PAD}Customer : ${statementData.customer_name || ""}`);
  if (statementData.customer_phone) p.text(`${PAD}Phone    : ${statementData.customer_phone}`);
  p.drawLine();

  p.style("B").text(`${PAD}DATE      ORDER ID          PAID    DUE`).style("NORMAL");
  p.drawLine();

  (statementData.bills || []).forEach((b) => {
    const dateCol = String(b.date || "").padEnd(10).substring(0, 10);
    const orderCol = String(b.orderId || "").padEnd(16).substring(0, 16);
    const paidVal = Number(b.paid || 0);
    const paidCol = (paidVal > 0 ? paidVal.toFixed(0) : "-").padStart(6);
    const dueCol = Number(b.due || 0).toFixed(0).padStart(6);
    p.text(`${PAD}${dateCol}${orderCol}${paidCol}${dueCol}`);
    p.text("");
    (b.items || []).forEach((it, idx) => {
      const timeLabel = idx === 0 ? (b.time || "") : "";
      const amt = Number(it.amount || 0).toFixed(0);
      p.text(`${PAD}  ${timeLabel} ${it.name} x${it.qty} - ${amt}`);
    });
    p.drawLine();
  });

  p.align("LT");
  p.style("B").text(`${`${PAD}Total Billed :`.padEnd(28)}${Number(statementData.totalBilled || 0).toFixed(2).padStart(10)}`).style("NORMAL");
  p.style("B").text(`${`${PAD}Total Paid   :`.padEnd(28)}${Number(statementData.totalPaid || 0).toFixed(2).padStart(10)}`).style("NORMAL");
  p.drawLine();

  const td = `Total Due: Rs.${Number(statementData.totalDue || 0).toFixed(2)}`;
  p.style("B").text(td.padStart(Math.floor((48 + td.length) / 2))).style("NORMAL");
  p.drawLine();

  p.align("CT").text("powered by FerryInfotech v1.0.1");
}

// ✅ IPC — DUE STATEMENT PRINT
ipcMain.handle("print-statement", async (event, { statementData, token }) => {
  log("print-statement IPC received, customer:", statementData?.customer_name);
  try {
    const printers = await fetchPrinters(token);
    const billPrinters = printers.filter((p) => p.printer_tab === "BILL");
    log("BILL printers found:", billPrinters.length, JSON.stringify(billPrinters));

    if (billPrinters.length === 0)
      return { success: false, message: "No BILL printer configured in backend!" };

    const errors = [];
    for (const printer of billPrinters) {
      try {
        await printOnPrinter(printer, (p) => buildStatementContent(p, statementData));
        log(`Statement printed successfully on ${printer.printer_value}`);
      } catch (err) {
        log(`FAILED on ${printer.printer_value}:`, err.message);
        errors.push(err.message);
      }
    }
    return errors.length
      ? { success: false, message: errors.join(" | ") }
      : { success: true };
  } catch (err) {
    log("print-statement top-level error:", err.message);
    return { success: false, message: err.message };
  }
});

// ✅ IPC — Log file path frontend ko bata do
ipcMain.handle("get-log-path", () => logFile);