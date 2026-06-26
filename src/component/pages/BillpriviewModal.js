

export default function BillPreviewModal({ isOpen, billData, onConfirm, onClose, loading }) {
  if (!isOpen || !billData) return null;

  const {
    restaurant_name = "",
    restaurant_address = "",
    gstin = "",
    captain_name = "",
    customer_name = "",
    customer_phone = "",
    billNo,
    uniqueOrderId,
    table_no,
    date_time,
    items = [],
    subtotal = "0.00",
    tax_breakdown = [],
    charge_breakdown = [],
    total_charges = 0,
    discount = 0,
    coupon_name = null,
    total_amount = "0.00",
    round_off = 0,
    payment_splits = [],
    paymentMethod,
    wallet_used = 0,
    advance_used = 0,
    is_lending,
    is_advance,
    remaining_amount = 0,
  } = billData;

  const totalTax = tax_breakdown.reduce((s, t) => s + (t.amount || 0), 0);

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
      {/* Outer card */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          maxHeight: "95vh",
          overflowY: "auto",
        }}
      >
        {/* Label */}
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, letterSpacing: 2, textTransform: "uppercase" }}>
          Bill Preview
        </div>

        {/* Thermal receipt */}
        <div
          style={{
            background: "#fff",
            width: 300,
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: 12,
            color: "#111",
            padding: "16px 14px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            borderRadius: 2,
            // Torn paper top edge
            clipPath: "polygon(0 4px,4px 0,8px 4px,12px 0,16px 4px,20px 0,24px 4px,28px 0,32px 4px,36px 0,40px 4px,44px 0,48px 4px,52px 0,56px 4px,60px 0,64px 4px,68px 0,72px 4px,76px 0,80px 4px,84px 0,88px 4px,92px 0,96px 4px,100% 4px,100% 100%,0 100%)",
            paddingTop: 20,
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 6 }}>
            <div style={{ fontWeight: "bold", fontSize: 15, letterSpacing: 1 }}>
              {restaurant_name}
            </div>
            <div style={{ fontSize: 11 }}>{restaurant_address}</div>
          </div>

          <Divider />

          <div style={{ textAlign: "center", fontSize: 11, marginBottom: 2 }}>
            <div>GSTIN &nbsp;&nbsp; {gstin}</div>
            <div>INVOICE NO. &nbsp;&nbsp; {uniqueOrderId }</div>
            <div>TABLE NO. &nbsp;&nbsp; {table_no || "Takeaway"}</div>
          </div>

          <Divider />

          {/* Captain + Time — dono left */}
          <LeftRow label="Captain Name" value={captain_name} />
          <LeftRow label="Time" value={date_time} />

          <Divider />

          {/* Customer — sirf tab dikhao jab ho */}
          {(customer_name || customer_phone) && (
            <>
              {customer_name && <Row label="Customer Name" value={customer_name} />}
              {customer_phone && <Row label="Customer Mobile No." value={customer_phone} />}
              <Divider />
            </>
          )}

          {/* Items header */}
          <div style={{ display: "flex", fontWeight: "bold", fontSize: 11, marginBottom: 4 }}>
            <span style={{ flex: 1 }}>ITEM</span>
            <span style={{ width: 30, textAlign: "right" }}>QTY</span>
            <span style={{ width: 50, textAlign: "right" }}>RATE</span>
            <span style={{ width: 55, textAlign: "right" }}>AMT</span>
          </div>

          <Divider />

          {/* Category label */}
          <div style={{ fontWeight: "bold", fontSize: 11, marginBottom: 4 }}>Food</div>

          {/* Items */}
          {items.map((item, i) => (
            <div key={i}>
              <div style={{ display: "flex", fontSize: 11, marginBottom: 2 }}>
                <span style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                  {item.name}
                </span>
                <span style={{ width: 30, textAlign: "right" }}>{item.qty}</span>
                <span style={{ width: 50, textAlign: "right" }}>{Number(item.rate).toFixed(2)}</span>
                <span style={{ width: 55, textAlign: "right" }}>{Number(item.total).toFixed(2)}</span>
              </div>
              {item.remark && (
                <div style={{ fontSize: 10, color: "#555", paddingLeft: 8, marginBottom: 2 }}>
                  Note: {item.remark}
                </div>
              )}
            </div>
          ))}

          <Divider />

          {/* Sub total */}
          <AmtRow label="Sub Total" value={subtotal} />

          <Divider />

          {/* Tax breakdown */}
          {tax_breakdown.map((t, i) => (
            <AmtRow key={i} label={`${t.name}(${t.pct}%)`} value={t.amount?.toFixed(2)} muted />
          ))}

          {/* Charges breakdown */}
          {charge_breakdown.length > 0 && (
            <>
              {charge_breakdown.map((c, i) => (
                <AmtRow
                  key={i}
                  label={c.field === "Item" ? `${c.name}(per item)` : c.name}
                  value={Number(c.amount).toFixed(2)}
                  muted
                />
              ))}
            </>
          )}

          {/* Discount */}
          {parseFloat(discount) > 0 && (
            <AmtRow label={coupon_name ? `Discount (${coupon_name})` : "Discount"} value={`-${Number(discount).toFixed(2)}`} muted />
          )}

          <Divider />

          <AmtRow label="Total" value={total_amount} />
          <AmtRow
            label="Round Off"
            value={`${round_off >= 0 ? "+" : ""}${round_off}`}
            muted
          />

          {/* Payment split */}
          {payment_splits.length > 0 && (
            <>
              <Divider />
              {payment_splits.map((s, i) =>
                s.mode && s.amount ? (
                  <AmtRow key={i} label={s.mode} value={`: ${s.amount}`} muted />
                ) : null
              )}
            </>
          )}

          {/* Wallet / Advance */}
          {parseFloat(wallet_used) > 0 && (
            <AmtRow label="Wallet Applied" value={`-${wallet_used}`} muted />
          )}
          {parseFloat(advance_used) > 0 && (
            <AmtRow label="Advance Applied" value={`-${advance_used}`} muted />
          )}

          {/* Lending due */}
          {is_lending && parseFloat(remaining_amount) > 0 && (
            <>
              <Divider />
              <div style={{ fontWeight: "bold", textAlign: "center", fontSize: 12 }}>
                DUE AMOUNT : Rs.{remaining_amount}
              </div>
            </>
          )}

          <Divider />
          {/* Grand Total */}
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 13, margin: "6px 0" }}>
            Grand Total:(INR)&nbsp;&nbsp;{total_amount}
          </div>

          <Divider />

          {/* Footer */}
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 12, marginTop: 6 }}>
            Thank You..
          </div>
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 12 }}>
            Visit Again!!!
          </div>

          {/* Torn paper bottom */}
          <div style={{ height: 12 }} />
          {/* Powered by */}
          <div style={{ textAlign: "center", fontSize: 12, color: "#aaa", marginTop: 6 }}>
            powered by FerryRestro v1.0.1
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
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: "10px 28px",
              borderRadius: 10,
              border: "none",
              background: loading ? "rgba(124,58,237,0.4)" : "rgba(124,58,237,0.9)",
              color: "#fff",
              fontSize: 14,
              fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Printing..." : "🖨️ Print "}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helper components ─────────────────────────

function Divider() {
  return (
    <div style={{
      borderTop: "1px dashed #999",
      margin: "5px 0",
    }} />
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
      <span style={{ color: "#333" }}>{label}</span>
      <span style={{ fontWeight: "bold" }}>{value}</span>
    </div>
  );
}

function LeftRow({ label, value }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "flex-start",
      gap: 6,
      fontSize: 11,
      marginBottom: 2
    }}>
      <span style={{ color: "#333" }}>{label} :</span>
      <span >{value}</span>
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