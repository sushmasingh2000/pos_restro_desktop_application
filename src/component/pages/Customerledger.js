
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { apiConnectorGet, apiConnectorPost } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import toast from "react-hot-toast";
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const StatCard = ({ label, value, color, sub }) => (
  <div
    className="rounded-2xl p-5 flex flex-col gap-1"
    style={{
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${color}33`,
      boxShadow: `0 0 24px ${color}11`,
    }}
  >
    <span className="text-xs uppercase tracking-widest" style={{ color: `${color}99` }}>
      {label}
    </span>
    <span className="text-2xl font-bold" style={{ color }}>
      {value}
    </span>
    {sub && <span className="text-xs text-white/30">{sub}</span>}
  </div>
);

const inp = "w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 bg-white/5 border border-white/10 focus:outline-none focus:border-purple-400/50 transition-all";

const modalOverlay = {
  position: "fixed", inset: 0, zIndex: 60,
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
};

const modalCard = {
  width: "100%", maxWidth: 440, borderRadius: 20,
  padding: "28px 28px 24px",
  background: "linear-gradient(135deg, rgba(15,0,26,0.98) 0%, rgba(18,0,31,0.98) 100%)",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
  color: "white", maxHeight: "90vh", overflowY: "auto",
};

const CustomerLedger = () => {
  const queryClient = useQueryClient();

  const [phone, setPhone] = useState("");
  const [searchPhone, setSearchPhone] = useState("");

  // Register modal
  const [registerModal, setRegisterModal] = useState(false);
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regWalletToggle, setRegWalletToggle] = useState(false);
  const [regWalletAmount, setRegWalletAmount] = useState("");
  const [regWalletRemark, setRegWalletRemark] = useState("");
  const [topupPaymentMode, setTopupPaymentMode] = useState("cash");
  // Wallet topup modal
  const [topupModal, setTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupRemark, setTopupRemark] = useState("");
  const [searchQ, setSearchQ] = useState("");

  // All customers
  const { data: allData } = useQuery(
    ["all_customers", searchQ],
    () => apiConnectorGet(`${endpoint.customer_search_api}?q=${searchQ}`),
    { refetchOnWindowFocus: false }
  );
  const allCustomers = allData?.data?.result || [];

  const { data, isLoading, isFetching } = useQuery(
    ["customer_ledger", searchPhone],
    () => apiConnectorGet(`${endpoint.customer_ledger_api}/${searchPhone}`),
    {
      enabled: !!searchPhone,
      refetchOnWindowFocus: false,
      onError: () => toast.error("Customer not found"),
    }
  );

  const ledger = data?.data?.result;
  const customer = ledger?.customer;

  // ── Register mutation ─────────────────────────────────────────
  const registerMutation = useMutation(
    (body) => apiConnectorPost(endpoint.register_customer_api, body),
    {
      onSuccess: (res) => {
        if (res?.data?.success) {
          toast.success(res.data.message || "Customer registered!");
          closeRegisterModal();
          setPhone(res.data.result?.phone || "");
          setSearchPhone(res.data.result?.phone || "");
        } else {
          toast.error(res?.data?.message || "Registration failed");
        }
      },
      onError: () => toast.error("Server error"),
    }
  );

  // ── Wallet topup mutation ─────────────────────────────────────
  const topupMutation = useMutation(
    (body) => apiConnectorPost(endpoint.wallet_topup_api, body),
    {
      onSuccess: (res) => {
        if (res?.data?.success) {
          toast.success(res.data.message || "Wallet updated!");
          setTopupModal(false);
          setTopupAmount("");
          setTopupRemark("");
          queryClient.invalidateQueries(["customer_ledger", searchPhone]);
        } else {
          toast.error(res?.data?.message || "Failed");
        }
      },
      onError: () => toast.error("Server error"),
    }
  );

  // ── Handlers ──────────────────────────────────────────────────
  const handleSearch = () => {
    const trimmed = phone.trim();
    if (!trimmed) return toast.error("Enter phone number");
    setSearchPhone(trimmed);
  };

  const closeRegisterModal = () => {
    setRegisterModal(false);
    setRegName(""); setRegPhone(""); setRegAddress("");
    setRegWalletToggle(false); setRegWalletAmount(""); setRegWalletRemark("");
    setTopupPaymentMode("cash");
  };

  const handleRegister = () => {
    if (!regName.trim()) return toast.error("Naam required hai");
    if (!regPhone.trim()) return toast.error("Phone required hai");
    if (regPhone.trim().length < 10) return toast.error("Valid phone number dalein");
    if (regWalletToggle && (!regWalletAmount || parseFloat(regWalletAmount) <= 0))
      return toast.error("Wallet amount valid hona chahiye");

    registerMutation.mutate({
      name: regName.trim(),
      phone: regPhone.trim(),
      address: regAddress.trim() || undefined,
      walletAmount: regWalletToggle ? parseFloat(regWalletAmount) : undefined,
      walletRemark: regWalletToggle ? regWalletRemark.trim() : undefined,
    });
  };

  const handleTopup = () => {
    const amt = parseFloat(topupAmount);
    if (!amt || amt <= 0) return toast.error("Enter valid amount");
    topupMutation.mutate({
      customerId: customer?.id,
      amount: amt,
      remark: topupRemark || "Manual top-up",
      payment_mode: topupPaymentMode,

    });
  };

  return (
    <div className="">
      {/* ── Header ── */}
      <div className="breadcrumbs">
        <div>
          <h3 className="main_heading">Customer Ledger</h3>
          <ul>
            <li>Home</li>
            <li>/</li>
            <li className="active">Customer Ledger</li>
          </ul>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setRegisterModal(true)}>
            <span>+</span> Customer Registe
          </button>

        </div>
      </div>


      {/* ── Search Bar ── */}
      <div className="brand_boxs flex items-end gap-4 w-full">
        <div className="main_input">
          <label>Customer Phone Number <span className="text-red-500">*</span></label>
          <select
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setSearchPhone(e.target.value); }}
          >
            <option value="" >Select Customer</option>
            {allCustomers.map((c) => (
              <option key={c.id} value={c.phone}>
                {c.name} ({c.phone})
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleSearch}
          disabled={isLoading || isFetching}
          className="main_btn">
          {isLoading || isFetching ? "Searching..." : "🔍 Search"}
        </button>
      </div>

      {/* ── Results ── */}
      {ledger && customer && (
        < >
          <div className="landing_boxes mt-3">
            <Row className="landing_header border-0">
              <Col lg={4} md={4}>
                <div className="landin_name">
                  <div className="landing_img">
                    {customer.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <h4>{customer.name}</h4>
                    <p>📞 {customer.phone}</p>
                    {customer.address && (
                    <p> {customer.address}</p>
                     )}
                      <button
                      onClick={() => setTopupModal(true)}
                      className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                      style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(52,211,153,0.3)", color: "#6ee7b7" }}>
                      + Add to Wallet
                     </button>
                  </div>
                </div>
              </Col>  
              <Col lg={8} md={8} className="mt-3 mt-md-0">
                <div className="landing_body grid grid-cols-3 gap-2">
                    <div className="landin_box landin_box_2">
                        <p>🧾 Wallet Balance</p>
                        <h3>{`₹${customer.walletBalance.toFixed(2)}`}</h3>
                        <h6>Available Advance</h6>
                    </div>
                    <div className="landin_box landin_box_3">
                        <p>✅ Total Due</p>
                        <h3>{`₹${ledger.totalDue.toFixed(2)}`}</h3>
                        <h6>{`${ledger.pendingDues?.length || 0} pending order(s)`}</h6>
                    </div>
                    <div className="landin_box landin_box_1">
                        <p>⚠️ Transactions</p>
                        <h3>{ledger.walletHistory?.length || 0}</h3>
                        <h6>Recent entries</h6>
                    </div>
                </div>
              </Col>
            </Row>
          </div>
          <div className="history_box mt-3">
            <div className="history_header flex justify-between items-center">
              <h6>Pending Dues</h6>
              {ledger.totalDue > 0 && ( 
              <p className="red_bg">₹{ledger.totalDue.toFixed(2)} due</p>
              )}
            </div>
              {ledger.pendingDues?.length === 0 ? (
                <div className="px-5 py-10 text-center text-white/30 text-sm">No pending due</div>
              ) : (
              <div className="divide-y divide-white/5">
                {ledger.pendingDues.map((due) => (
                    <div key={due.dg042_lending_id}s className="main_box_bill">
                        <div className="flex justify-between item-center">
                          <div className="bill_statues">
                            {due.dg042_bill_no}  <span className="yellow_bg">Pending</span>
                          </div>
                          <div className="bill-date">
                            🕐  {new Date(due.dg042_order_date || due.dg042_created_at).toLocaleDateString("en-IN", {
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
                              <h5 className={`${due.dg042_status === "settled" ? "text-white/40" : "unpaid"}`}>₹{parseFloat(due.dg042_remaining_amount).toFixed(2)}</h5>
                            </div>
                          </Col>
                           <Col lg={3} md={3}>
                            <div className="bill_card flex justify-content-md-end">
                             
                                  <button
                                    className="px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex-shrink-0"
                                    style={{
                                      background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.2))",
                                      border: "1px solid rgba(52,211,153,0.35)",
                                      color: "#6ee7b7",
                                    }}
                                  >
                                    💰 Due
                                  </button>
                            </div>
                          </Col>
                        </Row>
                       
                    </div>
                    
                 ))}
              </div>
              )}
          </div>
          <div className="wallet_histotry_box mt-3">
            <div className="history_header flex justify-between items-center">
              <h6>Wallet / Transaction History</h6>
            </div>
             {!ledger.walletHistory?.length ? (
                <div className="px-5 py-10 text-center text-white/30 text-sm">No transactions found</div>
              ) : (
              <div>
              {ledger.walletHistory.map((tx, i) => (
                <div className="flex justify-between items-center main_wallet_box" key={i}>
                  <div className="flex gap-3 item-center">
                    <div className="wallet_histoy_icon"
                    style={
                              tx.dg043_type === "credit"
                                ? {
                                  background: "rgba(16,185,129,0.15)",
                                  color: "#6ee7b7",
                                }
                                : {
                                  background: "rgba(239,68,68,0.15)",
                                  color: "#fca5a5",
                                }
                            }
                      >
                      {tx.dg043_type === "credit" ? "↑" : "↓"}
                    </div>
                    <div className="wallet_names">
                      <h5>{tx.dg043_remark || "Wallet Transaction"}</h5>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">

                              {/* DATE */}
                              <span className="text-xs text-white/30">
                                {new Date(tx.dg043_created_at).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>

                              {/* TIME */}
                              <span className="text-xs text-white/20">•</span>

                              <span className="text-xs text-white/30">
                                {new Date(tx.dg043_created_at).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>

                              {/* PAYMENT MODE */}
                              {tx.dg043_payment_mode && (
                                <>
                                  <span className="text-xs text-white/20">•</span>

                                  <span
                                    className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full"
                                    style={{
                                      background: "rgba(255,255,255,0.06)",
                                      border: "1px solid rgba(255,255,255,0.08)",
                                      color: "rgba(255,255,255,0.6)",
                                    }}
                                  >
                                    {tx.dg043_payment_mode}
                                  </span>
                                </>
                              )}
                      </div>
                    </div>
                  </div>
                  <div className="wallet_amouts">
                    <h4 className="m-0"
                    style={{
                              color:
                                tx.dg043_type === "credit"
                                  ? "#6ee7b7"
                                  : "#fca5a5",
                            }}>
                      {tx.dg043_type === "credit" ? "+" : "-"}₹
                      {parseFloat(tx.dg043_amount).toFixed(2)}
                    </h4>
                    <p className="m-0">{tx.dg043_type}</p>
                  </div>
                </div>
                ))}
              </div>
              )}
          </div>
         
        </>
      )}

      {/* Empty state */}
      {!isLoading && searchPhone && !ledger && (
        <div
          className="rounded-2xl px-6 py-16 text-center"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="text-4xl mb-3">🔍</div>
          <div className="text-white/50 text-sm">"{searchPhone}" phone number se koi customer nahi mila</div>
          <button
            onClick={() => setRegisterModal(true)}
            className="mt-4 px-5 py-2 rounded-xl text-sm font-semibold transition"
            style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)", color: "#c4b5fd" }}
          >
            + Register New Customer
          </button>
        </div>
      )}

      {/* ═══ MODAL 1: Register ═══ */}
      {registerModal && (
        <div style={modalOverlay}>
          <div className="Order_Details_modal">
            {/* HEADER */}
            <div className="Order_Details_modal_header">
              <div className="flex items-center gap-3">
                  <div className="modal_header_icon">🗂️</div>
                  <div>
                  <h2>New Customer Register</h2>
                  <p>Customer ka naam, phone aur address bharein</p>
                </div>
              </div>
              <button onClick={closeRegisterModal}>×</button>
            </div>
       
            
            <div className="main_input px-3">
              <label>Full Name <span className="text-red-400">*</span></label>
              <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="e.g. Ramesh Kumar"  autoFocus />
            </div>
            <div className="main_input px-3">
              <label>Phone Number <span className="text-red-400">*</span></label>
              <input type="tel" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="e.g. 9876543210"  />
            </div>
            <div className="main_input px-3">
              <label>Address <span className="text-white/20 normal-case">(optional)</span></label>
              <textarea value={regAddress} onChange={(e) => setRegAddress(e.target.value)} placeholder="e.g. 12, Main Bazaar..." rows={2}  style={{ resize: "none" }} />
            </div>
            <div className="rounded-xl mx-3 p-3 mb-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setRegWalletToggle((p) => !p)}>
                <div>
                  <div className="text-sm font-medium text-white"> add advance Wallet ?</div>
                  <div className="text-xs text-white/30 mt-0.5">Optional</div>
                </div>
                <div className="relative flex-shrink-0 w-10 h-6 rounded-full transition-colors" style={{ background: regWalletToggle ? "rgba(124,58,237,0.8)" : "rgba(255,255,255,0.1)" }}>
                  <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: regWalletToggle ? "20px" : "4px" }} />
                </div>
              </div>
              {regWalletToggle && (
                <div className="mt-4 space-y-3">
                  <div className="main_input">
                    <label >Amount (₹) <span className="text-red-400">*</span></label>
                    <input type="number" value={regWalletAmount} onChange={(e) => setRegWalletAmount(e.target.value)} placeholder="e.g. 500"  />
                  </div>
                  {/* Payment Method */}
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-widest mb-1.5 block">
                      Payment Method <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "cash", label: "Cash", icon: "" },
                        { id: "upi", label: "UPI", icon: "📲" },
                        { id: "card", label: "Card", icon: "" },
                        { id: "paytm", label: "Paytm", icon: "🟦" },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setTopupPaymentMode(m.id)}
                          className="py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition"
                          style={{
                            border: topupPaymentMode === m.id
                              ? "1.5px solid #7c3aed"
                              : "1px solid rgba(255,255,255,0.1)",
                            background: topupPaymentMode === m.id
                              ? "rgba(124,58,237,0.18)"
                              : "rgba(255,255,255,0.04)",
                            color: topupPaymentMode === m.id ? "#c4b5fd" : "rgba(255,255,255,0.5)",
                          }}
                        >
                          {m.icon} {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="main_input">
                    <label>Remark <span className="text-white/20 normal-case">(optional)</span></label>
                    <input type="text" value={regWalletRemark} onChange={(e) => setRegWalletRemark(e.target.value)} placeholder="e.g. Registration advance..."  />
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-between gap-3 modal_footer px-3 py-3">
              <button onClick={closeRegisterModal} className="cancel_btn">✕ Cancel</button>
              <button onClick={handleRegister} disabled={registerMutation.isLoading} className="update_btn" >
                {registerMutation.isLoading ? "Saving..." : "✓ Register Customer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {topupModal && customer && (
        <div style={modalOverlay}>
          <div className="Order_Details_modal">
             {/* HEADER */}
              <div className="Order_Details_modal_header">
                <div className="flex items-center gap-3">
                    <div className="modal_header_icon">🗂️</div>
                    <div>
                    <h2>Add to Wallet</h2>
                    <p>{customer.name} — Current balance: ₹{customer.walletBalance.toFixed(2)}</p>
                  </div>
                </div>
                <button onClick={() => {
                  setTopupModal(false);
                  setTopupAmount("");
                  setTopupRemark("");
                  setTopupPaymentMode("cash"); // ← reset
                }}>×</button>
              </div>
            
            <div className="space-y-3 mb-5 mx-3">
              <div className="main_input">
                <label>Amount</label>
                <input
                  type="number"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  placeholder="Enter amount"
                  autoFocus/>
              </div>

              {/* ── Payment Method ── */}
              <div className="mt-3">
                <label className="text-xs text-white/40 uppercase tracking-widest mb-1.5 block">
                  Payment Method <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "cash", label: "Cash", icon: "" },
                    { id: "upi", label: "UPI", icon: "📲" },
                    { id: "card", label: "Card", icon: "" },
                    { id: "paytm", label: "Paytm", icon: "🟦" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setTopupPaymentMode(m.id)}
                      className="py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition"
                      style={{
                        border: topupPaymentMode === m.id
                          ? "1.5px solid #7c3aed"
                          : "1px solid rgba(255,255,255,0.1)",
                        background: topupPaymentMode === m.id
                          ? "rgba(124,58,237,0.18)"
                          : "rgba(255,255,255,0.04)",
                        color: topupPaymentMode === m.id
                          ? "#c4b5fd"
                          : "rgba(255,255,255,0.5)",
                      }}
                    >
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="main_input">
                <label> Remark (optional) </label>
                <input
                  type="text"
                  value={topupRemark}
                  onChange={(e) => setTopupRemark(e.target.value)}
                  placeholder="e.g. Advance payment, Diwali credit..."
                />
              </div>
            </div>

            <div className="flex justify-between gap-3 modal_footer px-3 py-3">
              <button
                onClick={() => {
                  setTopupModal(false);
                  setTopupAmount("");
                  setTopupRemark("");
                  setTopupPaymentMode("cash"); // ← reset
                }}
                className="cancel_btn">
                ✕ Cancel
              </button>
              <button
                onClick={handleTopup}
                disabled={topupMutation.isLoading}
                className="update_btn disabled:opacity-50"
               >
                {topupMutation.isLoading ? "Saving..." : "✓ Add to Wallet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerLedger;