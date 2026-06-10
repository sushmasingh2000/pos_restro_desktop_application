import MenuIcon from "@mui/icons-material/Menu";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiConnectorPost } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";

const PosTab = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [qrCount, setQrCount] = useState(0);

  useEffect(() => {
    const fetchQrCount = async () => {
      try {
        const res = await apiConnectorPost(endpoint.get_customer_placed_orders);
        const orders = (res?.data?.result || []).filter(
          (o) => o.dg06_customer_session !== null 
               && o.dg06_customer_session !== ""
               && o.dg06_status === "customer_placed"
        );
        setQrCount(orders.length);
      } catch { }
    };
    fetchQrCount();
    const interval = setInterval(fetchQrCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: "DINE IN", path: "/userdashboard" },
    { name: "DOOR DELIVERY ORDERS", path: "/online-delivery-order" },
    { name: "OR SCAN ORDERS", path: "/qr-order", count: qrCount },
    { name: "ONLINE ORDERS", path: "/online-order" },
    { name: "PENDING ORDERS", path: "/pending-order" },
  ];

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
            {item.count > 0 && (
              <span style={{
                background: "#ef4444",
                color: "#fff",
                borderRadius: "50%",
                fontSize: 10,
                padding: "1px 6px",
                marginLeft: 6,
                fontWeight: "bold",
              }}>
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default PosTab;