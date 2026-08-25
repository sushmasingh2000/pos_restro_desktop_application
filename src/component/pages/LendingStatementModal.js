import React, { useRef } from "react";
import toast from "react-hot-toast";

export default function LendingStatementModal({ isOpen, onClose, customer, lendingDetails = [], branch = {} }) {
  const printRef = useRef();

  if (!isOpen || !customer) return null;

  const {
    business_name = "",
    restaurant_name = "",
    outlet_name = "",
    address = "",
    gst_no = "",
  } = branch;

  const generatedAt = new Date().toLocaleString("en-IN");

  const totalBilled = lendingDetails.reduce((s, d) => s + parseFloat(d.dg042_bill_amount || 0), 0);
  const totalPaid = lendingDetails.reduce((s, d) => s + parseFloat(d.dg042_paid_amount || 0), 0);
  const totalDue = lendingDetails.reduce((s, d) => s + parseFloat(d.dg042_remaining_amount || 0), 0);
  const totalGst = lendingDetails.reduce((s, d) => s + parseFloat(d.dg042_tax_amount || 0), 0);

  const handlePrint = async () => {
    const token = localStorage.getItem("token");

    if (window.electronAPI?.printStatement) {
      const statementData = {
        business_name,
        restaurant_name,
        outlet_name,
        address,
        gstin: gst_no,
        generatedAt,
        customer_name: customer.customer_name,
        customer_phone: customer.customer_phone,
        totalBilled,
        totalPaid,
        totalDue,
        bills: lendingDetails.map((due) => {
          const orderDate = new Date(due.dg042_order_date || due.dg042_created_at);
          return {
            date: orderDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }),
            time: orderDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
            orderId: due.dg042_unique_order_id || due.dg042_order_id,
            paid: parseFloat(due.dg042_paid_amount || 0),
            due: parseFloat(due.dg042_remaining_amount || 0),
            items: (due.items || []).map((it) => ({
              name: it.dg07_menu_name_snapshot,
              qty: it.dg07_quantity,
              amount: parseFloat(it.dg07_price || 0) * parseFloat(it.dg07_quantity || 0),
            })),
          };
        }),
      };

      const result = await window.electronAPI.printStatement({ statementData, token });
      if (result.success) {
        toast.success("Statement printed!");
      } else {
        toast.error(`Print failed: ${result.message}`);
      }
      return;
    }

    const printContents = printRef.current.innerHTML;
    const win = window.open("", "_blank", "width=400,height=600");
    win.document.write(`
      <html>
        <head>
          <title>Due Statement</title>
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
  };

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
          Statement Preview
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
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 6 }}>
            <div style={{ fontWeight: "bold", fontSize: 15, letterSpacing: 1, marginBottom: 5 }}>
              {business_name || restaurant_name}
            </div>
            {outlet_name && <div style={{ fontSize: 11 }}>{outlet_name}</div>}
            {/* {address && <div style={{ fontSize: 11 }}>{address}</div>} */}
            {gst_no && gst_no !== "0" && <div style={{ fontSize: 11 }}>GSTIN: {gst_no}</div>}
          </div>

          <Divider />

          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 14, letterSpacing: 1, margin: "4px 0" }}>
            DUE STATEMENT
          </div>
          <div style={{ textAlign: "center", fontSize: 10, color: "#555", marginBottom: 4 }}>
            Generated: {generatedAt}
          </div>

          <Divider />

          <LeftRow label="Customer" value={customer.customer_name} />
          {customer.customer_phone && <LeftRow label="Phone" value={customer.customer_phone} />}

          <Divider />

          {/* Ledger header */}
          <div style={{ display: "flex", fontWeight: "bold", fontSize: 11, marginBottom: 4 }}>
            <span style={{ width: 78 }}>DATE</span>
            <span style={{ flex: 1 }}>ORDER ID</span>
            {/* <span style={{ width: 28, textAlign: "right" }}>GST</span> */}
            <span style={{ width: 32, textAlign: "right" }}>DUE</span>
            <span style={{ width: 32, textAlign: "right" }}>PAID</span>
          
          </div>

          <Divider />

          {/* Every bill for this customer — full list, no truncation */}
          {lendingDetails.map((due) => {
            const orderDate = new Date(due.dg042_order_date || due.dg042_created_at);
            const dateStr = orderDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
            const timeStr = orderDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
            return (
              <div key={due.dg042_lending_id} style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", fontSize: 11 }}>
                  <span style={{ width: 78 }}>{dateStr}</span>
                  <span style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {due.dg042_unique_order_id || due.dg042_order_id}
                  </span>
                 
                  <span style={{ width: 32, textAlign: "right", fontWeight: due.dg042_status === "settled" ? "normal" : "bold" }}>
                    {parseFloat(due.dg042_remaining_amount).toFixed(0)}
                  </span>
                   <span style={{ width: 32, textAlign: "right", color: "#137a4c" }}>
                    {parseFloat(due.dg042_paid_amount || 0) > 0 ? parseFloat(due.dg042_paid_amount).toFixed(0) : "-"}
                  </span>
                </div>
                {(due.items || []).map((it, idx) => (
                  <div
                    key={idx}
                    style={{ display: "flex", fontSize: 10, color: "#555", paddingLeft: 8 }}
                  >
                    <span style={{ width: 70, color: "#888" }}>{idx === 0 ? timeStr : ""}</span>
                    <span style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      {it.dg07_menu_name_snapshot} x{it.dg07_quantity} - {(parseFloat(it.dg07_price || 0) * parseFloat(it.dg07_quantity || 0)).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}

          <Divider />

          <AmtRow label="Total Billed" value={totalBilled.toFixed(2)} />
          {/* <AmtRow label="Total GST" value={totalGst.toFixed(2)} muted /> */}
          <AmtRow label="Total Paid" value={totalPaid.toFixed(2)} muted />

          <Divider />

          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 13, margin: "6px 0" }}>
            Total Due: Rs.{totalDue.toFixed(2)}
          </div>

          <Divider />

          <div style={{ textAlign: "center", fontSize: 12, color: "#aaa", marginTop: 6 }}>
            powered by FerryInfotech v1.0.1
          </div>
        </div>

        {/* Action buttons */}
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
            ✕ Cancel
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
            🖨️ Print
          </button>
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: "1px dashed #999", margin: "5px 0" }} />;
}

function LeftRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", gap: 6, fontSize: 11, marginBottom: 2 }}>
      <span style={{ color: "#333" }}>{label} :</span>
      <span>{value}</span>
    </div>
  );
}

function AmtRow({ label, value, muted }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
      <span style={{ color: muted ? "#555" : "#111" }}>{label} :</span>
      <span style={{ color: muted ? "#555" : "#111" }}>{value}</span>
    </div>
  );
}
