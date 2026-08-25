import { useState } from "react";
import toast from "react-hot-toast";
import { apiConnectorPost } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import { useQueryClient } from "react-query";
import Swal from "sweetalert2";

const CANCEL_REASONS = [
  "Cancelled by customer",
  "Item not available",
  "Customer no-show",
  "Duplicate order",
  "Order placed by mistake",
  "Other",
];

export default function CancelOrderModal({ isOpen, onClose, orderId, onCancelled }) {
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [loading, setLoading] = useState(false);

  const reason = selectedReason === "Other" ? customReason : selectedReason;
  const client = useQueryClient();
  const handleCancel = async () => {
    if (!reason.trim()) {
      toast.error("Cancel reason is required!");
      return;
    }

    const result = await Swal.fire({
      title: "Are you sure?",
      text: "All items of this order will be cancelled permanently.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Cancel it!",
      cancelButtonText: "No",
    });

    if (!result.isConfirmed) return;

    setLoading(true);

    try {
      const res = await apiConnectorPost(endpoint.cancel_order_api, {
        orderId,
        reason: reason.trim(),
      });

      if (res?.data?.success) {
        toast.success("Order cancelled!");
        client.refetchQueries("get_table");
        client.removeQueries("getOrdersByTable");
        onCancelled?.();
        onClose();
      } else {
        toast.error(res?.data?.message || "Cancel not");
      }
    } catch (err) {
      console.error(err);
      toast.error("server Error");
    }

    setLoading(false);
  };

  const handleClose = () => {
    setSelectedReason("");
    setCustomReason("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 -mt-36
      " style={{background: "#0e2a47b5"}}>
      <div className="Order_Details_modal">
        {/* HEADER */}
        <div className="Order_Details_modal_header">
          <div className="flex items-center gap-3">
            <div className="modal_header_icon">🚫</div>
            <div>
              <h2>Cancel Order</h2>
              <p>Order #{orderId}</p>
            </div>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        {/* Header */}


        {/* Body */}
        <div className="p-3 space-y-4">

          {/* Warning */}
          <div className="cancel_order_message" >
            This order will be permanently canceled. The table will become free.
          </div>

          {/* Reason buttons */}
          <div className="order_cancel_tabs">
            <label> Cancel Reason <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {CANCEL_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedReason(r)}
                  className="ordesr_cancel_btn"
                  style={selectedReason === r
                    ? { background: "rgba(239,68,68,0.25)", border: "1px solid rgba(248,113,113,0.5)", color: "#fca5a5" }
                    : {}
                  }
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Custom reason — sirf "Other" select karne pe */}
          {selectedReason === "Other" && (
            <div>
              <label className="order_paira mb-1 block">
                Reason likhо *
              </label>
              <textarea
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Cancel ki wajah likhо..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl text-sm text-dark placeholder-white/30 bg-white/10 border border-white/20 focus:outline-none focus:border-red-400/50 transition-all resize-none"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex justify-between gap-3 modal_footer px-3 py-3">
          <button
            onClick={handleClose}
            className="cancel_btn">
            ✕ Back
          </button>

          <button
            onClick={handleCancel}
            disabled={loading || !reason.trim()}
            className="px-6 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #dc2626, #b91c1c)",
              color: "#fff",
              boxShadow: "0 4px 20px rgba(220,38,38,0.4)",
            }}
          >
            {loading ? "Cancelling..." : "🚫 Confirm Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}