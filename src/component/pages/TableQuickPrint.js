import { useState } from "react";
import { useQuery } from "react-query";
import { apiConnectorGet } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import toast from "react-hot-toast";

export default function TableQuickPrintModal({
    isOpen,
    onClose,
    orderId,
    uniqueOrderId,
    tableId,
    tableNameMap = {},
    orderItems = [],
}) {
    const [loading, setLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const { data: branchData } = useQuery(
        ["branch_profile"],
        () => apiConnectorGet(endpoint.branch_profile_api),
        { enabled: isOpen, refetchOnWindowFocus: false }
    );
    const branch = branchData?.data?.result || {};

    // ── Fetch taxes ───────────────────────────────────
    const { data: taxData } = useQuery(
        ["get_taxes"],
        () => apiConnectorGet(endpoint.tax_get_api),
        { enabled: isOpen, refetchOnWindowFocus: false }
    );
    const taxes = taxData?.data?.result || [];

    // ── Fetch charges ─────────────────────────────────
    const { data: chargesData } = useQuery(
        ["get_charges"],
        () => apiConnectorGet(endpoint.charge_get_api),
        { enabled: isOpen, refetchOnWindowFocus: false }
    );
    const charges = chargesData?.data?.result || [];

    // ── Calculations ──────────────────────────────────
    const subTotal = orderItems.reduce((acc, i) => acc + i.price * i.qty, 0);

    const taxBreakdown = taxes.map((t) => ({
        name: t.dg032_name,
        pct: parseFloat(t.dg032_percentage),
        amount: Math.round(((subTotal * parseFloat(t.dg032_percentage)) / 100) * 100) / 100,
    }));
    const totalTax = taxBreakdown.reduce((s, t) => s + t.amount, 0);

    const chargeBreakdown = charges.map((c) => ({
        name: c.dg035_name,
        amount: c.dg035_type === "Percentage"
            ? (subTotal * parseFloat(c.dg035_value)) / 100
            : parseFloat(c.dg035_value),
    }));
    const totalCharges = chargeBreakdown.reduce((s, c) => s + c.amount, 0);

    const beforeRound = Math.round((subTotal + totalTax + totalCharges) * 100) / 100;
    const grandTotal = Math.round(beforeRound);
    const roundOff = parseFloat((grandTotal - beforeRound).toFixed(2));

    // ── Print handler ─────────────────────────────────
    const handlePrint = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const billData = {
                restaurant_name: branch.branch_name || "Restaurant",
                restaurant_address: branch.address || "",
                gstin: branch.gst_no || "",
                captain_name: branch.captain_name || "",
                orderId: uniqueOrderId || orderId,
                table_no: tableId ? tableNameMap[tableId] || tableId : null,
                date_time: new Date().toLocaleString("en-IN"),
                tax_breakdown: taxBreakdown,
                subtotal: subTotal.toFixed(2),
                total_amount: grandTotal.toFixed(2),
                round_off: roundOff,
                is_quick_print: true,
                items: orderItems.map((i) => ({
                    name: i.dg09_name,
                    qty: i.qty,
                    rate: Number(i.price).toFixed(2),
                    total: (i.price * i.qty).toFixed(2),
                    remark: [...(i.predefinedRemarks || []), i.qtyRemark || ""]
                        .filter(Boolean).join(", "),
                })),
            };

            const token = localStorage.getItem("token");
            if (window.electronAPI?.printBill) {
                const printResult = await window.electronAPI.printBill({ billData, token });
                if (printResult.success) {
                    toast.success("Print successful!");
                    onClose();
                } else {
                    toast.error(`Print failed: ${printResult.message}`);
                }
            } else {
                toast.success("Bill data ready (no Electron)");
            }
        } catch (err) {
            console.error(err);
            toast.error("Print failed");
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    // ── THERMAL PREVIEW ───────────────────────────────
    if (showPreview) {
        return (
            <div style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.85)",
                backdropFilter: "blur(6px)",
            }}>
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 16,
                    maxHeight: "95vh",
                    overflowY: "auto",
                }}>
                    {/* Label */}
                    <div style={{
                        color: "rgba(255,255,255,0.5)",
                        fontSize: 13,
                        letterSpacing: 2,
                        textTransform: "uppercase",
                    }}>
                        Bill Preview
                    </div>

                    {/* Thermal Receipt */}
                    <div style={{
                        background: "#fff",
                        width: 300,
                        fontFamily: "'Courier New', Courier, monospace",
                        fontSize: 12,
                        color: "#111",
                        padding: "20px 14px 16px",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                        borderRadius: 2,
                        clipPath: "polygon(0 4px,4px 0,8px 4px,12px 0,16px 4px,20px 0,24px 4px,28px 0,32px 4px,36px 0,40px 4px,44px 0,48px 4px,52px 0,56px 4px,60px 0,64px 4px,68px 0,72px 4px,76px 0,80px 4px,84px 0,88px 4px,92px 0,96px 4px,100% 4px,100% 100%,0 100%)",
                    }}>
                        {/* Header */}
                        <div style={{ textAlign: "center", marginBottom: 6 }}>
                            <div style={{ fontWeight: "bold", fontSize: 15, letterSpacing: 1 }}>
                                {branch.branch_name || "Restaurant"}
                            </div>
                            <div style={{ fontSize: 11 }}>{branch.address || ""}</div>
                        </div>

                        <QDivider />

                        {/* GSTIN + Invoice + Table */}
                        <div style={{ textAlign: "center", fontSize: 11, marginBottom: 2 }}>
                            {branch.gst_no && <div>GSTIN &nbsp;&nbsp; {branch.gst_no}</div>}
                            <div>INVOICE NO. &nbsp;&nbsp; {uniqueOrderId || orderId}</div>
                            <div>TABLE NO. &nbsp;&nbsp; {tableId ? tableNameMap[tableId] || tableId : "Takeaway"}</div>
                        </div>

                        <QDivider />

                        {/* Captain + Time */}
                        <QLeftRow label="Captain" value={branch.captain_name || "—"} />
                        <QLeftRow label="Time" value={new Date().toLocaleString("en-IN")} />

                        <QDivider />

                        {/* Items Header */}
                        <div style={{ display: "flex", fontWeight: "bold", fontSize: 11, marginBottom: 4 }}>
                            <span style={{ flex: 1 }}>ITEM</span>
                            <span style={{ width: 30, textAlign: "right" }}>QTY</span>
                            <span style={{ width: 50, textAlign: "right" }}>RATE</span>
                            <span style={{ width: 55, textAlign: "right" }}>AMT</span>
                        </div>

                        <QDivider />

                        <div style={{ fontWeight: "bold", fontSize: 11, marginBottom: 4 }}>Food</div>

                        {/* Items */}
                        {orderItems.map((item, i) => {
                            const remark = [...(item.predefinedRemarks || []), item.qtyRemark || ""].filter(Boolean).join(", ");
                            return (
                                <div key={i}>
                                    <div style={{ display: "flex", fontSize: 11, marginBottom: 2 }}>
                                        <span style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                                            {item.dg09_name}
                                        </span>
                                        <span style={{ width: 30, textAlign: "right" }}>{item.qty}</span>
                                        <span style={{ width: 50, textAlign: "right" }}>{Number(item.price).toFixed(2)}</span>
                                        <span style={{ width: 55, textAlign: "right" }}>{(item.price * item.qty).toFixed(2)}</span>
                                    </div>
                                    {remark && (
                                        <div style={{ fontSize: 10, color: "#555", paddingLeft: 8, marginBottom: 2 }}>
                                            Note: {remark}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        <QDivider />

                        <QAmtRow label="Sub Total" value={subTotal.toFixed(2)} />

                        <QDivider />

                        <QAmtRow label="Sub Total" value={subTotal.toFixed(2)} />

                        {taxBreakdown.map((t, i) => (
                            <QAmtRow key={i} label={`${t.name}(${t.pct}%)`} value={t.amount?.toFixed(2)} muted />
                        ))}

                        <QDivider />

                        <QAmtRow label="Total" value={grandTotal.toFixed(2)} />
                        <QAmtRow label="Round Off" value={`${roundOff >= 0 ? "+" : ""}${roundOff}`} muted />

                        <QDivider />

                        <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 13, margin: "6px 0" }}>
                            Grand Total:(INR)&nbsp;&nbsp;{grandTotal}
                        </div>

                        <QDivider />

                        <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 12, marginTop: 6 }}>
                            Thank You..
                        </div>
                        <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 12 }}>
                            Visit Again!!!
                        </div>
                        <div style={{ textAlign: "center", fontSize: 9, color: "#aaa", marginTop: 4 }}>
                            powered by FerryRestro v1.0.1
                        </div>

                        <div style={{ height: 12 }} />
                    </div>

                    {/* Buttons */}
                    <div style={{ display: "flex", gap: 12 }}>
                        <button
                            onClick={() => setShowPreview(false)}
                            style={{
                                padding: "10px 24px",
                                borderRadius: 10,
                                border: "1px solid rgba(255,255,255,0.2)",
                                background: "rgba(255,255,255,0.08)",
                                color: "#fff",
                                fontSize: 14,
                                cursor: "pointer",
                            }}
                        >
                            ← Back
                        </button>
                        <button
                            onClick={handlePrint}
                            disabled={loading}
                            style={{
                                padding: "10px 28px",
                                borderRadius: 10,
                                border: "none",
                                background: loading ? "rgba(124,58,237,0.4)" : "rgba(124,58,237,0.9)",
                                color: "#fff",
                                fontSize: 14,
                                fontWeight: "bold",
                                cursor: loading ? "not-allowed" : "pointer",
                            }}
                        >
                            {loading ? "Printing..." : "🖨️ Print"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── DARK MODAL — default view ─────────────────────
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
        >
            <div className="Order_Details_modal">
                {/* Header */}
                <div className="Order_Details_modal_header">
                    <div className="flex items-center gap-3">
                        <div class="modal_header_icon">🗂️</div>
                        <div>
                            <h2>Order #{uniqueOrderId}</h2>
                            <p>Table: {tableNameMap[tableId] || tableId}</p>
                        </div>
                    </div>
                    <button onClick={onClose} >
                        ×
                    </button>
                </div>

                {/* Items Table */}
                <div className="main_table_container mt-3 border-0">
                    <table style={{ width: "100%", }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                                {["Item", "Qty", "Rate", "Total"].map((h) => (
                                    <th key={h} >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {orderItems.map((item, i) => {
                                const remarks = [...(item.predefinedRemarks || []), item.qtyRemark || ""].filter(Boolean).join(", ");
                                return (
                                    <>
                                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                            <td >{item.dg09_name}</td>
                                            <td>{item.qty}</td>
                                            <td>₹{Number(item.price).toFixed(2)}</td>
                                            <td>₹{(item.price * item.qty).toFixed(2)}</td>
                                        </tr>
                                        {remarks && (
                                            <tr key={`r-${i}`}>
                                                <td colSpan={4}>
                                                    Remark: {remarks}
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div style={{ margin: "0 20px 16px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", fontSize: "13px" }}>
                    <TotalRow label="Sub-Total" value={`₹${subTotal.toFixed(2)}`} />
                    {taxBreakdown.map((t, i) => (
                        <TotalRow key={i} label={`${t.name} (${t.pct}%)`} value={`₹${t.amount.toFixed(2)}`} muted />
                    ))}
                    {chargeBreakdown.map((c, i) => (
                        <TotalRow key={i} label={c.name} value={`₹${c.amount.toFixed(2)}`} muted />
                    ))}
                    {roundOff !== 0 && (
                        <TotalRow label="Round Off" value={`${roundOff >= 0 ? "+" : ""}${roundOff}`} muted />
                    )}
                    <TotalRow label="Grand Total" value={`₹${grandTotal}`} bold />
                </div>

                {/* Footer Buttons */}
                <div style={{ display: "flex", gap: "10px", padding: "0 20px 20px" }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1, padding: "10px", borderRadius: "10px",
                            border: "1px solid rgba(197,163,119,0.25)",
                            color: "#000",
                            background: "rgba(255,255,255,0.03)",
                            fontSize: "14px", cursor: "pointer",
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => setShowPreview(true)}
                        style={{
                            flex: 2, padding: "10px", borderRadius: "10px",
                            border: "none", background: "var(--primary-color)",
                            color: "#fff", fontSize: "14px",
                            fontWeight: 600, cursor: "pointer",
                        }}
                    >
                        🖨 Print
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Helper Components ─────────────────────────

function QDivider() {
    return <div style={{ borderTop: "1px dashed #999", margin: "5px 0" }} />;
}

function QLeftRow({ label, value }) {
    return (
        <div style={{ display: "flex", justifyContent: "flex-start", gap: 6, fontSize: 11, marginBottom: 2 }}>
            <span style={{ color: "#333" }}>{label} :</span>
            <span>{value}</span>
        </div>
    );
}

function QAmtRow({ label, value, muted }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
            <span style={{ color: muted ? "#555" : "#111" }}>{label} :</span>
            <span style={{ color: muted ? "#555" : "#111" }}>{value}</span>
        </div>
    );
}

function TotalRow({ label, value, bold, muted }) {
    return (
        <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "8px 12px", borderBottom: "1px solid #e9f3ff",
        }}>
            <span style={{ color: bold ? "#334155" : muted ? "#334155" : "#334155", fontWeight: bold ? 600 : 400 }}>
                {label}
            </span>
            <span style={{ color: bold ? "#334155" : muted ? "#334155" : "#334155", fontWeight: bold ? 700 : 500 }}>
                {value}
            </span>
        </div>
    );
}