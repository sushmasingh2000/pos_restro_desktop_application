
import React, { useState, useEffect, useRef } from "react";
import table_avialable from "./assets/images/chair-availble.png";
import table_busy from "./assets/images/chair-busy.png";
import { useNavigate } from "react-router-dom";
import { apiConnectorPost } from "./utils/APIConnector";
import { endpoint } from "./utils/APIRoutes";
import { useQuery, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import PosTab from "./component/Layout/PosTab";
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import TableQuickPrintModal from "./component/pages/TableQuickPrint";
import total_table from "./assets/images/dashbord/total-tables.png";
import available from "./assets/images/dashbord/available.png";
import busy from "./assets/images/dashbord/busy.png";
import utilisationi from "./assets/images/dashbord/utilisation.png";


function timeDifference(targetDateStr) {
  const target = new Date(targetDateStr);
  const now = new Date();
  const diffMs = target - now;
  const totalMinutes = Math.floor(Math.abs(diffMs) / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const direction = diffMs >= 0 ? "from now" : "ago";
  return `${hours} h:${minutes} min ${direction}`;
}

const BusyTimer = ({ busySince }) => (
  <p className="time_diff">
    ⏱ {timeDifference(busySince)}
  </p>
);

// ── Action Dropdown (replaces right-click context menu) ───────
const ActionDropdown = ({ table, onMove, onMerge, onSplit }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (table.dg05_status !== "Busy") return null;

  return (
    <div
      ref={ref}
      className="relative z-10"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => setOpen((prev) => !prev)}
        title="Table Actions"
        className="menu-btn flex items-center justify-center rounded-full transition-all duration-200"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <circle cx="6" cy="2" r="1.2" />
          <circle cx="6" cy="6" r="1.2" />
          <circle cx="6" cy="10" r="1.2" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 rounded-xl overflow-hidden text-sm main_table_action"
          style={{
            top: "100%",
            background: "#fff",
            border: "1px solid #b5d4f47d",
            borderRadius: "12px",
            boxShadow: "0 6px 30px rgba(37, 99, 235, .15);",
            minWidth: 160,
          }}
        >
          <div className="px-3 py-1.5 border-b  text-dark text-xs uppercase tracking-widest" style={{ borderColor: "#b5d4f47d" }}>
            {table.dg05_table_name}
          </div>
          <button onClick={() => { onMove(table); setOpen(false); }}>
            <span>🔀</span> Move Table
          </button>
          <button onClick={() => { onMerge(table); setOpen(false); }}>
            <span>🔗</span> Merge Table
          </button>
          <button onClick={() => { onSplit(table); setOpen(false); }}>
            <span>✂️</span> Split Table
          </button>
        </div>
      )}
    </div>
  );
};

// ── Move Modal ────────────────────────────────────────────────
const MoveModal = ({ fromTable, tables, onClose, onConfirm }) => {
  const [selectedTable, setSelectedTable] = useState(null);
  const availableTables = tables.filter(
    (t) => t.dg05_status === "Available" && t.dg05_table_id !== fromTable.dg05_table_id
  );

  return (
    <Modal title="Move Tables" onClose={onClose}>
      <p className="text-white/50 text-sm mb-4 px-3 mt-3">
        Move order from{" "}
        <span className="text-gold font-semibold">{fromTable.dg05_table_name}</span> to:
      </p>
      <Row className="p-3 pt-0">
        {availableTables.length === 0 && (
          <p className="col-span-3 text-center text-white/30 text-sm py-4">No available tables</p>
        )}
        {availableTables.map((t) => (
          <Col md={4} key={t.dg05_table_id}>
            <button
              onClick={() => setSelectedTable(t)}
              className={`main_table_action_btn ${selectedTable?.dg05_table_id === t.dg05_table_id
                ? "gold_bg"
                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
            >
              {t.dg05_table_name}
            </button>
          </Col>
        ))}
      </Row>
      <div className="flex justify-between gap-3 modal_footer px-3 py-3">
        <CancelBtn onClick={onClose} />
        <ConfirmBtn disabled={!selectedTable} onClick={() => onConfirm(selectedTable)} label="✓ Move" />
      </div>
    </Modal>
  );
};

// ── Merge Modal ───────────────────────────────────────────────
const MergeModal = ({ mainTable, tables, onClose, onConfirm }) => {
  const [selectedTable, setSelectedTable] = useState(null);
  const busyTables = tables.filter(
    (t) => t.dg05_status === "Busy" && t.dg05_table_id !== mainTable.dg05_table_id
  );

  return (
    <Modal title="Merge Table" onClose={onClose}>
      <p className="text-white/50 text-sm mb-4 px-3 mt-3">
        Merge{" "}
        <span className="text-gold font-semibold">{mainTable.dg05_table_name}</span> with:
      </p>
      <Row className="p-3 pt-0">
        {busyTables.length === 0 && (
          <p className="col-span-3 text-center text-white/30 text-sm py-4">No other busy tables</p>
        )}
        {busyTables.map((t) => (
          <Col md={4} key={t.dg05_table_id}>
            <button
              onClick={() => setSelectedTable(t)}
              className={`main_table_action_btn ${selectedTable?.dg05_table_id === t.dg05_table_id
                ? "bg_red"
                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
            >
              {t.dg05_table_name}
              <p className="text-xs text-red-300 mt-1 mb-0">Busy</p>
            </button>
          </Col>
        ))}
      </Row>
      <div className="flex justify-between gap-3 modal_footer px-3 py-3">
        <CancelBtn onClick={onClose} />
        <ConfirmBtn
          disabled={!selectedTable}
          onClick={() => onConfirm(selectedTable)}
          label="✓ Merge"
          color="red"
        />
      </div>
    </Modal>
  );
};

// ── Split Modal ───────────────────────────────────────────────
const SplitModal = ({ table, onClose, onConfirm }) => {
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await apiConnectorPost(endpoint.get_orders_by_table_api, {
          tableId: table.dg05_table_id,
        });
        const orderItems = res?.data?.result?.orders?.[0]?.items || [];
        setItems(orderItems);
      } catch {
        toast.error("Failed to fetch items");
      }
      setLoading(false);
    };
    fetchItems();
  }, [table]);

  const toggle = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <Modal title="Split Table" onClose={onClose}>
      <p className="text-white/50 text-sm mb-4 px-3 mt-3">Select items to move to a new bill:</p>
      {loading ? (
        <p className="text-center text-white/30 py-6">Loading items...</p>
      ) : items.length === 0 ? (
        <p className="text-center text-white/30 py-6">No items found</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-auto">
          {items.map((item) => (
            <div
              key={item.dg07_item_id}
              onClick={() => toggle(item.dg07_item_id)}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${selectedIds.includes(item.dg07_item_id)
                ? "gold_bg"
                : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
            >
              <div className="flex items-center gap-3 p-3">
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${selectedIds.includes(item.dg07_item_id)
                    ? "bg-purple-500 border-purple-400"
                    : "border-white/30"
                    }`}
                >
                  {selectedIds.includes(item.dg07_item_id) && (
                    <span className="text-white text-xs">✓</span>
                  )}
                </div>
                <span className="text-sm text-white">{item.dg07_menu_name_snapshot}</span>
                <span className="text-xs text-white/40">x{item.dg07_quantity}</span>
              </div>
              <span className="text-sm text-purple-300">₹{item.dg07_total}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-between gap-3 modal_footer px-3 py-3">
        <CancelBtn onClick={onClose} />
        <ConfirmBtn
          disabled={selectedIds.length === 0}
          onClick={() => onConfirm(selectedIds)}
          label={`Split (${selectedIds.length} items)`}
        />
      </div>
    </Modal>
  );
};

// ── Reusable UI ───────────────────────────────────────────────
const Modal = ({ title, onClose, children }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
  >
    <div className="Order_Details_modal">
      <div className="Order_Details_modal_header">
        <div className="flex items-center gap-3">
          <div className="modal_header_icon">🗂️</div>
          <div>
            <h2>{title}</h2>
          </div>
        </div>
        <button onClick={onClose}>×</button>
      </div>
      {children}
    </div>
  </div>
);

const CancelBtn = ({ onClick }) => (
  <button onClick={onClick} className="cancel_btn">
    ✕ Cancel
  </button>
);

const ConfirmBtn = ({ onClick, label, disabled, color = "purple" }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="update_btn disabled:opacity-40"
    style={
      color === "red"
        ? {
          background: "rgba(239,68,68,0.3)",
          border: "1px solid rgba(248,113,113,0.5)",
          color: "#fca5a5",
        }
        : {}
    }
  >
    {label}
  </button>
);

// ── Main Dashboard ────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [qrModal, setQrModal] = useState(null);
  const [allQrModal, setAllQrModal] = useState(false);

  const [moveModal, setMoveModal] = useState(null);
  const [mergeModal, setMergeModal] = useState(null);
  const [splitModal, setSplitModal] = useState(null);

  // ── Quick Print state ─────────────────────────────────────
  const [quickPrint, setQuickPrint] = useState(null);
  // quickPrint = { tableId, orderId, orderItems, tableNameMap }

  const { data, isLoading, isError } = useQuery(
    ["get_table"],
    () => apiConnectorPost(endpoint?.table_branch_api),
    { refetchOnMount: false, refetchOnWindowFocus: false, retry: false }
  );

  const tables = data?.data?.result || [];
  const totalTables = tables.length;

  const availableTables = tables.filter(
    (t) => t.dg05_status === "Available"
  ).length;

  const busyTables = tables.filter(
    (t) => t.dg05_status === "Busy"
  ).length;

  const utilisation =
    totalTables > 0
      ? ((busyTables / totalTables) * 100).toFixed(0)
      : 0;

  // tableNameMap: { tableId -> tableName }
  const tableNameMap = tables.reduce((acc, t) => {
    acc[t.dg05_table_id] = t.dg05_table_name;
    return acc;
  }, {});

  const handleTableClick = (table) => {
    navigate("/pos/dine-in", { state: { table: table.dg05_table_id } });
  };

  // ── Print icon click — fetch order then open modal ────────
  const handlePrintIconClick = async (e, table) => {
    e.stopPropagation(); // card click nahi ho
    try {
      const res = await apiConnectorPost(endpoint.get_orders_by_table_api, {
        tableId: table.dg05_table_id,
      });
      const order = res?.data?.result?.orders?.[0];
      if (!order) {
        toast.error("No order found for this table");
        return;
      }

      // items ko BillModal wale format mein convert karo
      const orderItems = (order.items || []).map((item) => ({
        dg09_name: item.dg07_menu_name_snapshot,
        qty: item.dg07_quantity,
        price: parseFloat(item.dg07_unit_price || item.dg07_total / item.dg07_quantity || 0),
        predefinedRemarks: [],
        qtyRemark: item.dg07_remark || "",
      }));

      setQuickPrint({
        tableId: table.dg05_table_id,
        orderId: order.dg06_order_id,
        uniqueOrderId: order.unique_order_id,
        orderItems,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch order");
    }
  };

  const handleMoveConfirm = async (toTable) => {
    try {
      const res = await apiConnectorPost(endpoint.move_table_api, {
        fromTableId: moveModal.dg05_table_id,
        toTableId: toTable.dg05_table_id,
      });
      if (res?.data?.success) {
        toast.success(`Order moved to ${toTable.dg05_table_name}`);
        client.refetchQueries("get_table");
      } else {
        toast.error(res?.data?.message || "Move failed");
      }
    } catch {
      toast.error("Server error");
    }
    setMoveModal(null);
  };

  // ── Merge Confirm ─────────────────────────────────────────
  const handleMergeConfirm = async (mergeTable) => {
    try {
      const res = await apiConnectorPost(endpoint.merge_tables_api, {
        mainTableId: mergeModal.dg05_table_id,
        mergeTableId: mergeTable.dg05_table_id,
      });
      if (res?.data?.success) {
        toast.success(`Tables merged into ${mergeModal.dg05_table_name}`);
        client.refetchQueries("get_table");
      } else {
        toast.error(res?.data?.message || "Merge failed");
      }
    } catch {
      toast.error("Server error");
    }
    setMergeModal(null);
  };

  // ── Split Confirm ─────────────────────────────────────────
  const handleSplitConfirm = async (selectedItemIds) => {
    try {
      const orderRes = await apiConnectorPost(endpoint.get_orders_by_table_api, {
        tableId: splitModal.dg05_table_id,
      });
      const originalOrderId = orderRes?.data?.result?.orders?.[0]?.dg06_order_id;

      if (!originalOrderId) {
        toast.error("Order not found");
        return;
      }

      const res = await apiConnectorPost(endpoint.split_table_api, {
        originalOrderId,
        splitItemIds: selectedItemIds,
      });

      if (res?.data?.success) {
        toast.success("Order split successfully!");
        client.refetchQueries("get_table");
      } else {
        toast.error(res?.data?.message || "Split failed");
      }
    } catch {
      toast.error("Server error");
    }
    setSplitModal(null);
  };

  if (isLoading) return <div className="p-6 text-purple-300">Loading tables...</div>;
  if (isError) return <div className="p-6 text-red-400">Error fetching tables!</div>;

  return (
    <div className="main_dashboard">
      <Row>
        <Col xl={3} lg={4} md={6} sm={6} className="mb-3">
          <div className="table_dsb">
            <div className="main_icon">
              <img src={total_table} />
            </div>
            <div>
            <h4>{totalTables}</h4>
              <p>Total Tables</p>
            </div>
          </div>
        </Col>
        <Col xl={3} lg={4} md={6} sm={6} className="mb-3">
          <div className="table_dsb">
            <div className="main_icon" style={{ background: "#dcfce7", borderColor: "#caffdc", }}>
              <img src={available} />
            </div>
            <div>
              <h4>{availableTables}</h4>
              <p>Available</p>
            </div>
          </div>
        </Col>
        <Col xl={3} lg={4} md={6} sm={6} className="mb-3">
          <div className="table_dsb">
            <div className="main_icon" style={{ background: "#fee2e2", borderColor: "#fcd7d7", }}>
              <img src={busy} />
            </div>
            <div>
              <h4>{busyTables}</h4>
              <p>Busy</p>
            </div>
          </div>
        </Col>
        <Col xl={3} lg={4} md={6} sm={6} className="mb-3">
          <div className="table_dsb">
            <div className="main_icon" style={{ background: "#fef9c3", borderColor: "#f7f1ae" }}>
              <img src={utilisationi} />
            </div>
            <div>
              <h4>{utilisation}%</h4>
              <p>Utilisation</p>
            </div>
          </div>
        </Col>
      </Row>
      {/* LEGEND */}
      <PosTab />

      <div className="flex items-center justify-between gap-6 mb-6 mt-3">
        <div class="legendse">
          <div class="leg"><div class="leg-dot avail"></div>Available</div>
          <div class="leg"><div class="leg-dot busy"></div>Busy</div>
        </div>


        <div className="flex items-center justify-between gap-6">
          <div className="search-box">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" placeholder="Search Table" />
          </div>
          {/* NEW BUTTON */}
          <button onClick={() => setAllQrModal(true)} className="scanner_btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="5" y="5" width="3" height="3" fill="white" stroke="none" />
              <rect x="16" y="5" width="3" height="3" fill="white" stroke="none" />
              <rect x="5" y="16" width="3" height="3" fill="white" stroke="none" />
              <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 17v3" />
            </svg>
            All QR
          </button>
        </div>
      </div>

      {/* GRID */}
      <Row>
        {tables.map((table) => (
          <Col
            md={3} sm={6} xs={12} className="mb-3"
            key={table.dg05_table_id}

          >
            <div
              className={`table_card ${table.dg05_status === "Available"
                ? "table_available"
                : table.dg05_status === "Busy"
                  ? "table_busy"
                  : "table_pending"
                }`}
            >
              <div className="flex items-center justify-between">
                <button className="qr_btns"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQrModal({ tableName: table.dg05_table_name, qrImage: table.dg05_qr_image });
                  }}
                  title="View QR Code" >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="5" y="5" width="3" height="3" fill="white" stroke="none" />
                    <rect x="16" y="5" width="3" height="3" fill="white" stroke="none" />
                    <rect x="5" y="16" width="3" height="3" fill="white" stroke="none" />
                    <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 17v3" />
                  </svg>
                </button>
                {/* 3-dot action dropdown */}
                <ActionDropdown
                  table={table}
                  onMove={(t) => setMoveModal(t)}
                  onMerge={(t) => setMergeModal(t)}
                  onSplit={(t) => setSplitModal(t)}
                />
              </div>


              {table.dg05_status === "Available" ? (
                <img onClick={() => handleTableClick(table)} src={table_avialable} alt="table" className="w-20 cursor-pointer mx-auto mb-3 mt-3 " />
              ) : (
                <img onClick={() => handleTableClick(table)} src={table_busy} alt="table" className="w-20 cursor-pointer mx-auto mb-3 mt-3 " />
              )}

              <h2 >{table.dg05_table_name}</h2>


              <button
                onClick={() => handleTableClick(table)}
                className={`table_status_btn cursor-pointer ${table.dg05_status === "Available"
                  ? "available_btn"
                  : table.dg05_status === "Busy"
                    ? "busy_btn"
                    : "panding_btn"
                  }`}
              >
                <span className="badge-dot"></span>
                {table.dg05_status}
              </button>

              {table.dg05_status === "Busy" && table.dg05_busy_since && (
                <BusyTimer busySince={table.dg05_busy_since} />
              )}
              {/* 🖨 Print icon — sirf Busy tables pe, bottom-left */}
              {table.dg05_status === "Busy" && (
                <div className="card-actions">
                  <button className="card-action-btn"
                    onClick={(e) => handlePrintIconClick(e, table)}
                    title="Quick Print" >
                    <svg viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    Print
                  </button>

                  <button className="card-action-btn red" onclick="event.stopPropagation();setAvailable(3)">
                    <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Refresh
                  </button>
                </div>
              )}
            </div>
          </Col>
        ))}
      </Row>

      {/* All QR Modal */}
      {allQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)" }}
          onClick={() => setAllQrModal(false)}
        >
          <div
            style={{
              background: "#1a1a1a",
              borderRadius: "16px",
              padding: "20px",
              maxWidth: "90vw",
              maxHeight: "85vh",
              overflowY: "auto",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setAllQrModal(false)}
              style={{
                position: "absolute",
                top: "-12px",
                right: "-12px",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "#333",
                border: "2px solid #555",
                color: "white",
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
              }}
            >
              ×
            </button>

            {/* Grid of all QRs */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "center" }}>
              {tables.map((table) => (
                <div key={table.dg05_table_id} style={{ textAlign: "center" }}>
                  <div style={{ background: "white", borderRadius: "8px", padding: "6px", display: "inline-block" }}>
                    <img
                      src={table.dg05_qr_image}
                      alt={table.dg05_table_name}
                      style={{ width: 150, height: 150, display: "block" }}
                    />
                  </div>
                  <p style={{ color: "white", fontSize: "12px", marginTop: "6px" }}>
                    {table.dg05_table_name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
          onClick={() => setQrModal(null)}
        >
          <div
            style={{
              position: "relative",
              background: "white",
              borderRadius: "12px",
              padding: "8px",
              display: "inline-block",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setQrModal(null)}
              style={{
                position: "absolute",
                top: "-12px",
                right: "-12px",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "#333",
                border: "2px solid #555",
                color: "white",
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
                lineHeight: 1,
              }}
            >
              ×
            </button>

            {/* QR Image - bada */}
            <img
              src={qrModal.qrImage}
              alt="QR Code"
              style={{ width: 240, height: 260, display: "block", borderRadius: "8px" }}
            />
          </div>
        </div>
      )}
      {/* Move Modal */}
      {moveModal && (
        <MoveModal
          fromTable={moveModal}
          tables={tables}
          onClose={() => setMoveModal(null)}
          onConfirm={handleMoveConfirm}
        />
      )}

      {/* Merge Modal */}
      {mergeModal && (
        <MergeModal
          mainTable={mergeModal}
          tables={tables}
          onClose={() => setMergeModal(null)}
          onConfirm={handleMergeConfirm}
        />
      )}

      {/* Split Modal */}
      {splitModal && (
        <SplitModal
          table={splitModal}
          onClose={() => setSplitModal(null)}
          onConfirm={handleSplitConfirm}
        />
      )}

      {/* ── Quick Print Modal ── */}
      {quickPrint && (
        <TableQuickPrintModal
          isOpen={!!quickPrint}
          onClose={() => setQuickPrint(null)}
          orderId={quickPrint.orderId}
          uniqueOrderId={quickPrint.uniqueOrderId}
          tableId={quickPrint.tableId}
          tableNameMap={tableNameMap}
          orderItems={quickPrint.orderItems}
        />
      )}
    </div>
  );
};

export default Dashboard;


