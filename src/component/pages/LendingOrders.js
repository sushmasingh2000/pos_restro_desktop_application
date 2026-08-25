
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { apiConnectorGet, apiConnectorPost } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import toast from "react-hot-toast";
import LendingStatementModal from "./LendingStatementModal";

const inp = "w-full px-3 py-2 rounded-xl text-sm text-white placeholder-white/30 bg-white/10 border border-white/20 focus:outline-none focus:border-purple-400/50 transition-all";

const LendingOrders = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [collectModal, setCollectModal] = useState(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectPaymentMode, setCollectPaymentMode] = useState("cash");
  // ADD THIS STATE
  const [activeTab, setActiveTab] = useState("due");
  const [showStatementPreview, setShowStatementPreview] = useState(false);
  const [stmtStartDate, setStmtStartDate] = useState("");
  const [stmtEndDate, setStmtEndDate] = useState("");
  // ── Fetch all lending customers ──────────────────────────────
  const { data, isLoading } = useQuery(
    ["lending_all"],
    () => apiConnectorGet(endpoint.lending_all_api),
    { refetchOnWindowFocus: false }
  );
  const allLending = data?.data?.result || [];

  // ── Today's due-collection (across all customers) ─────────────
  const { data: todaySummaryData } = useQuery(
    ["dashboard_summary_today"],
    () => apiConnectorGet(endpoint.dashboard_summary_api),
    { refetchOnWindowFocus: false }
  );
  const todayCollected = todaySummaryData?.data?.data?.todayDueCollected || 0;
  const todayCollectedCount = todaySummaryData?.data?.data?.todayDueCollectedCount || 0;

  // ── Fetch detail for selected customer ───────────────────────
  const { data: detailData, isLoading: detailLoading } = useQuery(
    ["lending_detail", selectedCustomer?.customer_name, selectedCustomer?.customer_phone],
    () => apiConnectorGet(
      `${endpoint.lending_detail_api}?customer_name=${encodeURIComponent(selectedCustomer.customer_name)}&customer_phone=${selectedCustomer.customer_phone || ""}`
    ),
    {
      enabled: !!selectedCustomer,
      refetchOnWindowFocus: false,
    }
  );
  const lendingDetails = detailData?.data?.result || [];

  // ── Date-range filter for the statement/order history (from-to) ──
  const filteredLendingDetails = lendingDetails.filter((due) => {
    if (!stmtStartDate && !stmtEndDate) return true;
    const d = new Date(due.dg042_order_date || due.dg042_created_at);
    const dStr = d.toISOString().split("T")[0];
    if (stmtStartDate && dStr < stmtStartDate) return false;
    if (stmtEndDate && dStr > stmtEndDate) return false;
    return true;
  });

  // selectedCustomer ke baad yeh query add karo
  const { data: paymentHistoryData } = useQuery(
    ["lending_payments", selectedCustomer?.customer_id],
    () => apiConnectorGet(
      `${endpoint.lending_payments_api}?customer_id=${selectedCustomer.customer_id}`
    ),
    {
      enabled: !!selectedCustomer,
      refetchOnWindowFocus: false,
    }
  );
  const allPayments = paymentHistoryData?.data?.result || [];

  // ── Branch info for the statement header ─────────────────────
  const { data: branchData } = useQuery(
    ["branch_profile"],
    () => apiConnectorGet(endpoint.branch_profile_api),
    { refetchOnWindowFocus: false }
  );
  const branch = branchData?.data?.result || {};

  // ── Settle mutation ───────────────────────────────────────────
  const settleMutation = useMutation(
    (body) => apiConnectorPost(endpoint.lending_settle_api, body),
    {
      onSuccess: (res) => {
        if (res?.data?.success) {
          toast.success(res.data.message);
          setCollectModal(null);
          setCollectAmount("");
          setCollectPaymentMode("cash");
          queryClient.invalidateQueries(["lending_all"]);
          queryClient.invalidateQueries(["dashboard_summary_today"]);
          queryClient.invalidateQueries([
            "lending_detail",
            selectedCustomer?.customer_name,
            selectedCustomer?.customer_phone,
          ]);
        } else {
          toast.error(res?.data?.message || "Failed");
        }
      },
      onError: () => toast.error("Server error"),
    }
  );

  const handleCollect = () => {
    const amt = parseFloat(collectAmount);
    if (!amt || amt <= 0) return toast.error("Valid amount daalo");
    if (amt > collectModal.remaining)
      return toast.error(`Max ₹${collectModal.remaining} collected`);

    settleMutation.mutate({
      lending_id: collectModal.lendingId,
      paid_amount: amt,
      payment_mode: collectPaymentMode,     //mode bhejo
      customer_id: collectModal.customerId, //customer id bhejo
    });
  };

  const closeCollectModal = () => {
    setCollectModal(null);
    setCollectAmount("");
    setCollectPaymentMode("cash");
  };

  const filtered = allLending.filter((c) => {
    const matchesSearch =
      c.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.customer_phone?.includes(search);

    if (activeTab === "due") {
      return c.overall_status !== "settled" && matchesSearch;
    }

    return c.overall_status === "settled" && matchesSearch;
  });


  const modalOverlay = {
    position: "fixed", inset: 0, zIndex: 60,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "#0e2a47b5",
  };
  const modalCard = {
    width: "100%", maxWidth: 480, borderRadius: 20,
    padding: "28px 28px 24px",
    background: "linear-gradient(135deg, rgba(15,0,26,0.98) 0%, rgba(18,0,31,0.98) 100%)",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 32px 80px rgba(0,0,0,0.7)", color: "white",
  };

  const [selectedAmount, setSelectedAmount] = useState("");

  return (
    <div
      className="main_cards">
      {/* ── Header ── */}
      <div className="cards_header flex items-center justify-between ">
          <div>
            <h3>Lending Orders</h3>
            <p>Manage lending orders and repayments easily.</p>
          </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="main_input mt-0">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone..."
            />
          </div>

          {/* Tabs */}
          <div
            className="flex items-center gap-2 rounded-xl main_lading_order"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <button
              onClick={() => setActiveTab("due")}
              className="tabslanding"
              style={
                activeTab === "due"
                  ? {
                    background: "rgba(239,68,68,0.2)",
                    color: "#f70000",
                    border: "1px solid rgba(248,113,113,0.3)",
                  }
                  : {
                    color: "#2563eb",
                  }
              }
            >
              Due Orders
            </button>

            <button
              onClick={() => setActiveTab("settled")}
              className="tabslanding"
              style={
                activeTab === "settled"
                  ? {
                    background: "rgba(16,185,129,0.2)",
                    color: "#6ee7b7",
                    border: "1px solid rgba(52,211,153,0.3)",
                  }
                  : {
                    color: "#2563eb",
                  }
              }
            >
              Settled Orders
            </button>
          </div>
        </div>
      </div>

      {/* ── Today's due-collection summary ── */}
      <div
        className="mx-3 mb-3 flex items-center gap-3"
        style={{
          background: "rgba(16,185,129,0.08)",
          border: "1px solid rgba(52,211,153,0.25)",
          borderRadius: 12,
          padding: "10px 16px",
        }}
      >
        <span style={{ fontSize: 20 }}>💰</span>
        <span style={{ fontSize: 13, color: "#065f46" }}>
          <b style={{ color: "#047857" }}>Today's Collection: ₹{todayCollected}</b>
          {todayCollectedCount > 0 && (
            <span style={{ color: "#475569" }}> — from {todayCollectedCount} customer{todayCollectedCount > 1 ? "s" : ""}</span>
          )}
        </span>
      </div>



      {/* ════════════════════════════════════════════════════════ */}
      {/* VIEW 1 — Customer list */}
      {/* ════════════════════════════════════════════════════════ */}
      {!selectedCustomer && (
        <>


          {isLoading ? (
            <div className="text-center py-16 text-dark">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-dark">
              <div className="text-4xl mb-3">📋</div>
              <div>Not Found</div>
            </div>
          ) : (
            <Row className="px-3 pb-3">
              {filtered.map((c, i) => (
                <Col lg={4} md={6} className="mt-3">
                  <div key={i} className="landing_boxes">
                    <div className="landing_header">
                      <div className="landin_name">
                        <div className="landing_img">
                          {c.customer_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <h4>{c.customer_name}</h4>
                          <p>📞 {c.customer_phone || "No phone"}</p>
                        </div>
                      </div>
                      <div className={`landing_status ${c.overall_status === "settled"
                        ? "green_bg"
                        : "red_bg"
                        }`}>
                        <span></span>
                        {c.overall_status === "settled" ? "Settled" : "Due "}
                      </div>
                    </div>
                    <div className="landing_body grid grid-cols-3 gap-2 p-3">
                      <div className="landin_box landin_box_1">
                        <p>Orders</p>
                        <h3>{c.total_orders}</h3>
                      </div>
                      <div className="landin_box landin_box_2">
                        <p>Paid</p>
                        <h3>₹{parseFloat(c.total_paid).toFixed(0)}</h3>
                      </div>
                      <div className="landin_box landin_box_3">
                        <p>Due</p>
                        <h3>₹{parseFloat(c.total_remaining).toFixed(0)}</h3>
                      </div>
                    </div>
                    <div className="landing_footer">
                      <p>🕐 Last order: {new Date(c.last_order_date).toLocaleDateString("en-IN")}</p>
                      <button onClick={() => setSelectedCustomer(c)}>View Details →</button>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* VIEW 2 — Customer detail */}
      {/* ════════════════════════════════════════════════════════ */}
      {selectedCustomer && (
        <>
          <div className="mx-3 mt-3">
            <button
              onClick={() => setSelectedCustomer(null)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#a78bfa",
              }}
            >
              ← Back to Lending Orders
            </button>
          </div>
          <div className="landing_boxes mx-3 mt-3">
            <Row className="landing_header border-0">
              <Col lg={4} md={4}>
                <div className="landin_name">
                  <div className="landing_img">
                    {filtered.customer_name?.[0]?.toUpperCase() || "K"}
                  </div>
                  <div>
                    <h6>Customer</h6>
                    <h4>{selectedCustomer.customer_name}</h4>
                    <p>📞 {selectedCustomer.customer_phone}</p>
                  </div>
                </div>
              </Col>  
              <Col lg={8} md={8} className="mt-3 mt-md-0">
                <div className="landing_body grid grid-cols-3 gap-2">
                    <div className="landin_box landin_box_1">
                        <p>🧾 Total Billed</p>
                        <h3>₹{parseFloat(selectedCustomer.total_billed || 0).toFixed(0)}</h3>
                    </div>
                    <div className="landin_box landin_box_2">
                        <p>✅ Total Paid</p>
                        <h3>₹{parseFloat(selectedCustomer.total_paid).toFixed(0)}</h3>
                    </div>
                    <div className="landin_box landin_box_3">
                        <p>⚠️ Total Due</p>
                        <h3>₹{parseFloat(selectedCustomer.total_remaining).toFixed(0)}</h3>
                    </div>
                </div>
              </Col>
            </Row>
          </div>
          <div className="history_box mt-3 mx-3 mb-3">
            <div className="history_header flex justify-between items-center flex-wrap gap-2">
              <h6>Order History</h6>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={stmtStartDate}
                  onChange={(e) => setStmtStartDate(e.target.value)}
                  className="px-2 py-1 rounded-lg text-xs"
                  style={{ background: "#fff", border: "1px solid #cbd5e1", color: "#1e293b" }}
                />
                <span style={{ color: "#94a3b8", fontSize: 12 }}>to</span>
                <input
                  type="date"
                  value={stmtEndDate}
                  onChange={(e) => setStmtEndDate(e.target.value)}
                  className="px-2 py-1 rounded-lg text-xs"
                  style={{ background: "#fff", border: "1px solid #cbd5e1", color: "#1e293b" }}
                />
                {(stmtStartDate || stmtEndDate) && (
                  <button
                    onClick={() => { setStmtStartDate(""); setStmtEndDate(""); }}
                    className="text-xs"
                    style={{ color: "#94a3b8" }}
                  >
                    ✕ Clear
                  </button>
                )}
                {filteredLendingDetails.length > 0 && (
                  <button
                    onClick={() => setShowStatementPreview(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap"
                    style={{
                      background: "#7c3aed",
                      border: "1px solid #7c3aed",
                      color: "#fff",
                    }}
                  >
                    🖨 Print Statement
                  </button>
                )}
              </div>
            </div>
             {detailLoading ? (
              <div className="py-12 text-center text-dark">Loading orders...</div>
            ) : filteredLendingDetails.length === 0 ? (
              <div className="py-12 text-center text-dark">Koi order nahi mila</div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredLendingDetails.map((due) => {

                  // Is bill ki payments filter karo
                  const billPayments = allPayments.filter(
                    (p) => p.dg044_lending_id === due.dg042_lending_id
                  );
                   return (
                    <div key={due.dg042_lending_id} className="main_box_bill">
                        <div className="flex justify-between item-center">
                          <div className="bill_statues">
                            {due.dg042_bill_no}  <span
                              className={` ${due.dg042_status === "settled"
                                ? "green_bg"
                                : "red_bg"
                                }`}
                            >
                              {due.dg042_status === "settled"
                                ? "Settled "
                                : due.dg042_status === "partial"
                                  ? "Partial "
                                  : "Pending "}
                            </span>
                          </div>
                          <div className="bill-date">
                            🕐 {new Date(due.dg042_order_date || due.dg042_created_at).toLocaleDateString("en-IN", {
                              day: "2-digit", month: "short", year: "numeric",
                            })}
                          </div>
                        </div>
                        {/* Bill amounts row */}
                        <Row>
                          <Col lg={3} md={3}>
                            <div className="bill_card">
                              <p>Bill Amount</p>
                              <h5>₹{parseFloat(due.dg042_bill_amount).toFixed(2)}</h5>
                            </div>
                          </Col>
                           <Col lg={3} md={3}>
                            <div className="bill_card">
                              <p>Paid</p>
                              <h5 className="paid">₹{parseFloat(due.dg042_paid_amount).toFixed(2)}</h5>
                            </div>
                          </Col>
                           <Col lg={3} md={3}>
                            <div className="bill_card">
                              <p>Remaining</p>
                              <h5 className={`${due.dg042_status === "settled" ? "text-dark" : "unpaid"}`}>₹{parseFloat(due.dg042_remaining_amount).toFixed(2)}</h5>
                            </div>
                          </Col>
                           <Col lg={3} md={3}>
                            <div className="bill_card flex justify-content-md-end">
                              {/* Collect button */}
                                {(due.dg042_status === "pending" || due.dg042_status === "partial") && (
                                  <button
                                    onClick={() => setCollectModal({
                                      lendingId: due.dg042_lending_id,
                                      billNo: due.dg042_bill_no,
                                      remaining: parseFloat(due.dg042_remaining_amount),
                                      customerId: selectedCustomer.customer_id || due.dg042_customer_id,
                                    })}
                                    className="px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex-shrink-0"
                                    style={{
                                      background: "linear-gradient(135deg, #10b981, #059669)",
                                      border: "1px solid #059669",
                                      color: "#fff",
                                    }}
                                  >
                                    💰 Collect ₹{parseFloat(due.dg042_remaining_amount).toFixed(0)}
                                  </button>
                                )}
                            </div>
                          </Col>
                        </Row>
                        {/* ── Payment Transaction History ── */}
                          {billPayments.length > 0 && (
                            <div
                              className="rounded-xl overflow-hidden mt-1"
                              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                            >
                              <div
                                className="px-3 py-2 text-xs font-semibold text-dark uppercase tracking-widest"
                                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                              >
                                Payment History
                              </div>
                              {billPayments.map((p, idx) => {
                                const modeConfig = {
                                  cash: { icon: "", color: "#6ee7b7", bg: "rgba(16,185,129,0.1)" },
                                  card: { icon: "", color: "#a78bfa", bg: "rgba(124,58,237,0.1)" },
                                  upi: { icon: "", color: "#60a5fa", bg: "rgba(59,130,246,0.1)" },
                                  advance: { icon: "", color: "#fcd34d", bg: "rgba(245,158,11,0.1)" },
                                };
                                const mode = modeConfig[p.dg044_payment_mode] || modeConfig.cash;

                                return (
                                  <div
                                    key={idx}
                                    className="px-3 py-2.5 flex items-center justify-between gap-3"
                                    style={{ borderBottom: idx < billPayments.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      {/* Mode badge */}
                                      <span
                                        className="text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                                        style={{ background: mode.bg, color: mode.color, border: `1px solid ${mode.color}30` }}
                                      >
                                        {mode.icon} {p.dg044_payment_mode}
                                      </span>
                                      {/* Date & Time */}
                                      <span className="text-xs text-dark">
                                        {new Date(p.dg044_created_at).toLocaleDateString("en-IN", {
                                          day: "2-digit", month: "short", year: "numeric",
                                        })}{" "}
                                        <span className="text-white/20">
                                          {new Date(p.dg044_created_at).toLocaleTimeString("en-IN", {
                                            hour: "2-digit", minute: "2-digit",
                                          })}
                                        </span>
                                      </span>
                                    </div>
                                    {/* Amount */}
                                    <span className="text-sm font-bold" style={{ color: "#6ee7b7" }}>
                                      +₹{parseFloat(p.dg044_paid_amount).toFixed(2)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                    </div>
                     );
                })}
              </div>
              )}
          </div>

        
        </>
      )}

      {/* ── Collect Modal ── */}
      {collectModal && (
        <div style={modalOverlay}>
          <div className="Order_Details_modal">
             {/* HEADER */}
            <div className="Order_Details_modal_header">
              <div className="flex items-center gap-3">
                  <div className="modal_header_icon">🗂️</div>
                  <div>
                  <h2>Collect Payment</h2>
                  <p>{collectModal.billNo} — Remaining: ₹{collectModal.remaining.toFixed(2)}</p>
                </div>
              </div>
              <button onClick={closeCollectModal}>×</button>
            </div>
           
            {/*Payment Mode */}
            <label className="text-xs text-dark uppercase tracking-widest mb-2 block mx-3 mt-3">
              Payment Mode
            </label>
            <div className="grid grid-cols-4 gap-2 mb-4 mx-3 payment_mode">
              {[
                { key: "cash", label: "Cash" },
                { key: "card", label: "Card" },
                { key: "upi", label: "UPI" },
                { key: "advance", label: "Advance" },
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => setCollectPaymentMode(m.key)}
                  className={`payment-btn ${
                    collectPaymentMode === m.key ? "active" : ""
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Advance warning */}
            {collectPaymentMode === "advance" && (
              <div
                className="rounded-xl px-3 py-2 text-xs mb-4"
                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(52,211,153,0.25)", color: "#6ee7b7" }}
              >
                Advance mode — Customer ke wallet se deduct hoga
              </div>
            )}
            <div className="main_input mx-3">
              <label> Amount to collect</label>
              <input
                type="number"
                value={collectAmount}
                onChange={(e) => setCollectAmount(e.target.value)}
                placeholder={`Max ₹${collectModal.remaining}`}
                autoFocus
              />
            </div>

            {/* Quick buttons */}
            <div className="flex flex-wrap gap-2 mt-2 mb-3 mx-3">
              <button
                onClick={() => {
                  setCollectAmount(String(collectModal.remaining));
                  setSelectedAmount("full");
                }}
                className={`payment-btn ${selectedAmount === "full" ? "active" : ""}`}
              >
                Full ₹{collectModal.remaining}
              </button>

              {[50, 100, 200, 500].map((q) =>
                q < collectModal.remaining ? (
                  <button
                    key={q}
                    onClick={() => {
                      setCollectAmount(String(q));
                      setSelectedAmount(q);
                    }}
                    className={`payment-btn ${selectedAmount === q ? "active" : ""}`}
                  >
                    ₹{q}
                  </button>
                ) : null
              )}
            </div>

            <div className="flex justify-between gap-3 modal_footer px-3 py-3">
              <button onClick={closeCollectModal} className="cancel_btn">
               ✕ Cancel
              </button>
              <button
                onClick={handleCollect}
                disabled={settleMutation.isLoading}
                className="update_btn">
                {settleMutation.isLoading ? "Saving..." : "✓ Collect"}
              </button>
            </div>
          </div>
        </div>
      )}

      <LendingStatementModal
        isOpen={showStatementPreview}
        onClose={() => setShowStatementPreview(false)}
        customer={selectedCustomer}
        lendingDetails={filteredLendingDetails}
        branch={branch}
      />
    </div>
  );
};

export default LendingOrders;