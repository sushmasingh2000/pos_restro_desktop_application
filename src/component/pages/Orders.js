import React, { useState } from "react";
import { useQuery } from "react-query";
import { apiConnectorPost } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import BillModal from "./Bill";
import Row from "react-bootstrap/esm/Row";
import Col from "react-bootstrap/esm/Col";

const Orders = () => {
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedBillOrder, setSelectedBillOrder] = useState(null);
  const limit = 5;

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    paymentMethod: "",
    paymentStatus: "",
    orderType: ""
  });

  const { data, isLoading } = useQuery(
    ["orders", filters, page],
    () =>
      apiConnectorPost(endpoint.order_branch_status_api, {
        ...filters,
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
      tableNo: order.dg06_table_id || "N/A",
      subTotal: Number(order.dg06_subtotal || 0),
      tax: Number(order.dg06_tax || 0),
      charge: Number(order.dg06_charges || 0),
      discount: Number(order.dg06_discount || 0),
      totalAmount: Number(order.dg06_total_amount || 0),
      paymentMethod: order.dg010_payment_method || "N/A",
      paymentStatus: order.dg010_payment_status || "pending",
      status: order.dg06_status,
      type: order.dg06_order_type,
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
          <h3>All Orders</h3>
          <p>Manage & track all orders</p>
        </div>
        {/* Search */}
        <div className="flex justify-end">
          <div className="date-row main_input">
            <span className="date-label">Search:</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
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
                        <span className={`px-3 py-1 rounded-full text-xs ${order.status === "completed"
                          ? "green_bg"
                          : "yellow_bg"
                          }`}>
                          {order.status}
                        </span>
                      </td>

                      <td>
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
            basePrice: parseFloat(i.dg07_base_price),
            qtyRemark: i.dg07_item_remark || "",
            globalRemark: i.dg07_global_remark || "",
            predefinedRemarks: i.dg07_predefined_remark
              ? i.dg07_predefined_remark.split(", ").filter(Boolean)
              : [],
          }))}

          orderId={selectedBillOrder.rawId}
          tableId={selectedBillOrder.tableNo}
          orderType={selectedBillOrder.type}
          tableNameMap={{}}
          existingBillId={selectedBillOrder.billId}
          onBillDone={() => {
            setShowBillModal(false);
            setSelectedBillOrder(null);
          }}
        />
      )}
    </div>
  );
};

export default Orders;