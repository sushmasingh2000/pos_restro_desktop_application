import { useState, useEffect } from "react";
import { useQuery } from "react-query";
import { apiConnectorGet } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import toast from "react-hot-toast";

export default function TableQuickPrintModal({
    isOpen,
    onClose,
    orderId,
    tableId,
    tableNameMap = {},
    orderItems = [],
}) {
    const [loading, setLoading] = useState(false);

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
        amount:
            Math.round(((subTotal * parseFloat(t.dg032_percentage)) / 100) * 100) /
            100,
    }));
    const totalTax = taxBreakdown.reduce((s, t) => s + t.amount, 0);

    const chargeBreakdown = charges.map((c) => ({
        name: c.dg035_name,
        amount:
            c.dg035_type === "Percentage"
                ? (subTotal * parseFloat(c.dg035_value)) / 100
                : parseFloat(c.dg035_value),
    }));
    const totalCharges = chargeBreakdown.reduce((s, c) => s + c.amount, 0);

    const beforeRound =
        Math.round((subTotal + totalTax + totalCharges) * 100) / 100;
    const grandTotal = Math.round(beforeRound);
    const roundOff = parseFloat((grandTotal - beforeRound).toFixed(2));

    // ── Print handler ─────────────────────────────────
    const handlePrint = async () => {
        if (loading) return;
        setLoading(true);

        try {
            const billData = {
                orderId,
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
                        .filter(Boolean)
                        .join(", "),
                })),
            };

            const token = localStorage.getItem("token");

            if (window.electronAPI?.printBill) {
                const printResult = await window.electronAPI.printBill({
                    billData,
                    token,
                });
                if (printResult.success) {
                    toast.success("Print successful!");
                    onClose();
                } else {
                    toast.error(`Print failed: ${printResult.message}`);
                }
            } else {
                toast.success("Bill data ready (no Electron)");
                console.log("billData:", billData);
            }
        } catch (err) {
            console.error(err);
            toast.error("Print failed");
        }

        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}

        >
            <div
                style={{
                    background: "linear-gradient(145deg, #1f1a17, #2a221d)",
                    border: "1px solid rgba(197,163,119,0.25)",
                    borderRadius: "16px",
                    width: "100%",
                    maxWidth: "480px",
                    overflow: "hidden",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "16px 20px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                    }}
                >
                    <div>
                        <h2
                            style={{
                                margin: 0,
                                fontSize: "16px",
                                fontWeight: 600,
                                color: "#f5deb3",
                            }}
                        >
                            🧾 Order #{orderId}
                        </h2>

                        <p
                            style={{
                                margin: "2px 0 0",
                                fontSize: "13px",
                                color: "rgba(197,163,119,0.65)",
                            }}
                        >
                            Table: {tableNameMap[tableId] || tableId}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "none",
                            border: "none",
                            color: "rgba(255,255,255,0.5)",
                            fontSize: "22px",
                            cursor: "pointer",
                            lineHeight: 1,
                            padding: "4px",
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Items Table */}
                <div style={{ padding: "16px 20px", maxHeight: "340px", overflowY: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                                {["Item", "Qty", "Rate", "Total"].map((h) => (
                                    <th
                                        key={h}
                                        style={{
                                            padding: "8px 6px",
                                            textAlign: h === "Item" ? "left" : "right",
                                            color: "rgba(255,255,255,0.4)",
                                            fontWeight: 500,
                                            fontSize: "11px",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em",
                                        }}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {orderItems.map((item, i) => {
                                const remarks = [
                                    ...(item.predefinedRemarks || []),
                                    item.qtyRemark || "",
                                ]
                                    .filter(Boolean)
                                    .join(", ");
                                return (
                                    <>
                                        <tr
                                            key={i}
                                            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                                        >
                                            <td style={{ padding: "10px 6px", color: "#fff" }}>
                                                {item.dg09_name}
                                            </td>
                                            <td style={{ padding: "10px 6px", textAlign: "right", color: "rgba(255,255,255,0.7)" }}>
                                                {item.qty}
                                            </td>
                                            <td style={{ padding: "10px 6px", textAlign: "right", color: "rgba(255,255,255,0.7)" }}>
                                                ₹{Number(item.price).toFixed(2)}
                                            </td>
                                            <td style={{ padding: "10px 6px", textAlign: "right", color: "#fff", fontWeight: 500 }}>
                                                ₹{(item.price * item.qty).toFixed(2)}
                                            </td>
                                        </tr>
                                        {remarks && (
                                            <tr key={`r-${i}`}>
                                                <td
                                                    colSpan={4}
                                                    style={{
                                                        padding: "0 6px 8px",
                                                        fontSize: "12px",
                                                        color: "rgba(252,211,77,0.7)",
                                                        fontStyle: "italic",
                                                    }}
                                                >
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
                <div
                    style={{
                        margin: "0 20px 16px",
                        borderRadius: "10px",
                        border: "1px solid rgba(255,255,255,0.08)",
                        overflow: "hidden",
                        fontSize: "13px",
                    }}
                >
                    <TotalRow label="Sub-Total" value={`₹${subTotal.toFixed(2)}`} />
                    {taxBreakdown.map((t, i) => (
                        <TotalRow
                            key={i}
                            label={`${t.name} (${t.pct}%)`}
                            value={`₹${t.amount.toFixed(2)}`}
                            muted
                        />
                    ))}
                    {chargeBreakdown.map((c, i) => (
                        <TotalRow
                            key={i}
                            label={`${c.name}`}
                            value={`₹${c.amount.toFixed(2)}`}
                            muted
                        />
                    ))}
                    {roundOff !== 0 && (
                        <TotalRow
                            label="Round Off"
                            value={`${roundOff >= 0 ? "+" : ""}${roundOff}`}
                            muted
                        />
                    )}
                    <TotalRow
                        label="Grand Total"
                        value={`₹${grandTotal}`}
                        bold
                    />
                </div>

                {/* Footer Buttons */}
                <div
                    style={{
                        display: "flex",
                        gap: "10px",
                        padding: "0 20px 20px",
                    }}
                >
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: "10px",
                            borderRadius: "10px",
                            border: "1px solid rgba(197,163,119,0.25)",
                            color: "rgba(255,235,210,0.75)",
                            background: "rgba(255,255,255,0.03)",
                            fontSize: "14px",
                            cursor: "pointer",
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handlePrint}
                        disabled={loading}
                        style={{
                            flex: 2,
                            padding: "10px",
                            borderRadius: "10px",
                            border: "none",
                            background: loading
                                ? "rgba(197,163,119,0.45)"
                                : "#c5a377",
                            color: "#1b1b1b",
                            fontSize: "14px",
                            fontWeight: 600,
                            cursor: loading ? "not-allowed" : "pointer",
                        }}
                    >
                        {loading ? "Printing..." : "🖨 Print"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function TotalRow({ label, value, bold, muted }) {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                // background: bold ? "rgba(124,58,237,0.12)" : "transparent",
            }}
        >
            <span
                style={{
                    color: bold
                        ? "#ffe7bf"
                        : muted
                            ? "rgba(255,240,220,0.6)"
                            : "#f8e7c9",
                    fontWeight: bold ? 600 : 400,
                }}
            >
                {label}
            </span>
            <span
                style={{
                    color: bold ? "#e9d5ff" : muted ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.85)",
                    fontWeight: bold ? 700 : 500,
                }}
            >
                {value}
            </span>
        </div>
    );
}