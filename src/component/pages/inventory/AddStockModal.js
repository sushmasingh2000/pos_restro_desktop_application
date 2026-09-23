import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "react-query";
import { apiConnectorPost } from "../../../utils/APIConnector";
import { endpoint } from "../../../utils/APIRoutes";
import toast from "react-hot-toast";

// Panel-side stock top up — same behaviour as admin's AddStockModal, but
// this is the ONLY inventory action exposed here. Panel users can add
// stock; they cannot create/edit/delete inventory products (that stays
// admin-only).
const formatQty = (value, upp, unitLabel) => {
  const qty = parseFloat(value) || 0;
  if (upp > 1) {
    const wholePackets = Math.floor(qty / upp);
    const loosePieces = Math.round(qty - wholePackets * upp);
    return `${wholePackets} packets + ${loosePieces} pieces`;
  }
  return `${qty} ${unitLabel || ""}`;
};

const AddStockModal = ({ isOpen, onClose, product }) => {
  const queryClient = useQueryClient();
  const [packetsQty, setPacketsQty] = useState("");
  const [piecesQty, setPiecesQty] = useState("");

  useEffect(() => {
    setPacketsQty("");
    setPiecesQty("");
  }, [product]);

  const addStockMutation = useMutation(
    (data) => apiConnectorPost(endpoint.product_add_stock_api, data),
    {
      onSuccess: (res) => {
        if (res?.data?.success) {
          toast.success("Stock added successfully");
          queryClient.invalidateQueries(["panel_products"]);
          onClose();
        } else {
          toast.error(res?.data?.message || "Failed to add stock");
        }
      },
      onError: () => toast.error("Server error, please try again"),
    }
  );

  if (!isOpen || !product) return null;

  const upp = parseFloat(product.dg011_units_per_pack) || 1;
  const isSliceWise = upp > 1;

  const currentStock = parseFloat(product.dg011_current_stock) || 0;
  const enteredPackets = Number(packetsQty) || 0;
  const enteredPieces = Number(piecesQty) || 0;
  const stockToAdd = isSliceWise
    ? enteredPackets * upp + enteredPieces
    : enteredPackets;
  const newStock = currentStock + stockToAdd;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (stockToAdd <= 0) {
      return toast.error("Enter a valid quantity to add!");
    }

    addStockMutation.mutate({
      product_id: product.dg011_inventory_id,
      quantity: stockToAdd,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="Order_Details_modal" style={{ maxWidth: 420 }}>
        <div className="Order_Details_modal_header">
          <div className="flex items-center gap-3">
            <div className="modal_header_icon">📦</div>
            <div>
              <h2>Add Stock</h2>
              <p>{product.dg011_name}</p>
            </div>
          </div>
          <button onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-3 pt-2">
            <div className="main_input">
              <label>Current Stock</label>
              <input
                value={formatQty(currentStock, upp, product.dg011_unit)}
                disabled
              />
            </div>

            {isSliceWise ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="main_input">
                  <label>Packets to Add</label>
                  <input
                    type="number"
                    min="0"
                    autoFocus
                    placeholder="Enter packets received"
                    value={packetsQty}
                    onChange={(e) => setPacketsQty(e.target.value)}
                  />
                </div>
                <div className="main_input">
                  <label>Loose Pieces to Add</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter loose pieces"
                    value={piecesQty}
                    onChange={(e) => setPiecesQty(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="main_input">
                <label>
                  Quantity to Add ({product.dg011_unit || "Units"}) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  autoFocus
                  placeholder={`Enter ${(product.dg011_unit || "units").toLowerCase()} received`}
                  value={packetsQty}
                  onChange={(e) => setPacketsQty(e.target.value)}
                />
              </div>
            )}

            {stockToAdd > 0 && (
              <p style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                New stock will be: <b>{formatQty(newStock, upp, product.dg011_unit)}</b>
              </p>
            )}
          </div>

          <div className="flex justify-between gap-3 modal_footer px-3 py-3">
            <button type="button" onClick={onClose} className="cancel_btn">
              ✕ Cancel
            </button>
            <button type="submit" className="update_btn">
              ✓ Add Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStockModal;
