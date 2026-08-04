import React from "react";
import { useQuery } from "react-query";
import { apiConnectorGet, apiConnectorPost } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import toast from "react-hot-toast";
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const KitchenScreen = () => {

    const { data, refetch } = useQuery(
        ["kitchen_kot"],
        () => apiConnectorGet(endpoint.get_kitchen_kot_api),
        {
            refetchOnWindowFocus: true,
        }
    );

    const orders = data?.data?.result || [];

    // 🔥 GROUP BY ORDER
    const groupedOrders = orders.reduce((acc, item) => {
        const key = item.dg015_kot_id;

        if (!acc[key]) {
            acc[key] = {
                kotId: item.dg015_kot_id,
                orderId: item.dg015_order_id,
                tableId: item.dg06_table_id,
                items: [],
            };
        }

        acc[key].items.push(item);
        return acc;
    }, {});

    const updateStatus = async (kotItemId, status) => {
        try {
            const res = await apiConnectorPost(endpoint.update_kitchen_kot_api, {
                kotItemId,
                status,
            });
                toast(res?.data?.message)
            if (res?.data?.success) {
                toast.success("Updated");
                refetch();
            }

        } catch (err) {
            console.error(err);
            toast.error("Update failed");
        }
    };

    const deleteKOT = async (kotId) => {
        if (!window.confirm(`Delete KOT #${kotId}? This cannot be undone.`)) return;
        try {
            const res = await apiConnectorPost(endpoint.delete_kitchen_kot_api, { kotId });
            if (res?.data?.success) {
                toast.success("KOT deleted");
                refetch();
            } else {
                toast.error(res?.data?.message || "Delete failed");
            }
        } catch (err) {
            console.error(err);
            toast.error("Delete failed");
        }
    };

   return (
  <div className="main_cards">
    <div className="cards_header flex items-center justify-between">
        <div>
          <h3>Kitchen Dashboard</h3>
          <p>Monitor kitchen orders in real time.</p>
        </div>
    </div>
    <Row className="px-3">
      {Object.values(groupedOrders).map((order) => (
      <Col lg={6} md={6}  key={order.kotId} className="mt-3">
        <div className="kitchen_box">
          <div className="kitchen_header flex justify-between items-center">
            <div className="flex gap-1 gap-md-3 items-center flex-wrap">
                <h1>KOT #{order.kotId}</h1>
                <div className="flex  flex-column">
                    {/* TABLE INFO */}
                    {order.tableId && (
                      <p className="mb-0">
                        🪑 Table: <span className="text-white">{order.tableId}</span>
                      </p>
                    )}
                    <div class="kc-time">10:14:22 AM</div>
                </div>
            </div>
            <div className="flex gap-2 justify-end items-center">
              <div className="table_id">Order #{order.orderId}</div>
              <div class="elapsed-tag">⏱ 38 min ago</div>
              <button
                className="delete_btn"
                title="Delete KOT"
                onClick={() => deleteKOT(order.kotId)}
              >
                🗑
              </button>
            </div>
          </div>
          <div className="kitchen_body px-3 pb-3">
             {order.items.map((item, index) => (
              <div className="kitchen_list flex justify-between items-center gap-5" key={index}>
                  <div className="flex items-center gap-2">
                    <div className="item_number">#{item.dg016_menu_id}</div>
                    <div className="flex flex-column gap-1">
                      <div className="id_menu">Menu ID:{item.dg016_menu_id}</div>
                        <div className="qunttiy">
                          <p>Qty: <span>{item.dg016_quantity}</span></p>
                           <span
                          className={
                            item.dg016_status === "approved"
                              ? "green_bg"
                              : item.dg016_status === "pending"
                              ? "yellow_bg"
                              : "white_bg"
                          }
                        >
                          {item.dg016_status}
                        </span>
                        </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateStatus(item.dg016_kot_item_id, "preparing") } className="start_btn">▶ Start</button>
                    <button onClick={() => updateStatus(item.dg016_kot_item_id, "done") } className="dones_btn">✓ Done</button>
                  </div>
              </div>
            ))}
          </div>
          <div className="kitchen_footer flex justify-between items-center px-3 ">
            <p className="mb-0">1 item · All pending</p>
            <button className="dones_btn">✓ Mark All Done</button>
          </div>
        </div>
      </Col>
      ))}
    </Row>
    

   
  </div>
);
};

export default KitchenScreen;