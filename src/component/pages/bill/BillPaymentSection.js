import React from "react";

export default function BillPaymentSection({
  paymentSplits,
  setPaymentSplits,
  allModes,
  isLending,
  isAdvance,
  isReprint,
  afterWalletTotal,
  givenAmount,
  setGivenAmount,
  lendingRemaining,
  returnAmt,
}) {
  return (
    <>
      {/* Given / Return — Single split only */}
      {!isReprint && !isAdvance && paymentSplits.length === 1 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="main_input">
            <label>
              {isLending ? "Amount Paid Now (optional)" : "Given Amount"}
            </label>
            <input
              type="number"
              value={givenAmount}
              onChange={(e) => setGivenAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="main_input" s>
            <label>
              {isLending ? "Remaining Credit" : "Return Amount"}
            </label>
            <div
              className="px-3 py-2 rounded-xl text-sm font-bold text-center"
              style={
                isLending
                  ? {
                    background: "rgba(239,68,68,0.15)",
                    border: "1px solid rgba(248,113,113,0.4)",
                    color: "#fca5a5",
                  }
                  : {
                    background: "rgba(16,185,129,0.15)",
                    border: "1px solid rgba(52,211,153,0.3)",
                    color: "#6ee7b7",
                  }
              }
            >
              ₹
              {isLending
                ? lendingRemaining.toFixed(2)
                : returnAmt.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Lending banner */}
      {isLending && !isReprint && (
        <div
          className="rounded-xl px-4 py-3 text-sm font-semibold text-center"
          style={{
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(248,113,113,0.35)",
            color: "#fca5a5",
          }}
        >
          Lending Mode — Customer details required
          {lendingRemaining > 0 && (
            <div className="text-lg font-bold mt-1 text-red-300">
              DUE: ₹{lendingRemaining.toFixed(2)}
            </div>
          )}
        </div>
      )}

      {/* ADVANCE BANNER */}
      {isAdvance && !isReprint && (
        <div
          className="rounded-xl px-4 py-3 text-sm font-semibold text-center"
          style={{
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(52,211,153,0.35)",
            color: "#6ee7b7",
          }}
        >
          Advance Mode — Customer wallet se payment hogi
          {afterWalletTotal > 0 ? (
            <div className="text-lg font-bold mt-1 text-red-300">
              REMAINING DUE: ₹{afterWalletTotal.toFixed(2)}
            </div>
          ) : afterWalletTotal === 0 ? (
            <div className="text-sm font-bold mt-1 text-green-300">
              Fully covered by advance!
            </div>
          ) : null}
        </div>
      )}

      {/* Payment modes — MULTIPLE SPLIT */}
      <div>
        <label className="text-xs text-dark uppercase tracking-widest mb-2 block">
          Payment Method {!isReprint && "*"}
        </label>

        {paymentSplits.map((split, idx) => {
          const isFirst = idx === 0;
          return (
            <div key={idx} className="mb-3">
              {/* Mode buttons */}
              <div className="flex flex-wrap gap-2 mb-2">
                {allModes.map((m) => {
                  const isSelected =
                    split.mode?.toLowerCase() === m.name?.toLowerCase();
                  const isLendingBtn =
                    m.name?.toLowerCase() === "lending";
                  const isAdvanceBtn =
                    m.name?.toLowerCase() === "advance";
                  // Advance sirf first split mein allowed; Lending second mein bhi allow
                  if (!isFirst && isAdvanceBtn) return null;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        const updated = [...paymentSplits];
                        updated[idx] = { ...updated[idx], mode: m.name };
                        // Agar sirf ek split hai to full amount auto-fill
                        if (paymentSplits.length === 1) {
                          updated[idx].amount = afterWalletTotal.toFixed(2);
                        }
                        // Agar Lending second split mein select kiya — remaining auto-fill
                        if (m.name?.toLowerCase() === "lending" && !isFirst) {
                          const otherPaid = paymentSplits
                            .filter((_, i) => i !== idx)
                            .reduce((s, p) => s + parseFloat(p.amount || 0), 0);
                          updated[idx].amount = Math.max(0, afterWalletTotal - otherPaid).toFixed(2);
                        }
                        setPaymentSplits(updated);
                        // Given Amount auto-fill (dono side dikhane ke liye)
                        const modeLower = m.name?.toLowerCase();
                        if (
                          paymentSplits.length === 1 &&
                          modeLower !== "lending" &&
                          modeLower !== "advance"
                        ) {
                          setGivenAmount(afterWalletTotal.toFixed(2));
                        }
                      }}
                      className="payment_method_btn"
                      style={
                        isSelected
                          ? isLendingBtn
                            ? {
                              background: "rgba(239,68,68,0.3)",
                              border: "1px solid rgba(248,113,113,0.5)",
                              color: "#fca5a5",
                            }
                            : isAdvanceBtn
                              ? {
                                background: "rgba(16,185,129,0.25)",
                                border: "1px solid rgba(52,211,153,0.5)",
                                color: "#6ee7b7",
                              }
                              : {
                                background: "rgba(124,58,237,0.4)",
                                border: "1px solid rgba(167,139,250,0.5)",
                                color: "#A83CF6",
                              }
                          : {

                          }
                      }
                    >
                      {m.name}
                    </button>
                  );
                })}
              </div>

              {/* Amount input — multi-split mein dikhao */}
              <div className="flex items-center gap-2">
                <div className="main_input">
                  <input
                    type="number"
                    value={split.amount}
                    onChange={(e) => {
                      const updated = [...paymentSplits];
                      updated[idx].amount = e.target.value;
                      setPaymentSplits(updated);
                    }}
                    placeholder="Amount"
                    // Single split mein amount readonly (auto = total)
                    readOnly={paymentSplits.length === 1}
                  />
                </div>
                {/* Remove button — first split nahi hata sakte */}
                {!isFirst && (
                  <button
                    onClick={() =>
                      setPaymentSplits(
                        paymentSplits.filter((_, i) => i !== idx)
                      )
                    }
                    className="px-3 py-2 rounded-xl text-sm font-bold"
                    style={{
                      background: "rgba(239,68,68,0.2)",
                      border: "1px solid rgba(248,113,113,0.35)",
                      color: "#fca5a5",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Split summary + Add button */}
        {(() => {
          const totalSplitPaid = paymentSplits.reduce(
            (s, p) => s + parseFloat(p.amount || 0),
            0
          );
          const splitRemaining = parseFloat(
            (afterWalletTotal - totalSplitPaid).toFixed(2)
          );
          const hasLendingSplit = paymentSplits.some(p => p.mode?.toLowerCase() === "lending");
          const canAdd = !isAdvance && !hasLendingSplit && paymentSplits.length < 4;
          return (
            <>
              {paymentSplits.length > 1 && (
                <div
                  className="rounded-xl px-3 py-2 mb-2 text-sm"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <div className="flex justify-between text-dark">
                    <span>Total Entered</span>
                    <span>₹{totalSplitPaid.toFixed(2)}</span>
                  </div>
                  <div
                    className="flex justify-between font-bold mt-1"
                    style={{
                      color: splitRemaining === 0 ? "#6ee7b7" : "#fca5a5",
                    }}
                  >
                    <span>
                      {splitRemaining === 0 ? "✅ Balanced" : "Remaining"}
                    </span>
                    <span>₹{Math.abs(splitRemaining).toFixed(2)}</span>
                  </div>
                </div>
              )}
              {canAdd && (
                <button
                  onClick={() => {
                    const totalSoFar = paymentSplits.reduce(
                      (s, p) => s + parseFloat(p.amount || 0),
                      0
                    );
                    const rem = Math.max(
                      0,
                      afterWalletTotal - totalSoFar
                    );
                    setPaymentSplits([
                      ...paymentSplits,
                      { mode: "", amount: rem.toFixed(2) },
                    ]);
                  }}
                  className="main_btn mt-1"
                >
                  + Add Another Payment Method
                </button>
              )}
            </>
          );
        })()}
      </div>
    </>
  );
}
