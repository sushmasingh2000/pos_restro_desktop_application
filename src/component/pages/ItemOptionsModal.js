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
        alert(`"${group.dg030_display_name}" mein kam se kam ${group.dg030_min_selectable} option select karo!`);
        return;
      }
    }
    onConfirm(item, extraPrice, selections);
    setSelections({});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(15,0,26,0.97), rgba(10,0,18,0.97))",
          border: "1px solid rgba(255,255,255,0.12)",
        }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white/10 border-b border-white/10">
          <div>
            <h2 className="text-base font-bold text-white">Customize Order</h2>
            <p className="text-xs text-purple-300 mt-0.5">{item.dg09_name}</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white text-xl">×</button>
        </div>

        {/* Groups */}
        <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: "55vh" }}>
          {groups.map((group) => (
            <div key={group.dg030_group_id} className="mb-5">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-semibold text-white">{group.dg030_display_name}</p>
                <span className="text-xs text-white/40">
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
                        background: selected ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.15)",
                        border: selected ? "1px solid rgba(167,139,250,0.6)" : "1px solid rgba(255,255,255,0.4)",
                        color: "white",  // ← yeh fix karo
                      }}>
                      {opt.dg029_display_name}   {/* ← dg029 wala naam */}
                      {parseFloat(opt.dg029_amount) > 0 && (
                        <span className="ml-1 text-green-300">+₹{opt.dg029_amount}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-white/10">
          <div className="text-white text-sm">
            Base: ₹{item.dg09_price}
            {extraPrice > 0 && <span className="text-green-300 ml-2">+₹{extraPrice}</span>}
            <span className="font-bold ml-2">
              = ₹{(parseFloat(item.dg09_price) + extraPrice).toFixed(2)}
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm bg-white/10 border border-white/20 text-white">
              Cancel
            </button>
            <button onClick={handleConfirm}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(139,92,246,0.4)", border: "1px solid rgba(167,139,250,0.4)", color: "white" }}>
              Add to Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}