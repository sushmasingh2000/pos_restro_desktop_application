import React, { useState, useEffect } from "react";
import PosTab from "../Layout/PosTab";
import { apiConnectorPost } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import toast from "react-hot-toast";
import { useQueryClient } from "react-query";

const tabs = ["PLACED", "IN PROGRESS", "COMPLETED", "CANCELLED"];

export default function OnlineDeliveryOrder() {
    const [activeTab, setActiveTab] = useState("PLACED");
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const client = useQueryClient();

    useEffect(() => {
        fetchOrders();
        // Har 30 sec mein auto refresh
        const interval = setInterval(fetchOrders, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await apiConnectorPost(endpoint.get_customer_placed_orders);
            setOrders(
                (res?.data?.result || []).filter(
                    (order) => order.dg06_order_type === "delivery"
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
                toast.success("Order confirmed! KOT sent to kitchen 🍳", {id:1});
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

    const filteredOrders = orders.filter(order => {
        if (activeTab === "PLACED") return order.dg06_status === "customer_placed";
        if (activeTab === "IN PROGRESS") return order.dg06_status === "pending";
        if (activeTab === "COMPLETED") return order.dg06_status === "completed";
        if (activeTab === "CANCELLED") return order.dg06_status === "cancelled";
        return false;
    });

    return (
        <div>
            <PosTab />
            <div className="main_cards mt-3">
                <div className="chart_header ">
                    <div className="chart_heading">
                        <h4><span className="live-dot"></span> Dooor Delivery </h4>
                        <p>Daily performance overview</p>
                    </div>
                    <div className="flex main_tanses">
                        <div className="flex gap-2 live_filters">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={activeTab === tab ? "active_tab" : ""}
                                >
                                    {tab}
                                    {tab === "PLACED" && orders.filter(o => o.dg06_status === "customer_placed").length > 0 && (
                                        <span style={{
                                            background: "#ef4444", color: "#fff",
                                            borderRadius: "50%", fontSize: 10,
                                            padding: "1px 5px", marginLeft: 6
                                        }}>
                                            {orders.filter(o => o.dg06_status === "customer_placed").length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="main_table_container" style={{ borderRadius: "0", border: "0" }}>
                    <div className="overflow-y-auto" >
                        <table className="w-full text-sm">
                            <thead>
                                <tr>
                                    <th>Order Id</th>
                                    <th>Type</th>
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
                                        <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition">
                                            <td>{order.unique_order_id}</td>
                                            <td> {order.dg06_order_type==="delivery" && "Delivery"}</td>
                                            <td>{order.item_count} items</td>
                                            <td>₹{order.dg06_total_amount}</td>
                                            <td>{new Date(order.dg06_created_at).toLocaleTimeString()}</td>
                                            <td>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium
                          ${order.dg06_status === "completed" ? "green_bg"
                                                        : order.dg06_status === "cancelled" ? "red_bg"
                                                            : order.dg06_status === "preparing" ? "yellow_bg"
                                                                : "purple_bg"}`}>
                                                    {order.dg06_status}
                                                </span>
                                            </td>
                                            {activeTab === "PLACED" && (
                                                <td>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleConfirm(order.dg06_order_id)}
                                                            className="main_btn"
                                                            style={{ padding: "4px 12px", fontSize: 12 }}
                                                        >
                                                            ✓ Confirm
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancel(order.dg06_order_id)}
                                                            className="cancel_btn"
                                                            style={{ padding: "4px 12px", fontSize: 12 }}
                                                        >
                                                            ✕ Cancel
                                                        </button>
                                                    </div>
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
        </div>
    );
}