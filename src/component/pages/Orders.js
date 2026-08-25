import React, { useState } from "react";
import { useQuery, useQueryClient } from "react-query";
import { apiConnectorPost } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import { useNavigate } from "react-router-dom";
import Row from "react-bootstrap/esm/Row";
import Col from "react-bootstrap/esm/Col";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

const FeedbackModal = ({ order, onClose, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!rating) { toast.error("Please select a rating"); return; }
    setLoading(true);
    try {
      const res = await apiConnectorPost(endpoint.feedback_submit_api, {
        order_id: order.rawId,
        unique_order_id: order.orderId,
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        rating,
        comment,
      });
      if (res?.data?.success) {
        toast.success(res.data.message);
        onSuccess();
        onClose();
      } else {
        toast.error(res?.data?.message || "Failed to submit");
      }
    } catch {
      toast.error("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="Order_Details_modal w-full max-w-md">
        <div className="Order_Details_modal_header">
          <div className="flex items-center gap-3">
            <div className="modal_header_icon">⭐</div>
            <div><h2>Customer Feedback</h2></div>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-center text-sm" style={{ color: "#64748b" }}>
            Order <strong>{order.orderId}</strong>
            {order.customerName && <> — {order.customerName}</>}
          </div>
          <div className="flex justify-center gap-2" style={{ fontSize: 36 }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <span
                key={s}
                style={{ cursor: "pointer", color: s <= (hovered || rating) ? "#f59e0b" : "#d1d5db", transition: "color .15s" }}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(s)}
              >★</span>
            ))}
          </div>
          {rating > 0 && (
            <div className="text-center text-sm font-semibold" style={{ color: "#f59e0b" }}>
              {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
            </div>
          )}
          <div className="main_input">
            <label>Comment (optional)</label>
            <textarea
              rows={3}
              placeholder="Customer feedback..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{ resize: "none" }}
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="update_btn flex-1" disabled={loading}>Cancel</button>
            <button onClick={handleSubmit} className="main_btn flex-1" disabled={loading}>
              {loading ? "Submitting..." : "Submit Feedback"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Orders = () => {
  const today = new Date().toISOString().split("T")[0];
  const [search, setSearch] = useState("");
  const handleSearchChange = (val) => { setSearch(val); setPage(1); };
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [feedbackOrder, setFeedbackOrder] = useState(null);
  const [exporting, setExporting] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const limit = 8;

  const [filters, setFilters] = useState({
    startDate: today,
    endDate: today,
    paymentMethod: "",
    paymentStatus: "",
    orderType: ""
  });

  const { data, isLoading } = useQuery(
    ["orders", filters, page, search],
    () =>
      apiConnectorPost(endpoint.order_branch_status_api, {
        ...filters,
        search,
        page,
        limit,
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
      discount: Number(order.bill_discount ?? order.dg06_discount ?? 0),
      totalAmount: Number(order.bill_total_amount || order.dg06_total_amount || 0),
      paymentMethod: order.dg010_payment_method || "N/A",
      paymentStatus: order.dg010_payment_status || "pending",
      status: order.dg06_status,
      type: order.dg06_order_type,
      items: order.items || [],
      billId: order.dg010_bill_id || null,
      billNo: order.dg06_bill_no || null,
      customerName: order.dg06_customer_name || "",      // ← ADD
      customerPhone: order.dg06_customer_phone || "",    // ← ADD  
      customerAddress: order.dg06_delivery_address || "",
    };
  });

  const filteredOrders = formattedOrders.filter(
    (order) => order.status !== "customer_placed"
  );

  const filtered = filteredOrders.filter((o) =>
    o.orderId?.toLowerCase().includes(search.toLowerCase())
  );

  const handleView = (order) => {
    navigate("/bill", {
      state: {
        orderItems: order.items.map(i => ({
          id: i.dg07_menu_id,
          dg09_name: i.dg07_menu_name_snapshot,
          qty: i.dg07_quantity,
          price: parseFloat(i.dg07_price),
          tax_group_id: i.dg09_tax_group_id,
          basePrice: parseFloat(i.dg07_base_price || i.dg07_price),
          dg09_apply_charges: i.dg09_apply_charges,
          qtyRemark: i.dg07_item_remark || "",
          globalRemark: i.dg07_global_remark || "",
          predefinedRemarks: i.dg07_predefined_remark
            ? i.dg07_predefined_remark.split(", ").filter(Boolean)
            : [],
        })),
        deliveryCustomerName: order?.customerName || "",
        deliveryCustomerPhone: order?.customerPhone || "",
        deliveryCustomerAddress: order?.customerAddress || "",
        orderId: order.rawId,
        tableId: order.rawTableId,
        orderType: order.type,
        tableNameMap: order.rawTableId ? { [order.rawTableId]: order.tableNo } : {},
        existingBillId: order.billId,
        orderStatus: order?.status || "",
        uniqueOrderId: order.orderId,
      },
    });
  };


  const exportToExcel = async () => {
    setExporting(true);
    try {
      const res = await apiConnectorPost(endpoint.order_branch_status_api, {
        ...filters, page: 1, limit: 5000,
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
          "Discount": Number(o.bill_discount ?? o.dg06_discount ?? 0),
          "Charge": Number(o.dg06_charges || 0),
          "Tax": Number(o.dg06_tax || 0),
          "Paid": Number(o.bill_total_amount || o.dg06_total_amount || 0),
          "MOP": o.dg010_payment_method || "--",
          "Status": o.dg06_status,
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Orders");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(new Blob([buf], { type: "application/octet-stream" })),
        download: `Orders_${filters.startDate}_${filters.endDate}.xlsx`,
      });
      a.click();
    } catch (e) { console.error("Export failed", e); }
    finally { setExporting(false); }
  };

  return (
    <div className="main_cards">
      <div className="cards_header flex items-center justify-between">
        <div>
          <h3>All Orders</h3>
          <p>Manage & track all orders</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportToExcel} className="main_btn" disabled={exporting} style={{ fontSize: 12, padding: "6px 14px" }}>
            {exporting ? "Exporting..." : "⬇ Excel"}
          </button>
          {/* Search */}
          <div className="date-row main_input">
            <span className="date-label">Search:</span>
            <input value={search} onChange={e => handleSearchChange(e.target.value)}
              placeholder="Enter Order Id" />
          </div>
        </div>
      </div>

      {/* CARD */}
      <div className="table_box_main mx-3 mt-3">
        <Row>
          <Col md={3}>
            <div className="main_input">
              <input
                type="date"
                className=""
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
              />
            </div>
          </Col>
          <Col md={3}>
            <div className="main_input">
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
              />
            </div>
          </Col>
          <Col md={3}>
            <div className="main_input">
              <select className=""
                onChange={(e) =>
                  setFilters({ ...filters, paymentMethod: e.target.value })
                } >
                <option >Mode of Payment</option>
                <option value="Cash" >Cash</option>
                <option value="Card" >Card</option>
                <option value="UPI">UPI</option>
                <option value="lending">Lending</option>
              </select>
            </div>
          </Col>
          <Col md={3}>
            <div className="main_input">
              <select
                onChange={(e) =>
                  setFilters({ ...filters, orderType: e.target.value })
                } >
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
      <div className="main_table_container mt-3 border-0" style={{ borderRadius: '0px' }}>
        {/* SCROLL WRAPPER */}
        <div className="overflow-x-auto" >

          <table className="w-full ">
            <thead >
              <tr>
                {["S.No.",
                  "Order Id", "Date", "Time", "Type", "Table No", "SubTotal", "Discount", "Charge",
                  "Tax", "Paid", "MOP", "Status", "Action"
                ].map((h) => (
                  <th key={h} >{h}</th>
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
                    No orders found
                  </td>
                </tr>
              ) : (
                filtered
                  .map((order, index) => (
                    <tr
                      key={order.orderId}
                      className="border-b border-white/5 hover:bg-white/5 transition text-center"
                    >
                      <td>{(page - 1) * limit + index + 1}</td>
                      <td className="text-purple">
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
                      <td >
                        ₹{order.totalAmount}
                      </td>
                      <td>
                        {order.paymentMethod || "--"}</td>
                      <td>
                        <span
                          className={`px-3 py-1 rounded-full text-xs ${order.status === "completed"
                            ? "green_bg"
                            : order.status === "cancelled"
                              ? "red_bg"
                              : "yellow_bg"
                            }`}
                        >
                          {order.status}
                        </span>
                      </td>

                      <td>
                        <div className="flex items-center justify-center gap-2">
                          {order.status === "cancelled" ? "--" :
                            <button onClick={() => handleView(order)} className="purple_bg">
                              View
                            </button>
                          }
                          {order.status === "completed" && (
                            <button
                              onClick={() => setFeedbackOrder(order)}
                              className="main_btn"
                              style={{ fontSize: 11, padding: "4px 10px" }}
                            >
                              ⭐ Feedback
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between  px-4 py-3 pt-0 ">

          {/* LEFT INFO */}
          <div className="legend_text">
            Page <span className="text-white font-semibold">{page}</span> of{" "}
            <span className="text-white font-semibold">
              {pagination?.totalPages || 1}
            </span>
          </div>

          {/* BUTTONS */}
          <div className="flex items-center gap-2">

            {/* PREV */}
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="right_btn"
            >
              ← Prev
            </button>

            {/* CURRENT PAGE */}
            <div className="bottom_btn">
              {page}
            </div>

            {/* NEXT */}
            <button
              disabled={page === pagination?.totalPages}
              onClick={() => setPage(page + 1)}
              className="right_btn"
            >
              Next →
            </button>

          </div>

        </div>
      </div>

      {feedbackOrder && (
        <FeedbackModal
          order={feedbackOrder}
          onClose={() => setFeedbackOrder(null)}
          onSuccess={() => queryClient.invalidateQueries(["orders"])}
        />
      )}

    </div>
  );
};

export default Orders;