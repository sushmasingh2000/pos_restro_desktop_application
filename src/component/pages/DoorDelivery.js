
import React, { useState } from "react";
import { useQuery, useQueryClient } from "react-query";
import { apiConnectorPost, apiConnectorGet } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import BillModal from "./Bill";
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import toast from "react-hot-toast";

// ── Feedback Modal ────────────────────────────────────────────────────
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

          {/* Stars */}
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

          {/* Comment */}
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
            <button
              onClick={handleSubmit}
              className="main_btn flex-1"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit Feedback"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DoorDelivery = () => {
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedBillOrder, setSelectedBillOrder] = useState(null);
  const [feedbackOrder, setFeedbackOrder] = useState(null);
  const queryClient = useQueryClient();
  const limit = 10;
  const type = "delivery"

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    paymentMethod: "",
    paymentStatus: "",
  });

  const { data, isLoading } = useQuery(
    ["orders", filters, page],
    () =>
      apiConnectorPost(endpoint.order_branch_status_api, {
        ...filters,
        page,
        limit,
        orderType: "delivery"
      }),
    {
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
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

      tableNo: order.dg06_table_id || "N/A",

      subTotal: Number(order.dg06_subtotal || 0),
      tax: Number(order.dg06_tax || 0),
      charge: Number(order.dg06_charges || 0),
      discount: Number(order.dg06_discount || 0),

      totalAmount: Number(order.dg06_total_amount || 0),

      mop: order.dg010_payment_method || "--",
      customerName: order.dg06_customer_name || "",      // ← ADD
      customerPhone: order.dg06_customer_phone || "",    // ← ADD  
      customerAddress: order.dg06_delivery_address || "",
      status: order.dg06_status,
      items: order.items || [],
      billId: order.dg010_bill_id || null,
      billNo: order.dg06_bill_no || null,
    };
  });

  const filtered = formattedOrders.filter((o) =>
    o.orderId?.toLowerCase().includes(search.toLowerCase())
  );

const handleView = (order) => {
    setSelectedBillOrder(order);
    setShowBillModal(true);
  };


  return (
    <div className="main_cards">
      <div className="cards_header flex items-center justify-between">
        <div>
          <h3>Door Delivery Orders</h3>
          <p>Manage and track delivery orders efficiently.</p>
        </div>
      </div>

      {/* CARD */}
      <div className="table_box_main mx-3 mt-3">
        <Row>
          <Col md={3}>
            <div className="main_input">
              <label>Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                className=""
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
              />
            </div>
          </Col>
          <Col md={3}>
            <div className="main_input">
              <label>Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                className=""
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
              />
            </div>
          </Col>
          <Col md={3}>
            <div className="main_input">
              <label>Mode of Payment <span className="text-red-500">*</span></label>
              <select onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}>
                <option >Mode of Payment</option>
                <option value="Cash" >Cash</option>
                <option value="Card" >Card</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
          </Col>
          <Col md={3}>
            <div className="main_input">
              <label>Payment Status <span className="text-red-500">*</span></label>
              <select onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}>
                <option>Payment Status</option>
                <option value="paid" >Paid</option>
                <option value="unpaid" >Pending</option>
              </select>
            </div>
          </Col>

        </Row>
      </div>


      {/* TABLE */}

      <div className="main_table_container mt-3 border-0" style={{ borderRadius: '0px' }}>

        {/* SCROLL WRAPPER */}
        <div className="overflow-x-auto" >

          <table className="w-full">
            <thead>
              <tr>
                {["S.No.",
                  "Order Id", "Date", "Time", "SubTotal", "Charge",
                  "Tax", "Discount", "Paid", "MOP", "Status", "Action"
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
                formattedOrders
                  .filter((order) =>
                    order.orderId.toString().includes(search)
                  )
                  .map((order, index) => (
                    <tr
                      key={order.orderId}
                      className="border-b border-white/5 hover:bg-white/5 transition text-center"
                    >
                      <td>{(page - 1) * limit + index + 1}</td>
                      <td >
                        {order.orderId}
                      </td>
                      <td>{order.date}</td>
                      <td>{order.time}</td>
                      <td>₹{order.subTotal}</td>
                      <td>₹{order.charge}</td>
                      <td>₹{order.tax}</td>
                      <td>₹{order.discount}</td>
                      <td>
                        ₹{order.totalAmount}
                      </td>
                      <td >
                        {order.mop || "--"} </td>
                      <td >
                        <span className={` ${order.status === "completed"
                          ? "green_bg"
                          : "yellow_bg"
                          }`}>
                          {order.status}
                        </span>
                      </td>

                      <td>
                        <div className="flex items-center justify-center gap-2">
                          {order.status !== "cancelled" && (
                            <button onClick={() => handleView(order)} className="purple_bg">
                              View
                            </button>
                          )}
                          {order.status === "completed" && (
                            <button
                              onClick={() => setFeedbackOrder(order)}
                              className="main_btn"
                              style={{ fontSize: 11, padding: "4px 10px" }}
                            >
                              ⭐ Feedback
                            </button>
                          )}
                          {order.status === "cancelled" && "--"}
                        </div>
                      </td>

                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-3">

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
              className="prev_btn" >
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
              className="right_btn">
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

      {showBillModal && selectedBillOrder && (
        <BillModal
          isOpen={showBillModal}
          onClose={() => { setShowBillModal(false); setSelectedBillOrder(null); }}

          orderItems={selectedBillOrder.items.map(i => ({
            id: i.dg07_menu_id,
            dg09_name: i.dg07_menu_name_snapshot,
            qty: i.dg07_quantity,
            price: parseFloat(i.dg07_price),
            tax_group_id: i.dg09_tax_group_id,
            basePrice: parseFloat(i.dg07_base_price),
            qtyRemark: i.dg07_item_remark || "",
            globalRemark: i.dg07_global_remark || "",
            predefinedRemarks: i.dg07_predefined_remark
              ? i.dg07_predefined_remark.split(", ").filter(Boolean)
              : [],
          }))}
          deliveryCustomerName={selectedBillOrder?.customerName || ""}
          deliveryCustomerPhone={selectedBillOrder?.customerPhone || ""}
          deliveryCustomerAddress={selectedBillOrder?.customerAddress || ""}
          orderId={selectedBillOrder.rawId}
          tableId={selectedBillOrder.tableNo}
          orderType={type}
          tableNameMap={{}}
          existingBillId={selectedBillOrder.billId}
          orderStatus={selectedBillOrder?.status || ""}
          onBillDone={() => {
            setShowBillModal(false);
            setSelectedBillOrder(null);
            // Orders list refresh karo
          }}
        />
      )}
    </div>
  );
};

export default DoorDelivery