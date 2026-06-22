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

  if (isMaster) return children;

  if (isLoading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", flexDirection: "column", gap: 14,
        background: "#f0f6ff",
      }}>
        <style>{"@keyframes spin { to { transform: rotate(360deg) } }"}</style>
        <div style={{
          width: 38, height: 38,
          border: "3px solid #dbeafe",
          borderTop: "3px solid #2563eb",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <span style={{ color: "#93c5fd", fontSize: 13 }}>Checking subscription...</span>
      </div>
    );
  }

  const sub = data?.data?.result;
  const daysLeft = sub?.days_left !== undefined ? Number(sub.days_left) : 999;
  const isExpired = sub ? (sub.is_expired || daysLeft <= 0) : false;
  const isNoSub = !sub;

  if (isExpired || isNoSub) {
    return <SubscriptionExpiredPage sub={sub} isNoSub={isNoSub} />;
  }

  return children;
};

// ── Subscription Expired Full Page ───────────────────────────
const SubscriptionExpiredPage = ({ sub, isNoSub }) => {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 60%, #eff6ff 100%)",
      padding: "20px", fontFamily: "inherit",
    }}>
      <style>{`
        @keyframes sub-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes sub-fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sub-reload-btn:hover {
          background: #2563eb !important;
          color: #fff !important;
          border-color: #2563eb !important;
        }
      `}</style>

      <div style={{
        background: "#ffffff",
        borderRadius: 20,
        padding: "44px 36px 36px",
        maxWidth: 440, width: "100%",
        textAlign: "center",
        boxShadow: "0 8px 40px rgba(37,99,235,0.12), 0 0 0 1px rgba(37,99,235,0.08)",
        animation: "sub-fade-up 0.4s ease",
        position: "relative",
      }}>

        {/* Small reload button — top right */}
        <button
          className="sub-reload-btn"
          onClick={() => window.location.reload()}
          title="Refresh"
          style={{
            position: "absolute", top: 14, right: 14,
            background: "#fff", border: "1.5px solid #bfdbfe",
            borderRadius: 8, padding: "5px 10px",
            color: "#2563eb", fontSize: 12, fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            transition: "all 0.18s",
          }}
        >
          <i className="ri-refresh-line" style={{ fontSize: 13 }} />
          Reload
        </button>

        {/* Icon */}
        <div style={{
          width: 72, height: 72,
          background: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
          borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
          fontSize: 32,
          animation: "sub-float 3.5s ease-in-out infinite",
          boxShadow: "0 4px 20px rgba(37,99,235,0.15)",
        }}>
          {isNoSub ? "📋" : "🔒"}
        </div>

        {/* Title */}
        <h1 style={{
          color: "#1e3a8a", fontWeight: 800, fontSize: 22,
          marginBottom: 8, letterSpacing: -0.3,
        }}>
          {isNoSub ? "No Subscription Assigned" : "Subscription Expired"}
        </h1>

        {/* Description */}
        <p style={{
          color: "#64748b", fontSize: 13.5, lineHeight: 1.8,
          marginBottom: 22,
        }}>
          {isNoSub
            ? "This account does not have an active subscription plan. Access has been suspended."
            : "Your subscription plan has expired. Panel access has been suspended until the plan is renewed."}
        </p>

        {/* Plan info card */}
        {sub && !isNoSub && (
          <div style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 12, padding: "13px 16px",
            marginBottom: 18, textAlign: "left",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 6,
            }}>
              <span style={{ color: "#991b1b", fontWeight: 700, fontSize: 13.5 }}>
                {sub.package_name || "Subscription Plan"}
              </span>
              <span style={{
                background: "#dc2626", color: "#fff",
                fontSize: 10, fontWeight: 700, padding: "2px 10px",
                borderRadius: 20, letterSpacing: 0.5,
              }}>EXPIRED</span>
            </div>
            <div style={{ color: "#94a3b8", fontSize: 12 }}>
              <i className="ri-calendar-close-line" style={{ marginRight: 5, color: "#f87171" }} />
              Expired on:{" "}
              <strong style={{ color: "#475569" }}>
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
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: 12, padding: "13px 16px",
          textAlign: "left",
          display: "flex", alignItems: "flex-start", gap: 12,
        }}>
          <i className="ri-customer-service-2-line" style={{
            color: "#2563eb", fontSize: 20, marginTop: 2, flexShrink: 0,
          }} />
          <div>
            <div style={{ color: "#1e40af", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
              Contact Support to Renew
            </div>
            <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.7 }}>
              Please contact{" "}
              <strong style={{ color: "#2563eb" }}>Ferry Info Tech</strong>{" "}
              or your business owner to renew the subscription and restore access.
            </div>
          </div>
        </div>

        <p style={{ color: "#cbd5e1", fontSize: 11, marginTop: 18, letterSpacing: 0.3 }}>
          Ferry Info Tech · Subscription Management
        </p>
      </div>
    </div>
  );
};

export default SubscriptionExpiredPage;
