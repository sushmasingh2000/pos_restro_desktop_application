import React, { useState } from "react";
import { useQuery } from "react-query";
import { apiConnectorPost } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import BillModal from "./Bill";
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const DineIn = () => {
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedBillOrder, setSelectedBillOrder] = useState(null);
  const limit = 8;
  const type = "dine_in"

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
        orderType: "dine_in"
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
      status: order.dg06_status,
      items: order.items || [],
      billId: order.dg010_bill_id || null,
      billNo: order.dg06_bill_no || null,
      repeatCount: Number(order.repeat_order_count ?? 0),
      customerName: order.dg06_customer_name || "",
      customerPhone: order.dg06_customer_phone || "",
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
      <div className="cards_header flex items-center justify-between mb-4">
        <div>
          <h3>DineIn Orders</h3>
          <p>Track dine-in orders, status, and billing easily.</p>
        </div>
      </div>
      {/* CARD */}
      <div className="table_box_main mx-3">
        <Row >
          <Col md={3}>
            <div className="main_input">
              <label>Start Date <span className="text-red-500">*</span></label>
                <input
                type="date"
                className=""
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })}/>
            </div>
          </Col>
          <Col md={3}>
            <div className="main_input">
                <label>End Date <span className="text-red-500">*</span></label>
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
                <select
                  onChange={(e) =>
                    setFilters({ ...filters, paymentMethod: e.target.value })
                  }>
                  <option>Mode of Payment</option>
                  <option value="Cash" >Cash</option>
                  <option value="Card" >Card</option>
                  <option value="UPI">UPI</option>
                </select>
            </div>
          </Col>
          <Col md={3}>
            <div className="main_input">
                <label>Payment Status <span className="text-red-500">*</span></label>
                 <select 
                  onChange={(e) =>
                    setFilters({ ...filters, paymentStatus: e.target.value })
                  }>
                  <option>Payment Status</option>
                  <option value="paid" >Paid</option>
                  <option value="unpaid" >Pending</option>
                </select>
            </div>
          </Col>
          
        

        </Row>
      </div>


      {/* TABLE */}

      <div className="main_table_container mt-4 border-0 " style={{borderRadius: '0px'}}>

        {/* SCROLL WRAPPER */}
        <div className="overflow-x-auto" >

          <table className="w-full">
            <thead>
              <tr>
                {["S.No.",
                  "Order Id", "Date", "Time", "Table No", "Customer", "SubTotal", "Discount", "Charge",
                  "Tax", "Paid", "MOP", "Repeat", "Status", "Action"
                ].map((h) => (
                  <th key={h} >{h}</th>
                ))}

              </tr>
            </thead>

            <tbody>

              {isLoading ? (
                <tr>
                  <td colSpan="16" className="text-center p-6 text-white/50">
                    Loading orders...
                  </td>
                </tr>
              ) : formattedOrders.length === 0 ? (
                <tr>
                  <td colSpan="16" className="text-center p-6 text-white/40">
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
                      className="border-b border-white/5 hover:bg-white/5 transition text-center">
                      <td>{(page - 1) * limit + index + 1}</td>
                      <td>{order.orderId}</td>
                      <td>{order.date}</td>
                      <td>{order.time}</td>
                      <td>{order.tableNo}</td>
                      <td>
                        {order.customerName
                          ? <div>
                              <div style={{ fontWeight: 600, fontSize: 12 }}>{order.customerName}</div>
                              {order.customerPhone && <div style={{ fontSize: 11, opacity: 0.6 }}>{order.customerPhone}</div>}
                            </div>
                          : "--"}
                      </td>
                      <td>₹{order.subTotal}</td>
                      <td>₹{order.discount}</td>
                      <td>₹{order.charge}</td>
                      <td>₹{order.tax}</td>
                      <td>₹{order.totalAmount}</td>
                      <td>{order.mop || "--"}</td>
                      <td>
                        {!order.customerPhone ? (
                          <span style={{ fontSize: 11, opacity: 0.4 }}>--</span>
                        ) : order.repeatCount === 0 ? (
                          <span style={{ background: "#dcfce7", color: "#15803d", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>
                             New
                          </span>
                        ) : (
                          <span style={{ background: "#fef3c7", color: "#b45309", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>
                             {order.repeatCount}x
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={` ${order.status === "completed"
                          ? "green_bg"
                          :order.status === "pending" ? "yellow_bg" : "red_bg"
                          }`}>
                          {order.status}
                        </span>
                      </td>

                      <td >
                        {order.status === "cancelled" ? "--" :
                          <button
                            onClick={() => handleView(order)}
                            className="purple_bg"
                          >
                            View
                          </button>
                        }
                      </td>

                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 ">

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
              className="prev_btn">
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
              className="next_btn">
              Next →
            </button>

          </div>

        </div>
      </div>

      {showBillModal && selectedBillOrder && (
        <BillModal
          isOpen={showBillModal}
          onClose={() => { setShowBillModal(false); setSelectedBillOrder(null); }}

          // Items map karo — Orders page ke field names alag hain
          orderItems={selectedBillOrder.items.map(i => ({
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
          }))}

          orderId={selectedBillOrder.rawId}
          tableId={selectedBillOrder.tableNo}
          orderType={type}
          tableNameMap={{}}  // Orders page pe table name map nahi hai, blank do

          //  KEY LOGIC: completed hai to existingBillId pass karo → Reprint mode
          // pending hai to null → Normal bill mode
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

export default DineIn