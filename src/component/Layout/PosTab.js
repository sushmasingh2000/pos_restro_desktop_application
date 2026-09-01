import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { useQuery } from "react-query";
import { apiConnectorPost, apiConnectorGet } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";

const badgeStyle = `
  @keyframes badgePulse {
    0%   { opacity: 1; transform: scale(1); }
    50%  { opacity: 0.4; transform: scale(0.85); }
    100% { opacity: 1; transform: scale(1); }
  }
`;

const Badge = ({ count }) => {
  if (!count || count <= 0) return null;
  return (
    <>
      <style>{badgeStyle}</style>
      <span style={{
        background: "#ef4444",
        color: "#fff",
        borderRadius: "50%",
        fontSize: 10,
        padding: "1px 6px",
        marginLeft: 6,
        fontWeight: "bold",
        minWidth: 18,
        display: "inline-block",
        textAlign: "center",
        animation: "badgePulse 1.2s ease-in-out infinite",
      }}>
        {count > 99 ? "99+" : count}
      </span>
    </>
  );
};

const PosTab = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [counts, setCounts] = useState({
    dineIn: 0,
    delivery: 0,
    tableQr: 0,
    qrTakeaway: 0,
    takeaway: 0,
    online: 0,
    pending: 0,
  });

  const fetchCounts = useCallback(async () => {
    try {
      // Call 1: customer-placed orders (QR, Delivery, Online)
      const res1 = await apiConnectorPost(endpoint.get_customer_placed_orders);
      const allPlaced = res1?.data?.result || [];

      // Table QR = customer scanned the table QR (dine-in)
      const tableQr = allPlaced.filter(
        (o) =>
          o.dg06_customer_session != null &&
          o.dg06_customer_session !== "" &&
          o.dg06_order_type === "dine_in" &&
          o.dg06_status === "customer_placed"
      ).length;

      const delivery = allPlaced.filter(
        (o) =>
          o.dg06_order_type === "delivery" &&
          o.dg06_status === "customer_placed"
      ).length;

      const online = allPlaced.filter(
        (o) =>
          (o.platform?.toLowerCase() === "swiggy" ||
            o.platform?.toLowerCase() === "zomato") &&
          o.dg06_status === "customer_placed"
      ).length;

      // QR Order = customer scanned a QR from anywhere for takeaway pickup
      const qrTakeaway = allPlaced.filter(
        (o) =>
          o.dg06_order_type === "takeaway" &&
          o.dg06_customer_session != null &&
          o.dg06_customer_session !== "" &&
          o.dg06_status === "customer_placed"
      ).length;

      // Call 2: pending branch orders (Dine-in + Pending tab)
      const res2 = await apiConnectorPost(endpoint.order_branch_status_api, {
        status: ["pending"],
        limit: 999,
      });
      const pendingOrders = res2?.data?.result?.orders || [];
      const pendingTotal = res2?.data?.result?.pagination?.total || pendingOrders.length;

      const dineIn = pendingOrders.filter(
        (o) => o.dg06_order_type === "dine_in"
      ).length;

      // Takeaway = orders staff placed at the counter
      const takeaway = pendingOrders.filter(
        (o) => o.dg06_order_type === "takeaway"
      ).length;

      const pending = pendingTotal;

      setCounts({ dineIn, delivery, tableQr, qrTakeaway, takeaway, online, pending });
    } catch { }
  }, []);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  const { data: branchProfileData } = useQuery(
    ["postab_branch_profile"],
    () => apiConnectorGet(endpoint.branch_profile_api),
    { refetchOnWindowFocus: false, retry: false, staleTime: 30 * 60 * 1000 }
  );
  const features = branchProfileData?.data?.result?.features || {};

  const navItems = [
    { name: "DINE IN", path: "/userdashboard", count: counts.dineIn },
    features.table_order && { name: "TAKE AWAY", path: "/pos/take-away", count: counts.takeaway },
    features.door_delivery && { name: "DOOR DELIVERY ORDERS", path: "/online-delivery-order", count: counts.delivery },
    features.table_qr && { name: "TABLE QR", path: "/qr-order", count: counts.tableQr },
    features.takeaway && { name: "QR ORDER", path: "/qr-takeaway-order", count: counts.qrTakeaway },
    { name: "ONLINE ORDERS", path: "/online-order", count: counts.online },
    { name: "PENDING ORDERS", path: "/pending-order", count: counts.pending },
  ].filter(Boolean);

  return (
    <div className="flex gap-1 main_tabs">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.name}
            onClick={() => navigate(item.path)}
            className={`${isActive ? "acive_tab" : ""}`}
          >
            {item.name}
            <Badge count={item.count} />
          </button>
        );
      })}
    </div>
  );
};

export default PosTab;
