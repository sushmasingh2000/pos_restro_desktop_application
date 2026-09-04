
import { Edit, Person } from "@mui/icons-material";
import React, { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { apiConnectorGet, apiConnectorPost } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import { useQuery, useQueryClient } from "react-query";
import { useEffect } from "react";
import toast from "react-hot-toast";
import CancelOrderModal from "./Cancel";
import AddQtyRemarkModal from "./AddQtyRemark";
import KOTPrintSlip from "./KOTPrintSlip";
import PosTab from "../Layout/PosTab";
import { Col } from "react-bootstrap";
import Row from 'react-bootstrap/Row';
import ItemOptionsModal from "./ItemOptionsModal";
import { domain } from "../../domain";

function formatReceiptDateTime() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}, ${hh}:${min}:${ss}`;
}

const POS = () => {
  const location = useLocation();
  const { type } = useParams();
  const table = location.state?.table;
  const clickReady = React.useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [optionItem, setOptionItem] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [orderItems, setOrderItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [address, setAddress] = useState("");
  const [modifyMode, setModifyMode] = useState(false);
  const [tableNameMap, setTableNameMap] = useState({});
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [savedOrderId, setSavedOrderId] = useState(null);
  const [existingBillId, setExistingBillId] = useState(null);
  const [existingBillNo, setExistingBillNo] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [activeOrderIndex, setActiveOrderIndex] = useState(0);
  const [kotPrintData, setKotPrintData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [previousItems, setPreviousItems] = useState([]);
  const [currentOrderStatus, setCurrentOrderStatus] = useState("");



  const navigate = useNavigate();
  const client = useQueryClient();

  // Ghost-click guard: ignore menu clicks for 500ms after page mounts
  useEffect(() => {
    clickReady.current = false;
    const t = setTimeout(() => { clickReady.current = true; }, 800);
    return () => clearTimeout(t);
  }, []);

  // ── Fetch tables ──────────────────────────────────────────
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const res = await apiConnectorPost(endpoint.table_branch_api);
        const tables = res?.data?.result || [];
        const map = {};
        tables.forEach((t) => { map[t.dg05_table_id] = t.dg05_table_name; });
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
    { refetchOnMount: false, refetchOnWindowFocus: false, retry: false }
  );
  const currentOrder = allOrders[activeOrderIndex];

  const categories = data?.data?.result?.categories || [];
  const itemsData = data?.data?.result?.menus || [];

  // ── Active item-specific offers (e.g. "Cappuccino @ ₹79 today") ──
  // Automatic — no coupon code needed. Backend already filters by
  // day/date/time and business+branch, so whatever comes back here is
  // valid right now for this outlet.
  const { data: offersData } = useQuery(
    ["activeOffers"],
    () => apiConnectorGet(endpoint.active_offers_api),
    { refetchOnWindowFocus: false, retry: false, staleTime: 5 * 60 * 1000 }
  );
  const offerByMenuId = React.useMemo(() => {
    const offers = offersData?.data?.result || [];
    const map = {};
    const categoryOffers = [];
    const ownPrice = (menuId) => {
      const item = itemsData.find((m) => m.dg09_menu_id === menuId);
      if (!item) return null;
      return item.dg09_tax_group_id
        ? parseFloat(item.dg09_amount_after_tax)
        : parseFloat(item.dg09_price);
    };
    offers.forEach((o) => {
      if (!o.dg037_menu_id && !o.dg037_category_id) return;
      const amount = parseFloat(o.dg037_offer_price || 0);
      const pct = parseFloat(o.dg037_offer_price_pct || 0);
      if (o.dg037_offer_type === "ItemPrice" && o.dg037_menu_id) {
        map[o.dg037_menu_id] = { price: amount, name: o.dg037_offer_name };
      } else if (o.dg037_offer_type === "ItemFlatDiscount" && o.dg037_menu_id) {
        const base = ownPrice(o.dg037_menu_id);
        if (base != null) map[o.dg037_menu_id] = { price: Math.max(base - amount, 0), name: o.dg037_offer_name };
      } else if (o.dg037_offer_type === "ItemPercentDiscount" && o.dg037_menu_id) {
        const base = ownPrice(o.dg037_menu_id);
        if (base != null) map[o.dg037_menu_id] = { price: Math.max(base * (1 - pct / 100), 0), name: o.dg037_offer_name };
      } else if (
        ["CategoryDiscount", "CategoryPercentDiscount", "CategoryFixedPrice"].includes(o.dg037_offer_type) &&
        o.dg037_category_id
      ) {
        categoryOffers.push({
          mode: o.dg037_offer_type,
          amount, pct,
          name: o.dg037_offer_name,
          menuIds: o.menu_ids || [],
        });
      }
    });
    // Category-wide offers — apply to every item in the category (skip
    // items that already have a more specific item-level offer).
    categoryOffers.forEach((co) => {
      co.menuIds.forEach((menuId) => {
        if (map[menuId]) return;
        if (co.mode === "CategoryFixedPrice") {
          map[menuId] = { price: co.amount, name: co.name };
          return;
        }
        const base = ownPrice(menuId);
        if (base == null) return;
        const price = co.mode === "CategoryPercentDiscount"
          ? base * (1 - co.pct / 100)
          : base - co.amount;
        map[menuId] = { price: Math.max(price, 0), name: co.name };
      });
    });
    return map;
  }, [offersData, itemsData]);

  const filteredItems = React.useMemo(() => {
    if (!itemsData || itemsData.length === 0) return [];
    // search karte waqt category select ho ya na ho, pura menu search ho
    if (searchTerm.trim() !== "") {
      return itemsData.filter((item) =>
        item.dg09_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    let items = itemsData;
    // category filter — sirf tab lagega jab search khali ho
    if (selectedCategory !== "All") {
      const category = categories.find(
        (cat) => cat.dg08_category_name === selectedCategory
      );
      if (category) {
        items = items.filter(
          (item) => item.dg09_category_id === category.dg08_category_id
        );
      }
    }
    return items;
  }, [selectedCategory, itemsData, categories, searchTerm]);

  const { data: orderData } = useQuery(
    ["getOrdersByTable", table],
    () => apiConnectorPost(endpoint.get_orders_by_table_api, { tableId: table }),
    { enabled: !!table && type === "dine-in" }
  );

  useEffect(() => {
    setPreviousItems([]);
    setAllOrders([]);
    setOrderItems([]);
    setSavedOrderId(null);
    setExistingBillId(null);
    setExistingBillNo(null);
    setActiveOrderIndex(0);
  }, [type]);

  useEffect(() => {
    const orders = orderData?.data?.result?.orders;
    if (!orders || orders.length === 0) return;
    const ordersToUse = orders.filter((o) => {
      return o.dg06_status !== "closed" && o.dg06_status !== "cancelled";
    });

    if (ordersToUse.length === 0) return;

    const formattedOrders = ordersToUse.map((order) => ({
      orderId: order.dg06_order_id,
      billId: order.dg06_bill_id || null,
      billNo: order.dg06_bill_no || null,
      uniqueId: order.unique_order_id,
      isSplit: order.unique_order_id?.startsWith("SPLIT"),
      items: (order.items || []).map((item) => {
        const menuItem = itemsData.find(m => m.dg09_menu_id === item.dg07_menu_id);
        return {
          id: item.dg07_menu_id,
          dg09_name: item.dg07_menu_name_snapshot,
          qty: item.dg07_quantity,
          tax_group_id: menuItem?.dg09_tax_group_id || null,        // ← menu se lo
          basePrice: parseFloat(menuItem?.dg09_price || item.dg07_price),  // ← menu se lo
          price: parseFloat(item.dg07_price),
          dg09_apply_charges: menuItem?.dg09_apply_charges,
          dg09_apply_discount: menuItem?.dg09_apply_discount,
          qtyRemark: item.dg07_item_remark || "",
          globalRemark: item.dg07_global_remark || "",
          status: order.dg06_status || "",
          predefinedRemarks: item.dg07_predefined_remark
            ? item.dg07_predefined_remark.split(", ").filter(Boolean)
            : [],
        };
      }),
      customerName: order.dg06_customer_name || "",      // ← ADD
      customerPhone: order.dg06_customer_phone || "",    // ← ADD  
      customerAddress: order.dg06_delivery_address || "",
    }));

    const mainOrder = formattedOrders.find((o) => !o.isSplit);
    const splitOrders = formattedOrders.filter((o) => o.isSplit);
    // Existing states ke saath ADD karo:
    const finalOrders = [
      ...(mainOrder ? [mainOrder] : []),
      ...splitOrders,
    ];

    setAllOrders(finalOrders);

    const firstOrder = finalOrders[0];

    if (firstOrder) {
      setOrderItems(firstOrder.items || []);
      setPreviousItems(firstOrder.items || []);
      setSavedOrderId(firstOrder.orderId || null);
      setExistingBillId(firstOrder.billId || null);
      setExistingBillNo(firstOrder.billNo || null);
      setCurrentOrderStatus(firstOrder.status || "");
      setActiveOrderIndex(0);
    }
  }, [orderData]);

  const handleOrderTabSwitch = (index) => {
    const order = allOrders[index];
    setActiveOrderIndex(index);
    setOrderItems(order.items);
    setSavedOrderId(order.orderId);
    setExistingBillId(order.billId);
    setExistingBillNo(order.billNo);
    setCurrentOrderStatus(order.status || "");  // ← ADD KARO

  };

  const addToOrder = async (item) => {
    if (!clickReady.current) return;
    try {
      const res = await apiConnectorGet(endpoint.item_options_pos_api + item.dg09_menu_id);
      const groups = res?.data?.result || [];

      if (groups.length === 0) {
        addItemDirectly(item, 0);
        return;
      }

      // Agar har group mein sirf 1 enabled option hai → auto-select, modal mat dikhao
      const allSingleOption = groups.every(g => (g.options || []).length === 1);
      if (allSingleOption) {
        const autoSelections = {};
        let extraPrice = 0;
        groups.forEach(g => {
          const opt = g.options[0];
          autoSelections[g.dg030_group_id] = [opt];
          extraPrice += parseFloat(opt.dg029_amount || 0);
        });
        addItemDirectly(item, extraPrice, autoSelections);
        return;
      }

      // Multiple options → modal dikhao
      setOptionItem({ ...item, optionGroups: groups });
      setShowOptionsModal(true);
    } catch (err) {
      addItemDirectly(item, 0);
    }
  };

  const addItemDirectly = (item, extraPrice, selections) => {
    // Agar aaj is item pe koi automatic "Item Special Price" offer active hai
    // (jaise "Cappuccino @ ₹79"), to wahi final price use karo — regular
    // price/tax calculation ko bypass karke, kyunki offer price already
    // customer ke liye final price hoti hai.
    const offer = offerByMenuId[item.dg09_menu_id];
    const basePrice = offer
      ? offer.price
      : item.dg09_tax_group_id
        ? parseFloat(item.dg09_amount_after_tax)
        : parseFloat(item.dg09_price);
    const finalPrice = basePrice + extraPrice;

    const optionLabel = selections
      ? Object.values(selections).flat()
        .map((o) => o.dg029_display_name)
        .join(", ")
      : "";

    // Text tag, emoji nahi — thermal printer par emoji print nahi hota
    // (khaali box ya garbage aata hai), isliye order/bill mein plain text
    // "(OFFER)" use karo, sirf POS screen ke badge mein emoji chalega.
    const displayName = optionLabel
      ? `${item.dg09_name} (${optionLabel})${offer ? " (OFFER)" : ""}`
      : offer ? `${item.dg09_name} (OFFER)` : item.dg09_name;

    // Functional update so rapid double-clicks never see stale state
    setOrderItems((prev) => {
      const existing = prev.find((i) => i.id === item.dg09_menu_id && i.dg09_name === displayName);
      if (existing) {
        return prev.map((i) =>
          i.id === item.dg09_menu_id && i.dg09_name === displayName ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, {
        ...item,
        qty: 1,
        id: item.dg09_menu_id,
        dg09_name: displayName,
        tax_group_id: offer ? null : (item.dg09_tax_group_id || null),
        basePrice: offer ? offer.price : parseFloat(item.dg09_price),
        price: finalPrice,
        isOfferItem: !!offer,
      }];
    });
  };

  // const addToOrder = (item) => {
  //   const existing = orderItems.find((i) => i.id === item.dg09_menu_id);
  //   if (existing) {
  //     setOrderItems(orderItems.map((i) =>
  //       i.id === item.dg09_menu_id ? { ...i, qty: i.qty + 1 } : i
  //     ));
  //   } else {
  //     setOrderItems([
  //       ...orderItems,
  //       {
  //         ...item, qty: 1, id: item.dg09_menu_id,
  //         tax_group_id: item.dg09_tax_group_id || null,
  //         basePrice: parseFloat(item.dg09_price),
  //         price: item.dg09_tax_group_id
  //           ? parseFloat(item.dg09_amount_after_tax)
  //           : parseFloat(item.dg09_price)
  //         // price: parseFloat(item.dg09_price)
  //       },
  //     ]);
  //   }
  // };

  const totalAmount = parseFloat(
    orderItems.reduce((acc, item) => acc + (item.price || item.basePrice) * item.qty, 0).toFixed(2)
  );


  const updateQty = (id, name, qty) => {
    if (qty < 1) return;
    setOrderItems(orderItems.map((i) => (i.id === id && i.dg09_name === name ? { ...i, qty } : i)));
  };

  const removeItem = (id, name) => setOrderItems(orderItems.filter((i) => !(i.id === id && i.dg09_name === name)));

  const getOrderTypeEnum = () => {
    if (type === "dine-in") return "dine_in";
    if (type === "take-away") return "takeaway";
    if (type === "delivery") return "delivery";
    return "";
  };

  const getTableId = () => {
    if (type === "dine-in") return table;
    return null;
  };

  const handleSaveKOT = async () => {
    if (!orderItems.length) { toast.error("Please add items first"); return; }
    if (isSubmitting) return;

    setIsSubmitting(true);
    const newItems = orderItems.filter((item) => {
      const prev = previousItems.find((p) => p.id === item.id);
      if (!prev) return true;
      return item.qty > prev.qty;
    }).map((item) => {
      const prev = previousItems.find((p) => p.id === item.id);
      return {
        ...item,
        qty: prev ? item.qty - prev.qty : item.qty,
      };
    });

    // ── Koi naya item nahi — sirf reprint karo ──
    const isReprint = newItems.length === 0;

    try {
      const res = await apiConnectorPost(endpoint.add_update_order_api, {
        tableId: getTableId(),
        customerName: type === "delivery" ? address : "",
        paymentMethod: "",
        orderType: getOrderTypeEnum(),
        items: orderItems.map((item) => ({
          menu_id: item.id,
          menu_name: item.dg09_name,
          quantity: item.qty,
          price: item.price,
          qtyRemark: item.qtyRemark || "",
          globalRemark: item.globalRemark || "",
          predefinedRemarks: item.predefinedRemarks || [],
        })),
      });

      if (res?.data?.success) {
        const orderId = res?.data?.order?.orderId ?? res?.data?.order?.offlineOrderId;
        const kotNo = res?.data?.order?.kotNo || 1;
        const captainName = res?.data?.order?.captainName || "—";
        const orderUniqueNo = res?.data?.order?.uniqueOrderId || `CBC-R${orderId}`;

        setSavedOrderId(orderId);
        await apiConnectorPost(endpoint.generate_kot_api, { orderId });

        if (type === "dine-in" && table) {
          await apiConnectorPost(endpoint.update_table_status_api, {
            tableId: table,
            status: "Busy",
            busySince: new Date().toISOString(),
          });
        }

        client.refetchQueries("get_table");

        if (!isReprint) setPreviousItems([...orderItems]); // ← sirf naye items pe update

        setKotPrintData({
          orderNo: orderUniqueNo,
          tableNo: type === "dine-in"
            ? tableNameMap[table] || table
            : type === "take-away" ? "TakeAway" : "Delivery",
          kotNo,
          captainName,
          type: isReprint ? "Reprint" : savedOrderId ? "Updated" : "Print", // ← type bhi sahi
          dateTime: formatReceiptDateTime(),
          items: isReprint
            ? orderItems.map((item) => ({  // ← reprint mein poore items
              name: item.dg09_name,
              qty: item.qty,
              qtyRemark: item.qtyRemark || "",
              globalRemark: item.globalRemark || "",
              predefinedRemarks: item.predefinedRemarks || [],
            }))
            : newItems.map((item) => ({   // ← update mein sirf naye
              name: item.dg09_name,
              qty: item.qty,
              qtyRemark: item.qtyRemark || "",
              globalRemark: item.globalRemark || "",
              predefinedRemarks: item.predefinedRemarks || [],
            })),
        });
        await apiConnectorPost(endpoint.update_order_status_api, {
          orderId: savedOrderId || orderId,
          status: "pending" || "preparing"
        });
      } else {
        toast.error(res?.data?.message || "Failed to save KOT");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save KOT");
    }
    finally {
      setIsSubmitting(false); // ← hamesha reset karo
    }
  };

  // ── Open Bill ─────────────────────────────────────────────
  const handleOpenBill = () => {
    if (!orderItems.length) { toast.error("Please add items first", { id: 1 }); return; }
    if (!savedOrderId) { toast.error("Please save KOT first", { id: 1 }); return; }
    const uniqueId = currentOrder?.uniqueId
      || allOrders.find(o => o.orderId === savedOrderId)?.uniqueId
      || null;

    navigate("/bill", {
      state: {
        orderItems,
        orderId: savedOrderId,
        uniqueOrderId: uniqueId,  // ← yahan use karo
        tableId: table,
        orderType: getOrderTypeEnum(),
        orderStatus: currentOrderStatus,
        tableNameMap,
        existingBillId,
        deliveryCustomerName: currentOrder?.customerName || "",
        deliveryCustomerPhone: currentOrder?.customerPhone || "",
        deliveryCustomerAddress: currentOrder?.customerAddress || "",
      },
    });
  };

  // ── After Bill Done ───────────────────────────────────────
  const handleBillDone = () => {
    setOrderItems([]);
    setSavedOrderId(null);
    setExistingBillId(null);
    setExistingBillNo(null);
    client.refetchQueries("get_table");
    setTimeout(() => navigate("/userdashboard"), 500);
  };


  // ── UI ────────────────────────────────────────────────────
  return (
    <div>
      <PosTab />
      <div className="flex main_take_away">
        {/* LEFT — CATEGORIES */}
        <div className="w-[15%] h-full list_category_btnt">
          <div
            className="list_items_btn"
            onClick={() => setSelectedCategory("All")}
          >
            All
          </div>
          {categories.map((cat) => (
            <div
              key={cat.dg08_category_id}
              onClick={() => setSelectedCategory(cat.dg08_category_name)}
              className={`list_items_btn
                  ${selectedCategory === cat.dg08_category_name
                  ? "gold_bg"
                  : ""}`}
            >
              {cat.dg08_category_name}
            </div>
          ))}
        </div>

        {/* CENTER — MENU ITEMS */}
        <div className="w-3/5 h-full overflow-y-auto p-3 pt-0 grid grid-cols-3 gap-3 content-start">
          {/* SEARCH BAR */}
          <div className="search-bar-wrap w-full col-span-3">
            <div className="search-bar">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className=""
              />
            </div>
          </div>
          {filteredItems.map((item) => {
            const offer = offerByMenuId[item.dg09_menu_id];
            return (
              <div
                key={item.dg09_menu_id}
                onClick={() => addToOrder(item)}
                className="main_card main_card_2"
                style={offer ? { position: "relative", border: "1.5px solid #f59e0b" } : undefined}
              >
                {offer && (
                  <span
                    title={offer.name}
                    style={{
                      position: "absolute", top: -8, right: -8,
                      background: "#f59e0b", color: "#fff",
                      fontSize: 10, fontWeight: 700,
                      padding: "2px 7px", borderRadius: 20,
                      boxShadow: "0 2px 6px rgba(245,158,11,0.5)",
                    }}
                  >
                    🔥 OFFER
                  </span>
                )}

                {/* <img
                  src={domain + item.dg09_image_url}
                  alt={item.dg09_image_url}
                  className="w-full h-16 object-cover rounded"
                /> */}
                <h6>{item.dg09_name}</h6>
                {offer ? (
                  <h3>
                    <span style={{ textDecoration: "line-through", opacity: 0.5, fontSize: "0.75em", marginRight: 6 }}>
                      ₹{item.dg09_price}
                    </span>
                    ₹{offer.price}
                  </h3>
                ) : (
                  <h3>₹{item.dg09_price}</h3>
                )}
              </div>
            );
          })}
        </div>

        {/* RIGHT — BILL PANEL */}
        <div className="w-2/6 cart_post flex flex-col">

          {/* Split order tabs */}
          {allOrders.length > 1 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {allOrders.map((order, index) => (
                <button
                  key={order.orderId}
                  onClick={() => handleOrderTabSwitch(index)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition
                      ${activeOrderIndex === index
                      ? "bg-purple-500/40 border-purple-400 text-white"
                      : "bg-white/10 border-white/10 text-white/60 hover:bg-white/20"}`}
                >
                  {order.isSplit ? `✂️ Split` : `📋 Main`} — #{order.orderId}
                </button>
              ))}
            </div>
          )}

          {/* Info bar */}
          <div className="flex flex-wrap justify-start gap-2 items-center  cart-badges">
            <button className="main_food_type_btn">
              {getOrderTypeEnum() === "dine_in" ? "Dine In"
                : getOrderTypeEnum() === "takeaway" ? "TakeAway"
                  : getOrderTypeEnum() === "delivery" ? "Door Delivery" : "-"}
            </button>
            <span className="main_food_type_btn-2">
              {type === "dine-in" ? tableNameMap[table] || table
                : type === "take-away" ? "Table: 1001"
                  : type === "delivery" ? "Table: 1002" : "N/A"}
            </span>
            {type === "delivery" && (
              <div
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 cursor-pointer bg-white/10 px-3 py-1 rounded-full"
              >
                <Person className="text-dark" />
              </div>
            )}
            {/* <span className="text-xs text-white/60 ml-auto">{currentDateTime}</span> */}
          </div>

          {/* ORDER TABLE */}
          <div className="cart-cols">
            <div class="cart-col-h">Item</div>
            <div class="cart-col-h" style={{ textAlign: "center" }}>Qty</div>
            <div class="cart-col-h" style={{ textAlign: "right" }}>Price</div>
            <div class="cart-col-h" style={{ textAlign: "right" }}>Total</div>
            <div class="cart-col-h" style={{ textAlign: "right" }}>Edit</div>
            <div class="cart-col-h"></div>
          </div>
          <div className="cart-items">
            {orderItems.map((item) => (
              <div className="cart-row">
                <div className="cart-item-name">{item.dg09_name}</div>
                <div className="cart-qty-wrap">
                  {modifyMode ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <button
                        onClick={() => updateQty(item.id, item.dg09_name, item.qty - 1)}
                        style={{ width: 18, height: 18, borderRadius: 4, background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171", fontWeight: 700, fontSize: 13, lineHeight: 1, cursor: "pointer", padding: 0 }}
                      >−</button>
                      <span style={{ minWidth: 16, textAlign: "center", fontWeight: 600, fontSize: 12 }}>{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.id, item.dg09_name, item.qty + 1)}
                        style={{ width: 18, height: 18, borderRadius: 4, background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.4)", color: "#4ade80", fontWeight: 700, fontSize: 13, lineHeight: 1, cursor: "pointer", padding: 0 }}
                      >+</button>
                    </div>
                  ) : item.qty}
                </div>
                <div className="cart-price">₹{(item.price || item.basePrice).toFixed(2)}</div>
                <div className="cart-total">₹{((item.price || item.basePrice) * item.qty).toFixed(2)}</div>
                <div className="edite_inf"><Edit onClick={() => { setSelectedItem(item); setShowQtyModal(true); }} /></div>
                <div className="cart-del"><button onClick={() => removeItem(item.id, item.dg09_name)} >✕</button></div>
              </div>
            ))}
          </div>


          {/* TOTAL */}
          <div className="flex justify-between items-center">
            {modifyMode && savedOrderId && (
              <button className="bg-red-600 text-white p-2 mx-3 rounded-lg text-sm" onClick={() => setShowCancelModal(true)}>
                Cancel Order
              </button>
            )}
            <div className="mt-2 text-right font-semibold text-gold ml-auto px-3">
              Total: ₹{totalAmount.toFixed(2)}
            </div>
          </div>

          {savedOrderId && (
            <div className="ordr_lsitst ">
              KOT Saved — Order #{savedOrderId}
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="mt-3 mb-3 flex flex-col gap-2 px-3">
            <button
              onClick={handleSaveKOT}
              className="main_btn flex justify-center items-center "
            >
              {savedOrderId ? "Update KOT & Print" : "Save KOT & Print"}
            </button>

            <button
              onClick={handleOpenBill}
              className={`main_btn_2 flex justify-center items-center
                  ${savedOrderId
                  ? "gold_bg"
                  : " cursor-not-allowed"}`}
            >
              🖨 View / Print Bill
            </button>

            <button
              onClick={() => setModifyMode(!modifyMode)}
              className="main_btn_3 d-flex justify-center items-center"
            >
              {modifyMode ? " Done" : "✏️ Modify"}
            </button>
          </div>
        </div>

        {/* KOT Print Modal */}
        {kotPrintData && (
          <KOTPrintSlip kotData={kotPrintData} onClose={() => setKotPrintData(null)} />
        )}

        <AddQtyRemarkModal
          isOpen={showQtyModal}
          onClose={() => setShowQtyModal(false)}
          item={selectedItem}
          orderItems={orderItems}
          onUpdate={setOrderItems}
        />
        <ItemOptionsModal
          isOpen={showOptionsModal}
          onClose={() => setShowOptionsModal(false)}
          item={optionItem}
          onConfirm={(item, extraPrice, selections) => {
            addItemDirectly(item, extraPrice, selections);
            setShowOptionsModal(false);
          }}
        />
        <CancelOrderModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          orderId={savedOrderId}
          onCancelled={() => {
            const remaining = allOrders.filter((_, i) => i !== activeOrderIndex);
            const wasSplit = allOrders[activeOrderIndex]?.isSplit;
            if (wasSplit && remaining.length > 0) {
              // Sirf split cancel hua — main order tab pe wapas jao
              setAllOrders(remaining);
              const main = remaining[0];
              setOrderItems(main.items || []);
              setSavedOrderId(main.orderId || null);
              setExistingBillId(main.billId || null);
              setExistingBillNo(main.billNo || null);
              setCurrentOrderStatus(main.status || "");
              setActiveOrderIndex(0);
              setModifyMode(false);
            } else {
              // Main order cancel hua — baaki saare split bhi cancel karo
              remaining.forEach(splitOrder => {
                apiConnectorPost(endpoint.cancel_order_api, {
                  orderId: splitOrder.orderId,
                  reason: "Cancelled with main order",
                }).catch(e => console.error("Split auto-cancel failed:", e));
              });
              setOrderItems([]);
              setSavedOrderId(null);
              navigate("/userdashboard");
            }
          }}
        />

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
            <div className="Order_Details_modal">
              <Row className="p-3">
                <Col md={12}>
                  <div className="main_input">
                    <label>Enter Address <span className="text-red-500">*</span></label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter delivery address..." />
                  </div>
                </Col>
              </Row>


              <div className="flex justify-between gap-3 modal_footer px-3 py-3">
                <button onClick={() => setShowModal(false)} className="cancel_btn">✕ Cancel</button>
                <button onClick={() => setShowModal(false)} className="update_btn">✓ Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default POS;