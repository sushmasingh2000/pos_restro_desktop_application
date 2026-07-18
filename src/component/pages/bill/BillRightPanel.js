import React from "react";

export default function BillRightPanel({
  customer,
  setCustomer,
  customerSearch,
  setCustomerSearch,
  customerList,
  setCustomerList,
  selectedCustomerId,
  setSelectedCustomerId,
  walletBalance,
  useWallet,
  setUseWallet,
  isAdvance,
  isReprint,
  grandTotal,
  maxWalletUse,
  afterWalletTotal,
  advanceRemaining,
  isLending,
  discountMode,
  setDiscountMode,
  discountPct,
  setDiscountPct,
  couponCode,
  setCouponCode,
  couponDiscount,
  setCouponDiscount,
  discountAmount,
  subTotal,
  activeOffers,
  applyCoupon,
  applyOfferDirect,
  couponBlocked,
  discountBlocked,
}) {
  const inp = "";

  return (
    <div className="w-96 p-5 pt-0 space-y-4 flex-shrink-0">
      {/* Customer Search */}
      <div className="main_input">
        <label>
           Search Customer
          {isAdvance && (
            <span className="text-red-400 ml-1">
              * (Advance is Required)
            </span>
          )}
        </label>
        <input
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
          placeholder="Search by name or phone"
          className={`${3} ${isAdvance && !selectedCustomerId ? "" : ""}`}
        />
        {customerList.length > 0 && (
          <div className="bg-white/10 border border-white/20 rounded-xl mt-2 max-h-40 overflow-y-auto">
            {customerList.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  setSelectedCustomerId(c.id);
                  setCustomer({
                    name: c.name,
                    phone: c.phone,
                    address: c.address || "",
                    tax_id: c.tax_id || "",
                    dob: c.dob || "",
                    anniversary: c.anniversary || "",
                  });
                  setCustomerSearch(c.name);
                  setCustomerList([]);
                }}
                className="px-3 py-2 hover:bg-white/10 cursor-pointer text-sm"
              >
                {c.name} - {c.phone}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Wallet section */}
      {selectedCustomerId && (
        <div
          className="rounded-xl p-3"
          style={{
            background:
              walletBalance > 0
                ? "rgba(16,185,129,0.08)"
                : "rgba(255,255,255,0.04)",
            border:
              walletBalance > 0
                ? "1px solid rgba(52,211,153,0.25)"
                : "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-xs text-dark uppercase tracking-widest">
                {/*Label change: advance mode mein "Advance Balance" dikhao */}
                {isAdvance ? "Advance Balance" : "Wallet Balance"}
              </div>
              <div
                className="text-lg font-bold mt-0.5"
                style={{
                  color:
                    walletBalance > 0
                      ? "#6ee7b7"
                      : "rgba(255,255,255,0.3)",
                }}
              >
                ₹{walletBalance.toFixed(2)}
              </div>
              {/*Advance mode mein remaining bhi dikhao */}
              {isAdvance && advanceRemaining > 0 && (
                <div
                  className="text-xs mt-1"
                  style={{ color: "#fca5a5" }}
                >
                  After order: ₹{advanceRemaining.toFixed(2)} due
                </div>
              )}
              {isAdvance &&
                advanceRemaining === 0 &&
                walletBalance > 0 && (
                  <div
                    className="text-xs mt-1"
                    style={{ color: "#6ee7b7" }}
                  >
                    Fully covers ₹{grandTotal} order
                  </div>
                )}
            </div>

            {/* Toggle — advance mode mein auto ON, sirf normal mode mein manual toggle */}
            {walletBalance > 0 && !isAdvance && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs text-dark">Use wallet</span>
                <div
                  onClick={() => setUseWallet((w) => !w)}
                  className="relative w-10 h-5 rounded-full transition-all cursor-pointer"
                  style={{
                    background: useWallet
                      ? "rgba(16,185,129,0.6)"
                      : "rgba(255,255,255,0.15)",
                    border: useWallet
                      ? "1px solid rgba(52,211,153,0.5)"
                      : "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                    style={{
                      left: useWallet ? "calc(100% - 18px)" : "2px",
                    }}
                  />
                </div>
              </label>
            )}

            {/* Advance mode mein toggle nahi, auto-on indicator dikhao */}
            {walletBalance > 0 && isAdvance && (
              <div
                className="text-xs px-2 py-1 rounded-lg font-semibold"
                style={{
                  background: "rgba(16,185,129,0.2)",
                  color: "#6ee7b7",
                  border: "1px solid rgba(52,211,153,0.3)",
                }}
              >
                Auto Applied
              </div>
            )}
          </div>

          {useWallet && maxWalletUse > 0 && (
            <div
              className="rounded-lg px-3 py-2 text-xs text-center font-semibold"
              style={{
                background: "rgba(16,185,129,0.15)",
                color: "#6ee7b7",
                border: "1px solid rgba(52,211,153,0.2)",
              }}
            >
              ₹{maxWalletUse.toFixed(2)}{" "}
              {isAdvance ? "advance" : "wallet"} apply
              {afterWalletTotal === 0 && " — Fully covered!"}
            </div>
          )}

          {walletBalance <= 0 && (
            <div className="text-xs text-dark text-center">
              {isAdvance ? "No advance balance" : "Empty Wallet"}
            </div>
          )}
        </div>
      )}

      <div
        className="px-3 py-2 rounded-xl text-xs"
        style={
          isLending
            ? {
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(248,113,113,0.3)",
              color: "#fca5a5",
            }
            : isAdvance
              ? {
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(52,211,153,0.25)",
                color: "#6ee7b7",
              }
              : {
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.2)",
                // color: "rgba(252,211,77,0.8)",
              }
        }
      >
        {isLending
          ? " Lending selected — Name & Phone required"
          : isAdvance
            ? "Advance selected — Customer mandatory, wallet auto-apply"
            : "*Note: Contact Number mandatory to save customer"}
      </div>

      <div className="space-y-3">
        <div className="main_input">
          <label>
            Customer Name
            {(isLending || isAdvance) && (
              <span className="text-red-400"> *</span>
            )}
          </label>
          <input
            value={customer.name}
            onChange={(e) =>
              setCustomer((p) => ({ ...p, name: e.target.value }))
            }
            placeholder="Enter name"
            className={`${inp} ${(isLending || isAdvance) && !customer.name
              ? "border-red-400/50"
              : ""
              }`}
          />
        </div>
        <div className="main_input">
          <label>
            Phone
            {(isLending || isAdvance) && (
              <span className="text-red-400"> *</span>
            )}
          </label>
          <input
            value={customer.phone}
            onChange={(e) =>
              setCustomer((p) => ({ ...p, phone: e.target.value }))
            }
            placeholder="Phone number"
            type="tel"
            className={`${inp} ${(isLending || isAdvance) && !customer.phone
              ? "border-red-400/50"
              : ""
              }`}
          />
        </div>
        <div className="main_input">
          <input
            value={customer.address}
            onChange={(e) =>
              setCustomer((p) => ({ ...p, address: e.target.value }))
            }
            placeholder="Customer Address"
            className={inp}
          />
        </div>
        <div className="main_input">
          <input
            value={customer.tax_id}
            onChange={(e) =>
              setCustomer((p) => ({ ...p, tax_id: e.target.value }))
            }
            placeholder="Customer Tax ID"
            className={inp}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="main_input">
          <label>Date of Birth</label>
          <input
            type="date"
            value={customer.dob}
            onChange={(e) =>
              setCustomer((p) => ({ ...p, dob: e.target.value }))
            }
          />
        </div>
        <div className="main_input">
          <label>Anniversary</label>
          <input
            type="date"
            value={customer.anniversary}
            onChange={(e) =>
              setCustomer((p) => ({ ...p, anniversary: e.target.value }))
            }
          />
        </div>
      </div>

      {/* Discount */}
      <div>
        <div className="flex gap-4 mb-3">
          {["percent", "coupon"].map((m) => {
            const blocked = m === "coupon" ? couponBlocked : discountBlocked;
            return (
              <label
                key={m}
                className="flex items-center gap-2 text-sm"
                style={{ cursor: blocked ? "not-allowed" : "pointer" }}
              >
                <div
                  onClick={() => !blocked && setDiscountMode(m)}
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                  style={{
                    cursor: blocked ? "not-allowed" : "pointer",
                    borderColor: blocked
                      ? "#cbd5e1"
                      : discountMode === m
                        ? "#a78bfa"
                        : "#94a3b8",
                  }}
                >
                  {discountMode === m && !blocked && (
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                  )}
                </div>
                <span
                  className={blocked ? "capitalize" : "text-dark capitalize"}
                  style={blocked ? { color: "#94a3b8", textDecoration: "line-through" } : undefined}
                >
                  {m === "percent" ? "Discount" : "Coupon"}
                </span>
              </label>
            );
          })}
        </div>
        {couponBlocked && (
          <p style={{ fontSize: 11, color: "#f59e0b", marginBottom: 10 }}>
            ⚠️ This order already has an offer-priced item — coupon can't be applied
            {discountBlocked ? "; add a non-offer item to enable discount." : "."}
          </p>
        )}
        {discountMode === "percent" && !discountBlocked ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="main_input">
              <label>Discount %</label>
              <input
                type="number"
                value={discountPct}
                onChange={(e) => setDiscountPct(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="main_input">
              <label>Discount Amount</label>
              <div className="px-3 py-2 rounded-xl text-sm text-dark bg-white/5 border border-white/10">
                ₹{discountAmount.toFixed(2)}
              </div>
            </div>
          </div>
        ) : discountMode === "coupon" && !couponBlocked ? (
          <div>
            {/* Active offer cards */}
            {activeOffers.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 11, color: "#a78bfa", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Available Offers
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {activeOffers.map(offer => (
                    <div
                      key={offer.dg037_offer_id}
                      onClick={() => {
                        if (couponDiscount > 0) return;
                        if (offer.dg037_coupon) applyCoupon(offer.dg037_coupon);
                        else applyOfferDirect(offer);
                      }}
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 8, padding: "6px 10px", cursor: couponDiscount > 0 ? "default" : "pointer",
                        transition: "all 0.15s",
                        opacity: couponDiscount > 0 ? 0.5 : 1,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>
                        {offer.dg037_offer_name}
                      </div>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                        {offer.dg037_offer_type === "Percentage"
                          ? `${offer.dg037_offer_price_pct}% off`
                          : offer.dg037_offer_type === "Flat"
                          ? `₹${offer.dg037_offer_price} off`
                          : offer.dg037_offer_type}
                        {offer.dg037_min_amount > 0 && ` · Min ₹${offer.dg037_min_amount}`}
                        {offer.category_name && ` · ${offer.category_name}`}
                      </div>
                      {offer.dg037_coupon && (
                        <div style={{ fontSize: 10, color: "#a78bfa", marginTop: 2, fontWeight: 600 }}>
                          {offer.dg037_coupon}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coupon input + apply */}
            <div className="flex gap-2">
              <div className="main_input" style={{ flex: 1 }}>
                <input
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value); setCouponDiscount(0); }}
                  placeholder="Enter coupon code"
                  className={inp}
                  onKeyDown={e => e.key === "Enter" && applyCoupon()}
                />
              </div>
              <button onClick={() => applyCoupon()} className="main_btn">
                Apply
              </button>
            </div>
            {couponDiscount > 0 && (
              <div style={{ fontSize: 12, color: "#4ade80", marginTop: 6, display: "flex", justifyContent: "space-between" }}>
                <span>✓ Coupon applied</span>
                <span>-₹{couponDiscount.toFixed(2)}</span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
