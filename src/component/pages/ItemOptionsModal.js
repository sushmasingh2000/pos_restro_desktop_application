import { useState } from "react";

export default function ItemOptionsModal({ isOpen, onClose, item, onConfirm }) {
  const [selections, setSelections] = useState({});

  if (!isOpen || !item) return null;

  const groups = item.optionGroups || [];

  const handleSelect = (groupId, option, maxSelect) => {
    setSelections((prev) => {
      const current = prev[groupId] || [];
      const exists = current.find((o) => o.dg029_option_id === option.dg029_option_id); // ← fix

      if (exists) {
        return { ...prev, [groupId]: current.filter((o) => o.dg029_option_id !== option.dg029_option_id) }; // ← fix
      } else {
        if (maxSelect === 1) {
          return { ...prev, [groupId]: [option] };
        }
        if (current.length >= maxSelect) return prev;
        return { ...prev, [groupId]: [...current, option] };
      }
    });
  };

  const extraPrice = Object.values(selections)
    .flat()
    .reduce((acc, o) => acc + parseFloat(o.dg029_amount || 0), 0); // ← dg029

  const handleConfirm = () => {
    // Validation — min check
    for (const group of groups) {
      const selected = selections[group.dg030_group_id] || [];
      if (selected.length < group.dg030_min_selectable) {
        alert(`"${group.dg030_display_name}" at Least ${group.dg030_min_selectable} Please Select option !`);
        return;
      }
    }
    onConfirm(item, extraPrice, selections);
    setSelections({});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "#0e2a47b5" }}>
      <div className="Order_Details_modal">

        {/* Header */}
        <div className="Order_Details_modal_header">
          <div>
            <h2>Customize Order</h2>
            <p>{item.dg09_name}</p>
          </div>
          <button onClick={onClose} >×</button>
        </div>

        {/* Groups */}
        <div className="px-3 py-4 overflow-y-auto" style={{ maxHeight: "55vh" }}>
          {groups.map((group) => (
            <div key={group.dg030_group_id} className="">
              <div className="flex justify-between items-center ">
                <p className="text-sm font-semibold text-dark">{group.dg030_display_name}</p>
                <span className="text-xs text-dark">
                  Min: {group.dg030_min_selectable} | Max: {group.dg030_max_selectable}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(group.options || []).map((opt) => {
                  const selected = (selections[group.dg030_group_id] || [])
                    .find((o) => o.dg029_option_id === opt.dg029_option_id);
                  return (
                    <button
                      key={opt.dg029_option_id}
                      onClick={() => handleSelect(group.dg030_group_id, opt, group.dg030_max_selectable)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition"
                      style={{
                        background: selected ? "#1d4ed8" : "#fff",
                        border: selected ? "1px solid rgba(167,139,250,0.6)" : "1px solid rgba(255,255,255,0.4)",
                        color: "#334155",  // ← yeh fix karo
                      }}>
                      {opt.dg029_display_name}   {/* ← dg029 wala naam */}
                      {parseFloat(opt.dg029_amount) > 0 && (
                        <span className="ml-1" style={{ color: "#1ca22e" }}>+₹{opt.dg029_amount}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="base_price px-3 mb-3">
          Base: ₹{item.dg09_price}
          {extraPrice > 0 && <span className="text-green ml-2">+₹{extraPrice}</span>}
          <span className="font-bold ml-2">
            = ₹{(parseFloat(item.dg09_price) + extraPrice).toFixed(2)}
          </span>
        </div>
        {/* Footer */}
        <div className="flex justify-between gap-3 modal_footer px-3 py-3">
          <button onClick={onClose}
            className="cancel_btn">
            Cancel
          </button>
          <button onClick={handleConfirm}
            className="update_btn" >
            Add to Order
          </button>
        </div>
      </div>
    </div>
  );
}