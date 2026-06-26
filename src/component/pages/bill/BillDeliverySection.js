import React from "react";
import { apiConnectorPost } from "../../../utils/APIConnector";
import { endpoint } from "../../../utils/APIRoutes";
import toast from "react-hot-toast";

export default function BillDeliverySection({
  orderType,
  orderId,
  currentStatus,
  setCurrentStatus,
  statusLoading,
  setStatusLoading,
  estimatedTime,
  setEstimatedTime,
  confirmDialog,
  setConfirmDialog,
}) {
  if (orderType !== "delivery") return null;

  return (
    <div style={{ margin: 8 }}>

      {/* Estimated Time — shows immediately when Out for Delivery is active */}
      {currentStatus === "out_for_delivery" && currentStatus !== "completed" && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 12px", width: "45%" }}>
          <input
            type="text"
            placeholder="⏱️ e.g. 30 mins"
            value={estimatedTime}
            onChange={(e) => setEstimatedTime(e.target.value)}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 13,
              border: "1px solid rgba(139,92,246,0.4)",
              background: "rgba(139,92,246,0.08)", color: "#c4b5fd", outline: "none"
            }}
          />
          <button
            onClick={async () => {
              if (!estimatedTime.trim()) {
                toast.error("Please enter estimated delivery time!");
                return;
              }
              await apiConnectorPost(endpoint.update_order_status_api, {
                orderId,
                status: "out_for_delivery",
                estimatedTime
              });
              toast.success("⏱️ Estimated time updated!");
            }}
            style={{
              padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: "rgba(139,92,246,0.3)", border: "1px solid rgba(139,92,246,0.5)",
              color: "#c4b5fd", cursor: "pointer", whiteSpace: "nowrap"
            }}
          >
            Set Time
          </button>
        </div>
      )}

      {(() => {
        const statusOrder = ["preparing", "ready", "out_for_delivery"];
        const isCompleted = currentStatus === "completed";
        const currentIdx = isCompleted ? statusOrder.length : statusOrder.indexOf(currentStatus);
        const steps = [
          { key: "preparing",        label: "Preparing",        icon: "🍳", color: "#f59e0b", rgb: "245,158,11" },
          { key: "ready",            label: "Ready",            icon: "📦", color: "#3b82f6", rgb: "59,130,246" },
          { key: "out_for_delivery", label: "Out for Delivery", icon: "🛵", color: "#a855f7", rgb: "168,85,247" },
        ];
        return (
          <div style={{ padding: "10px 16px 14px" }}>
            <style>{`
              @keyframes stepPulse {
                0%,100% { transform: scale(1);    box-shadow: var(--sp-sm); }
                50%     { transform: scale(1.08); box-shadow: var(--sp-lg); }
              }
              @keyframes sweetIn {
                0%   { opacity: 0; transform: scale(0.6) translateY(20px); }
                70%  { transform: scale(1.04) translateY(-2px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
              }
              @keyframes overlayIn {
                from { opacity: 0; } to { opacity: 1; }
              }
              .step-active-amber  { --sp-sm: 0 0 0 4px rgba(245,158,11,0.25), 0 0 16px rgba(245,158,11,0.6);  --sp-lg: 0 0 0 7px rgba(245,158,11,0.2), 0 0 32px rgba(245,158,11,0.9);  animation: stepPulse 1.7s ease-in-out infinite; }
              .step-active-blue   { --sp-sm: 0 0 0 4px rgba(59,130,246,0.25),  0 0 16px rgba(59,130,246,0.6);  --sp-lg: 0 0 0 7px rgba(59,130,246,0.2),  0 0 32px rgba(59,130,246,0.9);  animation: stepPulse 1.7s ease-in-out infinite; }
              .step-active-purple { --sp-sm: 0 0 0 4px rgba(168,85,247,0.25),  0 0 16px rgba(168,85,247,0.6);  --sp-lg: 0 0 0 7px rgba(168,85,247,0.2),  0 0 32px rgba(168,85,247,0.9);  animation: stepPulse 1.7s ease-in-out infinite; }
            `}</style>

            {/* Timeline row */}
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              {steps.flatMap((s, idx) => {
                const isActive = currentStatus === s.key;
                const isPast   = idx < currentIdx;
                const glowCls  = ["step-active-amber","step-active-blue","step-active-purple"][idx];

                const parts = [];

                /* ── Step node ── */
                parts.push(
                  <div key={s.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 82 }}>
                    <button
                      className={isActive ? glowCls : ""}
                      disabled={statusLoading || isPast || isCompleted}
                      onClick={() => !isCompleted && setConfirmDialog(s)}
                      style={{
                        width: 58, height: 58,
                        borderRadius: "50%",
                        border: `2px solid ${isPast ? s.color : isActive ? s.color : `rgba(${s.rgb},0.45)`}`,
                        background: isPast
                          ? s.color
                          : isActive
                            ? `rgba(${s.rgb},0.18)`
                            : `rgba(${s.rgb},0.08)`,
                        fontSize: isPast ? 20 : 26,
                        cursor: isPast || statusLoading ? "default" : "pointer",
                        color: isPast ? "#fff" : s.color,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        outline: "none",
                        transition: "background 0.3s, border 0.3s",
                        opacity: isPast ? 0.75 : 1,
                      }}
                    >
                      {isPast ? "✓" : s.icon}
                    </button>

                    {/* Label */}
                    <div style={{ marginTop: 8, textAlign: "center" }}>
                      <div style={{
                        fontSize: 11, fontWeight: 700,
                        color: isActive ? s.color : isPast ? "#888" : `rgba(${s.rgb},0.7)`,
                      }}>
                        {s.label}
                      </div>
                      {isActive && (
                        <div style={{
                          fontSize: 9, fontWeight: 800, letterSpacing: "0.1em",
                          color: s.color, marginTop: 3,
                        }}>
                          ● ACTIVE
                        </div>
                      )}
                      {isPast && (
                        <div style={{ fontSize: 9, color: "#999", marginTop: 3 }}>
                          ✓ done
                        </div>
                      )}
                    </div>
                  </div>
                );

                /* ── Connector line (not after last) ── */
                if (idx < steps.length - 1) {
                  const lineColor = isPast
                    ? `linear-gradient(to right, ${s.color}, ${steps[idx + 1].color})`
                    : `rgba(${s.rgb},0.2)`;
                  parts.push(
                    <div key={`line-${idx}`} style={{
                      flex: 1,
                      height: 3,
                      marginTop: 28,
                      borderRadius: 2,
                      background: lineColor,
                      alignSelf: "flex-start",
                    }} />
                  );
                }

                return parts;
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Custom SweetAlert Confirm Dialog ── */}
      {confirmDialog && (
        <div
          onClick={() => setConfirmDialog(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "overlayIn 0.2s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 24,
              padding: "36px 32px 28px",
              width: 320,
              textAlign: "center",
              boxShadow: `0 24px 64px rgba(0,0,0,0.25), 0 0 0 1px rgba(${confirmDialog.rgb},0.2)`,
              animation: "sweetIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            {/* Icon circle */}
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: `rgba(${confirmDialog.rgb},0.1)`,
              border: `3px solid ${confirmDialog.color}`,
              margin: "0 auto 20px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 38,
              boxShadow: `0 0 0 6px rgba(${confirmDialog.rgb},0.08)`,
            }}>
              {confirmDialog.icon}
            </div>

            {/* Title */}
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}>
              Are you sure?
            </div>

            {/* Subtitle */}
            <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 28 }}>
              Mark this order as{" "}
              <span style={{
                fontWeight: 700, color: confirmDialog.color,
                background: `rgba(${confirmDialog.rgb},0.1)`,
                padding: "2px 8px", borderRadius: 6,
              }}>
                {confirmDialog.label}
              </span>
              ?
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setConfirmDialog(null)}
                style={{
                  flex: 1, padding: "12px", borderRadius: 12,
                  fontSize: 14, fontWeight: 700,
                  background: "#f1f5f9", border: "1px solid #e2e8f0",
                  color: "#64748b", cursor: "pointer",
                }}
              >
                ✕ Cancel
              </button>
              <button
                onClick={async () => {
                  const s = confirmDialog;
                  setConfirmDialog(null);
                  setStatusLoading(true);
                  try {
                    await apiConnectorPost(endpoint.update_order_status_api, { orderId, status: s.key });
                    setCurrentStatus(s.key);
                    toast.success(`${s.icon} ${s.label}`);
                  } catch {
                    toast.error("Status update failed");
                  } finally {
                    setStatusLoading(false);
                  }
                }}
                style={{
                  flex: 1, padding: "12px", borderRadius: 12,
                  fontSize: 14, fontWeight: 700,
                  background: `linear-gradient(135deg, ${confirmDialog.color}, rgba(${confirmDialog.rgb},0.75))`,
                  border: "none", color: "#fff", cursor: "pointer",
                  boxShadow: `0 4px 14px rgba(${confirmDialog.rgb},0.4)`,
                }}
              >
                ✓ Yes!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
