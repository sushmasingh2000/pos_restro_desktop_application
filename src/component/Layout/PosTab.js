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

  const EMPTY_COUNTS = {
    dineIn: 0,
    delivery: 0,
    doorDelivery: 0,
    tableQr: 0,
    qrTakeaway: 0,
    takeaway: 0,
    online: 0,
    pending: 0,
  };

  const fetchCounts = async () => {
    {
      // Call 1: customer-placed orders (QR, Delivery, Online)
      // Sirf customer_placed chahiye (neeche saare counts isi status pe hain) —
      // pehle poori order history (9MB+) har 30 sec me aati thi.
      const res1 = await apiConnectorPost(endpoint.get_customer_placed_orders, { statuses: ["customer_placed"] });
      // Network/server fail pe error throw karo, taaki purane counts na mitein
      // (apiConnectorPost khud throw nahi karta).
      if (!res1?.data) throw new Error("customer placed fetch failed");
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

      // Call 2: pending branch orders ke counts. Pehle yahan limit:999 ke saath
      // poori pending orders ki list aati thi sirf ginne ke liye — ab backend se
      // ek chhota counts response aata hai (rush hour me bhi size same rehta hai).
      // Dine-in/takeaway ginti me QR wale bhi shamil hain (pehle jaisa).
      let dineIn, takeaway, doorDelivery, pending;
      const resCounts = await apiConnectorPost(endpoint.order_branch_status_counts_api, {
        status: ["pending"],
      });
      const c = resCounts?.data?.success ? resCounts.data.result : null;
      if (c && typeof c.all === "number") {
        dineIn = (c.dine_in || 0) + (c.qr || 0);
        takeaway = (c.takeaway || 0) + (c.qr_takeaway || 0);
        doorDelivery = c.delivery || 0;
        pending = c.all || 0;
      } else {
        // Fallback: counts endpoint na mile (purana server / offline mode) to
        // purana tareeka — poori list se gino.
        const res2 = await apiConnectorPost(endpoint.order_branch_status_api, {
          status: ["pending"],
          limit: 999,
        });
        if (!res2?.data) throw new Error("pending orders fetch failed");
        const pendingOrders = res2?.data?.result?.orders || [];
        pending = res2?.data?.result?.pagination?.total || pendingOrders.length;
        dineIn = pendingOrders.filter((o) => o.dg06_order_type === "dine_in").length;
        takeaway = pendingOrders.filter((o) => o.dg06_order_type === "takeaway").length;
        // Door Delivery = counter pe staff ne liya order (phone/walk-in) — upar wala
        // `delivery` customer-app se aaya order hai.
        doorDelivery = pendingOrders.filter((o) => o.dg06_order_type === "delivery").length;
      }

      return { dineIn, delivery, doorDelivery, tableQr, qrTakeaway, takeaway, online, pending };
    }
  };


  // PosTab har POS/orders page pe naya mount hota hai. Pehle har mount pe 2 API
  // hit hoti thi; ab react-query cache se 20 sec tak wahi counts milte hain, aur
  // 30 sec polling pehle jaisi hai.
  const { data: countsData, refetch: refetchCounts } = useQuery(
    ["pos_tab_counts", localStorage.getItem("token")],
    fetchCounts,
    {
      staleTime: 20000,
      refetchInterval: 30000,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );
  const counts = countsData || EMPTY_COUNTS;

  useEffect(() => {
    // Order bana/cancel hone par turant fresh counts chahiye
    const onUpdated = () => { refetchCounts(); };
    window.addEventListener("orders-updated", onUpdated);
    return () => window.removeEventListener("orders-updated", onUpdated);
  }, [refetchCounts]);

  const { data: branchProfileData } = useQuery(
    ["branch_profile"],
    () => apiConnectorGet(endpoint.branch_profile_api),
    { refetchOnWindowFocus: false, retry: false, staleTime: 30 * 60 * 1000 }
  );
  const features = branchProfileData?.data?.result?.features || {};

  const navItems = [
    { name: "DINE IN", path: "/userdashboard", count: counts.dineIn },
    { name: "TAKE AWAY", path: "/pos/take-away", count: counts.takeaway },
    { name: "DOOR DELIVERY", path: "/pos/delivery", count: counts.doorDelivery },
    features.door_delivery && { name: "ONLINE DELIVERY", path: "/online-delivery-order", count: counts.delivery },
    features.table_qr && { name: "TABLE QR", path: "/qr-order", count: counts.tableQr },
    features.takeaway && { name: "QR ORDER", path: "/qr-takeaway-order", count: counts.qrTakeaway },
    // { name: "ONLINE ORDERS", path: "/online-order", count: counts.online },
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
