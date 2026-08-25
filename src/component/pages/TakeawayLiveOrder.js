import React, { useState, useEffect } from "react";
import PosTab from "../Layout/PosTab";
import { apiConnectorPost } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import toast from "react-hot-toast";
import { useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";

const tabs = ["PLACED", "IN PROGRESS", "COMPLETED", "CANCELLED"];

const rupee = "₹";

function OrderDetailModal({ order, onConfirm, onCancel, onClose, showActions }) {
  if (!order) return null;
  const items = order.items || [];

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 14, width: "100%", maxWidth: 460,
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)", overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "14px 20px", background: "#eff6ff",
          borderBottom: "1px solid #bfdbfe",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
              Order #{order.unique_order_id}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {new Date(order.dg06_created_at).toLocaleString()} · Takeaway
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 22, cursor: "pointer", lineHeight: 1 }}
          >×</button>
        </div>

        {/* Customer info */}
        <div style={{ padding: "10px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 13, color: "#1e293b", fontWeight: 600 }}>
            🧑‍🍳 {order.dg06_customer_name || "Staff Order"}
            {order.dg06_customer_phone && (
              <span style={{ fontWeight: 400, color: "#64748b" }}> · 📞 {order.dg06_customer_phone}</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
            Placed by staff at counter
          </div>
          {order.dg06_pickup_note && (
            <div style={{ fontSize: 12, color: "#2563eb", marginTop: 4 }}>
              🥡 {order.dg06_pickup_note}
            </div>
          )}
        </div>

        {/* Items */}
        <div style={{ padding: "14px 20px", maxHeight: 300, overflowY: "auto" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
            Items ({items.length})
          </div>
          {items.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "16px 0" }}>
              No items found — restart backend server
            </p>
          ) : (
            items.map((item, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "9px 0", borderBottom: "1px solid #f1f5f9",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    {rupee}{Number(item.price).toFixed(0)} × {item.qty}
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
                  {rupee}{Number(item.total).toFixed(0)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Total */}
        <div style={{
          padding: "12px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Total Amount</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#16a34a" }}>
            {rupee}{Number(order.dg06_total_amount).toFixed(0)}
          </span>
        </div>

        {/* Actions */}
        {showActions && (
          <div style={{ padding: "14px 20px", display: "flex", gap: 10, background: "#fff", borderTop: "1px solid #e2e8f0" }}>
            <button
              onClick={() => { onConfirm(order.dg06_order_id); onClose(); }}
              className="main_btn"
              style={{ flex: 1, padding: "10px 0", fontSize: 14, fontWeight: 700 }}
            >
              ✓ Accept Order
            </button>
            <button
              onClick={() => { onCancel(order.dg06_order_id); onClose(); }}
              className="cancel_btn"
              style={{ flex: 1, padding: "10px 0", fontSize: 14, fontWeight: 700 }}
            >
              ✕ Reject Order
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TakeawayLiveOrder() {
  const [activeTab, setActiveTab] = useState("PLACED");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const client = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await apiConnectorPost(endpoint.get_customer_placed_orders);
      setOrders(
        (res?.data?.result || []).filter(
          (order) =>
            order.dg06_order_type === "takeaway" &&
            (order.dg06_customer_session === null || order.dg06_customer_session === "")
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (orderId) => {
    try {
      const res = await apiConnectorPost(endpoint.confirm_customer_order, { orderId });
      if (res?.data?.success) {
        toast.success("Order confirmed! KOT sent to kitchen 🍳", { id: 1 });
        fetchOrders();
        client.refetchQueries("get_table");
      }
    } catch {
      toast.error("Failed to confirm order");
    }
  };

  const handleCancel = async (orderId) => {
    try {
      const res = await apiConnectorPost(endpoint.cancel_customer_order, { orderId });
      if (res?.data?.success) {
        toast.success("Order cancelled");
        fetchOrders();
        client.refetchQueries("get_table");
      }
    } catch {
      toast.error("Failed to cancel order");
    }
  };

  // Customer (QR) orders wait at "customer_placed" for staff Accept.
  // Staff-placed orders (from POS) are created already-confirmed as "pending",
  // so they belong in IN PROGRESS straightaway, not PLACED.
  const filteredOrders = orders.filter((order) => {
    if (activeTab === "PLACED") return order.dg06_status === "customer_placed";
    if (activeTab === "IN PROGRESS") return order.dg06_status === "pending" || order.dg06_status === "preparing";
    if (activeTab === "COMPLETED") return order.dg06_status === "completed";
    if (activeTab === "CANCELLED") return order.dg06_status === "cancelled";
    return false;
  });

  return (
    <div>
      <PosTab />
      <div className="main_cards mt-3">
        <div className="chart_header">
          <div className="chart_heading">
            <h4><span className="live-dot"></span> Takeaway Orders</h4>
            <p>Orders placed by staff at the counter</p>
          </div>
          <div className="flex main_tanses" style={{ alignItems: "center", gap: 12 }}>
            <button
              onClick={() => navigate("/pos/take-away")}
              className="main_btn"
              style={{ padding: "8px 16px", fontSize: 13, fontWeight: 700 }}
            >
              + New Takeaway Order
            </button>
            <div className="flex gap-2 live_filters">
              {tabs.map((tab) => {
                const count = orders.filter((o) => {
                  if (tab === "PLACED") return o.dg06_status === "customer_placed";
                  if (tab === "IN PROGRESS") return o.dg06_status === "pending" || o.dg06_status === "preparing";
                  if (tab === "COMPLETED") return o.dg06_status === "completed";
                  if (tab === "CANCELLED") return o.dg06_status === "cancelled";
                  return false;
                }).length;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={activeTab === tab ? "active_tab" : ""}
                  >
                    {tab}
                    {count > 0 && (
                      <span style={{
                        background: tab === "PLACED" ? "#ef4444"
                          : tab === "IN PROGRESS" ? "#f59e0b"
                          : tab === "COMPLETED" ? "#10b981"
                          : "#6b7280",
                        color: "#fff", borderRadius: "50%",
                        fontSize: 10, padding: "1px 5px", marginLeft: 6,
                      }}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="main_table_container" style={{ borderRadius: "0", border: "0" }}>
          <div className="overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>Order Id</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Time</th>
                  <th>Status</th>
                  {activeTab === "PLACED" && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="text-center p-8 text-white/40">Loading...</td></tr>
                ) : filteredOrders.length > 0 ? (
                  filteredOrders.map((order, index) => (
                    <tr
                      key={index}
                      className="border-b border-white/5 hover:bg-white/5 transition"
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td>{order.unique_order_id}</td>
                      <td style={{ fontSize: 12, color: "#94a3b8" }}>
                        {order.dg06_customer_name || "—"}
                      </td>
                      <td>
                        <span style={{
                         background: "#FDECEC", color: "green", border: "green", border:"1px solid",
                          borderRadius: 12, padding: "2px 8px", fontSize: 11,
                        }}>
                          {order.item_count} items
                        </span>
                      </td>
                      <td>{rupee}{order.dg06_total_amount}</td>
                      <td>{new Date(order.dg06_created_at).toLocaleTimeString()}</td>
                      <td>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          order.dg06_status === "completed" ? "green_bg"
                          : order.dg06_status === "cancelled" ? "red_bg"
                          : order.dg06_status === "preparing" ? "yellow_bg"
                          : "purple_bg"
                        }`}>
                          {order.dg06_status}
                        </span>
                      </td>
                      {activeTab === "PLACED" && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="main_btn"
                            style={{ padding: "4px 12px", fontSize: 12 }}
                          >
                            👁 View & Accept
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center p-8 text-white/40">No orders found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        showActions={selectedOrder?.dg06_status === "customer_placed"}
      />
    </div>
  );
}
