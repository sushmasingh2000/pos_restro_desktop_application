import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { apiConnectorGet, apiConnectorPost } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import toast from "react-hot-toast";

// Manual wastage — inventory item kharab ho gaya (fungus / seal gaya) to
// quantity daal ke stock se ghata do, Wastage Report me bhi dikhega.
const formatQty = (value, upp, unitLabel) => {
  const qty = parseFloat(value) || 0;
  if (upp > 1) {
    const wholePackets = Math.floor(qty / upp);
    const loosePieces = Math.round(qty - wholePackets * upp);
    return `${wholePackets} packets + ${loosePieces} pieces`;
  }
  return `${qty} ${unitLabel || ""}`;
};

const AddWastageModal = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState("");
  const [packetsQty, setPacketsQty] = useState("");
  const [piecesQty, setPiecesQty] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      setProductId("");
      setPacketsQty("");
      setPiecesQty("");
      setReason("");
    }
  }, [isOpen]);

  const { data } = useQuery(
    ["panel_products"],
    () => apiConnectorGet(endpoint.product_get_api),
    { refetchOnWindowFocus: false, enabled: isOpen }
  );
  const products = data?.data?.result || [];

  const addWastageMutation = useMutation(
    (body) => apiConnectorPost(endpoint.wastage_add_manual_api, body),
    {
      onSuccess: (res) => {
        if (res?.data?.success) {
          toast.success(res.data.message || "Wastage added");
          queryClient.invalidateQueries(["wastage_report"]);
          queryClient.invalidateQueries(["panel_products"]);
          onClose();
        } else {
          toast.error(res?.data?.message || "Failed to add wastage");
        }
      },
      onError: () => toast.error("Server error, please try again"),
    }
  );

  if (!isOpen) return null;

  const product = products.find((p) => String(p.dg011_inventory_id) === String(productId));
  const upp = parseFloat(product?.dg011_units_per_pack) || 1;
  const isSliceWise = upp > 1;
  const currentStock = parseFloat(product?.dg011_current_stock) || 0;
  const wasteQty = isSliceWise
    ? (Number(packetsQty) || 0) * upp + (Number(piecesQty) || 0)
    : Number(packetsQty) || 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!product) return toast.error("Select a product!");
    if (wasteQty <= 0) return toast.error("Enter a valid quantity!");

    addWastageMutation.mutate({
      product_id: product.dg011_inventory_id,
      quantity: wasteQty,
      reason,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="Order_Details_modal" style={{ maxWidth: 420 }}>
        <div className="Order_Details_modal_header">
          <div className="flex items-center gap-3">
            <div className="modal_header_icon">🗑️</div>
            <div>
              <h2>Add Wastage</h2>
              <p>Kharab hua stock inventory se ghatayein</p>
            </div>
          </div>
          <button onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-3 pt-2">
            <div className="main_input">
              <label>
                Product <span className="text-red-500">*</span>
              </label>
              <select
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);
                  setPacketsQty("");
                  setPiecesQty("");
                }}
              >
                <option value="">-- Select Product --</option>
                {products.map((p) => (
                  <option key={p.dg011_inventory_id} value={p.dg011_inventory_id}>
                    {p.dg011_name}
                  </option>
                ))}
              </select>
            </div>

            {product && (
              <>
                <div className="main_input">
                  <label>Current Stock</label>
                  <input value={formatQty(currentStock, upp, product.dg011_unit)} disabled />
                </div>

                {isSliceWise ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="main_input">
                      <label>Packets Wasted</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Packets"
                        value={packetsQty}
                        onChange={(e) => setPacketsQty(e.target.value)}
                      />
                    </div>
                    <div className="main_input">
                      <label>Loose Pieces Wasted</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Pieces"
                        value={piecesQty}
                        onChange={(e) => setPiecesQty(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="main_input">
                    <label>
                      Quantity Wasted ({product.dg011_unit || "Units"}) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder={`Enter ${(product.dg011_unit || "units").toLowerCase()} wasted`}
                      value={packetsQty}
                      onChange={(e) => setPacketsQty(e.target.value)}
                    />
                  </div>
                )}

                {wasteQty > 0 && (
                  <p style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                    New stock will be: <b>{formatQty(currentStock - wasteQty, upp, product.dg011_unit)}</b>
                  </p>
                )}
              </>
            )}

            <div className="main_input">
              <label>Reason</label>
              <input
                placeholder="e.g. Fungus, seal gaya, expired"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-between gap-3 modal_footer px-3 py-3">
            <button type="button" onClick={onClose} className="cancel_btn">
              ✕ Cancel
            </button>
            <button type="submit" className="update_btn" disabled={addWastageMutation.isLoading}>
              {addWastageMutation.isLoading ? "Saving..." : "✓ Add Wastage"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddWastageModal;
