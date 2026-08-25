import React, { useRef } from "react";
import toast from "react-hot-toast";

const KOTPrintSlip = ({ kotData, onClose }) => {
  const printRef = useRef();

  const handlePrint = async () => {
    const token = localStorage.getItem("token");

    if (window.electronAPI?.printKot) {
      const result = await window.electronAPI.printKot({
        kotData: {
          orderId: kotData.orderNo,
          table_no: kotData.tableNo,
          kotNo: kotData.kotNo,
          captainName: kotData.captainName,
          type: kotData.type,
          dateTime: kotData.dateTime,
          items: (kotData.items || []).map((i) => ({
            name: i.name,
            qty: i.qty,
            predefinedRemarks: i.predefinedRemarks || [],
            qtyRemark: i.qtyRemark || "",
            globalRemark: i.globalRemark || "",
          })),
        },
        token,
      });
      if (result.success) {
        toast.success("KOT printed!");
      } else {
        toast.error(`Print failed: ${result.message}`);
      }
    } else {
      const printContents = printRef.current.innerHTML;
      const win = window.open("", "_blank", "width=400,height=600");
      win.document.write(`
        <html>
          <head>
            <title>KOT Print</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                background: #fff;
                color: #000;
                width: 80mm;
                padding: 8px;
              }
            </style>
          </head>
          <body>${printContents}</body>
        </html>
      `);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); win.close(); }, 300);
    }
  };

  if (!kotData) return null;

  const { orderNo, tableNo, kotNo, captainName, type, dateTime, items = [] } = kotData;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0e2a47b5",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxHeight: "95vh", overflowY: "auto" }}>

        {/* Label */}
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, letterSpacing: 2, textTransform: "uppercase" }}>
          KOT Preview
        </div>

        {/* Thermal Receipt */}
        <div
          ref={printRef}
          style={{
            background: "#fff",
            width: 300,
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: 12,
            color: "#111",
            padding: "20px 14px 16px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            borderRadius: 2,
            clipPath: "polygon(0 4px,4px 0,8px 4px,12px 0,16px 4px,20px 0,24px 4px,28px 0,32px 4px,36px 0,40px 4px,44px 0,48px 4px,52px 0,56px 4px,60px 0,64px 4px,68px 0,72px 4px,76px 0,80px 4px,84px 0,88px 4px,92px 0,96px 4px,100% 4px,100% 100%,0 100%)",
          }}
        >
          {/* KOT Heading */}
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 16, letterSpacing: 2, marginBottom: 4 }}>
            KOT
          </div>

          <KotDivider />

          {/* Meta Info */}
          {/* Meta Info — Center aligned */}
          <div style={{ textAlign: "center", fontSize: 11, marginBottom: 2 }}>
            <div>ORDER NO. &nbsp;&nbsp; {orderNo || "—"}</div>
            <div>TABLE NO. &nbsp;&nbsp; {tableNo || "—"}</div>
            <div>KOT NO. &nbsp;&nbsp; {kotNo || "1"}</div>
          </div>

          <KotDivider />

          {/* Captain, Type, DateTime — left right */}
          <KotRow label="CAPTAIN" value={captainName || "—"} />
          <KotRow label="TYPE" value={type || "—"} />
          <KotRow label="DATE & TIME" value={dateTime || "—"} />

          <KotDivider />

          {/* Items Header */}
          <div style={{ display: "flex", fontWeight: "bold", fontSize: 11, marginBottom: 4 }}>
            <span style={{ flex: 1 }}>ITEM</span>
            <span style={{ width: 40, textAlign: "right" }}>QTY</span>
          </div>

          <KotDivider />

          {/* Items */}
          {items.map((item, idx) => {
            const remarks = [
              ...(item.predefinedRemarks || []),
              item.qtyRemark?.trim() || "",
              item.globalRemark?.trim() ? `Note: ${item.globalRemark.trim()}` : "",
            ].filter(Boolean);

            return (
              <React.Fragment key={idx}>
                <div style={{ display: "flex", fontSize: 12, fontWeight: "bold", marginBottom: 2 }}>
                  <span style={{ flex: 1 }}>{item.name}</span>
                  <span style={{ width: 40, textAlign: "right" }}>{item.qty}</span>
                </div>
                {remarks.map((r, ri) => (
                  <div key={ri} style={{ fontSize: 10, color: "#555", paddingLeft: 10, fontStyle: "italic", marginBottom: 2 }}>
                    ↳ {r}
                  </div>
                ))}
              </React.Fragment>
            );
          })}

          <KotDivider />

          {/* Powered by */}
          <div style={{ textAlign: "center", fontSize: 9, color: "#aaa", marginTop: 4 }}>
            powered by FerryInfotech v1.0.1
          </div>

          <div style={{ height: 12 }} />
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 24px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            ✕ Close
          </button>
          <button
            onClick={handlePrint}
            style={{
              padding: "10px 28px",
              borderRadius: 10,
              border: "none",
              background: "rgba(124,58,237,0.9)",
              color: "#fff",
              fontSize: 14,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            🖨️ Print KOT
          </button>
        </div>

      </div>
    </div>
  );
};

export default KOTPrintSlip;

// ── Helper Components ─────────────────────────

function KotDivider() {
  return (
    <div style={{ borderTop: "1px dashed #999", margin: "5px 0" }} />
  );
}

function KotRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
      <span style={{ color: "#333" }}>{label}</span>
      <span style={{ fontWeight: "bold" }}>{value}</span>
    </div>
  );
}