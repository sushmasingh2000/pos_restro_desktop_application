import { useState, useEffect, useCallback, useRef } from "react";
import { apiConnectorGet } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";

const fmt  = (n) => "₹" + (parseFloat(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtN = (n) => (parseInt(n) || 0).toLocaleString("en-IN");
const fmtD = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtDT= (d) => d ? new Date(d).toLocaleString("en-IN",  { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const ini  = (n) => (n || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

const card = { background: "#212020", borderRadius: 12, border: "1px solid #3d3d3d", padding: "14px 16px", marginBottom: 14 };
const th   = {   };
const td   = {  };

// ── SMALL COMPONENTS ─────────────────────────────────────────
const Spinner = () => (
  <div style={{ width: 20, height: 20, border: "2px solid #e5e7eb", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin .6s linear infinite", display: "inline-block", verticalAlign: "middle" }} />
);

const Badge = ({ text, type = "gray" }) => {
  const colors = {
    green: { bg: "#d1fae5", col: "#065f46" },
    red:   { bg: "#fee2e2", col: "#991b1b" },
    amber: { bg: "#fef3c7", col: "#92400e" },
    blue:  { bg: "#dbeafe", col: "#1e40af" },
    gray:  { bg: "#f3f4f6", col: "#374151" },
  };
  const s = colors[type] || colors.gray;
  return (
    <span style={{ display: "inline-block", fontSize: 11, padding: "2px 8px", borderRadius: 6, fontWeight: 600, background: s.bg, color: s.col }}>
      {text}
    </span>
  );
};

const statusBadge = (s) => {
  const m = { paid: "green", completed: "green", settled: "green", cancelled: "red", pending: "amber", partial: "amber" };
  return <Badge text={s || "—"} type={m[s] || "gray"} />;
};

const Stat = ({ label, value, color = "#FFF" }) => (
  <div style={{ background: "#2b2b2b", borderRadius: 8, padding: "10px 12px" }}>
    <div style={{ fontSize: 11, color: "#d7d7d7", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 17, fontWeight: 700, color }}>{value}</div>
  </div>
);

const StatGrid = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10 }}>
    {children}
  </div>
);

const Section = ({ label, children }) => (
  <div style={card}>
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "#696969", textTransform: "uppercase", marginBottom: 12 }}>
      {label}
    </div>
    {children}
  </div>
);

const Empty = ({ text }) => (
  <div style={{ color: "#696969", textAlign: "center", padding: "24px 0", fontSize: 13 }}>{text}</div>
);

// ── BILL TABLE ───────────────────────────────────────────────
const BillTable = ({ list }) => {
  if (!list.length) return <Empty text="Koi bill nahi" />;
  return (
    <div  className="main_table_container">
       <div className="overflow-x-auto" style={{borderRadius: '14px'}}>
        <table className="w-full">
          <thead>
            <tr>
              {["Date", "Bill ID", "Total", "Paid", "Remaining", "Discount", "Wallet used", "Method", "Status"].map((h) => (
                <th key={h} >{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((b, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition text-center">
                <td style={{ ...td, whiteSpace: "nowrap" }}>{fmtD(b.createdAt)}</td>
                <td style={{ ...td, color: "#2563eb", fontWeight: 600 }}>#{b.billId}</td>
                <td style={td}>{fmt(b.totalAmount)}</td>
                <td style={{ ...td, color: "#059669", fontWeight: 600 }}>{fmt(b.paidAmount)}</td>
                <td style={{ ...td, color: parseFloat(b.remaining) > 0 ? "#dc2626" : "#059669", fontWeight: 600 }}>{fmt(b.remaining)}</td>
                <td style={{ ...td, color: "#d97706" }}>{fmt(b.discount)}</td>
                <td style={{ ...td, color: "#2563eb" }}>{fmt(b.walletUsed)}</td>
                <td style={td}>{b.paymentMethod || "—"}</td>
                <td style={td}>{statusBadge(b.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── LENDING TABLE ────────────────────────────────────────────
const LendingTable = ({ list }) => {
  if (!list.length) return <Empty text="Not found Any Due" />;
  return (
    <div  className="main_table_container">
      <div className="overflow-x-auto" style={{borderRadius: '14px'}}>
        <table className="w-full">
          <thead>
            <tr>
              {["Order date", "Bill no", "Bill amount", "Paid", "Remaining", "Mode", "Settlement date", "Status"].map((h) => (
                <th key={h} >{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((l, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition text-center">
                <td style={{ ...td, whiteSpace: "nowrap" }}>{fmtD(l.orderDate)}</td>
                <td style={{ ...td, color: "#2563eb", fontWeight: 600 }}>{l.billNo || "—"}</td>
                <td style={td}>{fmt(l.billAmount)}</td>
                <td style={{ ...td, color: "#059669", fontWeight: 600 }}>{fmt(l.paidAmount)}</td>
                <td style={{ ...td, color: parseFloat(l.remaining) > 0 ? "#dc2626" : "#059669", fontWeight: 600 }}>{fmt(l.remaining)}</td>
                <td style={td}>{l.paymentMode || "—"}</td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>{fmtD(l.settlementDate)}</td>
                <td style={td}>{statusBadge(l.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── WALLET LIST ──────────────────────────────────────────────
const WalletList = ({ list }) => {
  if (!list.length) return <Empty text="Koi wallet transaction nahi" />;
  return (
    <div>
      {list.map((w, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: i < list.length - 1 ? "1px solid #292929" : "none" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: w.type === "credit" ? "#1f2f27" : "#372424", color: w.type === "credit" ? "#059669" : "#dc2626", fontSize: 18, fontWeight: 700 }}>
            {w.type === "credit" ? "↑" : "↓"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {w.remark || "—"}
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
              {fmtDT(w.createdAt)} · {w.paymentMode || "—"}{w.referenceId ? ` · Ref: ${w.referenceId}` : ""}
            </div>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, flexShrink: 0, color: w.type === "credit" ? "#059669" : "#dc2626" }}>
            {w.type === "credit" ? "+" : "−"}{fmt(w.amount)}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── ORDER ITEMS ──────────────────────────────────────────────
const OrderItems = ({ items, topItems }) => {
  const [view, setView] = useState("items");
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[
          { k: "items", label: `Sabhi items (${items.length})` },
          { k: "top",   label: `Top ordered (${topItems.length})` },
        ].map((t) => (
          <button key={t.k} onClick={() => setView(t.k)}
            style={{ padding: "5px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid #3d3d3d", background: view === t.k ? "var(--primary-color)" : "#2b2b2b", color: view === t.k ? "#000" : "#9f9f9f" }}>
            {t.label}
          </button>
        ))}
      </div>

      {view === "items" && (
        items.length === 0 ? <Empty text="Koi order item nahi" /> :
        <div className="main_table_container">
          <div className="overflow-x-auto" style={{borderRadius: '14px'}}>
            <table className="w-full">
              <thead>
                <tr>{["Date & Time","Order ID","Item name","Qty","Price","Total","KOT","Item status","Remark"].map((h) => <th key={h} >{h}</th>)}</tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition text-center">
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{fmtDT(it.createdAt)}</td>
                    <td style={{ ...td, color: "#2563eb", fontWeight: 600 }}>#{it.orderId}</td>
                    <td style={{ ...td, fontWeight: 500, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.menuName || "—"}</td>
                    <td style={{ ...td, textAlign: "center", fontWeight: 700 }}>{it.quantity}</td>
                    <td style={td}>{fmt(it.price)}</td>
                    <td style={{ ...td, fontWeight: 700, color: "#059669" }}>{fmt(it.total)}</td>
                    <td style={td}>{it.kotNo || "—"}</td>
                    <td style={td}>{statusBadge(it.itemStatus)}</td>
                    <td style={{ ...td, color: "#6b7280", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {it.itemRemark || it.predefinedRemark || it.globalRemark || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === "top" && (
        topItems.length === 0 ? <Empty text="Data nahi mila" /> :
        <div>
          {topItems.map((t, i) => {
            const pct = Math.round((t.totalQty / (topItems[0]?.totalQty || 1)) * 100);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: i < topItems.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: i < 3 ? "#fef3c7" : "#f3f4f6", color: i < 3 ? "#92400e" : "#374151", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.menuName}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{fmtN(t.orderCount)} baar · Qty: {fmtN(t.totalQty)}</div>
                  <div style={{ marginTop: 5, height: 5, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "var(--primary-color)", borderRadius: 99 }} />
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#059669", flexShrink: 0, minWidth: 70, textAlign: "right" }}>{fmt(t.totalAmount)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── CUSTOMER LIST ITEM ───────────────────────────────────────
const CustItem = ({ c, active, onClick }) => (
  <div onClick={onClick} style={{ padding: "11px 14px", borderBottom: "1px solid #3d3d3d", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: active ? "#c5a3772b" : "#212020", borderLeft: active ? "3px solid var(--primary-color)" : "3px solid transparent", transition: "background .12s" }}>
    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#c5a37736", color: "var(--primary-color)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
      {ini(c.name)}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>{c.phone || ""}</div>
    </div>
    <div style={{ textAlign: "right", flexShrink: 0 }}>
      <div style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>{fmt(c.totalBilled)}</div>
      {parseFloat(c.totalUdharPending) > 0 && (
        <div style={{ fontSize: 11, color: "#dc2626", marginTop: 1 }}>Due {fmt(c.totalUdharPending)}</div>
      )}
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function CustomerReport() {
  const [customers, setCustomers] = useState([]);
  const [filtered,  setFiltered]  = useState([]);
  const [activeId,  setActiveId]  = useState(null);
  const [report,    setReport]    = useState(null);
  const [listLoad,  setListLoad]  = useState(false);
  const [detLoad,   setDetLoad]   = useState(false);
  const [listErr,   setListErr]   = useState("");
  const [detErr,    setDetErr]    = useState("");
  const [search,    setSearch]    = useState("");
  const [localQ,    setLocalQ]    = useState("");
  const [activeTab, setActiveTab] = useState("bills");
  const timer = useRef(null);

  // ── Load customer list ──
  const loadList = useCallback(async (q = "") => {
    setListLoad(true);
    setListErr("");
    try {
      const res = await apiConnectorGet(
        `${endpoint?.customer_report_api}${q ? "?q=" + encodeURIComponent(q) : ""}`
      );
      const data = res?.data?.result || [];  // ✅ FIX 1
      setCustomers(data);
      setFiltered(data);
    } catch (e) {
      setListErr(e.message);
    } finally {
      setListLoad(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  // ── Search debounce ──
  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => loadList(val), 420);
  };

  // ── Local filter ──
  const handleLocal = (val) => {
    setLocalQ(val);
    if (!val.trim()) { setFiltered(customers); return; }
    const kw = val.toLowerCase();
    setFiltered(customers.filter((c) =>
      (c.name  || "").toLowerCase().includes(kw) ||
      (c.phone || "").includes(kw)
    ));
  };

  // ── Load single report ──
  const loadReport = async (id) => {
    setActiveId(id);
    setActiveTab("bills");
    setDetLoad(true);
    setDetErr("");
    setReport(null);
    try {
      const res = await apiConnectorGet(
        `${endpoint?.customer_report_by}/${id}`  // ✅ FIX 2 — "/" add kiya
      );
      setReport(res?.data?.result);
    } catch (e) {
      setDetErr(e.message);
    } finally {
      setDetLoad(false);
    }
  };

  const cu = report?.customer           || {};
  const bs = report?.summary?.bills     || {};
  const ls = report?.summary?.lending   || {};
  const ws = report?.summary?.wallet    || {};
  const bl = report?.billList           || [];
  const ll = report?.lendingList        || [];
  const wl = report?.walletTransactions || [];
  const oi = report?.orderItems         || [];
  const ti = report?.topItems           || [];

  const TABS = [
    { key: "bills",   label: `Bills (${bl.length})` },
    { key: "lending", label: `Due (${ll.length})` },
    { key: "wallet",  label: `Wallet (${wl.length})` },
    { key: "items",   label: `Order items (${oi.length})` },
  ];

  return (
    <div className="main_chait_boday">
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } @keyframes spin { to { transform: rotate(360deg); } } table tr:hover td { background: #f0f9ff; }`}</style>

      {/* ── TOP BAR ── */}
      <div style={{ background: "#212020", borderBottom: "1px solid #3d3d3d", padding: "10px 18px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
        <span style={{ fontSize: 15, fontWeight: 700, marginRight: 4, color: "#fff" }}> Customer Report</span>
        <input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name / phone..."
          style={{ padding: "7px 12px", color: "#fff", border: "1px solid #3d3d3d", background: "#212020", borderRadius: 8, fontSize: 13, width: 230, outline: "none" }}
        />
        <span style={{ fontSize: 12, color: "#fff" }}>{filtered.length} customers</span>
        <button
          onClick={() => loadList(search)}
          style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer", border: "1px solid var(--primary-color)", background: "var(--primary-color)", color: "#000" }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* ── BODY ── */}
      <div className="main_box_chait">

        {/* ── LEFT: Customer List ── */}
        <div className="main_chat_sidebar">
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #3d3d3d" }}>
            <input
              value={localQ}
              onChange={(e) => handleLocal(e.target.value)}
              placeholder="🔍 Filter list..."
              style={{ width: "100%", padding: "7px 10px", color: "#fff", background: "#212020", border: "1px solid #3d3d3d", borderRadius: 8, fontSize: 13, outline: "none" }}
            />
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {listLoad ? (
              <div style={{ padding: 24, textAlign: "center", color: "#6b7280" }}><Spinner /> &nbsp;Loading...</div>
            ) : listErr ? (
              <div style={{ padding: 16, color: "#dc2626", fontSize: 13 }}>❌ {listErr}</div>
            ) : !filtered.length ? (
              <Empty text="Not Found any customer" />
            ) : (
              filtered.map((c) => (
                <CustItem
                  key={c.customerId}
                  c={c}
                  active={c.customerId === activeId}
                  onClick={() => loadReport(c.customerId)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT: Detail ── */}
        <div className="main_chait_right">

          {!activeId && !detLoad && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, color: "#9ca3af" }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.3">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span style={{ fontSize: 13 }}> select customer </span>
            </div>
          )}

          {detLoad && (
            <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
              <Spinner /> &nbsp;Report loading...
            </div>
          )}

          {detErr && !detLoad && (
            <div style={{ ...card, color: "#dc2626", borderColor: "#fecaca" }}>❌ {detErr}</div>
          )}

          {report && !detLoad && (
            <>
              {/* Profile Card */}
              <div style={{ ...card, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#2d2d2d", border: "1px solid #3d3d3d", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                  {ini(cu.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", }}>{cu.name}</div>
                  <div style={{ fontSize: 12, color: "#838383", marginTop: 4 }}>
                    📞 {cu.phone || "—"} &nbsp;·&nbsp; 📍 {cu.address || "—"} &nbsp;·&nbsp; Since {fmtD(cu.customerSince)}
                  </div>
                  <div style={{ marginTop: 7, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {parseFloat(bs.totalRemaining) > 0
                      ? <Badge text="Partial pending" type="amber" />
                      : <Badge text="Fully paid" type="green" />}
                    {parseInt(ls.pendingCount) > 0 &&
                      <Badge text={`${ls.pendingCount} due pending`} type="red" />}
                    {parseInt(bs.visitDays) >= 5 &&
                      <Badge text={`${bs.visitDays} visit days`} type="blue" />}
                    {parseInt(bs.cancelledBills) > 0 &&
                      <Badge text={`${bs.cancelledBills} cancelled`} type="red" />}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: "#838383" }}>Wallet balance</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#059669", marginTop: 3 }}>{fmt(cu.walletBalance)}</div>
                </div>
              </div>

              {/* Billing Summary */}
              <Section label="📋 Billing summary">
                <StatGrid>
                  <Stat label="Total bills"     value={fmtN(bs.totalBills)} />
                  <Stat label="Total orders"    value={fmtN(bs.totalOrders)} />
                  <Stat label="Total billed"    value={fmt(bs.totalBilled)} />
                  <Stat label="Total paid"      value={fmt(bs.totalPaid)}        color="#059669" />
                  <Stat label="Remaining"       value={fmt(bs.totalRemaining)}   color="#dc2626" />
                  <Stat label="Discount"        value={fmt(bs.totalDiscount)}    color="#d97706" />
                  <Stat label="Wallet used"     value={fmt(bs.totalWalletUsed)}  color="#2563eb" />
                  <Stat label="Advance used"    value={fmt(bs.totalAdvanceUsed)} />
                  <Stat label="Cancelled bills" value={fmtN(bs.cancelledBills)}  color="#dc2626" />
                  <Stat label="Visit days"      value={fmtN(bs.visitDays)} />
                </StatGrid>
              </Section>

              {/* Lending Summary */}
              <Section label="📅 Due summary">
                <StatGrid>
                  <Stat label="Due times"     value={fmtN(ls.totalUdharTimes)} />
                  <Stat label="Total Due"     value={fmt(ls.totalUdharAmount)}  color="#d97706" />
                  <Stat label="Due paid"      value={fmt(ls.totalUdharPaid)}    color="#059669" />
                  <Stat label="Pending amount"  value={fmt(ls.totalUdharPending)} color="#dc2626" />
                  <Stat label="Settled entries" value={fmtN(ls.settledCount)}     color="#059669" />
                  <Stat label="Pending entries" value={fmtN(ls.pendingCount)}     color="#dc2626" />
                </StatGrid>
              </Section>

              {/* Wallet Summary */}
              <Section label="💰 Wallet summary">
                <StatGrid>
                  <Stat label="Total credited"  value={fmt(ws.totalCredited)}      color="#059669" />
                  <Stat label="Total debited"   value={fmt(ws.totalDebited)}       color="#dc2626" />
                  <Stat label="Transactions"    value={fmtN(ws.totalTransactions)} />
                  <Stat label="Current balance" value={fmt(cu.walletBalance)}      color="#2563eb" />
                </StatGrid>
              </Section>

              {/* TABS */}
              <div style={{ display: "flex", gap: 4, marginBottom: 14, background: "#212020", borderRadius: 10, border: "1px solid #3d3d3d", padding: 4 }}>
                {TABS.map((t) => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    style={{ flex: 1, padding: "7px 6px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", background: activeTab === t.key ? "var(--primary-color)" : "transparent", color: activeTab === t.key ? "#000" : "rgb(105, 105, 105)" }}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={card}>
                {activeTab === "bills"   && <BillTable    list={bl} />}
                {activeTab === "lending" && <LendingTable list={ll} />}
                {activeTab === "wallet"  && <WalletList   list={wl} />}
                {activeTab === "items"   && <OrderItems   items={oi} topItems={ti} />}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}