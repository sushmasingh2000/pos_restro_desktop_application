// ─────────────────────────────────────────
//  GlassUI.jsx — Shared Glass Components
//  Style: matches InventoryCategory.jsx
// ─────────────────────────────────────────

export const GlassInput = ({ label, ...props }) => (
  <div className="main_input">
    {label && (
      <label>{label} <span className="text-red-500">*</span></label>
    )}
    <input
      {...props} />
  </div>
);

export const GlassSelect = ({ label, children, ...props }) => (
  <div className="main_input">
    {label && (
      <label>
        {label} <span className="text-red-500">*</span>
      </label>
    )}
    <select
      {...props}
      
    >
      {children}
    </select>
  </div>
);

export const GlassTextarea = ({ label, ...props }) => (
  <div className="main_input">
    {label && (
      <label>
        {label} <span className="text-red-500">*</span>
      </label>
    )}
    <textarea
      {...props}
      
    />
  </div>
);

export const GlassButton = ({ children, variant = "default", className = "", ...props }) => {
  const base = "";
  const variants = {
    default:  "main_btn",
    primary:  "main_btn",
    danger:   "main_btn",
    success:  "main_btn",
    info:     "update_btn",
  };
  return (
    <button {...props} className={`${base} ${variants[variant] || variants.default} ${className}`}>
      {children}
    </button>
  );
};

export const StatusBadge = ({ status }) => {
  const isPaid = status === "Paid";
  return (
    <span className={` ${
      isPaid
        ? "green_bg"
        : "yellow_bg"
    }`}>
      {status}
    </span>
  );
};

export const SummaryCard = ({ label, amount, colorClass }) => (
  <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-5 shadow-2xl">
    <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">{label}</p>
    <p className={`text-xl font-bold ${colorClass}`}>
      ₹{parseFloat(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
    </p>
  </div>
);

export const GlassModal = ({ show, onClose, title, width = "max-w-3xl", children }) => {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 mt-10
      bg-black/70 backdrop-blur-md"

      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`Order_Details_modal w-full ${width}`}>
        {/* HEADER */}
         <div className="Order_Details_modal_header">
          <div className="flex items-center gap-3">
              <div className="modal_header_icon">🗂️</div>
              <div>
              <h2>{title}</h2>
            </div>
          </div>
          <button onClick={onClose}>×</button>
        </div>

        
        {/* Body */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: "78vh" }}>
          {children}
        </div>
      </div>
    </div>
  );
};