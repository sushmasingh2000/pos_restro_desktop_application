const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const axios = require("axios");


// EPIPE error handle karo
process.stdout.on('error', (err) => { if (err.code === 'EPIPE') return; });
process.stderr.on('error', (err) => { if (err.code === 'EPIPE') return; });

const escpos = require("escpos");
escpos.USB = require("escpos-usb");
escpos.Network = require("escpos-network");

let backendProcess;
let mainWindow;

const API_BASE = "http://localhost:9047";

// ✅ Auto detect node.exe based on Windows version
function getNodeExec() {
  if (app.isPackaged) {
    const release = parseFloat(os.release());
    if (release < 6.3) {
      return path.join(process.resourcesPath, "node_win7.exe"); // Windows 7
    } else {
      return path.join(process.resourcesPath, "node.exe"); // Windows 10+
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

  console.log(`Using node: ${nodeExec}`);

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
    console.log("Backend:", msg);
    if (
      !windowCreated &&
      (msg.includes("SERVER_READY") || msg.includes("Server listening on port"))
    ) {
      windowCreated = true;
      createWindow();
    }
  });

  backendProcess.stderr.on("data", (data) => {
    console.error("Backend Error:", data.toString());
  });

  backendProcess.on("error", (err) => {
    console.error("Backend spawn error:", err.message);
  });

  // ✅ Fallback — 8 second baad bhi window nahi bani toh force karo
  setTimeout(() => {
    if (!windowCreated) {
      console.log("Fallback: force creating window after timeout");
      windowCreated = true;
      createWindow();
    }
  }, 8000);

  console.log("Backend starting...");
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

app.whenReady().then(() => {
  startBackend();
});

app.on("window-all-closed", () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== "darwin") app.quit();
});

// ✅ Printer list API se fetch — dynamic import

async function fetchPrinters(token) {
  try {
    const res = await axios.get(`${API_BASE}/api/v1/printer-list`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeout: 3000, // ✅ 3 sec timeout
    });
    return res.data?.result || [];
  } catch (err) {
    console.log("Printer fetch failed (offline?):", err.message);
    return []; // ✅ Crash nahi karega
  }
}

// ✅ Printer pe print karo — timeout added
async function printOnPrinter(printer, buildContent) {
  console.log(`Printing on: ${printer.printer_type} -> ${printer.printer_value}`);
  let device;

  if (printer.printer_type === "network") {
    device = new escpos.Network(printer.printer_value, 9100);
  } else {
    const usbDevices = escpos.USB.findPrinter();
    if (!usbDevices || usbDevices.length === 0)
      throw new Error("USB printer not found");
    const first = usbDevices[0];
    device = new escpos.USB(
      first.deviceDescriptor.idVendor,
      first.deviceDescriptor.idProduct
    );
  }

  return new Promise((resolve, reject) => {
    // ✅ 8 second timeout — hang nahi karega
    const timer = setTimeout(() => {
      reject(new Error(`Printer timeout - ${printer.printer_value} reachable nahi hai`));
    }, 8000);

    device.open((err) => {
      clearTimeout(timer); // ✅ Timer clear karo
      if (err) {
        console.error("Device open error:", err.message);
        return reject(err);
      }
      console.log("Device opened");
      const printerObj = new escpos.Printer(device);
      try {
        buildContent(printerObj);
        printerObj.cut().close(() => {
          console.log("Print done");
          resolve({ success: true });
        });
      } catch (e) {
        console.error("Print content error:", e.message);
        reject(e);
      }
    });
  });
}

function buildBillContent(p, billData) {
  const name    = billData.restaurant_name    || "Chai Bolo Chai";
  const address = billData.restaurant_address || "Indiranagar";
  const gstin   = billData.gstin              || "51575785745";
  const captain = billData.captain_name       || "Captain";

  // ✅ Epson margin fix
  p.raw(Buffer.from([0x1B, 0x6C, 0x04]));

  // ── HEADER ──────────────────────────────────────────
  p.align("CT").style("B").text(name);
  p.style("NORMAL").text(address);
  p.drawLine();

  // ── INFO ────────────────────────────────────────────
  p.align("CT");
  p.text(`GSTIN - ${gstin}`);
  p.text(`INVOICE NO. - ${billData.billNo || billData.orderId}`);
  p.text(`TABLE NO. - ${billData.table_no || "Takeaway"}`);
  p.drawLine();

  p.align("LT").text(`Captain Name: ${captain}`);
  p.drawLine();
  p.text(`Time`);
  p.align("CT").text(`${billData.date_time}`);
  p.drawLine();

  // ── COLUMN HEADER ───────────────────────────────────
  p.align("LT").style("B");
  p.text("ITEM             QTY    RATE   AMOUNT");
  p.style("NORMAL").drawLine();

  // ── FOOD ITEMS ──────────────────────────────────────
  p.style("B").text("Food").style("NORMAL");

  billData.items.forEach((item) => {
    const fullName = item.name || "";
    const qty   = String(item.qty).padStart(4);
    const rate  = Number(item.price || item.rate || 0).toFixed(2).padStart(7);
    const total = Number(item.total || 0).toFixed(2).padStart(8);

    // pehli line — max 16 chars naam + columns
    const firstName = fullName.substring(0, 16).padEnd(16);
    p.text(`${firstName} ${qty}  ${rate} ${total}`);

    // agar naam 16 se lamba hai toh wrap
    if (fullName.length > 16) {
      p.text(`  ${fullName.substring(16)}`);
    }

    if (item.remark) p.text(`  Note: ${item.remark}`);
  });

  p.drawLine();

  // ── SUB TOTAL ───────────────────────────────────────
  p.align("CT").text(`Sub Total : ${Number(billData.subtotal || 0).toFixed(2)}`);
  p.drawLine();

  // ── TAXES ───────────────────────────────────────────
  if (billData.tax_breakdown?.length > 0) {
    billData.tax_breakdown.forEach((t) => {
      const label  = `${t.name}(${t.pct}%):`;
      const amount = Number(t.amount).toFixed(2);
      p.align("CT").text(`${label.padEnd(16)}${amount.padStart(10)}`);
    });
    p.drawLine();
  }

  // ── TOTAL + ROUND OFF ───────────────────────────────
  p.align("CT");
  p.text(`${"Total :".padEnd(16)}${String(billData.total_amount).padStart(10)}`);
  const rv = billData.round_off || 0;
  p.text(`${"Round Off :".padEnd(16)}${String(rv).padStart(10)}`);

  // ── PAYMENT SPLITS ──────────────────────────────────
  if (billData.payment_splits?.length > 0) {
    billData.payment_splits.forEach((s) => {
      if (s.mode && s.amount) {
        p.text(`${String(s.mode).padEnd(16)}${String(s.amount).padStart(10)}`);
      }
    });
  }

  if (parseFloat(billData.wallet_used || 0) > 0)
    p.text(`${"Wallet Applied :".padEnd(16)}${("-" + billData.wallet_used).padStart(10)}`);
  if (parseFloat(billData.advance_used || 0) > 0)
    p.text(`${"Advance Applied :".padEnd(16)}${("-" + billData.advance_used).padStart(10)}`);

  if (billData.is_lending && parseFloat(billData.remaining_amount || 0) > 0) {
    p.drawLine();
    p.align("CT").style("B").text(`DUE: Rs.${billData.remaining_amount}`).style("NORMAL");
  }

  p.drawLine();

  // ── GRAND TOTAL — normal bold, no size(1,1) ─────────
  p.align("CT").style("B");
  p.text(`Grand Total:(INR) ${billData.total_amount}`);
  p.style("NORMAL");

  p.drawLine();
  p.align("CT").text("Thank You..").text("Visit Again!!!");
  p.drawLine();
}

// function buildBillContent(p, billData) {
//   const name = billData.restaurant_name || "Chai Bolo Chai";
//   const address = billData.restaurant_address || "Indiranagar";
//   const gstin = billData.gstin || "";
//   const captain = billData.captain_name || "Captain";

//   // ── HEADER ──────────────────────────────────────────
//   p.align("CT").style("B").size(1, 1).text(name);
//   p.size(0, 0).style("NORMAL").text(address);
//   p.drawLine();

//   // ── INFO BLOCK ──────────────────────────────────────
//   p.align("CT");
//   p.text(`GSTIN - ${gstin}`);
//   p.text(`INVOICE NO. - ${billData.billNo || billData.orderId}`);
//   p.text(`TABLE NO. - ${billData.table_no || "Takeaway"}`);
//   p.drawLine();

//   p.align("LT");
//   p.text(`Captain Name: ${captain}`);
//   p.drawLine();
//   p.text(`Time`);
//   p.align("CT").text(`${billData.date_time}`);
//   p.drawLine();

//   // ── COLUMN HEADER ───────────────────────────────────
//   // 48 chars: ITEM(20) QTY(4) RATE(7) AMOUNT(8) + spaces
//   p.align("LT").style("B");
//   p.text("ITEM                 QTY   RATE  AMOUNT");
//   p.style("NORMAL").drawLine();

//   // ── FOOD SECTION ────────────────────────────────────
//   p.style("B").text("Food").style("NORMAL");

//   billData.items.forEach((item) => {
//     const fullName = item.name || "";
//     const qty = String(item.qty);
//     const rate = Number(item.price || item.rate || 0).toFixed(2);
//     const total = Number(item.total || 0).toFixed(2);

//     if (fullName.length <= 16) {
//       // ── Single line fit ho jaaye ──
//       // ITEM(16) + space + QTY(4) + RATE(7) + AMOUNT(8)
//       const n = fullName.padEnd(16);
//       const q = qty.padStart(4);
//       const r = rate.padStart(7);
//       const t = total.padStart(8);
//       p.text(`${n} ${q} ${r} ${t}`);
//     } else {
//       // ── Naam lambi hai — wrap karo ──
//       const firstLine = fullName.substring(0, 16).padEnd(16);
//       const restName = fullName.substring(16);
//       const q = qty.padStart(4);
//       const r = rate.padStart(7);
//       const t = total.padStart(8);
//       p.text(`${firstLine} ${q} ${r} ${t}`);
//       p.text(`  ${restName}`); // indent ke saath wrap
//     }

//     if (item.remark) p.text(`  Note: ${item.remark}`);
//   });

//   p.drawLine();

//   // ── SUB TOTAL (sirf ek baar) ────────────────────────
//   const subtotalVal = String(
//     Number(billData.subtotal || 0).toFixed(2)
//   );
//   p.align("CT").text(`Sub Total : ${subtotalVal}`);
//   p.drawLine();

//   // ── TAXES ───────────────────────────────────────────
//   if (billData.tax_breakdown?.length > 0) {
//     billData.tax_breakdown.forEach((t) => {
//       const label = `${t.name}(${t.pct}%):`;
//       const amount = Number(t.amount).toFixed(2);
//       p.align("CT").text(`${label.padEnd(16)}${amount.padStart(10)}`);
//     });
//     p.drawLine();
//   }

//   // ── TOTAL + ROUND OFF ───────────────────────────────
//   p.align("CT");
//   p.text(`${"Total :".padEnd(16)}${String(billData.total_amount).padStart(10)}`);
//   const rv = billData.round_off || 0;
//   p.text(`${"Round Off :".padEnd(16)}${String(rv).padStart(10)}`);

//   // ── PAYMENT SPLITS ──────────────────────────────────
//   if (billData.payment_splits?.length > 0) {
//     billData.payment_splits.forEach((s) => {
//       if (s.mode && s.amount) {
//         const modeLabel = String(s.mode).padEnd(16);
//         const modeAmt = String(s.amount).padStart(10);
//         p.text(`${modeLabel}${modeAmt}`);  // "Cash            :     10.00"
//       }
//     });
//   }

//   if (parseFloat(billData.wallet_used || 0) > 0)
//     p.text(`${"Wallet Applied :".padEnd(16)}${("-" + billData.wallet_used).padStart(10)}`);
//   if (parseFloat(billData.advance_used || 0) > 0)
//     p.text(`${"Advance Applied :".padEnd(16)}${("-" + billData.advance_used).padStart(10)}`);

//   if (billData.is_lending && parseFloat(billData.remaining_amount || 0) > 0) {
//     p.drawLine();
//     p.align("CT").style("B").text(`DUE: Rs.${billData.remaining_amount}`).style("NORMAL");
//   }

//   p.drawLine();

//   // ── GRAND TOTAL ─────────────────────────────────────
//   p.align("CT").style("B").size(1, 1);
//   p.text(`Grand Total:(INR)  ${billData.total_amount}`);
//   p.size(0, 0).style("NORMAL");

//   p.drawLine();
//   p.align("CT").text("Thank You..").text("Visit Again!!!");
//   p.drawLine();
// }

function buildKotContent(p, kotData) {
  // ── HEADER ──────────────────────────────────────────
  p.align("CT").style("B").size(1, 1);
  p.text("KOT");
  p.size(0, 0).style("NORMAL");
  p.drawLine();
 
  // ── META INFO ────────────────────────────────────────
  p.align("LT");
  p.text(`ORDER NO.-    ${kotData.orderId || kotData.orderNo || "—"}`);
  p.text(`TABLE NO.-    ${kotData.table_no || kotData.tableNo || "Takeaway"}`);
  p.text(`KOT NO.-      ${kotData.kotNo || "1"}`);
  p.text(`CAPTAIN NAME- ${kotData.captainName || kotData.captain_name || "—"}`);
  p.text(`TYPE-         ${kotData.type || "New"}`);
  p.text(`DATE & TIME-  ${kotData.dateTime || kotData.date_time || new Date().toLocaleString("en-IN")}`);
  p.drawLine();
 
  // ── COLUMN HEADER ────────────────────────────────────
  p.align("LT").style("B");
  p.text("ITEM                           QTY");
  p.style("NORMAL").drawLine();
 
  // ── ITEMS + ADD-ONS ──────────────────────────────────
  (kotData.items || []).forEach((item) => {
    const fullName = item.name || "";
    const qty = String(item.qty || 1);
 
    if (fullName.length <= 30) {
      // Single line
      p.style("B").text(`${fullName.padEnd(30)} ${qty.padStart(3)}`).style("NORMAL");
    } else {
      // Long name — wrap
      const first = fullName.substring(0, 30);
      const rest = fullName.substring(30);
      p.style("B").text(`${first.padEnd(30)} ${qty.padStart(3)}`).style("NORMAL");
      p.text(`  ${rest}`);
    }
 
    // ── Add-ons / Remarks ────────────────────────────
    // predefinedRemarks array
    if (item.predefinedRemarks?.length > 0) {
      item.predefinedRemarks.forEach((r) => {
        p.text(`  -> ${r}`);
      });
    }
 
    // qtyRemark (single string)
    if (item.qtyRemark?.trim()) {
      p.text(`  -> ${item.qtyRemark.trim()}`);
    }
 
    // globalRemark / remark
    const gRemark = item.globalRemark || item.remark;
    if (gRemark?.trim()) {
      p.text(`  Note: ${gRemark.trim()}`);
    }
  });
 
  p.drawLine();
}

// function buildBillContent(p, billData) {
//   const name = billData.restaurant_name || "Chai Bolo Chai";
//   const address = billData.restaurant_address || "Indiranagar";
//   const gstin = billData.gstin || "245454";
//   const captain = billData.captain_name || "Captain";

//   // Header
//   p.align("CT").style("B").text(name);
//   p.style("NORMAL").text(address);
//   p.drawLine();

//   // Info
//   p.align("LT");
//   p.text(`GSTIN      : ${gstin}`);
//   p.text(`INVOICE NO.: ${billData.billNo || billData.orderId}`);
//   p.text(`TABLE NO.  : ${billData.table_no || "Takeaway"}`);
//   p.drawLine();
//   p.text(`Captain    : ${captain}`);
//   p.text(`Time       : ${billData.date_time}`);
//   p.drawLine();

//   // Items header — 48 char wide
//   p.style("B").text("ITEM             QTY   RATE    AMT");
//   p.style("NORMAL").drawLine();
//   p.style("B").text("Food").style("NORMAL");

//   // Items
//   billData.items.forEach((item) => {
//     const iName = (item.name || "").substring(0, 16).padEnd(16);
//     const qty   = String(item.qty).padStart(4);
//     const rate  = String(Number(item.price || item.rate || 0).toFixed(2)).padStart(7);
//     const total = String(Number(item.total || 0).toFixed(2)).padStart(7);
//     p.text(`${iName}${qty} ${rate} ${total}`);
//     if (item.remark) p.text(`  Note: ${item.remark}`);
//   });

//   p.drawLine();

//   // Subtotal — sirf ek baar
//   p.text(`${"Sub Total :".padEnd(28)}${String(billData.subtotal || "0.00").padStart(8)}`);
//   p.drawLine();

//   // Taxes
//   if (billData.tax_breakdown?.length > 0) {
//     billData.tax_breakdown.forEach((t) => {
//       const label = `${t.name}(${t.pct}%):`;
//       p.text(`${label.padEnd(28)}${String(Number(t.amount).toFixed(2)).padStart(8)}`);
//     });
//     p.drawLine();
//   }

//   // Total + Round off
//   p.text(`${"Total :".padEnd(28)}${String(billData.total_amount).padStart(8)}`);
//   const rv = billData.round_off || 0;
//   p.text(`${"Round Off :".padEnd(28)}${String((rv >= 0 ? "+" : "") + rv).padStart(8)}`);

//   // Payment splits
//   if (billData.payment_splits?.length > 0) {
//     p.drawLine();
//     billData.payment_splits.forEach((s) => {
//       if (s.mode && s.amount)
//         p.text(`${s.mode.padEnd(28)}${String(s.amount).padStart(8)}`);
//     });
//   }

//   if (parseFloat(billData.wallet_used || 0) > 0)
//     p.text(`${"Wallet Applied :".padEnd(28)}${("-" + billData.wallet_used).padStart(8)}`);
//   if (parseFloat(billData.advance_used || 0) > 0)
//     p.text(`${"Advance Applied :".padEnd(28)}${("-" + billData.advance_used).padStart(8)}`);

//   if (billData.is_lending && parseFloat(billData.remaining_amount || 0) > 0) {
//     p.drawLine();
//     p.align("CT").style("B").text(`DUE: Rs.${billData.remaining_amount}`).style("NORMAL");
//   }

//   p.drawLine();

//   // ✅ Grand Total — normal size, nahi wrap hoga
//   p.align("CT").style("B");
//   p.text(`Grand Total:(INR) ${billData.total_amount}`);
//   p.style("NORMAL");

//   p.drawLine();
//   p.align("CT").text("Thank You..").text("Visit Again!!!");
// }

// function buildKotContent(p, kotData) {
//   p.align("CT").style("B").size(1, 1);
//   p.text("KOT");
//   p.style("NORMAL").size(0, 0);
//   p.drawLine();
//   p.text(`Order: ${kotData.orderId}`);
//   p.text(`Table: ${kotData.table_no || "Takeaway"}`);
//   p.text(`Time : ${new Date().toLocaleTimeString("en-IN")}`);
//   p.drawLine();
//   kotData.items.forEach((item) => {
//     p.style("B").text(`${item.qty} x ${item.name}`).style("NORMAL");
//     if (item.remark) p.text(`  Note: ${item.remark}`);
//   });
//   p.drawLine();
// }

// ✅ IPC BILL PRINT


ipcMain.handle("print-bill", async (event, { billData, token }) => {
  console.log("print-bill IPC received, orderId:", billData?.orderId);
  try {
    const printers = await fetchPrinters(token);
    const billPrinters = printers.filter((p) => p.printer_tab === "BILL");
    console.log("All printers raw data:", JSON.stringify(printers));
    console.log("BILL printers found:", billPrinters.length);

    if (billPrinters.length === 0)
      return { success: false, message: "No BILL printer configured in backend!" };

    const errors = [];
    for (const printer of billPrinters) {
      try {
        await printOnPrinter(printer, (p) => buildBillContent(p, billData));
        console.log(`Bill printed on ${printer.printer_value}`);
      } catch (err) {
        console.error(`Failed on ${printer.printer_value}:`, err.message);
        errors.push(err.message);
      }
    }
    return errors.length
      ? { success: false, message: errors.join(" | ") }
      : { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

// ✅ IPC KOT PRINT
ipcMain.handle("print-kot", async (event, { kotData, token }) => {
  console.log("print-kot IPC received, orderId:", kotData?.orderId);
  try {
    const printers = await fetchPrinters(token);
    const kotPrinters = printers.filter((p) => p.printer_tab === "KOT");

    if (kotPrinters.length === 0)
      return { success: false, message: "No KOT printer configured in backend!" };

    const errors = [];
    for (const printer of kotPrinters) {
      try {
        await printOnPrinter(printer, (p) => buildKotContent(p, kotData));
        console.log(`KOT printed on ${printer.printer_value}`);
      } catch (err) {
        console.error(`Failed on ${printer.printer_value}:`, err.message);
        errors.push(err.message);
      }
    }
    return errors.length
      ? { success: false, message: errors.join(" | ") }
      : { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
});