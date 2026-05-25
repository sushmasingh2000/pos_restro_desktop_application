import React, { useState } from "react";
import PosTab from "../Layout/PosTab";

const ordersData = [
  {
    id: "#101",
    placedAt: "10:00 AM",
    deliveryTime: "10:30 AM",
    channel: "Zomato",
    status: "PLACED",
  },
  {
    id: "#102",
    placedAt: "10:10 AM",
    deliveryTime: "10:40 AM",
    channel: "Swiggy",
    status: "IN PROGRESS",
  },
  {
    id: "#103",
    placedAt: "10:20 AM",
    deliveryTime: "10:50 AM",
    channel: "Dine In",
    status: "COMPLETED",
  },
  {
    id: "#104",
    placedAt: "10:30 AM",
    deliveryTime: "11:00 AM",
    channel: "Takeaway",
    status: "CANCELLED",
  },
  {
    id: "#105",
    placedAt: "10:40 AM",
    deliveryTime: "11:20 AM",
    channel: "Website",
    status: "INFUTURE",
  },
];

const tabs = ["PLACED", "IN PROGRESS", "COMPLETED", "CANCELLED", "INFUTURE"];

export default function OnlineOrder() {
  const [activeTab, setActiveTab] = useState("PLACED");

  const filteredOrders = ordersData.filter(
    (order) => order.status === activeTab
  );

  return (
    <div className="">
      <PosTab />

      <div className="chart_header px-0">
        <div className="chart_heading">
          <h4><span class="live-dot"></span> Token Update</h4>
          <p>Daily performance overview</p>
        </div>

        {/* FILTERS */}
        <div className="flex main_tanses">
          <div className="flex gap-2 live_filters">

            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
          
          ${activeTab === tab
                    ? "active_tab"
                    : ""
                  }`}
              >
                {tab}
              </button>
            ))}

          </div>

        </div>
      </div>

   
      {/* TABLE WRAPPER */}
      <div className="main_table_container mt-3">
        <div className="overflow-y-auto" style={{borderRadius: '14px'}}>
          <table className="w-full text-sm">

            <thead >
              <tr>
                <th>Order Id</th>
                <th>Placed At</th>
                <th>Delivery Time</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {filteredOrders.length > 0 ? (
                filteredOrders.map((order, index) => (
                  <tr
                    key={index}
                    className="border-b border-white/5 hover:bg-white/5 transition"
                  >

                    <td >
                      {order.id}
                    </td>

                    <td >
                      {order.placedAt}
                    </td>

                    <td >
                      {order.deliveryTime}
                    </td>

                    <td >
                      {order.channel}
                    </td>

                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium
                      ${order.status === "COMPLETED"
                          ? "green_bg"
                          : order.status === "CANCELLED"
                            ? "red_bg"
                            : order.status === "IN PROGRESS"
                              ? "yellow_bg"
                              : "purple_bg"
                        }
                    `}>
                        {order.status}
                      </span>
                    </td>

                    <td className="p-3">
                      <button className="text-purple-300 hover:text-white transition">
                        View
                      </button>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center p-8 text-white/40">
                    No orders found
                  </td>
                </tr>
              )}

            </tbody>

          </table>
        </div>
      </div>

    </div>
  );
}