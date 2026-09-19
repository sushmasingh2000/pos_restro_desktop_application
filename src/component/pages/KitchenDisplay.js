import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "react-query";
import { useNavigate } from "react-router-dom";
import { apiConnectorGet, apiConnectorPost } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

const POLL_MS = 4000;

const CARD_COLORS = [
  {
    border: "#2563eb",
    bg: "#eff6ff",
    text: "#1d4ed8",
  },
  {
    border: "#16a34a",
    bg: "#f0fdf4",
    text: "#15803d",
  },
  {
    border: "#f59e0b",
    bg: "#fffbeb",
    text: "#b45309",
  },
  {
    border: "#ef4444",
    bg: "#fef2f2",
    text: "#dc2626",
  },
  {
    border: "#8b5cf6",
    bg: "#f5f3ff",
    text: "#7c3aed",
  },
  {
    border: "#06b6d4",
    bg: "#ecfeff",
    text: "#0891b2",
  },
];

const formatTime = (dt) => {
  if (!dt) return "";

  return new Date(dt).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getOrderAge = (dt) => {
  if (!dt) return "";

  const diff = Math.max(0, Date.now() - new Date(dt).getTime());

  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Just now";
  if (minutes === 1) return "1 min ago";

  return `${minutes} mins ago`;
};

const KitchenDisplay = () => {
  const navigate = useNavigate();

  const [tableNameMap, setTableNameMap] = useState({});
  const [menuNameMap, setMenuNameMap] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Tables + Menu
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tableRes, menuRes] = await Promise.all([
          apiConnectorPost(endpoint.table_branch_api),
          apiConnectorPost(endpoint.menu_branch_api),
        ]);

        const tables = tableRes?.data?.result || [];
        const menus = menuRes?.data?.result?.menus || [];

        const tableMap = {};
        tables.forEach((t) => {
          tableMap[t.dg05_table_id] = t.dg05_table_name;
        });

        const menuMap = {};
        menus.forEach((m) => {
          menuMap[m.dg09_menu_id] = m.dg09_name;
        });

        setTableNameMap(tableMap);
        setMenuNameMap(menuMap);
      } catch (err) {
        console.error("Error fetching KDS data:", err);
      }
    };

    fetchData();
  }, []);

  // Live KOT
  const { data, isFetching } = useQuery(
    ["kitchen_kot_display"],
    () => apiConnectorGet(endpoint.get_kitchen_kot_api),
    {
      refetchInterval: POLL_MS,
      refetchOnWindowFocus: true,
    }
  );

  const orders = data?.data?.result || [];

  // Group KOT
  const groupedOrders = orders.reduce((acc, item) => {
    const key = item.dg015_kot_id;

    if (!acc[key]) {
      acc[key] = {
        kotId: item.dg015_kot_id,
        orderId: item.dg015_order_id,
        tableId: item.dg06_table_id,
        createdAt: item.dg015_created_at,
        items: [],
      };
    }

    acc[key].items.push(item);

    return acc;
  }, {});

  const kotCards = Object.values(groupedOrders).sort(
    (a, b) =>
      new Date(a.createdAt).getTime() -
      new Date(b.createdAt).getTime()
  );

  const handleLogout = () => {
    localStorage.clear();
    navigate("/kitchen-login");
  };

  return (
    <div className="kds-page">

      {/* ================= HEADER ================= */}
      <div className="kds-header">

        <div className="kds-brand">
          <div className="kds-logo">
            🍳
          </div>

          <div>
            <h2>Kitchen Display</h2>

            <div className="kds-subtitle">
              Live Kitchen Orders
            </div>
          </div>
        </div>

        <div className="kds-header-right">

          <div className="kds-live">
            <span className="live-dot"></span>
            LIVE
          </div>

          <div className="kds-order-count">
            <span>Active Orders</span>
            <strong>{kotCards.length}</strong>
          </div>

          <div className="kds-clock">
            {currentTime.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </div>

          <button
            className="kds-logout"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>
      </div>

      {/* ================= STATUS BAR ================= */}
      <div className="kds-status-bar">

        <div>
          <span className="status-icon">●</span>
          Kitchen is receiving live orders
        </div>

        <div className="refresh-info">
          {isFetching ? "Updating..." : "Auto refresh • 4 sec"}
        </div>

      </div>

      {/* ================= ORDERS ================= */}
      <div className="kds-content">

        {kotCards.length === 0 ? (

          <div className="kds-empty">

            <div className="empty-icon">
              🍽️
            </div>

            <h3>No Active Orders</h3>

            <p>
              New kitchen orders will appear here automatically.
            </p>

          </div>

        ) : (

          <Row className="g-4">

            {kotCards.map((order, cardIndex) => {

              const tableLabel = order.tableId
                ? (
                    tableNameMap[order.tableId] ||
                    `Table ${order.tableId}`
                  )
                : "Takeaway / Delivery";

              const color =
                CARD_COLORS[
                  cardIndex % CARD_COLORS.length
                ];

              return (

                <Col
                  xl={4}
                  lg={6}
                  md={6}
                  sm={12}
                  key={order.kotId}
                >

                  <div
                    className="kds-card"
                    style={{
                      "--card-color": color.border,
                      "--card-bg": color.bg,
                      "--card-text": color.text,
                    }}
                  >

                    {/* CARD HEADER */}
                    <div className="kds-card-header">

                      <div className="table-section">

                        <div className="table-icon">
                          🪑
                        </div>

                        <div>

                          <div className="table-name">
                            {tableLabel}
                          </div>

                          <div className="kot-number">
                            KOT #{order.kotId}
                          </div>

                        </div>

                      </div>

                      <div className="order-time">

                        <div className="time">
                          {formatTime(order.createdAt)}
                        </div>

                        <div className="age">
                          {getOrderAge(order.createdAt)}
                        </div>

                      </div>

                    </div>

                    {/* CARD BODY */}
                    <div className="kds-card-body">

                      {order.items.map((item, index) => (

                        <div
                          className="kds-item"
                          key={index}
                        >

                          <div className="item-left">

                            <div
                              className="item-number"
                              style={{
                                background: color.bg,
                                color: color.text,
                              }}
                            >
                              {index + 1}
                            </div>

                            <div className="item-name">

                              {
                                menuNameMap[item.dg016_menu_id] ||
                                `Item #${item.dg016_menu_id}`
                              }

                            </div>

                          </div>

                          <div className="qty-badge">
                            × {item.dg016_quantity}
                          </div>

                        </div>

                      ))}

                    </div>

                    {/* CARD FOOTER */}
                    <div className="kds-card-footer">

                      <span>
                        {order.items.length}{" "}
                        {order.items.length === 1
                          ? "Item"
                          : "Items"}
                      </span>

                      <span>
                        Order #{order.orderId}
                      </span>

                    </div>

                  </div>

                </Col>

              );
            })}

          </Row>

        )}

      </div>

      {/* ================= CSS ================= */}
      <style>{`

        * {
          box-sizing: border-box;
        }

        .kds-page {
          min-height: 100vh;
          background: #f1f5f9;
          color: #0f172a;
        }

        /* HEADER */

        .kds-header {
          height: 82px;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .kds-brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .kds-logo {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 23px;
        }

        .kds-brand h2 {
          margin: 0;
          font-size: 23px;
          font-weight: 800;
          color: #0f172a;
        }

        .kds-subtitle {
          color: #64748b;
          font-size: 13px;
          margin-top: 2px;
        }

        .kds-header-right {
          display: flex;
          align-items: center;
          gap: 22px;
        }

        .kds-live {
          display: flex;
          align-items: center;
          gap: 7px;
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
          padding: 7px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 800;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 0 4px #d1fae5;
        }

        .kds-order-count {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #64748b;
          font-size: 13px;
        }

        .kds-order-count strong {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0f172a;
          color: white;
          font-size: 14px;
        }

        .kds-clock {
          font-weight: 700;
          color: #334155;
          font-size: 15px;
          min-width: 95px;
        }

        .kds-logout {
          border: 1px solid #cbd5e1;
          background: white;
          color: #334155;
          padding: 8px 15px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        .kds-logout:hover {
          background: #f8fafc;
        }

        /* STATUS BAR */

        .kds-status-bar {
          min-height: 44px;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 28px;
          color: #475569;
          font-size: 13px;
        }

        .status-icon {
          color: #10b981;
          margin-right: 8px;
          font-size: 11px;
        }

        .refresh-info {
          color: #94a3b8;
        }

        /* CONTENT */

        .kds-content {
          padding: 22px 28px 40px;
        }

        /* CARD */

        .kds-card {
          background: white;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-top: 5px solid var(--card-color);
          box-shadow:
            0 2px 6px rgba(15, 23, 42, 0.05),
            0 8px 20px rgba(15, 23, 42, 0.04);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .kds-card:hover {
          transform: translateY(-2px);
          box-shadow:
            0 5px 12px rgba(15, 23, 42, 0.08),
            0 12px 28px rgba(15, 23, 42, 0.06);
        }

        /* CARD HEADER */

        .kds-card-header {
          background: var(--card-bg);
          padding: 16px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e2e8f0;
        }

        .table-section {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .table-icon {
          font-size: 23px;
        }

        .table-name {
          color: var(--card-text);
          font-size: 19px;
          font-weight: 800;
        }

        .kot-number {
          color: #64748b;
          font-size: 11px;
          font-weight: 600;
          margin-top: 3px;
        }

        .order-time {
          text-align: right;
        }

        .time {
          color: var(--card-text);
          font-size: 15px;
          font-weight: 800;
        }

        .age {
          color: #64748b;
          font-size: 11px;
          margin-top: 3px;
        }

        /* ITEMS */

        .kds-card-body {
          padding: 4px 18px;
        }

        .kds-item {
          min-height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          border-bottom: 1px dashed #e2e8f0;
        }

        .kds-item:last-child {
          border-bottom: none;
        }

        .item-left {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
        }

        .item-number {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .item-name {
          font-size: 21px;
          font-weight: 750;
          color: #172033;
          line-height: 1.2;
          word-break: break-word;
        }

        .qty-badge {
          min-width: 62px;
          padding: 8px 11px;
          text-align: center;
          border-radius: 8px;
          background: #f1f5f9;
          color: #0f172a;
          font-size: 15px;
          font-weight: 800;
          flex-shrink: 0;
        }

        /* FOOTER */

        .kds-card-footer {
          height: 38px;
          padding: 0 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 600;
        }

        /* EMPTY */

        .kds-empty {
          min-height: 450px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .empty-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          box-shadow: 0 5px 20px rgba(15,23,42,.07);
          margin-bottom: 20px;
        }

        .kds-empty h3 {
          margin: 0;
          font-size: 22px;
          font-weight: 800;
        }

        .kds-empty p {
          margin-top: 8px;
          color: #94a3b8;
        }

        /* RESPONSIVE */

        @media (max-width: 900px) {

          .kds-header {
            padding: 0 15px;
          }

          .kds-header-right {
            gap: 8px;
          }

          .kds-order-count,
          .kds-clock {
            display: none;
          }

          .kds-content {
            padding: 15px;
          }

          .kds-status-bar {
            padding: 0 15px;
          }

        }

        @media (max-width: 600px) {

          .kds-brand h2 {
            font-size: 18px;
          }

          .kds-logo {
            width: 40px;
            height: 40px;
          }

          .kds-subtitle {
            display: none;
          }

          .kds-card-header {
            padding: 14px;
          }

          .item-name {
            font-size: 18px;
          }

        }

      `}</style>
    </div>
  );
};

export default KitchenDisplay;