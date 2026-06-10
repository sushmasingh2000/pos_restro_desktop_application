import React, { useState, useEffect } from "react";

const PREDEFINED_REMARKS = [
  "Less Spicy",
  "Extra Spicy",
  "No Onion",
  "No Garlic",
  "Extra Sauce",
  "Well Done",
  "Medium Rare",
  "No Ice",
  "Sugar Free",
  "Extra Cheese",
];

const AddQtyRemarkModal = ({ isOpen, onClose, item, orderItems, onUpdate }) => {
  const [qty, setQty] = useState(1);
  const [qtyRemark, setQtyRemark] = useState("");
  const [globalRemark, setGlobalRemark] = useState("");
  const [selectedPredefined, setSelectedPredefined] = useState([]);

  useEffect(() => {
    if (item) {
      setQty(item.qty || 1);
      setQtyRemark(item.qtyRemark || "");
      setGlobalRemark(item.globalRemark || "");
      setSelectedPredefined(item.predefinedRemarks || []);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const togglePredefined = (remark) => {
    setSelectedPredefined((prev) =>
      prev.includes(remark)
        ? prev.filter((r) => r !== remark)
        : [...prev, remark]
    );
  };

  const handleAddToCart = () => {
    const combinedRemark = [...selectedPredefined, qtyRemark]
      .filter(Boolean)
      .join(", ");

    const updated = orderItems.map((i) =>
      i.id === item.id
        ? {
            ...i,
            qty: Math.max(1, qty),
            qtyRemark,
            globalRemark,
            predefinedRemarks: selectedPredefined,
            remark: combinedRemark,
          }
        : { ...i, globalRemark }
    );

    onUpdate(updated);
    onClose();
  };

  const inputStyle =
    `w-full bg-white/10 border border-white/20 rounded-xl p-3
    text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 -mt-36
       backdrop-blur" style={{background: "#0e2a47b5"}}>

      <div className="Order_Details_modal">
         {/* HEADER */}
        <div className="Order_Details_modal_header">
          <div className="flex items-center gap-3">
              <div className="modal_header_icon">🚚</div>
              <div>
              <h2>{item.dg09_name}</h2>
              <p> ₹{item.price} • Qty: {item.qty}</p>
            </div>
          </div>
          <button onClick={onClose}>×</button>
        </div>

       

        {/* BODY */}
        <div className="order_add_remove">

          {/* QTY */}
          <div className="order_quantity_box">
            <label>Quantity</label>
            <div className="flex items-center">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))}>-</button>
              <input type="text" value={qty} onChange={(e) => setQty(Math.max(1, +e.target.value))}/>
              <button onClick={() => setQty((q) => q + 1)}>+</button>
            </div>
          </div>

          {/* QTY REMARK */}
          <div className="Item_Remark">
            <label>Item Remark</label>
            <input
              value={qtyRemark}
              onChange={(e) => setQtyRemark(e.target.value)}
              placeholder="e.g. less spicy"
            />
          </div>
        </div>

          {/* GLOBAL REMARK */}
          <div className="main_input mx-3">
            <label>Global Remark <span className="text-red-500">*</span></label>
            <textarea
              value={globalRemark}
              onChange={(e) => setGlobalRemark(e.target.value)}
              rows={2}
              placeholder="Apply to all items..."
            />
          </div>

          {/* PREDEFINED */}
          <div className="order_cancel_tabs m-3">
            <p className="order_paira mb-2">Quick Options</p>
            <div className="flex flex-wrap gap-2">
              {PREDEFINED_REMARKS.map((r) => (
                <button
                  key={r}
                  onClick={() => togglePredefined(r)}
                  className={`ordesr_cancel_btn
                    ${
                      selectedPredefined.includes(r)
                        ? "active_color"
                        : ""
                    }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* SUMMARY */}
          {(selectedPredefined.length > 0 || qtyRemark) && (
            <div className="bg-white/10 border border-white/20 rounded-xl p-3 mx-3 my-2 text-xs text-dark">
              Remark: {[...selectedPredefined, qtyRemark].filter(Boolean).join(", ")}
            </div>
          )}

        {/* FOOTER */}
        <div className="flex justify-between gap-3 modal_footer px-3 py-3">
          <button onClick={onClose} className="cancel_btn">
           ✕ Cancel
          </button>

          <button onClick={handleAddToCart} className="update_btn">
           ✓  Add To Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddQtyRemarkModal;