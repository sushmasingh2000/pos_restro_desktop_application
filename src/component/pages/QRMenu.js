import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { domain } from "../../domain";
import toast from "react-hot-toast";

const QrMenuPage = () => {
  const { token } = useParams();
  const [table, setTable] = useState(null);
  const [menu, setMenu] = useState({ categories: [], items: [] });
  const [cart, setCart] = useState({});
  const [selectedCat, setSelectedCat] = useState("All");
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(true);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [orderStatus, setOrderStatus] = useState("customer_placed");
  const [tableBusy, setTableBusy] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tableRes, menuRes] = await Promise.all([
        axios.get(`${domain}/api/v1/public/table/${token}`),
        axios.get(`${domain}/api/v1/public/menu/${token}`)
      ]);

      const tableData = tableRes.data.result;
      setTable(tableData);

      // ❌ Table busy hai toh menu mat dikho
      if (tableData.dg05_status === "busy") {
        setTableBusy(true);
      }

      setMenu({
        categories: menuRes.data.result.categories || [],
        items: menuRes.data.result.menus || []
      });
    } catch {
      alert("Invalid QR or menu not available");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (selectedCat === "All") return menu.items;
    return menu.items.filter(i => i.dg08_category_name === selectedCat);
  }, [selectedCat, menu.items]);

  const grouped = useMemo(() => {
    const g = {};
    filteredItems.forEach(item => {
      const cat = item.dg08_category_name || "Other";
      if (!g[cat]) g[cat] = [];
      g[cat].push(item);
    });
    return g;
  }, [filteredItems]);

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const subtotal = Object.entries(cart).reduce((a, [id, qty]) => {
    const item = menu.items.find(i => i.dg09_menu_id == id);
    return a + (item ? parseFloat(item.dg09_price) * qty : 0);
  }, 0);
  const gst = subtotal * 0.05;
  const total = subtotal + gst;

  const addItem = (id) => setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  const removeItem = (id) => setCart(prev => {
    const updated = { ...prev };
    if (updated[id] > 1) updated[id]--;
    else delete updated[id];
    return updated;
  });

  const getFoodImage = (name, category) => {
    const n = name.toLowerCase();
    const c = category?.toLowerCase() || "";

    // Name based matching
    if (n.includes("burger") || n.includes("bun butter"))
      return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=80";
    if (n.includes("maggi") || n.includes("tandoori maggi") || n.includes("veggie maggi") || n.includes("plain maggi"))
      return "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=300&q=80";
    if (n.includes("mojito") || n.includes("strawberry mojito"))
      return "https://images.unsplash.com/photo-1546171753-97d7676e4602?w=300&q=80";
    if (n.includes("lemonade") || n.includes("masala lemonade"))
      return "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300&q=80";
    if (n.includes("hot coffee") || n.includes("coffee"))
      return "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&q=80";
    if (n.includes("fries") || n.includes("salted fries") || n.includes("peri peri"))
      return "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300&q=80";
    if (n.includes("water"))
      return "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=300&q=80";

    // Category based fallback
    if (c.includes("burger"))
      return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=80";
    if (c.includes("coffee"))
      return "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&q=80";
    if (c.includes("mocktail") || c.includes("iced tea") || c.includes("shakes"))
      return "https://images.unsplash.com/photo-1546171753-97d7676e4602?w=300&q=80";
    if (c.includes("fries"))
      return "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300&q=80";
    if (c.includes("maggi") || c.includes("pasta") || c.includes("wraps") || c.includes("sandwich") || c.includes("light meal"))
      return "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=300&q=80";

    // Default food image
    return "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&q=80";
  };

  useEffect(() => {
    if (!orderId) return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${domain}/api/v1/public/order-status/${orderId}`);
        const status = res.data.status;
        setOrderStatus(status);
        if (status === "preparing" || status === "completed" || status === "cancelled") {
          clearInterval(interval);
        }
      } catch (err) {
        console.error(err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [orderId]);

  const placeOrder = async () => {
    setPlacing(true);
    try {
      const items = Object.entries(cart).map(([id, qty]) => {
        const item = menu.items.find(i => i.dg09_menu_id == id);
        return {
          menu_id: id,
          menu_name: item?.dg09_name,
          quantity: qty,
          price: parseFloat(item?.dg09_price),
          globalRemark: remark
        };
      });
      const res = await axios.post(`${domain}/api/v1/public/order`, {
        qrToken: token,
        tableId: table?.dg05_table_id,
        items,
        remark
      });
      if (res.data.success) {
        setOrderId(res.data.orderId);
        setOrderPlaced(true);
        setShowCart(false);
      }
      else {
        toast(res.data.message);
      }
    } catch {
      alert("Order failed. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  const [activeView, setActiveView] = useState("menu"); // "menu" | "orders"
  const [myOrders, setMyOrders] = useState([]);

  const fetchMyOrders = async () => {
    try {
      const res = await axios.get(`${domain}/api/v1/public/my-orders/${token}`);
      setMyOrders(res.data.result || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (table) fetchMyOrders();
  }, [table]);

  // Har 10 sec mein refresh
  useEffect(() => {
    const interval = setInterval(() => {
      if (table) fetchMyOrders();
    }, 10000);
    return () => clearInterval(interval);
  }, [table]);


  if (loading) return (
    <div style={styles.loading}>
      <p>Loading menu...</p>
    </div>
  );

  // ✅ Table busy screen
  if (tableBusy) return (
    <div style={styles.successScreen}>
      <div style={{ fontSize: 60, marginBottom: 20 }}>🪑</div>
      <h2 style={styles.successTitle}>Order Already Placed!</h2>
      <p style={styles.successSub}>
        This table already has an active order.<br />
        Please ask staff if you want to add more items.
      </p>
      <div style={{ ...styles.pendingBadge, marginTop: 20 }}>
        ⏳ Order in progress
      </div>
    </div>
  );

  if (orderPlaced) return (
    <div style={styles.successScreen}>
      <div style={styles.successIcon}>
        {orderStatus === "preparing" ? "🍳" : orderStatus === "completed" ? "✅" : "✓"}
      </div>
      <h2 style={styles.successTitle}>Order Placed!</h2>
      <p style={styles.successSub}>Your order has been sent.<br />Staff will confirm shortly.</p>
      <div style={styles.orderIdBox}>
        Order ID
        <strong style={{ display: "block", fontSize: 18, marginTop: 4 }}>#{orderId}</strong>
      </div>

      {orderStatus === "customer_placed" && (
        <div style={styles.pendingBadge}>⏳ Waiting for staff confirmation</div>
      )}
      {orderStatus === "preparing" && (
        <div style={{ ...styles.pendingBadge, background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" }}>
          🍳 Your order is being prepared!
        </div>
      )}
      {orderStatus === "completed" && (
        <div style={{ ...styles.pendingBadge, background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" }}>
          ✅ Order Ready! Enjoy your meal!
        </div>
      )}
      {orderStatus === "cancelled" && (
        <div style={{ ...styles.pendingBadge, background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" }}>
          ❌ Order cancelled by staff
        </div>
      )}
    </div>
  );
  return (
    <div style={styles.app}>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.tableIcon}>🪑</div>
        <div>
          <div style={styles.headerTitle}>{table?.dg05_table_name}</div>
          <div style={styles.headerSub}>Ferry Restro — Scan & Order</div>
        </div>
        <div style={styles.statusBadge}>Open</div>
      </div>
      {/* TAB BAR */}
      <div style={styles.tabBar}>
        <button
          onClick={() => setActiveView("menu")}
          style={{ ...styles.tabBtn, ...(activeView === "menu" ? styles.tabBtnActive : {}) }}
        >
          Menu
        </button>
        <button
          onClick={() => { setActiveView("orders"); fetchMyOrders(); }}
          style={{ ...styles.tabBtn, ...(activeView === "orders" ? styles.tabBtnActive : {}) }}
        >
          My Orders
          {myOrders.filter(o => o.dg06_status === "customer_placed").length > 0 && (
            <span style={styles.badge}>
              {myOrders.filter(o => o.dg06_status === "customer_placed").length}
            </span>
          )}
        </button>
      </div>
      {activeView === "orders" && (
        <div style={{ padding: 16 }}>
          {myOrders.length === 0 ? (
            <div style={{ textAlign: "center", color: "#aaa", marginTop: 60 }}>
              <div style={{ fontSize: 40 }}>🧾</div>
              <p style={{ marginTop: 12 }}>No orders yet</p>
            </div>
          ) : (
            myOrders.map((order, i) => (
              <div key={i} style={styles.orderCard}>
                <div style={styles.orderCardHeader}>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>#{order.unique_order_id}</span>
                  <span style={{
                    ...styles.statusPill,
                    background: order.dg06_status === "preparing" ? "#dcfce7"
                      : order.dg06_status === "completed" ? "#e0f2fe"
                        : order.dg06_status === "cancelled" ? "#fee2e2"
                          : "#fef3c7",
                    color: order.dg06_status === "preparing" ? "#166534"
                      : order.dg06_status === "completed" ? "#0369a1"
                        : order.dg06_status === "cancelled" ? "#991b1b"
                          : "#92400e",
                  }}>
                    {order.dg06_status === "customer_placed" ? "⏳ Pending"
                      : order.dg06_status === "preparing" ? "🍳 Preparing"
                        : order.dg06_status === "completed" ? "✅ Ready"
                          : order.dg06_status === "cancelled" ? "❌ Cancelled"
                            : order.dg06_status}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>
                  {order.items?.map((item, j) => (
                    <span key={j}>{item.dg07_menu_name_snapshot} x{item.dg07_quantity}{j < order.items.length - 1 ? ", " : ""}</span>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: "#aaa" }}>
                    {new Date(order.dg06_created_at).toLocaleTimeString()}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#c9a84c" }}>
                    ₹{order.dg06_total_amount}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CATEGORIES — sirf menu tab mein dikhe */}
      {activeView === "menu" && (
        <>
          <div style={styles.cats}>
            {["All", ...menu.categories.map(c => c.dg08_category_name)].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                style={{ ...styles.catBtn, ...(selectedCat === cat ? styles.catBtnActive : {}) }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* MENU ITEMS */}
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div style={styles.sectionTitle}>{cat}</div>
              <div style={styles.itemsGrid}>
                {items.map(item => {
                  const qty = cart[item.dg09_menu_id] || 0;
                  return (
                    <div key={item.dg09_menu_id} style={styles.itemCard}>
                      <div style={styles.itemImg}>
                        <img
                          src={item.dg09_image_url || getFoodImage(item.dg09_name, item.dg08_category_name)}
                          alt={item.dg09_name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => {
                            e.target.src = "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&q=80";
                          }}
                        />
                      </div>
                      <div style={styles.itemBody}>
                        <div style={styles.itemName}>{item.dg09_name}</div>
                        <div style={styles.itemFooter}>
                          <span style={styles.itemPrice}>₹{item.dg09_price}</span>
                          {qty === 0
                            ? <button style={styles.addBtn} onClick={() => addItem(item.dg09_menu_id)}>+</button>
                            : <div style={styles.qtyCtrl}>
                              <button style={styles.qtyBtn} onClick={() => removeItem(item.dg09_menu_id)}>−</button>
                              <span style={styles.qtyNum}>{qty}</span>
                              <button style={styles.qtyBtn} onClick={() => addItem(item.dg09_menu_id)}>+</button>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}

      {/* CART BAR */}
      {cartCount > 0 && (
        <div style={styles.cartBar}>
          <div>
            <span style={styles.cartCount}>{cartCount} item{cartCount !== 1 ? "s" : ""}</span>
            <strong style={styles.cartTotal}>₹{total.toFixed(0)}</strong>
          </div>
          <button style={styles.cartBtn} onClick={() => setShowCart(true)}>View Cart →</button>
        </div>
      )}

      {/* CART SHEET */}
      {showCart && (
        <>
          <div style={styles.overlay} onClick={() => setShowCart(false)} />
          <div style={styles.cartSheet}>
            <div style={styles.sheetHandle} />
            <div style={styles.sheetTitle}>Your Order</div>
            {Object.entries(cart).map(([id, qty]) => {
              const item = menu.items.find(i => i.dg09_menu_id == id);
              if (!item) return null;
              return (
                <div key={id} style={styles.cartItem}>
                  <div style={{ flex: 1 }}>
                    <div style={styles.cartItemName}>{item.dg09_name}</div>
                    <div style={{ fontSize: 11, color: "#aaa" }}>₹{item.dg09_price} × {qty}</div>
                  </div>
                  <div style={styles.qtyCtrl}>
                    <button style={styles.qtyBtn} onClick={() => removeItem(id)}>−</button>
                    <span style={styles.qtyNum}>{qty}</span>
                    <button style={styles.qtyBtn} onClick={() => addItem(id)}>+</button>
                  </div>
                  <div style={{ ...styles.cartItemPrice, marginLeft: 8 }}>₹{(parseFloat(item.dg09_price) * qty).toFixed(0)}</div>
                </div>
              );
            })}
            <div style={{ marginTop: 12 }}>
              <div style={styles.totalRow}><span style={{ color: "#888" }}>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
              <div style={styles.totalRow}><span style={{ color: "#888" }}>GST (5%)</span><span>₹{gst.toFixed(0)}</span></div>
              <div style={{ ...styles.totalRow, fontWeight: 500, fontSize: 15, borderTop: "1px solid #eee", paddingTop: 12, marginTop: 4 }}>
                <span>Total</span><span>₹{total.toFixed(0)}</span>
              </div>
            </div>
            <textarea
              style={styles.remarkInput}
              placeholder="Any special instructions? (optional)"
              value={remark}
              onChange={e => setRemark(e.target.value)}
              rows={2}
            />
            <button
              style={{ ...styles.placeBtn, opacity: placing ? 0.6 : 1 }}
              onClick={placeOrder}
              disabled={placing}
            >
              {placing ? "Placing order..." : "Place Order"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
  app: { maxWidth: 480, margin: "0 auto", background: "#fff", minHeight: "100vh", paddingBottom: 120, fontFamily: "sans-serif" },
  loading: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 12, color: "#888" },
  header: { background: "#1a1a1a", color: "#fff", padding: "16px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 },
  tableIcon: { width: 40, height: 40, background: "#c9a84c20", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 },
  headerTitle: { fontSize: 15, fontWeight: 500, color: "#fff" },
  headerSub: { fontSize: 12, color: "#aaa", marginTop: 2 },
  statusBadge: { marginLeft: "auto", background: "#22c55e20", color: "#22c55e", border: "1px solid #22c55e40", borderRadius: 20, padding: "4px 10px", fontSize: 11 },
  cats: { display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto", background: "#fff", borderBottom: "0.5px solid #eee", position: "sticky", top: 73, zIndex: 9 },
  catBtn: { padding: "6px 14px", borderRadius: 20, border: "1px solid #e5e5e5", background: "#fff", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", color: "#555" },
  catBtnActive: { background: "#1a1a1a", color: "#fff", borderColor: "#1a1a1a" },
  sectionTitle: { fontSize: 12, fontWeight: 500, color: "#888", padding: "16px 16px 8px", textTransform: "uppercase", letterSpacing: ".5px" },
  itemsGrid: { padding: "0 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  itemCard: { background: "#fff", border: "0.5px solid #eee", borderRadius: 12, overflow: "hidden" },
  itemImg: { height: 80, background: "#f5f0e8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 },
  itemBody: { padding: 10 },
  itemName: { fontSize: 13, fontWeight: 500, color: "#1a1a1a", lineHeight: 1.3 },
  itemFooter: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  itemPrice: { fontSize: 14, fontWeight: 500, color: "#c9a84c" },
  addBtn: { width: 26, height: 26, background: "#1a1a1a", color: "#fff", border: "none", borderRadius: "50%", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" },
  qtyCtrl: { display: "flex", alignItems: "center", gap: 6 },
  qtyBtn: { width: 22, height: 22, borderRadius: "50%", border: "1px solid #ddd", background: "#f5f5f5", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" },
  qtyNum: { fontSize: 13, fontWeight: 500, minWidth: 16, textAlign: "center" },
  cartBar: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#1a1a1a", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 20 },
  cartCount: { fontSize: 12, color: "#aaa", display: "block" },
  cartTotal: { fontSize: 16, color: "#fff" },
  cartBtn: { background: "#c9a84c", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 500, cursor: "pointer" },
  overlay: { position: "fixed", inset: 0, background: "#00000060", zIndex: 30 },
  cartSheet: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#fff", borderRadius: "20px 20px 0 0", zIndex: 40, padding: "20px 16px 32px", maxHeight: "80vh", overflowY: "auto" },
  sheetHandle: { width: 40, height: 4, background: "#e5e5e5", borderRadius: 2, margin: "0 auto 16px" },
  sheetTitle: { fontSize: 16, fontWeight: 500, color: "#1a1a1a", marginBottom: 16 },
  cartItem: { display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "0.5px solid #f0f0f0" },
  cartItemName: { fontSize: 13, color: "#1a1a1a", fontWeight: 500 },
  cartItemPrice: { fontSize: 13, color: "#888", minWidth: 50, textAlign: "right" },
  totalRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14 },
  remarkInput: { width: "100%", border: "0.5px solid #e5e5e5", borderRadius: 8, padding: "8px 10px", fontSize: 13, marginTop: 10, resize: "none" },
  placeBtn: { width: "100%", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 500, cursor: "pointer", marginTop: 12 },
  successScreen: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", textAlign: "center", minHeight: "100vh" },
  successIcon: { width: 72, height: 72, background: "#22c55e15", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 20 },
  successTitle: { fontSize: 20, fontWeight: 500, color: "#1a1a1a" },
  successSub: { fontSize: 14, color: "#888", marginTop: 8, lineHeight: 1.6 },
  orderIdBox: { background: "#f5f5f0", borderRadius: 10, padding: "12px 20px", marginTop: 20, fontSize: 13, color: "#555" },
  pendingBadge: { background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 14px", fontSize: 12, marginTop: 16 },
  tabBar: { display: "flex", background: "#fff", borderBottom: "0.5px solid #eee", position: "sticky", top: 73, zIndex: 9 },
  tabBtn: { flex: 1, padding: "12px", border: "none", background: "transparent", fontSize: 14, cursor: "pointer", color: "#888", position: "relative" },
  tabBtnActive: { color: "#1a1a1a", fontWeight: 500, borderBottom: "2px solid #1a1a1a" },
  badge: { background: "#ef4444", color: "#fff", borderRadius: "50%", fontSize: 10, padding: "1px 5px", marginLeft: 6 },
  orderCard: { background: "#fff", border: "0.5px solid #eee", borderRadius: 12, padding: 14, marginBottom: 12 },
  orderCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  statusPill: { fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 500 },
};

export default QrMenuPage;