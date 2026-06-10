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
        status: ["pending"],
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
      audioRef.current?.play().catch(() => {});

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
                background: "rgba(20,20,30,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-white">
                  Pending Orders ({notifCount})
                </h3>

                <button
                  onClick={() => setShowDropdown(false)}
                  className="text-white/40 hover:text-white"
                >
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
                      className="px-4 py-3 border-b border-white/5 hover:bg-white/5 cursor-pointer"
                      onClick={() => {
                        setShowDropdown(false);
                        navigate("/live-orders");
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-white">
                          Order #{order.dg06_order_id}
                        </span>

                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background: "rgba(245,158,11,0.2)",
                            color: "#fcd34d",
                          }}
                        >
                          {order.dg06_status}
                        </span>
                      </div>

                      <div className="text-xs text-white/50 mt-1">
                        {order.dg06_order_type === "dine_in"
                          ? `Table ${order.dg06_table_id}`
                          : order.dg06_order_type}
                        {" • "}₹{order.dg06_total_amount}
                      </div>

                      <div className="text-xs text-white/30 mt-0.5">
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