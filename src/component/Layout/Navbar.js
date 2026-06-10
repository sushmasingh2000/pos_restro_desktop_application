import { Logout } from "@mui/icons-material";
import MenuIcon from "@mui/icons-material/Menu";
import { useNavigate } from "react-router-dom";
import { useQuery } from "react-query";
import { useState, useEffect, useRef } from "react";
import { apiConnectorPost } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";

const Navbar = ({ toggleSidebar }) => {
  const navigate = useNavigate();

  const type = localStorage.getItem("role");

  const [showDropdown, setShowDropdown] = useState(false);
  const [prevCount, setPrevCount] = useState(null);
  const audioRef = useRef(null);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
    window.location.reload();
  };

  const { data: notifData } = useQuery(
    ["pending_notifications"],
    () =>
      apiConnectorPost(endpoint.order_branch_status_api, {
        status: ["pending", "customer_placed"],
      }),
    {
      refetchInterval: 10000,
      refetchOnWindowFocus: true,
    }
  );

  const notifications = notifData?.data?.result?.orders || [];
  const notifCount = notifications.length;

  useEffect(() => {
    if (prevCount === null) {
      setPrevCount(notifCount);
      return;
    }

    if (notifCount > prevCount) {
      audioRef.current?.play().catch(() => { });

      if (Notification.permission === "granted") {
        new Notification("🔔 New Order!", {
          body: `${notifCount - prevCount} New Order Pending`,
          icon: "/logo.png",
        });
      }
    }

    setPrevCount(notifCount);
  }, [notifCount, prevCount]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return (
    <nav className="flex items-center justify-between">
      <audio
        ref={audioRef}
        src="/notification.wav"
        preload="auto"
      />

      <div className="flex items-center gap-4">
        <div className="breadcrumb_text">
          <h4>
            {type === "business_owner" && "Owner Dashboard"}
            {type === "branch_admin" && "Branch Admin Dashboard"}
          </h4>
          <p>Dinner Service Active</p>
        </div>
      </div>

      <div className="flex items-center gap-3">


        {/* Notification Bell */}
        <div className="relative">
          <button
            className="notification_btn"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className={notifCount > 0 ? "animate-bounce" : ""}>
              🔔
            </div>

            {notifCount > 0 && (
              <span className="notification_count">
                {notifCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div
              className="absolute right-0 mt-2 rounded-xl shadow-xl z-50 overflow-hidden"
              style={{
                width: "320px",
                background: "#fff",
                border: "1px solid #DBEAFE",
                boxShadow: "0 4px 20px rgba(37, 99, 235, .13);",
              }}
            >
              <div className="np-header flex items-center justify-between">
                <h3><i class="ri-timer-line"></i> Pending Orders <span>{notifCount}</span></h3>
                <button
                  onClick={() => setShowDropdown(false)}>
                  ✕
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-white/40 text-sm">
                    Koi pending order nahi
                  </div>
                ) : (
                  notifications.map((order, index) => (
                    <div
                      key={index}
                      className="order_notifaction"
                      onClick={() => {
                        setShowDropdown(false);
                        navigate(
                          order.dg06_order_type === "delivery"
                            ? "/online-delivery-order"
                            : "/qr-order"
                        );
                      }}
                    >
                      <div className="flex justify-between items-center order_stattus_box">
                        <span>
                          Order #{order.dg06_order_id}
                        </span>

                        <span className="order_status">
                          <div className="np-badge-dot "></div>
                          {order.dg06_status}
                        </span>
                      </div>

                      <div className="np-order-meta">
                        <i class="ri-timer-2-line"></i>
                        {order.dg06_order_type === "dine_in"
                          ? `Table ${order.dg06_table_id}`
                          : order.dg06_order_type}
                        {" • "}₹{order.dg06_total_amount}
                      </div>

                      <div className="np-time">
                        <i class="ri-timer-2-line"></i>
                        {new Date(
                          order.dg06_created_at
                        ).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 logout_btn"
        >
          <Logout className="!h-4" />
          Logout
        </button>

        <div className="tottle_btn mobile_btn">
          <button onClick={toggleSidebar}>
            <MenuIcon fontSize="small" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;