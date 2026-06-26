import React from "react";

function Row({ label, value, bold, highlight, muted }) {
  return (
    <div className="flex justify-between items-center px-3 py-2 border-b border-white/5 last:border-0">
      <span
        className={`text-sm ${muted
          ? "text-dark"
          : bold
            ? "text-dark font-semibold"
            : "text-dark"
          }`}
      >
        {label} :
      </span>
      <span
        className={`text-sm font-medium ${highlight
          ? "text-purple-300"
          : bold
            ? "text-dark font-bold"
            : "text-dark"
          }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function BillBreakdown({
  subTotal,
  taxBreakdown,
  chargeBreakdown,
  totalItemQty,
  discountAmount,
  roundOff,
  grandTotal,
  isAdvance,
  maxWalletUse,
  afterWalletTotal,
  useWallet,
  isReprint,
  reprintWalletUsed,
  reprintRemainingDue,
  advanceRemaining,
}) {
  return (
    <div className="main_table_container">
      <Row label="Sub-Total" value={`₹${subTotal.toFixed(2)}`} />
      <Row
        label="Bill Amount"
        value={`₹${subTotal.toFixed(2)}`}
        muted
      />
      <div className="border-t border-white/5" />
      {taxBreakdown.length === 0 ? (
        <Row label="Tax" value="₹0.00" muted />
      ) : (
        taxBreakdown.map((t, i) => (
          <Row
            key={i}
            label={`${t.name} (${t.pct}%)`}
            value={`₹${t.amount.toFixed(2)}`}
            muted
          />
        ))
      )}
      {chargeBreakdown.map((c, i) => (
        <Row
          key={i}
          label={c.field === "Item" ? `${c.name} (per item ×${totalItemQty})` : c.name}
          value={`₹${c.amount.toFixed(2)}`}
          muted
        />
      ))}
      <div className="border-t border-white/5" />
      <Row
        label="Discount"
        value={
          discountAmount > 0
            ? `-₹${discountAmount.toFixed(2)}`
            : "₹0.00"
        }
        muted
      />
      <Row
        label="Round Off"
        value={`${roundOff >= 0 ? "+" : ""}${roundOff}`}
        muted
      />
      <div className="border-t border-white/5" />
      <Row label="Grand Total" value={`₹${grandTotal}`} bold />

      {/* Wallet applied */}
      {(isReprint ? reprintWalletUsed : maxWalletUse) > 0 && (
        <>
          <div
            className="flex justify-between items-center px-3 py-2 border-t border-white/5"
            style={{ background: "rgba(16,185,129,0.08)" }}
          >
            <span className="text-sm" style={{ color: "#6ee7b7" }}>
              {isAdvance ? "Advance Applied" : "Wallet Applied"}
            </span>
            <span
              className="text-sm font-bold"
              style={{ color: "#6ee7b7" }}
            >
              -₹
              {(isReprint ? reprintWalletUsed : maxWalletUse).toFixed(
                2
              )}
            </span>
          </div>
          <div
            className="flex justify-between items-center px-3 py-2 border-t border-white/5"
            style={{ background: "rgba(16,185,129,0.05)" }}
          >
            <span className="text-sm font-bold text-white">
              Payable Amount
            </span>
            <span className="text-sm font-bold text-white">
              ₹{isReprint ? reprintRemainingDue : afterWalletTotal}
            </span>
          </div>
        </>
      )}

      {isAdvance && advanceRemaining > 0 && (
        <div
          className="flex justify-between items-center px-3 py-2 border-t border-white/5"
          style={{ background: "rgba(239,68,68,0.12)" }}
        >
          <span
            className="text-sm font-bold"
            style={{ color: "#fca5a5" }}
          >
            Advance Remaining Due
          </span>
          <span
            className="text-sm font-bold"
            style={{ color: "#fca5a5" }}
          >
            ₹{isReprint
              ? reprintRemainingDue.toFixed(2)
              : advanceRemaining.toFixed(2)}{" "}
          </span>
        </div>
      )}

      {/* Advance fully covered */}
      {isAdvance && advanceRemaining === 0 && maxWalletUse > 0 && (
        <div
          className="px-3 py-2 border-t border-white/5 text-center text-xs font-semibold"
          style={{
            background: "rgba(16,185,129,0.1)",
            color: "#6ee7b7",
          }}
        >
          Advance fully covers this order!
        </div>
      )}
    </div>
  );
}
