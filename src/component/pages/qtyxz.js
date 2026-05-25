// ─────────────────────────────────────────────────────────────
// qzPrint.js — QZ Tray helper for thermal (ESC/POS) printing
// Restaurant PC pe QZ Tray installed hona chahiye: https://qz.io
// ─────────────────────────────────────────────────────────────

const PRINTER_NAME = ""; // Blank = default printer. Ya likhna: "EPSON TM-T82"

// ── Load QZ Tray script dynamically ──────────────────────────
export const loadQZ = () =>
  new Promise((resolve, reject) => {
    if (window.qz) return resolve(window.qz);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js";
    script.onload = () => resolve(window.qz);
    script.onerror = () => reject(new Error("QZ Tray script load failed"));
    document.head.appendChild(script);
  });

// ── Connect to QZ Tray ────────────────────────────────────────
export const connectQZ = async () => {
  const qz = await loadQZ();
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect();
  }
  return qz;
};

// ── Main print function ───────────────────────────────────────
export const printBillQZ = async (billData) => {
      console.log("🔥 printBillQZ HIT", billData);
  const qz = await connectQZ();

  const printerName = PRINTER_NAME || (await qz.printers.getDefault());
  const config = qz.configs.create(printerName);

  // ── Build ESC/POS commands ────────────────────────────────
  const ESC = "\x1B";
  const GS  = "\x1D";
  const NL  = "\n";

  const center    = `${ESC}a\x01`;
  const left      = `${ESC}a\x00`;
  const boldOn    = `${ESC}E\x01`;
  const boldOff   = `${ESC}E\x00`;
  const bigText   = `${GS}!\x11`;   // double width + height
  const normalText= `${GS}!\x00`;
  const cutPaper  = `${GS}V\x42\x00`;
  const line      = "--------------------------------" + NL;

  const pad = (left, right, width = 32) => {
    const gap = width - left.length - right.length;
    return left + " ".repeat(Math.max(1, gap)) + right + NL;
  };

  let data = [];

  // REPRINT banner
  if (billData.isReprint) {
    data.push(center + boldOn + "*** REPRINT ***" + boldOff + NL);
  }

  // Header
  data.push(center + boldOn + bigText + "MY RESTAURANT" + normalText + boldOff + NL);
  data.push(center + "Lucknow" + NL);
  data.push(left + line);

  // Bill info
  data.push(`Bill No : ${billData.billNo || "N/A"}` + NL);
  data.push(`Order ID: ${billData.orderId || "N/A"}` + NL);
  if (billData.customer_name)  data.push(`Customer: ${billData.customer_name}` + NL);
  if (billData.customer_phone) data.push(`Phone   : ${billData.customer_phone}` + NL);
  data.push(line);

  // Items
  if (Array.isArray(billData.items)) {
    billData.items.forEach((item) => {
      data.push(pad(`${item.name} x${item.qty}`, `Rs.${item.total}`));
      if (item.remark) data.push(`  > ${item.remark}` + NL);
    });
  }
  data.push(line);

  // Totals
  data.push(pad("Sub Total", `Rs.${billData.subtotal || "0.00"}`));

  if (parseFloat(billData.discount || 0) > 0)
    data.push(pad("Discount", `-Rs.${billData.discount}`));

  if (parseFloat(billData.wallet_used || 0) > 0)
    data.push(pad("Wallet Applied", `-Rs.${billData.wallet_used}`));

  if (parseFloat(billData.advance_used || 0) > 0)
    data.push(pad("Advance Applied", `-Rs.${billData.advance_used}`));

  data.push(line);

  // Grand Total
  data.push(boldOn + pad("GRAND TOTAL", `Rs.${billData.total_amount || "0.00"}`) + boldOff);

  if (billData.paymentMethod)
    data.push(`Payment : ${billData.paymentMethod}` + NL);

  // Wallet / Advance payable
  if (parseFloat(billData.wallet_used || 0) > 0 || parseFloat(billData.advance_used || 0) > 0) {
    const applied = parseFloat(billData.wallet_used || 0) + parseFloat(billData.advance_used || 0);
    const payable = parseFloat(billData.total_amount || 0) - applied;
    data.push(pad("Payable Amount", `Rs.${Math.max(0, payable).toFixed(2)}`));
  }

  // Udhaar
  if (billData.is_lending && parseFloat(billData.remaining_amount || 0) > 0) {
    data.push(line);
    data.push(center + boldOn + `CREDIT DUE: Rs.${billData.remaining_amount}` + boldOff + NL);
  }

  // Advance due
  if (billData.is_advance && parseFloat(billData.remaining_amount || 0) > 0) {
    data.push(line);
    data.push(center + boldOn + `ADVANCE DUE: Rs.${billData.remaining_amount}` + boldOff + NL);
  }

  // Footer
  data.push(NL + center + "Thank You! Please Visit Again" + NL + NL + NL);
  data.push(cutPaper);

  // ── Send to printer ───────────────────────────────────────
  await qz.print(config, [
    {
      type: "raw",
      format: "plain",
      data: data.join(""),
    },
  ]);
};