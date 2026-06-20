import React, { useState, useMemo } from "react";
import { useQuery, useQueries } from "react-query";
import { apiConnectorPost } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import BillModal from "./Bill";
import PosTab from "../Layout/PosTab";

export default function PendingOrder() {
  const [activeTab, setActiveTab] = useState("ALL SECTIONS");
  const [search, setSearch] = useState("");
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedBillOrder, setSelectedBillOrder] = useState(null);
  const [page, setPage] = useState(1);

  const limit = 8;

  const tabs = [
    "ALL SECTIONS",
    "DINE IN",
    "QR ORDER",
    "DOOR DELIVERY",
    // "PARK ITEMS",
  ];

  const getApiParams = (tab) => {
    const base = { page, limit, status: ["pending"] };
    if (tab === "ALL SECTIONS")  return base;
    if (tab === "QR ORDER")      return { ...base, qrOnly: true };
    if (tab === "DINE IN")       return { ...base, orderType: "dine_in" };
    if (tab === "DOOR DELIVERY") return { ...base, orderType: "delivery" };
    // if (tab === "PARK ITEMS")    return { ...base, orderType: "park-items" };
    return base;
  };

  const { data, isLoading } = useQuery(
    ["pending-orders", activeTab, page],
    () => apiConnectorPost(endpoint.order_branch_status_api, getApiParams(activeTab)),
    { keepPreviousData: true }
  );

  const orders = data?.data?.result?.orders || [];
  const pagination = data?.data?.result?.pagination || {};

  const countQueries = useQueries([
    { queryKey: ["pending-count", "all"],      queryFn: () => apiConnectorPost(endpoint.order_branch_status_api, { page: 1, limit: 1, status: ["pending"] }), refetchInterval: 30000 },
    { queryKey: ["pending-count", "dine_in"],  queryFn: () => apiConnectorPost(endpoint.order_branch_status_api, { page: 1, limit: 1, status: ["pending"], orderType: "dine_in" }), refetchInterval: 30000 },
    { queryKey: ["pending-count", "qr"],       queryFn: () => apiConnectorPost(endpoint.order_branch_status_api, { page: 1, limit: 1, status: ["pending"], qrOnly: true }), refetchInterval: 30000 },
    { queryKey: ["pending-count", "delivery"], queryFn: () => apiConnectorPost(endpoint.order_branch_status_api, { page: 1, limit: 1, status: ["pending"], orderType: "delivery" }), refetchInterval: 30000 },
    // { queryKey: ["pending-count", "park"],     queryFn: () => apiConnectorPost(endpoint.order_branch_status_api, { page: 1, limit: 1, status: ["pending"], orderType: "park-items" }), refetchInterval: 30000 },
  ]);

  const tabCounts = {
    "ALL SECTIONS":  countQueries[0]?.data?.data?.result?.pagination?.total || 0,
    "DINE IN":       countQueries[1]?.data?.data?.result?.pagination?.total || 0,
    "QR ORDER":      countQueries[2]?.data?.data?.result?.pagination?.total || 0,
    "DOOR DELIVERY": countQueries[3]?.data?.data?.result?.pagination?.total || 0,
    // "PARK ITEMS":    countQueries[4]?.data?.data?.result?.pagination?.total || 0,
  };

  // FORMAT ORDERS
  const formattedOrders = useMemo(() => {
    return orders.map((order) => {
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
        items: (order.items || []).map((item) => ({
          dg09_name: item.dg07_menu_name_snapshot,
          price: Number(item.dg07_price || 0),
          tax_group_id: item.dg09_tax_group_id,
          basePrice: parseFloat(item.dg07_base_price),
          qty: Number(item.dg07_quantity || 0),
          total: Number(item.dg07_total || 0),
          globalRemark: item.dg07_global_remark,
          predefinedRemarks: item.dg07_predefined_remark
            ? [item.dg07_predefined_remark]
            : [],
        })),
        customerName: order.dg06_customer_name || "",      // ← ADD
        customerPhone: order.dg06_customer_phone || "",    // ← ADD  
        customerAddress: order.dg06_delivery_address || "",
        // items: order.items || [],
        billId: order.dg010_bill_id || null,
        billNo: order.dg06_bill_no || null,
      };
    });
  }, [orders]);

  // SEARCH FILTER ONLY
  const filteredOrders = useMemo(() => {
    return formattedOrders.filter((order) =>
      order.orderId?.toLowerCase().includes(search.toLowerCase())
    );
  }, [formattedOrders, search]);

  const handleView = (order) => {
    setSelectedBillOrder(order);
    setShowBillModal(true);
  };

  return (
    <div className="">
      <PosTab />
      <div className="main_cards mt-3">
        <div className="chart_header ">
          <div className="chart_heading">
            <h4><span class="live-dot"></span> Pending Orders</h4>
            <p>Daily performance overview</p>
          </div>

          {/* FILTERS */}
          <div className="flex">
            <div className="flex gap-2 live_filters">

              {tabs.map((tab) => {
                const count = tabCounts[tab] || 0;
                return (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); setPage(1); }}
                    className={activeTab === tab ? "active_tab" : ""}
                  >
                    {tab}
                    {count > 0 && (
                      <span style={{
                        background: tab === "ALL SECTIONS" ? "#6366f1"
                          : tab === "DINE IN" ? "#f59e0b"
                          : tab === "QR ORDER" ? "#8b5cf6"
                          : tab === "DOOR DELIVERY" ? "#ef4444"
                          : "#10b981",
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


        {/* TABLE */}
        <div className="main_table_container" style={{ borderRadius: "0", border: "0" }}>
          <div className="overflow-y-auto">

            <table className="w-full ">
              <thead >
                <tr>
                  {[
                    "S.No.",
                    "Order Id",
                    "Date",
                    "Time",
                    "Type",
                    "Table No",
                    "SubTotal",
                    "Discount",
                    "Charge",
                    "Tax",
                    "Paid",
                    "MOP",
                    "Status",
                    "Action",
                  ].map((h) => (
                    <th key={h} >{h}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="14" className="text-center p-6">
                      Loading...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="14" className="text-center p-6">
                      No pending orders found
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, index) => (
                    <tr
                      key={order.orderId}
                      className="text-center border-b border-white/5 hover:bg-white/5"
                    >
                      <td>
                        {(page - 1) * limit + index + 1}
                      </td>

                      {/*  FIX: long ID break */}
                      <td >
                        {order.orderId}
                      </td>

                      <td>{order.date}</td>
                      <td>{order.time}</td>

                      <td>
                        {order.type === "dine_in"
                          ? "Dine In"
                          : order.type === "takeaway"
                            ? "TakeAway"
                            : order.type === "delivery"
                              ? "Door Delivery"
                              : "--"}
                      </td>

                      <td>{order.tableNo}</td>
                      <td>₹{order.subTotal}</td>
                      <td>₹{order.discount}</td>
                      <td>₹{order.charge}</td>
                      <td>₹{order.tax}</td>

                      <td className="p-2 text-green-400 font-semibold">
                        ₹{order.totalAmount}
                      </td>

                      <td>{order.paymentMethod}</td>

                      <td>
                        <span
                          className={`px-3 py-1 rounded-full text-xs ${order.status === "completed"
                            ? "green_bg"
                            : "yellow_bg"
                            }`}
                        >
                          {order.status}
                        </span>
                      </td>

                      <td>
                        <button
                          onClick={() => handleView(order)}
                          className="purple_bg"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

          </div>
        </div>

        {/* PAGINATION */}
        <div className="flex justify-between mt-4 text-sm">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 bg-white/10 rounded disabled:opacity-30"
          >
            Prev
          </button>

          <div>
            Page {page} / {pagination?.totalPages || 1}
          </div>

          <button
            disabled={page === pagination?.totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 bg-white/10 rounded disabled:opacity-30"
          >
            Next
          </button>
        </div>
      </div>

      {/* BILL MODAL */}
      {showBillModal && selectedBillOrder && (
        <BillModal
          isOpen={showBillModal}
          onClose={() => {
            setShowBillModal(false);
            setSelectedBillOrder(null);
          }}
          orderItems={selectedBillOrder.items}
          orderId={selectedBillOrder.rawId}
          tableId={selectedBillOrder.tableNo}
          orderType={selectedBillOrder.type}
          existingBillId={selectedBillOrder.billId}  //  FIX
           deliveryCustomerName={selectedBillOrder?.customerName || ""}
          deliveryCustomerPhone={selectedBillOrder?.customerPhone || ""}
          deliveryCustomerAddress={selectedBillOrder?.customerAddress || ""}
        />
      )}
    </div>
  );
}