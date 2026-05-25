
import { Edit, Person } from "@mui/icons-material";
import React, { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { apiConnectorPost } from "../../../utils/APIConnector";
import { endpoint } from "../../../utils/APIRoutes";
import { useQuery, useQueryClient } from "react-query";
import { useEffect } from "react";
import toast from "react-hot-toast";
import BillModal from "./Bill"; //  BillModal import
import CancelOrderModal from "./Cancel";
import AddQtyRemarkModal from "./AddQtyRemark";

const POS = () => {
  const location = useLocation();
  const { type } = useParams();
  const table = location.state?.table;
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [orderItems, setOrderItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [address, setAddress] = useState("");
  const [modifyMode, setModifyMode] = useState(false);
  const [tableNameMap, setTableNameMap] = useState({});

  const [showQtyModal, setShowQtyModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  //  BillModal state
  const [showBillModal, setShowBillModal] = useState(false);
  const [savedOrderId, setSavedOrderId] = useState(null);

  const [existingBillId, setExistingBillId] = useState(null);
  const [existingBillNo, setExistingBillNo] = useState(null);


  const navigate = useNavigate();
  const client = useQueryClient();

  // ── Fetch tables ──────────────────────────────────────────
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const res = await apiConnectorPost(endpoint.table_branch_api);
        const tables = res?.data?.result || [];
        const map = {};
        tables.forEach((t) => {
          map[t.dg05_table_id] = t.dg05_table_name;
        });
        setTableNameMap(map);
      } catch (err) {
        console.error("Error fetching tables:", err);
      }
    };
    fetchTables();
  }, []);

  const currentDateTime = new Date().toLocaleString();

  // ── Fetch menu ────────────────────────────────────────────
  const { data } = useQuery(
    ["getMenuByBranch"],
    () => apiConnectorPost(endpoint.menu_branch_api),
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  const categories = data?.data?.result?.categories || [];
  const itemsData = data?.data?.result?.menus || [];

  const filteredItems = React.useMemo(() => {
    if (!itemsData || itemsData.length === 0) return [];
    if (selectedCategory === "All") return itemsData;
    const category = categories.find(
      (cat) => cat.dg08_category_name === selectedCategory
    );
    if (!category) return [];
    return itemsData.filter(
      (item) => item.dg09_category_id === category.dg08_category_id
    );
  }, [selectedCategory, itemsData, categories]);

  // ── Fetch existing order (dine-in) ────────────────────────
  const { data: orderData } = useQuery(
    ["getOrdersByTable", table],
    () =>
      apiConnectorPost(endpoint.get_orders_by_table_api, {
        tableId: table,
      }),
    {
      enabled: !!table && type === "dine-in",
    }
  );

  useEffect(() => {
    const firstOrder = orderData?.data?.result?.orders?.[0];
    if (!firstOrder) return;

    // orderId set karo
    if (firstOrder.dg06_order_id) {
      setSavedOrderId(firstOrder.dg06_order_id);
    }

    if (firstOrder.dg06_bill_id) {
      setExistingBillId(firstOrder.dg06_bill_id);
      setExistingBillNo(firstOrder.dg06_bill_no);
    }

    // Items load karo
    if (firstOrder.items && firstOrder.items.length > 0) {
      const formatted = firstOrder.items.map((item) => ({
        id: item.dg07_menu_id,
        dg09_name: item.dg07_menu_name_snapshot,
        qty: item.dg07_quantity,
        price: parseFloat(item.dg07_price),
        qtyRemark: item.dg07_item_remark || "",
        globalRemark: item.dg07_global_remark || "",
        predefinedRemarks: item.dg07_predefined_remark
          ? item.dg07_predefined_remark.split(", ").filter(Boolean)
          : [],
      }));
      setOrderItems(formatted);
    }
  }, [orderData]);

  const addToOrder = (item) => {
    const existing = orderItems.find((i) => i.id === item.dg09_menu_id);
    if (existing) {
      setOrderItems(
        orderItems.map((i) =>
          i.id === item.dg09_menu_id ? { ...i, qty: i.qty + 1 } : i
        )
      );
    } else {
      setOrderItems([
        ...orderItems,
        {
          ...item,
          qty: 1,
          id: item.dg09_menu_id,
          price: parseFloat(item.dg09_price),
        },
      ]);
    }
  };

  const totalAmount = orderItems.reduce(
    (acc, item) => acc + item.price * item.qty,
    0
  );

  const updateQty = (id, qty) => {
    if (qty < 1) return;
    setOrderItems(
      orderItems.map((i) => (i.id === id ? { ...i, qty: qty } : i))
    );
  };

  const removeItem = (id) => {
    setOrderItems(orderItems.filter((i) => i.id !== id));
  };

  const getOrderTypeEnum = () => {
    if (type === "dine-in") return "dine_in";
    if (type === "take-away") return "takeaway";
    if (type === "delivery") return "delivery";
    return "";
  };

  const getTableId = () => {
    if (type === "dine-in") return table;
    if (type === "take-away") return 10001;
    if (type === "delivery") return 10002;
    return null;
  };

  // ── Save KOT ──────────────────────────────────────────────
  const handleSaveKOT = async () => {
    if (!orderItems.length) {
      toast.error("Please add items first");
      return;
    }

    if (type === "delivery" && !address.trim()) {
      toast.error("Delivery address is required");
      return;
    }

    try {
      const res = await apiConnectorPost(endpoint.add_update_order_api, {
        tableId: getTableId(),
        customerName: type === "delivery" ? address : "",
        paymentMethod: "", //  payment method ab bill modal mein hoga
        orderType: getOrderTypeEnum(),
        items: orderItems.map((item) => ({
          menu_id: item.id,
          menu_name: item.dg09_name,
          quantity: item.qty,
          price: item.price,
          qtyRemark: item.qtyRemark || "",
          globalRemark: item.globalRemark || "",
          predefinedRemarks: item.predefinedRemarks || [],
        }))
      });

      if (res?.data?.success) {
        const orderId = res?.data?.order?.orderId;

        //  orderId save karo — bill modal ke liye
        setSavedOrderId(orderId);

        // KOT generate
        await apiConnectorPost(endpoint.generate_kot_api, {
          orderId: orderId,
        });

        // Table busy mark karo (dine-in)
        if (type === "dine-in") {
          await apiConnectorPost(endpoint.update_table_status_api, {
            tableId: table,
            status: "Busy",
            busySince: new Date().toISOString(),
          });
        }

        toast.success("KOT sent to Kitchen ");
        client.refetchQueries("get_table");

      } else {
        toast.error(res?.data?.message || "Failed to save KOT");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save KOT");
    }
  };

  // ── Open Bill Modal ───────────────────────────────────────
  const handleOpenBill = () => {
    if (!orderItems.length) {
      toast.error("Please add items first");
      return;
    }
    if (!savedOrderId) {
      toast.error("Please save KOT first");
      return;
    }
    setShowBillModal(true);
  };

  // ── After Bill Done ───────────────────────────────────────
  const handleBillDone = () => {
    setOrderItems([]);
    setSavedOrderId(null);
    setExistingBillId(null);   //  reset
    setExistingBillNo(null);   //  reset
    client.refetchQueries("get_table");
    setTimeout(() => navigate("/userdashboard"), 500);
  };

  // ── UI ────────────────────────────────────────────────────
  return (
    <div className="h-screen flex overflow-hidden bg-black/20 backdrop-blur-2xl border-r border-white/10 text-white shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
      {/* LEFT — CATEGORIES */}
      <div className="w-[15%] h-full overflow-y-auto p-3 space-y-2 border-r border-white/10 backdrop-blur-xl">
        <div
          className="p-3 rounded-xl text-center cursor-pointer bg-white/10 hover:bg-white/20 border border-white/10"
          onClick={() => setSelectedCategory("All")}
        >
          All
        </div>
        {categories.map((cat) => (
          <div
            key={cat.dg08_category_id}
            onClick={() => setSelectedCategory(cat.dg08_category_name)}
            className={`p-3 rounded-xl text-center cursor-pointer transition border backdrop-blur-md
                            ${selectedCategory === cat.dg08_category_name
                ? "bg-purple-500/30 border-purple-400 text-white"
                : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
          >
            {cat.dg08_category_name}
          </div>
        ))}
      </div>

      {/* CENTER — MENU ITEMS */}
      <div className="w-3/5 h-full overflow-y-auto p-4 grid grid-cols-3 gap-3 content-start">
        {filteredItems.map((item) => (
          <div
            key={item.dg09_menu_id}
            onClick={() => addToOrder(item)}
            className="relative cursor-pointer group bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:scale-105 transition"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl opacity-100 group-hover:opacity-100 transition" />
            <h3 className="text-sm font-medium relative z-10">
              {item.dg09_name}
            </h3>
            <p className="text-purple-300 font-bold mt-2 relative z-10">
              ₹{item.dg09_price}
            </p>
          </div>
        ))}
      </div>

      {/* RIGHT — BILL PANEL */}
      <div className="w-2/6 bg-white/10 backdrop-blur-xl border-l border-white/10 p-4 flex flex-col">
        {/* TOP BAR */}
        <div className="flex flex-wrap justify-start gap-2 items-center mb-3">
          <button className="px-3 py-1 rounded-full bg-purple-500/30 border border-purple-400 text-sm">
            {getOrderTypeEnum() === "dine_in"
              ? "Dine In"
              : getOrderTypeEnum() === "takeaway"
                ? "TakeAway"
                : getOrderTypeEnum() === "delivery"
                  ? "Door Delivery"
                  : "-"}
          </button>

          <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-sm">
            {type === "dine-in"
              ? tableNameMap[table] || table
              : type === "take-away"
                ? "Table: 1001"
                : type === "delivery"
                  ? "Table: 1002"
                  : "N/A"}
          </span>
          {type === "delivery" &&
            <div
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 cursor-pointer bg-white/10 px-3 py-1 rounded-full"
            >
              <Person className="!text-white" />
            </div>
          }

          <span className="text-xs text-white/60 ml-auto">
            {currentDateTime}
          </span>
        </div>

        {/* ORDER TABLE */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/10 text-white">
              <tr>
                <th className="p-2 text-left">Item</th>
                <th className="p-2">Qty</th>
                <th className="p-2">Price</th>
                <th className="p-2">Total</th>
                <th className="p-2">Required</th>
                {modifyMode && <th className="p-2">X</th>}
              </tr>
            </thead>
            <tbody>
              {orderItems.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-white/40 p-4">
                    No items
                  </td>
                </tr>
              )}
              {orderItems.map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="p-2">{item.dg09_name}</td>
                  <td className="p-2 text-center">
                    {modifyMode ? (
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateQty(item.id, +e.target.value)}
                        className="w-14 text-center bg-white/10 border border-white/10 rounded"
                      />
                    ) : (
                      item.qty
                    )}
                  </td>
                  <td className="p-2 text-center">₹{item.price}</td>
                  <td className="p-2 text-center">₹{item.price * item.qty}</td>
                  <td className="p-2 text-center cursor-pointer"
                    key={item.id} >
                    <Edit onClick={() => { setSelectedItem(item); setShowQtyModal(true); }} /></td>
                  {modifyMode && (
                    <td className="p-2 text-center">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-400"
                      >
                        ✕
                      </button>

                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOTAL */}
        <div className="flex justify-between">
          {modifyMode && savedOrderId &&
            <div className="">
              <button className="bg-red-600 text-white p-2 rounded-lg" onClick={() => setShowCancelModal(true)}>
                Cancel Order
              </button>
            </div>
          }
          <div className="mt-2 text-right font-semibold text-purple-300">
            Total: ₹{totalAmount}
          </div>
        </div>

        {/*  KOT saved indicator */}
        {savedOrderId && (
          <div className="mt-1 text-center text-xs text-green-400/80 bg-green-500/10 border border-green-500/20 rounded-lg py-1">
            KOT Saved — Order #{savedOrderId}
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="mt-3 flex flex-col gap-2">
          {/* Save KOT */}
          <button
            onClick={handleSaveKOT}
            className="bg-purple-600 hover:bg-purple-700 py-2 rounded-xl transition"
          >
            {savedOrderId ? "Update KOT" : "Save KOT"}
          </button>

          {/*  View / Print Bill — BillModal khulega */}
          <button
            onClick={handleOpenBill}
            className={`py-2 rounded-xl transition border font-semibold
                            ${savedOrderId
                ? "bg-green-600/30 border-green-400/50 text-green-300 hover:bg-green-600/50"
                : "bg-white/10 border-white/10 text-white/40 cursor-not-allowed"
              }`}
          >
            🖨 View / Print Bill
          </button>

          {/* Modify */}
          <button
            onClick={() => setModifyMode(!modifyMode)}
            className="bg-white/10 py-2 rounded-xl transition hover:bg-white/20"
          >
            {modifyMode ? " Done" : "✏️ Modify"}
          </button>
        </div>
      </div>

      <AddQtyRemarkModal
        isOpen={showQtyModal}
        onClose={() => setShowQtyModal(false)}
        item={selectedItem}
        orderItems={orderItems}
        onUpdate={setOrderItems}
      />

      {/*  BILL MODAL */}
      <BillModal
        isOpen={showBillModal}
        onClose={() => setShowBillModal(false)}
        orderItems={orderItems}
        orderId={savedOrderId}
        tableId={table}
        orderType={getOrderTypeEnum()}
        tableNameMap={tableNameMap}
        onBillDone={handleBillDone}
        existingBillId={existingBillId}   //  NEW
        existingBillNo={existingBillNo}   //  NEW
      />

      <CancelOrderModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        orderId={savedOrderId}
        onCancelled={() => {
          setOrderItems([]);
          setSavedOrderId(null);
          navigate("/userdashboard");
        }}
      />

      {/* Address Modal (delivery) */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl p-5 w-80 shadow-lg">
            <h2 className="text-lg font-semibold mb-3 text-gray-700">
              Enter Address
            </h2>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter delivery address..."
              className="w-full border p-2 rounded mb-4 focus:ring-2 text-black focus:ring-purple-400"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1 bg-purple-600 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;