import React, { useState } from "react";
import { useQuery } from "react-query";
import { apiConnectorPost } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import * as XLSX from "xlsx";

const CancelOrder = () => {
    const today = new Date().toISOString().split("T")[0];
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const [reasonModal, setReasonModal] = useState(null);
    const [page, setPage] = useState(1);
    const [exporting, setExporting] = useState(false);
    const limit = 8;

    const [filters, setFilters] = useState({
        startDate: today,
        endDate: today,
        orderType: ""
    });

    const { data, isLoading } = useQuery(
        ["orders", filters, page],
        () =>
            apiConnectorPost(endpoint.order_branch_status_api, {
                ...filters,
                page,
                limit,
                status: ["cancelled"],

            })
    );
    const orders = data?.data?.result?.orders || [];
    const pagination = data?.data?.result?.pagination || {};

    const formattedOrders = orders.map((order) => {
        const createdAt = new Date(order.dg06_created_at);
        return {
            orderId: order.unique_order_id,
            rawId: order.dg06_order_id,
            date: createdAt.toLocaleDateString(),
            time: createdAt.toLocaleTimeString(),
            tableNo: order.dg05_table_name || order.dg06_table_id || "N/A",
            rawTableId: order.dg06_table_id,
            subTotal: Number(order.dg06_subtotal || 0),
            tax: Number(order.dg06_tax || 0),
            charge: Number(order.dg06_charges || 0),
            discount: Number(order.dg06_discount || 0),
            totalAmount: Number(order.dg06_total_amount || 0),
            status: order.dg06_status,
            type: order.dg06_order_type,
            cancelReason: order.dg06_cancel_reason || "No reason given",
            items: order.items || [],
        };
    });

    const filtered = formattedOrders.filter((o) =>
        o.orderId?.toLowerCase().includes(search.toLowerCase())
    );

    const exportToExcel = async () => {
        setExporting(true);
        try {
            const res = await apiConnectorPost(endpoint.order_branch_status_api, {
                ...filters, page: 1, limit: 5000, status: ["cancelled"],
            });
            const all = res?.data?.result?.orders || [];
            if (!all.length) return;
            const rows = all.map((o, i) => {
                const d = new Date(o.dg06_created_at);
                return {
                    "S.No": i + 1, "Order ID": o.unique_order_id,
                    "Date": d.toLocaleDateString(), "Time": d.toLocaleTimeString(),
                    "Type": o.dg06_order_type, "Table No": o.dg05_table_name || o.dg06_table_id || "N/A",
                    "SubTotal": Number(o.dg06_subtotal || 0),
                    "Discount": Number(o.dg06_discount || 0),
                    "Charge": Number(o.dg06_charges || 0),
                    "Tax": Number(o.dg06_tax || 0),
                    "Paid": Number(o.dg06_total_amount || 0),
                    "Status": o.dg06_status,
                };
            });
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "CancelledOrders");
            const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            const a = Object.assign(document.createElement("a"), {
                href: URL.createObjectURL(new Blob([buf], { type: "application/octet-stream" })),
                download: `CancelledOrders_${filters.startDate}_${filters.endDate}.xlsx`,
            });
            a.click();
        } catch (e) { console.error("Export failed", e); }
        finally { setExporting(false); }
    };

    return (
        <div className="main_cards">
            <div className="cards_header flex items-center justify-between">
                <div>
                    <h3>Cancelled Orders</h3>
                    <p>View and manage cancelled orders quickly.</p>
                </div>
                <button onClick={exportToExcel} className="main_btn" disabled={exporting} style={{ fontSize: 12, padding: "6px 14px" }}>
                    {exporting ? "Exporting..." : "⬇ Excel"}
                </button>
            </div>

            {/* CARD */}
            <div className="table_box_main mx-3 mt-3">
                <Row>
                    <Col md={4}>
                        <div className="main_input">
                            <label>Start Date <span className="text-red-500">*</span></label>
                            <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value }) }/>
                        </div>
                    </Col>
                    <Col md={4}>
                        <div className="main_input">
                            <label>End Date <span className="text-red-500">*</span></label>
                            <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value }) } />
                        </div>
                    </Col>
                    <Col md={4}>
                        <div className="main_input">
                            <label>Order Type <span className="text-red-500">*</span></label>
                             <select onChange={(e) => setFilters({ ...filters, orderType: e.target.value }) } >
                                <option value="" >Order Type</option>
                                <option value="dine_in" >DINE IN</option>
                                <option value="takeaway" >TAKE AWAY</option>
                                <option value="delivery">DOOR DELIVERY</option>
                            </select>
                        </div>
                    </Col>
                </Row>
            </div>

            {/* TABLE */}
            <div className="main_table_container mt-3 border-0" style={{borderRadius: '0px'}}>
                {/* SCROLL WRAPPER */}
                <div className="overflow-x-auto" >

                    <table className="w-full">
                        <thead>
                            <tr>
                                {["S.No.",
                                    "Order Id", "Date", "Time", "Type", "Table No", "SubTotal", "Discount", "Charge",
                                    "Tax", "Paid", "Status"
                                ].map((h) => (
                                    <th key={h}>{h}</th>
                                ))}

                            </tr>
                        </thead>

                        <tbody>

                            {isLoading ? (
                                <tr>
                                    <td colSpan="14" className="text-center p-6 text-white/50">
                                        Loading orders...
                                    </td>
                                </tr>
                            ) : formattedOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="14" className="text-center p-6 text-white/40">
                                        No cancelled orders found
                                    </td>
                                </tr>
                            ) : (
                                filtered
                                    .map((order, index) => (
                                        <tr
                                            key={order.orderId}
                                            onClick={() => setReasonModal(order)}
                                            className="border-b border-white/5 hover:bg-white/5 transition text-center"
                                            style={{ cursor: "pointer" }}
                                            title="Click to view cancel reason"
                                        >
                                            <td>{(page - 1) * limit + index + 1}</td>
                                            <td>
                                                {order.orderId}
                                            </td>
                                            <td>{order.date}</td>
                                            <td>{order.time}</td>
                                            <td>{order.type === "dine_in" ? "Dine In" :
                                                order.type === "takeaway" ? "TakeAway" : order.type === "delivery" ? "Door Delivery" : "--"}</td>
                                            <td>{order.tableNo}</td>
                                            <td>₹{order.subTotal}</td>
                                            <td>₹{order.discount}</td>
                                            <td>₹{order.charge}</td>
                                            <td>₹{order.tax}</td>
                                            <td>
                                                ₹{order.totalAmount}
                                            </td>

                                            <td className="p-2">
                                                <span className={`red_bg`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-between p-3 ">

                    {/* LEFT INFO */}
                    <div className="pagination_number">
                        Page <span className="pagintation_text">{page}</span> of{" "}
                        <span className="pagintation_text">
                        {pagination?.totalPages || 1}
                        </span>
                    </div>

                    {/* BUTTONS */}
                    <div className="flex items-center gap-2">

                        {/* PREV */}
                        <button
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                        className="prev_btn "
                        >
                        ← Prev
                        </button>

                        {/* CURRENT PAGE */}
                        <div className="current_page">
                        {page}
                        </div>

                        {/* NEXT */}
                        <button
                        disabled={page === pagination?.totalPages}
                        onClick={() => setPage(page + 1)}
                        className="right_btn  "
                        >
                        Next →
                        </button>

                    </div>
                </div>
            </div>

            {/* ── Cancel Reason Modal ── */}
            {reasonModal && (
                <div
                    onClick={() => setReasonModal(null)}
                    style={{
                        position: "fixed", inset: 0, zIndex: 9999,
                        background: "rgba(0,0,0,0.55)",
                        backdropFilter: "blur(6px)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: "#fff",
                            borderRadius: 20,
                            padding: "28px 26px",
                            width: 340,
                            boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                            <div style={{
                                width: 42, height: 42, borderRadius: "50%",
                                background: "rgba(239,68,68,0.1)", border: "2px solid #ef4444",
                                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                            }}>
                                🚫
                            </div>
                            <div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
                                    Order #{reasonModal.orderId}
                                </div>
                                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                                    {reasonModal.date} • {reasonModal.time}
                                </div>
                            </div>
                        </div>

                        <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                            Cancel Reason
                        </div>
                        <div style={{
                            fontSize: 14, color: "#334155", background: "#fef2f2",
                            border: "1px solid #fecaca", borderRadius: 10, padding: "10px 12px",
                        }}>
                            {reasonModal.cancelReason}
                        </div>

                        <button
                            onClick={() => setReasonModal(null)}
                            style={{
                                marginTop: 18, width: "100%", padding: "10px",
                                borderRadius: 10, border: "1px solid #e2e8f0",
                                background: "#f1f5f9", color: "#64748b",
                                fontSize: 13, fontWeight: 600, cursor: "pointer",
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CancelOrder;