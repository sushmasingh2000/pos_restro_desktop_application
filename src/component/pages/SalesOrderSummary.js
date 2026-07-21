import React, { useMemo, useState } from "react";
import { useQuery } from "react-query";
import { apiConnectorGet } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import getLast12Months from "../../Shared/Month";
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import DailyOrderChart from "../DailyOrderChart";

const Card = ({ title, value }) => (
  <div className="relative p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg hover:scale-[1.02] transition overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 pointer-events-none" />
    <div className="relative z-10">
      <p className="text-white/70 text-sm">{title}</p>
      <h2 className="text-2xl font-bold mt-2 text-white">{value}</h2>
    </div>
  </div>
);

const SalesSummary = () => {
  const today = new Date().toISOString().split("T")[0];
  const [filterType, setFilterType] = useState("");
  const [month, setMonth] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [subTab, setSubTab] = useState("orders");
  const [mainTab, setMainTab] = useState("sales");
  const months = getLast12Months();


  const { data: summaryData, isLoading: summaryLoading } = useQuery(
    ["dashboard_summary", month],
    () => apiConnectorGet(`${endpoint.dashboard_summary_api}?month=${month}`),
    {
      refetchOnWindowFocus: false,
      enabled: true,
    }
  );

  const { data: dailyOrderData, isLoading: dailyOrderLoading } = useQuery(
    ["dashboard_daily_orders", startDate, endDate],
    () => apiConnectorGet(`${endpoint.dashboard_daily_order_analysis_api}?startDate=${startDate}&endDate=${endDate}`),
    {
      refetchOnWindowFocus: false,
      enabled: mainTab === "sales" && subTab === "orders" && !!startDate && !!endDate,
    }
  );

  // ── 3. Daily Sales Analysis ───────────────────────────────────
  const { data: dailySalesData, isLoading: dailySalesLoading } = useQuery(
    ["dashboard_daily_sales", month, startDate, endDate, filterType],
    () => apiConnectorGet(`${endpoint.dashboard_daily_sales_analysis_api}?startDate=${startDate}&endDate=${endDate}`),
    {
      refetchOnWindowFocus: false,
      enabled: mainTab === "sales" && subTab === "sales" && !!startDate && !!endDate,
    });

  // ── 4. Payment Analysis ───────────────────────────────────────
  const { data: paymentData, isLoading: paymentLoading } = useQuery(
    ["dashboard_payment", month, startDate, endDate, filterType],
    () => apiConnectorGet(`${endpoint.dashboard_payment_analysis_api}?startDate=${startDate}&endDate=${endDate}`),
    {
      refetchOnWindowFocus: false,
      enabled: mainTab === "payment" && !!startDate && !!endDate,
    }
  );
  // ── Data extraction ───────────────────────────────────────────
  const summary = summaryData?.data?.data || {};
  const orderRec = dailyOrderData?.data?.data?.records || {};
  const orderBreak = dailyOrderData?.data?.data?.chart || [];
  const salesRec = dailySalesData?.data?.data?.records || {};
  const payment = paymentData?.data?.data?.records || {};
  const payBreak = paymentData?.data?.data?.breakdown || [];

  // ── Chart data ────────────────────────────────────────────────
  const COLORS = ["#a855f7", "#9ca3af"];
  const SALES_COLORS = ["#3b82f6", "#a855f7"];
  const PAYMENT_COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#d9264a"];

  const pieData = [
    { name: "Restaurant Orders", value: orderRec.restaurantOrderProcessed || 0 },
    { name: "Online Orders", value: orderRec.onlineOrderProcessed || 0 },
  ];

  const salesPieData = [
    { name: "Restaurant Sales", value: salesRec.restaurantSales || 0 },
    { name: "Online Sales", value: salesRec.onlineSales || 0 },
  ];

  const paymentPieData = [
    { name: "Cash", value: payment.cash || 0 },
    { name: "UPI", value: payment.upi || 0 },
    { name: "Card", value: payment.card || 0 },
    { name: "Lending", value: payment.lending || 0 },
  ];

  const isLoading =
    summaryLoading ||
    (mainTab === "sales" && subTab === "orders" && dailyOrderLoading) ||
    (mainTab === "sales" && subTab === "sales" && dailySalesLoading) ||
    (mainTab === "payment" && paymentLoading)

  const stats = [
    { title: "Monthly Orders", value: summary.monthlyOrders || 0, icon: "<i class=\"ri-receipt-line\"></i>" },
    { title: "Monthly Revenue", value: `₹${summary.monthlyRevenue || 0}`, icon: "<i class=\"ri-money-dollar-circle-line\"></i>" },
    { title: "Monthly Expense", value: `₹${summary.monthlyExpense || 0}`, icon: "<i class=\"ri-bank-line\"></i>" },
    { title: "Monthly Lending Amount", value: `₹${summary.monthlyLentAmount || 0}`, icon: "<i class=\"ri-bank-line\"></i>" },
    { title: "Monthly Due Collected", value: `₹${summary.monthlyDueCollected || 0}${summary.monthlyDueCollectedCount ? ` (${summary.monthlyDueCollectedCount})` : ""}`, icon: "<i class=\"ri-hand-coin-line\"></i>" },
    { title: "Today's Due Collected", value: `₹${summary.todayDueCollected || 0}${summary.todayDueCollectedCount ? ` (${summary.todayDueCollectedCount})` : ""}`, icon: "<i class=\"ri-hand-coin-line\"></i>" },
    // { title: "Net Profit", value: `₹${Number(summary.netProfit)?.toFixed(2) || 0}`, icon: "<i class=\"ri-feedback-line\"></i>" },
  ];

  return (
    <div className="min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-center gap-4 main_breadcrumb">
        <h2 className="main_heading">Sales Summary</h2>

        <div className="flex gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="" >
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* LOADING */}
      {isLoading ? (
        <div className="text-center py-10 text-white/60">Loading data...</div>
      ) : (
        <>
          <Row>
            {stats.map((item) => (
              <Col xs={12} sm={6} md={3} className="mb-md-0 mb-4" key={item.title}>
                <div className="main_card" >
                  <div className="main_icon" dangerouslySetInnerHTML={{ __html: item.icon }} />
                  <h2>{item.value}</h2>
                  <p>{item.title}</p>
                </div>
              </Col>
            ))}
          </Row>
          {/* ── TOP CARDS ── */}

          <div className="flex justify-between items-center mt-md-3">
            <h4 className="main_heading">Sales Analysis</h4>
            <div className="flex justify-end gap-3 px-3" >
              <div className="main_input">
                <label>
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  max={today}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="main_input">
                <label>
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  max={today}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="ana-tabs">
            <button
              onClick={() => setMainTab("sales")}
              className={`atab ${mainTab === "sales" ? "on" : ""}`}
            >
              Sales Analysis
            </button>
            <button
              onClick={() => setMainTab("payment")}
              className={`atab ${mainTab === "payment" ? "on" : ""}`}
            >
              Payment Analysis
            </button>
          </div>


          <div className=" ">
            {/* ── SUB TABS (Sales only) ── */}
            {mainTab === "sales" && (
              <div className="flex gap-3 mb-6 text-xs">
                <button
                  className={`stab ${subTab === "orders" ? "on" : ""}`}
                  onClick={() => setSubTab("orders")}
                >
                  Daily Orders
                </button>
                <button
                  className={`stab ${subTab === "sales" ? "on" : ""}`}
                  onClick={() => setSubTab("sales")}
                >
                  Daily Sales
                </button>
              </div>
            )}

            {/* ══════════════════════════════════════
              SALES ANALYSIS TAB
          ══════════════════════════════════════ */}
            {mainTab === "sales" && (
              <>
                {subTab === "orders" ? (
                  <Row>
                    <Col md={6} className="mb-4 md:mb-0" >
                      {/* Chart */}
                      <div className="main_cards" style={{ height: "100%" }}>
                        <div className="cards_header flex items-center justify-between">
                          <div>
                            <h3>Daily Orders</h3>
                            <p>Daily performance overview</p>
                          </div>
                          <button className="chart_btn">View Report</button>
                        </div>
                        <DailyOrderChart data={orderBreak} />
                      </div>
                    </Col>
                    <Col md={6} className="mb-4 md:mb-0" >
                      {/* Records Table */}
                      <div className="main_cards" style={{ height: "100%" }}>
                        <div className="cards_header flex items-center justify-between ">
                          <div>
                            <h3>Daily Sales Records</h3>
                            <p>Daily performance overview</p>
                          </div>
                          <button className="chart_btn">View Report</button>
                        </div>
                        <div className="rec-card-body">
                          <div class="rec-thead">
                            <span className="rec-th">Orders</span>
                            <span className="rec-th">Quantity</span>
                          </div>
                          <div className="rec-row">
                            <span className="rec-key">Order Processed</span>
                            <span className="rec-val">{orderRec.orderProcessed || 0}</span>
                          </div>
                          <div className="rec-row">
                            <span className="rec-key">Restaurant Order Processed</span>
                            <span className="rec-val">{orderRec.restaurantOrderProcessed || 0}</span>
                          </div>
                          <div className="rec-row">
                            <span className="rec-key">Online Order Processed</span>
                            <span className="rec-val">{orderRec.onlineOrderProcessed || 0}</span>
                          </div>
                        </div>
                      </div>
                    </Col>
                  </Row>
                ) : (
                  <Row>
                    {/* Sales Chart */}
                    <Col md={6} className="mb-4 md:mb-0">
                      <div className="main_cards" style={{ height: "100%" }}>
                        <div className="cards_header flex items-center justify-between">
                          <div>
                            <h3>Daily Sales</h3>
                            <p>Daily performance overview</p>
                          </div>
                          <button className="chart_btn">View Report</button>
                        </div>
                        <div className="p-5">
                          <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={salesPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                  {salesPieData.map((_, index) => (
                                    <Cell key={index} fill={SALES_COLORS[index]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => value} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex gap-4 mt-4 text-xs text-white/60">
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 bg-blue-400" />Restaurant In Sales
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 bg-purple-400" />Online Sales
                            </span>
                          </div>
                        </div>
                      </div>
                    </Col>
                    {/* Sales Records Table */}
                    <Col md={6} className="mb-4 md:mb-0">
                      <div className="main_cards" style={{ height: "100%" }}>
                        <div className="cards_header flex items-center justify-between">
                          <div>
                            <h3>Daily Sales Records</h3>
                            <p>Daily performance overview</p>
                          </div>
                          <button className="chart_btn">View Report</button>
                        </div>
                        <div className="rec-card-body">
                          <div class="rec-thead">
                            <span className="rec-th">Sales</span>
                            <span className="rec-th">Quantity</span>
                          </div>
                          <div className="rec-row"><span className="rec-key">Total Sale</span><span className="rec-val">{salesRec.totalSale || 0}</span></div>
                          <div className="rec-row"><span className="rec-key">Restaurant Sales</span><span className="rec-val">{salesRec.restaurantSales || 0}</span></div>
                          <div className="rec-row"><span className="rec-key">Online Sales</span><span className="rec-val">{salesRec.onlineSales || 0}</span></div>
                          <div className="rec-row"><span className="rec-key">Total Expense</span><span className="rec-val">{salesRec.totalExpense || 0}</span></div>
                          <div className="rec-row"><span className="rec-key">Total Lend Sales</span><span className="rec-val">{salesRec.totalLendSales || 0}</span></div>

                        </div>

                      </div>
                    </Col>
                  </Row>
                )}
              </>
            )}

            {mainTab === "payment" && (
              <Row >
                <Col md={6} className="mb-4 md:mb-0">
                  <div className="main_cards" style={{ height: "100%" }}>
                    <div className="cards_header flex items-center justify-between">
                      <div>
                        <h3>Payment Breakdown</h3>
                        <p>Daily performance overview</p>
                      </div>
                      <button className="chart_btn">View Report</button>
                    </div>
                    <div className="p-5 h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={paymentPieData} dataKey="value" nameKey="name" outerRadius={80} label>
                            {paymentPieData.map((_, i) => (
                              <Cell key={i} fill={PAYMENT_COLORS[i]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `₹${value}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </Col>
                <Col md={6} className="mb-4 md:mb-0">
                  <div className="main_cards" style={{ height: "100%" }}>
                    <div className="cards_header flex items-center justify-between">
                      <div>
                        <h3>Payment Records</h3>
                        <p>Daily performance overview</p>
                      </div>
                      <button className="chart_btn">View Report</button>
                    </div>
                    <div className="rec-card-body">
                      <div className="rec-row"><span className="rec-key">Cash</span><span className="rec-val">₹{payment.cash || 0}</span></div>
                      <div className="rec-row"><span className="rec-key">UPI</span><span className="rec-val">₹{payment.upi || 0}</span></div>
                      <div className="rec-row"><span className="rec-key">Card</span><span className="rec-val">₹{payment.card || 0}</span></div>
                      <div className="rec-row"><span className="rec-key">Lending</span><span className="rec-val">₹{payment.lending || 0}</span></div>

                    </div>

                  </div>
                </Col>
              </Row>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SalesSummary;