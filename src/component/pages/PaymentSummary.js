

import React, { useState } from "react";
import { useQuery } from "react-query";
import { apiConnectorGet } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { FaEye } from "react-icons/fa"
import Row from "react-bootstrap/esm/Row";
import Col from "react-bootstrap/esm/Col";

const Card = ({ title, value, color = "purple" }) => {
  const colorMap = {
    purple: "from-purple-500/10 to-pink-500/10",
    green: "from-green-500/10 to-teal-500/10",
    blue: "from-blue-500/10 to-cyan-500/10",
    red: "from-red-500/10 to-orange-500/10",
  };
  return (
    <div className="main_card">
      <div className="relative z-10">
        <p className="mt-0">{title}</p>
        <h2 className="mt-2 ">{value}</h2>
      </div>
    </div>
  );
};

const Badge = ({ label, color }) => {
  const map = {
    cash: "",
    upi: "",
    card: "",
    unpaid: "",
    advance: "",
    credit: "",
    debit: "",
    settled: "",
    partial: "",
    pending: "",
  };
  const cls = map[color] || map[label?.toLowerCase()] || "";
  return (
    <span className={` ${cls}`}>{label}</span>
  );
};

const Section = ({ title, children }) => (
  <div className="main_cards" style={{height: "100%"}}>
    <div className="cards_header flex items-center justify-between">
      <h3>{title}</h3>
    </div>
    <div >{children}</div>
  </div>
);

//  NEW: Customer Payment Modal
const LendingModal = ({ customer, onClose }) => {
  if (!customer) return null;

  const modeColor = {
    cash: "bg-green-500/20 text-green-300 border-green-500/30",
    upi: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    card: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    advance: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  };

  // Mode-wise total from payments array
  const modeBreakdown = (customer.payments || []).reduce((acc, p) => {
    const m = (p.mode || "other").toLowerCase();
    acc[m] = (acc[m] || 0) + parseFloat(p.amount || 0);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background: "#0e2a47b5"}}
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-white/20 rounded-2xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h3 className="text-white font-semibold text-lg">{customer.customer_name || "—"}</h3>
            <p className="text-white/50 text-sm">{customer.phone || "—"}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl font-bold">✕</button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 p-5 border-b border-white/10">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-white/50 text-xs mb-1">Bill</p>
            <p className="text-white font-semibold">₹{parseFloat(customer.bill_amount || 0).toFixed(2)}</p>
          </div>
          <div className="bg-green-500/10 rounded-xl p-3 text-center">
            <p className="text-green-400/70 text-xs mb-1">Paid</p>
            <p className="text-green-300 font-semibold">₹{parseFloat(customer.paid_amount || 0).toFixed(2)}</p>
          </div>
          <div className="bg-red-500/10 rounded-xl p-3 text-center">
            <p className="text-red-400/70 text-xs mb-1">Remaining</p>
            <p className="text-red-300 font-semibold">₹{parseFloat(customer.remaining || 0).toFixed(2)}</p>
          </div>
        </div>

        {/* Status + Date */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <Badge label={customer.status} color={customer.status?.toLowerCase()} />
          <span className="text-white/40 text-xs">{customer.order_date?.slice(0, 10)}</span>
        </div>

        {/* Payment History */}
        <div className="p-5">
          <p className="text-white/50 text-xs uppercase tracking-wider mb-3">Payment History</p>

          {(customer.payments || []).length === 0 ? (
            <p className="text-white/30 text-sm text-center py-4">No payments yet</p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {customer.payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs border font-medium
                      ${modeColor[(p.mode || "").toLowerCase()] || "bg-white/10 text-white/60 border-white/10"}`}>
                      {p.mode || "—"}
                    </span>
                    <span className="text-white/40 text-xs">
                      {new Date(p.paid_at).toLocaleString("en-IN", {
                        day: "2-digit", month: "short",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <span className="text-green-300 font-semibold">₹{parseFloat(p.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Mode breakdown */}
          {Object.keys(modeBreakdown).length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Mode Breakdown</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(modeBreakdown).map(([mode, total]) => (
                  <div key={mode}
                    className={`px-3 py-1.5 rounded-xl text-xs border
                      ${modeColor[mode] || "bg-white/10 text-white/60 border-white/10"}`}>
                    {mode}: ₹{total.toFixed(2)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const WalletModal = ({ customer, onClose }) => {
  if (!customer) return null;

  const typeColor = {
    credit: "bg-green-500/20 text-green-300 border-green-500/30",
    debit: "bg-red-500/20 text-red-300 border-red-500/30",
  };
  const modeColor = {
    cash: "bg-green-500/20 text-green-300 border-green-500/30",
    upi: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    card: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background: "#0e2a47b5"}}
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-white/20 rounded-2xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h3 className="text-white font-semibold text-lg">{customer.customer_name || "—"}</h3>
            <p className="text-white/50 text-sm">{customer.phone || "—"}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl font-bold">✕</button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 p-5 border-b border-white/10">
          <div className="bg-green-500/10 rounded-xl p-3 text-center">
            <p className="text-green-400/70 text-xs mb-1">Credit</p>
            <p className="text-green-300 font-semibold">₹{parseFloat(customer.total_credit || 0).toFixed(2)}</p>
          </div>
          <div className="bg-red-500/10 rounded-xl p-3 text-center">
            <p className="text-red-400/70 text-xs mb-1">Debit</p>
            <p className="text-red-300 font-semibold">₹{parseFloat(customer.total_debit || 0).toFixed(2)}</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${parseFloat(customer.net_balance) >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
            <p className="text-white/50 text-xs mb-1">Net</p>
            <p className={`font-semibold ${parseFloat(customer.net_balance) >= 0 ? "text-green-300" : "text-red-300"}`}>
              ₹{parseFloat(customer.net_balance || 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Transaction History */}
        <div className="p-5">
          <p className="text-white/50 text-xs uppercase tracking-wider mb-3">Transaction History</p>

          {(customer.transactions || []).length === 0 ? (
            <p className="text-white/30 text-sm text-center py-4">No transactions found</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {customer.transactions.map((t, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Credit / Debit badge */}
                    <span className={`px-2 py-0.5 rounded-full text-xs border font-medium
                      ${typeColor[t.type?.toLowerCase()] || "bg-white/10 text-white/60 border-white/10"}`}>
                      {t.type}
                    </span>
                    {/* Mode badge */}
                    {t.mode && (
                      <span className={`px-2 py-0.5 rounded-full text-xs border
                        ${modeColor[t.mode?.toLowerCase()] || "bg-white/10 text-white/60 border-white/10"}`}>
                        {t.mode}
                      </span>
                    )}
                    <span className="text-white/40 text-xs">
                      {new Date(t.created_at).toLocaleString("en-IN", {
                        day: "2-digit", month: "short",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <span className={`font-semibold text-sm ${t.type === "credit" ? "text-green-300" : "text-red-300"}`}>
                    {t.type === "credit" ? "+" : "-"}₹{parseFloat(t.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PAY_COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#d9264a"];
const LEND_COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#ef4444"];
const WALLET_COLORS = ["#22c55e", "#ef4444"];

const PaymentLendingWallet = () => {
  const [filterType, setFilterType] = useState("");
  const [month, setMonth] = useState("");
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [activeTab, setActiveTab] = useState("payment");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedWalletCustomer, setSelectedWalletCustomer] = useState(null);

  const { data: paymentData, isLoading: paymentLoading } = useQuery(
    ["plw_payment", startDate, endDate],
    () => apiConnectorGet(`${endpoint.dashboard_payment_analysis_api}?startDate=${startDate}&endDate=${endDate}`),
    {
      refetchOnWindowFocus: false,
      enabled: activeTab === "payment" && !!startDate && !!endDate,
    }
  );

  const { data: lendingData, isLoading: lendingLoading } = useQuery(
    ["plw_lending", startDate, endDate],
    () => apiConnectorGet(`${endpoint.dashboard_lending_analysis_api}?startDate=${startDate}&endDate=${endDate}`),
    {
      refetchOnWindowFocus: false,
      enabled: activeTab === "lending" && !!startDate && !!endDate,
    }
  );

  const { data: walletData, isLoading: walletLoading } = useQuery(
    ["plw_wallet", startDate, endDate],
    () => apiConnectorGet(`${endpoint.dashboard_wallet_analysis_api}?startDate=${startDate}&endDate=${endDate}`),
    {
      refetchOnWindowFocus: false,
      enabled: activeTab === "wallet" && !!startDate && !!endDate,
    }
  );

  const payment = paymentData?.data?.data?.records || {};
  const payBreak = paymentData?.data?.data?.breakdown || [];
  const lendSum = lendingData?.data?.data?.summary || {};
  const lendMode = lendingData?.data?.data?.paymentModeBreakdown || {};
  const lendList = lendingData?.data?.data?.customerList || [];
  const walMonthly = walletData?.data?.data?.monthly || {};
  const walToday = walletData?.data?.data?.today || {};
  const walMode = walletData?.data?.data?.modeBreakdown || {};
  const walCustomers = walletData?.data?.data?.customerWallet || [];
  const walChart = walletData?.data?.data?.dailyChart || [];

  const payPieData = [
    { name: "Cash", value: payment.cash || 0 },
    { name: "UPI", value: payment.upi || 0 },
    { name: "Card", value: payment.card || 0 },
    { name: "Lending", value: payment.lending || 0 },
  ];
  const lendPieData = [
    { name: "Cash", value: lendMode.cash || 0 },
    { name: "UPI", value: lendMode.upi || 0 },
    { name: "Card", value: lendMode.card || 0 },
    { name: "Unpaid", value: lendMode.unpaid || 0 },
  ];
  const walPieData = [
    { name: "Total Credit", value: walMonthly.totalCredit || 0 },
    { name: "Total Debit", value: walMonthly.totalDebit || 0 },
  ];

  const isLoading =
    (activeTab === "payment" && paymentLoading) ||
    (activeTab === "lending" && lendingLoading) ||
    (activeTab === "wallet" && walletLoading);

  return (
    <div className="main_analysisrder">

      {/*  Modal */}
      <LendingModal customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />
      <WalletModal customer={selectedWalletCustomer} onClose={() => setSelectedWalletCustomer(null)} />

      <div className="chart_header">
        <div className="chart_heading">
          <h4>Payment · Lending · Wallet</h4>
          <p>Daily performance overview</p>
        </div>

        {/* FILTERS */}
        <div className="flex payment_tabs">
          <div className="flex gap-2 live_filters">

            {[
              { id: "payment", label: "Payment Analysis" },
              { id: "lending", label: "Lending Analysis" },
              { id: "wallet", label: "Wallet Analysis" },
            ].map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={` ${activeTab === t.id
                  ? "active_tab" : ""}`}>
                {t.label}
              </button>
            ))}

          </div>
        </div>
      </div>




      {isLoading ? (
        <div className="text-center py-16 text-white/50">Loading data...</div>
      ) : (
        <>
          {/* PAYMENT TAB */}
          {activeTab === "payment" && (
            <>
              <Row className="p-4 pt-0">
                <Col md={3} sm={6} xs={12} className="mb-3 md:mb-0">
                  <Card title="Cash" value={`₹${payment.cash || 0}`} color="green" />
                </Col>
                <Col md={3} sm={6} xs={12} className="mb-3 md:mb-0">
                  <Card title="UPI" value={`₹${payment.upi || 0}`} color="blue" />
                </Col>
                <Col md={3} sm={6} xs={12} className="mb-3 md:mb-0">
                  <Card title="Card" value={`₹${payment.card || 0}`} color="purple" />
                </Col>
                <Col md={3} sm={6} xs={12} className="mb-3 md:mb-0">
                  <Card title="Lending" value={`₹${payment.lending || 0}`} color="red" />
                </Col>
              </Row>
              <Row className="p-4 pt-0">
                <Col md={6} className="mb-3 md:mb-0">
                  <Section title="Payment Breakdown">
                    <div className="h-52 px-4 pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={payPieData} dataKey="value" nameKey="name" outerRadius={80} label>
                            {payPieData.map((_, i) => <Cell key={i} fill={PAY_COLORS[i]} />)}
                          </Pie>
                          <Tooltip formatter={(v) => `₹${v}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-dark px-4 pb-4">
                      {payPieData.map((d, i) => (
                        <span key={i} className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded" style={{ background: PAY_COLORS[i] }} />
                          {d.name}
                        </span>
                      ))}
                    </div>
                  </Section>
                </Col>
                <Col md={6} className="mb-3 md:mb-0">
                  <Section title="Payment Records">
                    <div className="rec-card-body">
                      <div class="rec-thead">
                          <span className="rec-th">Method</span>
                          <span className="rec-th">Amount</span>
                      </div>
                        {[
                          { label: "Cash", val: payment.cash,  },
                          { label: "UPI", val: payment.upi,  },
                          { label: "Card", val: payment.card,  },
                          { label: "Lending", val: payment.lending,  },
                        ].map((row, i) => (
                          <li key={i} className="rec-row">
                            <span  className="rec-key"><Badge label={row.label}  /></span>
                            <span className="rec-val">₹{row.val || 0}</span>
                          </li>
                        ))}
                        <li className="rec-row"><span><b>Total</b></span><span className="rec-val">₹{((payment.cash || 0) + (payment.upi || 0) + (payment.card || 0) + (payment.lending || 0)).toFixed(2)}</span></li>
                      
                    </div>

                  </Section>
                </Col>
              </Row>
            </>
          )}

          {/* LENDING TAB */}
          {activeTab === "lending" && (
            <>
              <Row className="p-4 pt-0">
                <Col md={3} sm={6} xs={12} className="mb-3 md:mb-0">
                  <Card title="Total Lent" value={`₹${lendSum.totalBillAmount || 0}`} color="blue" />
                </Col>
                <Col md={3} sm={6} xs={12} className="mb-3 md:mb-0">
                  <Card title="Total Paid" value={`₹${lendSum.totalPaid || 0}`} color="green" />
                </Col>
                <Col md={3} sm={6} xs={12} className="mb-3 md:mb-0">
                  <Card title="Total Remaining" value={`₹${lendSum.totalRemaining || 0}`} color="red" />
                </Col>
                <Col md={3} sm={6} xs={12} className="mb-3 md:mb-0">
                  <Card title="Total Entries" value={lendSum.totalEntries || 0} color="purple" />
                </Col>
              </Row>

              <Row className="p-4 pt-0">
                <Col md={6} className="mb-3 md:mb-0">
                  <Section title="Lending — Paid via (Cash / UPI / Card)">
                    <div className="h-52 px-4 pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={lendPieData} dataKey="value" nameKey="name" outerRadius={80} label>
                            {lendPieData.map((_, i) => <Cell key={i} fill={LEND_COLORS[i]} />)}
                          </Pie>
                          <Tooltip formatter={(v) => `₹${v}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-dark  px-4 pb-4">
                      {lendPieData.map((d, i) => (
                        <span key={i} className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded" style={{ background: LEND_COLORS[i] }} />
                          {d.name}: ₹{d.value}
                        </span>
                      ))}
                    </div>
                  </Section>
                </Col>

                <Col md={6} className="mb-3 md:mb-0">
                  <Section title="Payment Mode Records">
                    <div className="rec-card-body">
                      <div className="rec-thead">
                        <span className="rec-th">Mode</span>
                        <span className="rec-th">Paid Amount</span>
                      </div>
                        {[
                          { label: "Cash", val: lendMode.cash },
                          { label: "UPI", val: lendMode.upi },
                          { label: "Card", val: lendMode.card },
                          { label: "Unpaid", val: lendMode.unpaid },
                        ].map((row, i) => (
                          <li key={i} className="rec-row">
                            <span className="rec-key"><Badge label={row.label} color={row.label.toLowerCase()} /></span>
                            <span className="rec-val">₹{row.val || 0}</span>
                          </li>
                        ))}
                    </div>

                  </Section>
                </Col>
              </Row>

              {/*  FIXED: Customer table — Mode column hataya, click se modal */}
              <div className="mx-4 mb-3">
              <Section  title="Customer-wise Lending (click to view payments)" >
                {lendList.length > 0 ? (
                  <div className="main_table_container" className="mx-3">
                    <div className="overflow-x-auto" style={{ borderRadius: "14px;" }}>
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10 text-white/60">
                            <th>Customer</th>
                            <th>Phone</th>
                            <th>Bill Amt</th>
                            <th>Paid</th>
                            <th>Remaining</th>
                            <th>Status</th>
                            <th>Action</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lendList.map((row, i) => (
                            <tr
                              key={i}
                              className="border-b border-white/5 hover:bg-white/10 cursor-pointer transition"
                            >
                              <td>{row.customer_name || "—"}</td>
                              <td>{row.phone || "—"}</td>
                              <td>₹{parseFloat(row.bill_amount || 0).toFixed(2)}</td>
                              <td>₹{parseFloat(row.paid_amount || 0).toFixed(2)}</td>
                              <td>₹{parseFloat(row.remaining || 0).toFixed(2)}</td>
                              <td>
                                <Badge label={row.status} color={row.status?.toLowerCase()} />
                              </td>
                              <td >
                                < FaEye className="!text-red-500"
                                  onClick={() => setSelectedCustomer(row)}
                                /></td>
                              <td >{row.order_date?.slice(0, 10)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-dark text-center py-8">No lending records found</p>
                )}
              </Section>
              </div>
            </>
          )}

          {/* WALLET TAB — unchanged */}
          {activeTab === "wallet" && (
            <>
              <Row className="p-4 pt-0">
                <Col md={3} sm={6} xs={12} className="mb-3 md:mb-0">
                  <Card title="Total Credit" value={`₹${walMonthly.totalCredit || 0}`} color="green" />
                </Col>
                <Col md={3} sm={6} xs={12} className="mb-3 md:mb-0">
                  <Card title="Total Debit" value={`₹${walMonthly.totalDebit || 0}`} color="red" />
                </Col>
                <Col md={3} sm={6} xs={12} className="mb-3 md:mb-0">
                  <Card title="Net Balance" value={`₹${walMonthly.netBalance || 0}`} color="purple" />
                </Col>
                <Col md={3} sm={6} xs={12} className="mb-3 md:mb-0">
                  <Card title="Transactions" value={walMonthly.totalTransactions || 0} color="blue" />
                </Col>
              </Row>
              <Row className="p-4 pt-0">
                <Col md={6} className="mb-3 md:mb-0">
                  <Section title="Wallet Overview (Credit vs Debit)">
                    <div className="h-52 px-4 pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={walPieData} dataKey="value" nameKey="name" outerRadius={80} label>
                            {walPieData.map((_, i) => <Cell key={i} fill={WALLET_COLORS[i]} />)}
                          </Pie>
                          <Tooltip formatter={(v) => `₹${v}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex gap-4 mt-3 text-xs text-dark  px-4 pb-4">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500" />Credit</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500" />Debit</span>
                    </div>
                  </Section>
                </Col>
                <Col md={6} className="mb-3 md:mb-0">
                  <Section title="Wallet by Payment Mode">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-white/60">
                          <th className="p-3 text-left">Mode</th>
                          <th className="p-3 text-right text-green-400">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(walMode).length > 0 ? (
                          Object.entries(walMode).map(([mode, vals], i) => (
                            <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                              <td className="p-3"><Badge label={mode} color={mode.toLowerCase()} /></td>
                              <td className="p-3 text-right text-green-400">₹{vals.credit || 0}</td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={3} className="p-4 text-center text-dark">No data</td></tr>
                        )}
                      </tbody>
                    </table>
                  </Section>
                </Col>
              </Row>
              <Row className="p-4 pt-0 pb-0">
                {walChart.length > 0 && (
                  <Col md={6} className="mb-3 md:mb-0">
                    <Section title="Daily Wallet Activity">
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={walChart}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} tickFormatter={(v) => v?.slice(5)} />
                            <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                            <Tooltip formatter={(v) => `₹${v}`} contentStyle={{ background: "#1a1a2e", border: "none", borderRadius: 8 }} />
                            <Legend wrapperStyle={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }} />
                            <Bar dataKey="credit" name="Credit" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="debit" name="Debit" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Section>
                  </Col>
                )}
                <Col md={6} className="mb-3 md:mb-0">
                  <div className="">
                    <Section title="Customer Wallet Summary">
                      {walCustomers.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-white/10 text-white/60" >
                                <th className="p-3 text-left">Customer</th>
                                <th className="p-3 text-left">Phone</th>
                                <th className="p-3 text-right text-green-400">Credit</th>
                                <th className="p-3 text-right text-red-400">Debit</th>
                                <th className="p-3 text-right">Net Balance</th>
                                <th className="p-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {walCustomers.map((c, i) => (
                                <tr key={i} className="border-b border-white/5 hover:bg-white/5"
                                >
                                  <td className="p-3 font-medium">{c.customer_name || `Customer #${c.customer_id}`}</td>
                                  <td className="p-3 text-white/60">{c.phone || "—"}</td>
                                  <td className="p-3 text-right text-green-400">₹{parseFloat(c.total_credit).toFixed(2)}</td>
                                  <td className="p-3 text-right text-red-400">₹{parseFloat(c.total_debit).toFixed(2)}</td>
                                  <td className={`p-3 text-right font-semibold ${parseFloat(c.net_balance) >= 0 ? "text-green-400" : "text-red-400"}`}>
                                    ₹{parseFloat(c.net_balance).toFixed(2)}
                                  </td>
                                  <td className="p-3 flex justify-center items-center">
                                    < FaEye className="!text-red-500 !cursor-pointer"
                                      onClick={() => setSelectedWalletCustomer(c)}
                                    /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-dark text-center py-8">No wallet transactions found</p>
                      )}
                    </Section>
                  </div>
                </Col>
              </Row>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default PaymentLendingWallet;