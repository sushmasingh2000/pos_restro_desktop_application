import MenuIcon from "@mui/icons-material/Menu";
import { useNavigate } from "react-router-dom";
import { useQuery } from "react-query";
import { useState, useEffect, useRef } from "react";
import { apiConnectorPost, apiConnectorGet, triggerLocalCacheNow } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import useAppMode from "../../hooks/useAppMode";

const Navbar = ({ toggleSidebar }) => {
  const navigate = useNavigate();

  const type = localStorage.getItem("role");

  const [showDropdown, setShowDropdown] = useState(false);
  const [showSubDropdown, setShowSubDropdown] = useState(false);
  const [prevCount, setPrevCount] = useState(null);
  const [switchingOffline, setSwitchingOffline] = useState(false);
  const audioRef = useRef(null);
  const subDropRef = useRef(null);
  const notifDropRef = useRef(null);

  const showBell = type !== "business_owner" && type !== "master_admin";
  const { appMode, rawOnline, startOfflineMode, goOnlineMode } = useAppMode();

  const handleStartOffline = async () => {
    setSwitchingOffline(true);
    await triggerLocalCacheNow(); // best-effort fresh sync before switching
    setSwitchingOffline(false);
    startOfflineMode();
  };

  // ── Branch name ──
  const { data: branchData } = useQuery(
    ["navbar_branch_profile"],
    () => apiConnectorGet(endpoint.branch_profile_api),
    { refetchOnWindowFocus: false, retry: false, staleTime: 30 * 60 * 1000 }
  );
  const branchName = branchData?.data?.result?.branch_name || "";

  // ── Subscription alert ──
  const { data: subData } = useQuery(
    ["my_subscription_nav"],
    () => apiConnectorGet(endpoint.get_my_subscription),
    {
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 5 * 60 * 1000,
      enabled: type !== "master_admin",
    }
  );
  const sub = subData?.data?.result;
  const daysLeft = sub?.days_left !== undefined ? Number(sub.days_left) : 999;
  const isExpired = sub ? (sub.is_expired || daysLeft <= 0) : false;
  const showSubAlert = sub && !isExpired && daysLeft <= 15;

  useEffect(() => {
    const handler = (e) => {
      if (subDropRef.current && !subDropRef.current.contains(e.target)) {
        setShowSubDropdown(false);
      }
      if (notifDropRef.current && !notifDropRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: notifData } = useQuery(
    ["pending_notifications"],
    () =>
      apiConnectorPost(endpoint.order_branch_status_api, {
        status: ["customer_placed"],
      }),
    {
      refetchInterval: 10000,
      refetchOnWindowFocus: true,
      enabled: showBell,
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

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          new Notification("🔔 New Order!", {
            body: `${notifCount - prevCount} New Order Pending`,
            icon: "/logo.png",
          });
        } catch {
          // Mobile browsers (Android Chrome) don't allow direct `new Notification()` —
          // silently skip instead of crashing the whole app.
        }
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
    <>
    {rawOnline === false && appMode === "online" && (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
        background: "#fef3c7", borderBottom: "1px solid #f59e0b",
        padding: "8px 16px", fontSize: 13, color: "#92400e", fontWeight: 600,
        flexWrap: "wrap", textAlign: "center",
      }}>
        <span>⚠️ Internet connection lost — start offline mode to keep working?</span>
        <button
          onClick={handleStartOffline}
          disabled={switchingOffline}
          style={{
            background: "#f59e0b", color: "#fff", border: "none",
            borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 700,
            cursor: switchingOffline ? "not-allowed" : "pointer",
            opacity: switchingOffline ? 0.7 : 1,
          }}
        >
          {switchingOffline ? "Syncing..." : "Start Offline Order"}
        </button>
      </div>
    )}
    {rawOnline === true && appMode === "offline" && (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
        background: "#dcfce7", borderBottom: "1px solid #22c55e",
        padding: "8px 16px", fontSize: 13, color: "#166534", fontWeight: 600,
        flexWrap: "wrap", textAlign: "center",
      }}>
        <span>✅ Internet is back — switch back to online mode?</span>
        <button
          onClick={goOnlineMode}
          style={{
            background: "#22c55e", color: "#fff", border: "none",
            borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Go Online
        </button>
      </div>
    )}
    <nav className="flex items-center justify-between">
      <audio ref={audioRef} src="/notification.wav" preload="auto" />


      <div className="flex items-center gap-4">
        <div className="sidebar_logo logo_mobile_responsvie">
          <div className="logo_icon">
            <i className="ri-send-plane-line"></i>
          </div>
          <div>
            <h1>Ferry Restro</h1>
            <p>Restaurant Technology partner</p>
          </div>
        </div>
        <div className="breadcrumb_text">
          <h4>
            {type === "business_owner" && "Owner Dashboard"}
            {type === "branch_admin" && "Branch Admin Dashboard"}
          </h4>
          <p>Dinner Service Active</p>
        </div>
      </div>

      <div className="flex items-center gap-md-3 gap-2">

        {/* Online/Offline Mode Indicator (manual — reflects app mode, not raw network signal) */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          background: appMode === "online" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
          border: `1px solid ${appMode === "online" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.35)"}`,
          borderRadius: 8, padding: "4px 10px",
          fontSize: 12, color: appMode === "online" ? "#10b981" : "#ef4444", fontWeight: 700,
          whiteSpace: "nowrap",
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: appMode === "online" ? "#10b981" : "#ef4444",
            display: "inline-block",
          }} />
          {appMode === "online" ? "Online" : "Offline"}
        </div>

        {/* Branch Name Badge */}
        {branchName && (
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "rgba(59,130,246,0.12)",
            border: "1px solid rgba(59,130,246,0.3)",
            borderRadius: 8, padding: "4px 10px",
            fontSize: 12, color: "#60a5fa", fontWeight: 600,
            whiteSpace: "nowrap",
          }}>
            <i className="ri-store-2-line" style={{ fontSize: 13 }} />
            {branchName}
          </div>
        )}

        {/* Subscription Alert */}
        {showSubAlert && (
          <div className="relative" ref={subDropRef}>
            <style>{`
              @keyframes sub-pulse {
                0%,100% { box-shadow: 0 0 0 0 #dc262666; }
                50%      { box-shadow: 0 0 0 8px transparent; }
              }
            `}</style>
            <button
              className="notification_btn"
              onClick={() => setShowSubDropdown(!showSubDropdown)}
              style={{ position: "relative" }}
            >
              <div style={{ animation: "sub-pulse 1.4s infinite" }}>
                {daysLeft <= 3 ? "🚨" : "⚠️"}
              </div>
              <span className="notification_count" style={{ background: "#dc2626" }}>
                {daysLeft + "d"}
              </span>
            </button>

            {showSubDropdown && (
              <div
                className="absolute right-0 mt-2 rounded-xl shadow-xl z-50 overflow-hidden"
                style={{
                  width: 300,
                  background: "#fff",
                  border: "1.5px solid #fca5a5",
                  boxShadow: "0 4px 20px rgba(220,38,38,.15)",
                }}
              >
                <div
                  style={{
                    background: daysLeft <= 3 ? "#fee2e2" : "#ffedd5",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: `1px solid ${daysLeft <= 3 ? "#fca5a5" : "#fed7aa"}`,
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 13, color: daysLeft <= 3 ? "#991b1b" : "#92400e" }}>
                    {daysLeft <= 3 ? "🚨 Subscription Critical" : "⚠️ Subscription Expiring"}
                  </span>
                  <button
                    onClick={() => setShowSubDropdown(false)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#94a3b8" }}
                  >✕</button>
                </div>

                <div style={{ padding: "14px 16px" }}>
                  <div style={{ fontSize: 13, color: "#1e3a8a", fontWeight: 600, marginBottom: 6 }}>
                    {sub?.package_name}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
                    <i className="ri-calendar-event-line" style={{ marginRight: 4 }} />
                    Expires:{" "}
                    <strong>
                      {sub?.end_date
                        ? new Date(sub.end_date).toLocaleDateString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric",
                          })
                        : "—"}
                    </strong>
                  </div>

                  <div style={{
                    background: "#ffedd5",
                    border: "1px solid #fed7aa",
                    borderRadius: 8, padding: "10px 12px",
                    textAlign: "center", marginBottom: 12,
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#ea580c" }}>
                      {`${daysLeft} Day${daysLeft !== 1 ? "s" : ""} Left`}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                      {daysLeft <= 3
                        ? "Renew immediately to avoid interruption"
                        : "Contact owner to renew subscription"}
                    </div>
                  </div>

                  <div style={{
                    background: "#eff6ff", border: "1px solid #bfdbfe",
                    borderRadius: 8, padding: "10px 12px",
                    fontSize: 12, color: "#1e40af",
                    display: "flex", alignItems: "flex-start", gap: 8,
                  }}>
                    <i className="ri-information-line" style={{ marginTop: 1, flexShrink: 0 }} />
                    Please contact your business owner to renew the subscription plan before expiry.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notification Bell — only for branch_admin / staff */}
        {showBell && <div className="relative" ref={notifDropRef}>
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

                      {order.dg06_order_type === "delivery" && (
                        <div style={{ marginTop: 5 }}>
                          {Number(order.repeat_order_count) === 0 ? (
                            <span style={{ background: "#dcfce7", color: "#15803d", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
                              🆕 New Customer
                            </span>
                          ) : (
                            <span style={{ background: "#fef3c7", color: "#b45309", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
                              🔁 Repeated Order: {order.repeat_order_count}
                            </span>
                          )}
                        </div>
                      )}

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
        </div>}

        <div className="tottle_btn mobile_btn">
          <button onClick={toggleSidebar}>
            <MenuIcon fontSize="small" />
          </button>
        </div>
      </div>
    </nav>
    </>
  );
};

export default Navbar;