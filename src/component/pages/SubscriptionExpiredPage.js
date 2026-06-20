import { useQuery } from "react-query";
import { apiConnectorGet } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";

// ── Subscription Guard ────────────────────────────────────────
export const SubscriptionGuard = ({ children }) => {
  const role = localStorage.getItem("role");
  const isMaster = role === "master_admin";

  const { data, isLoading } = useQuery(
    ["sub_guard"],
    () => apiConnectorGet(endpoint.get_my_subscription),
    { staleTime: 5 * 60 * 1000, retry: false, refetchOnWindowFocus: false, enabled: !isMaster }
  );

  // Master admin hamesha andar ja sakta hai
  if (isMaster) return children;

  if (isLoading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", flexDirection: "column", gap: 14,
        background: "#0f172a",
      }}>
        <style>{"@keyframes spin { to { transform: rotate(360deg) } }"}</style>
        <div style={{
          width: 38, height: 38,
          border: "3px solid rgba(255,255,255,0.1)",
          borderTop: "3px solid #3b82f6",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <span style={{ color: "#475569", fontSize: 13 }}>Checking subscription...</span>
      </div>
    );
  }

  const sub = data?.data?.result;
  const daysLeft = sub?.days_left !== undefined ? Number(sub.days_left) : 999;
  const isExpired = sub ? (sub.is_expired || daysLeft < 0) : false;
  const isNoSub = !sub;

  if (isExpired || isNoSub) {
    return <SubscriptionExpiredPage sub={sub} isNoSub={isNoSub} />;
  }

  return children;
};

// ── Subscription Expired Full Page ───────────────────────────
const SubscriptionExpiredPage = ({ sub, isNoSub }) => {
  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/";
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)",
      padding: "20px", fontFamily: "inherit",
    }}>
      <style>{`
        @keyframes sub-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes sub-glow {
          0%, 100% { box-shadow: 0 0 30px rgba(220,38,38,0.2), 0 0 0 1px rgba(220,38,38,0.15); }
          50%       { box-shadow: 0 0 60px rgba(220,38,38,0.35), 0 0 0 1px rgba(220,38,38,0.3); }
        }
        @keyframes sub-fade-up {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sub-btn-ghost:hover { background: rgba(255,255,255,0.12) !important; }
        .sub-btn-red:hover   { background: #b91c1c !important; }
      `}</style>

      <div style={{
        background: "rgba(30,41,59,0.95)",
        borderRadius: 24,
        padding: "48px 40px",
        maxWidth: 460, width: "100%",
        textAlign: "center",
        animation: "sub-fade-up 0.45s ease, sub-glow 3s ease-in-out 0.5s infinite",
      }}>

        {/* Floating Icon */}
        <div style={{
          fontSize: 72, lineHeight: 1,
          marginBottom: 24,
          display: "inline-block",
          animation: "sub-float 3.5s ease-in-out infinite",
        }}>
          {isNoSub ? "📋" : "🔒"}
        </div>

        {/* Title */}
        <h1 style={{
          color: "#f1f5f9", fontWeight: 800, fontSize: 26,
          marginBottom: 10, letterSpacing: -0.5,
        }}>
          {isNoSub ? "No Subscription Assigned" : "Subscription Expired"}
        </h1>

        {/* Description */}
        <p style={{
          color: "#64748b", fontSize: 14, lineHeight: 1.8,
          marginBottom: 24,
        }}>
          {isNoSub
            ? "This account does not have an active subscription plan. Access has been suspended."
            : "Your subscription plan has expired. Panel access has been suspended until the plan is renewed."}
        </p>

        {/* Plan info — only if sub exists */}
        {sub && !isNoSub && (
          <div style={{
            background: "rgba(220,38,38,0.08)",
            border: "1px solid rgba(220,38,38,0.25)",
            borderRadius: 12, padding: "14px 18px",
            marginBottom: 20, textAlign: "left",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 8,
            }}>
              <span style={{ color: "#fca5a5", fontWeight: 700, fontSize: 14 }}>
                {sub.package_name || "Subscription Plan"}
              </span>
              <span style={{
                background: "#dc2626", color: "#fff",
                fontSize: 10, fontWeight: 700, padding: "2px 10px",
                borderRadius: 20, letterSpacing: 0.5,
              }}>EXPIRED</span>
            </div>
            <div style={{ color: "#475569", fontSize: 12 }}>
              <i className="ri-calendar-close-line" style={{ marginRight: 6, color: "#f87171" }} />
              Expired on:{" "}
              <strong style={{ color: "#cbd5e1" }}>
                {sub.end_date
                  ? new Date(sub.end_date).toLocaleDateString("en-IN", {
                      day: "2-digit", month: "long", year: "numeric",
                    })
                  : "—"}
              </strong>
            </div>
          </div>
        )}

        {/* Contact Box */}
        <div style={{
          background: "rgba(59,130,246,0.08)",
          border: "1px solid rgba(59,130,246,0.2)",
          borderRadius: 12, padding: "14px 18px",
          marginBottom: 28, textAlign: "left",
          display: "flex", alignItems: "flex-start", gap: 12,
        }}>
          <i className="ri-customer-service-2-line" style={{
            color: "#60a5fa", fontSize: 22, marginTop: 1, flexShrink: 0,
          }} />
          <div>
            <div style={{ color: "#93c5fd", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
              Contact Support to Renew
            </div>
            <div style={{ color: "#475569", fontSize: 12, lineHeight: 1.7 }}>
              Please contact{" "}
              <strong style={{ color: "#93c5fd" }}>Ferry Info Tech</strong>{" "}
              or your business owner to renew the subscription and restore access.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            className="sub-btn-ghost"
            onClick={handleRefresh}
            style={{
              flex: 1, padding: "12px 0",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10, color: "#cbd5e1",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            <i className="ri-refresh-line" style={{ marginRight: 6 }} />
            Refresh
          </button>
          <button
            className="sub-btn-red"
            onClick={handleLogout}
            style={{
              flex: 1, padding: "12px 0",
              background: "#dc2626", border: "none",
              borderRadius: 10, color: "#fff",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            <i className="ri-logout-circle-line" style={{ marginRight: 6 }} />
            Logout
          </button>
        </div>

        <p style={{ color: "#1e293b", fontSize: 11, marginTop: 20, letterSpacing: 0.3 }}>
          Ferry Info Tech · Subscription Management
        </p>
      </div>
    </div>
  );
};

export default SubscriptionExpiredPage;
