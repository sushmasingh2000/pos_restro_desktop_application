import React from "react";

export default function BillItemsTable({ orderItems }) {
  return (
    <div className="main_table_container">
      <div className="overflow-x-auto" style={{ borderRadius: "14px" }}>
        <table className="w-full">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
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
                  <tr key={i} className="border-t border-white/5">
                    <td>{item.dg09_name}</td>
                    <td>{item.qty}</td>
                    <td>₹{Number(item.price || item.basePrice).toFixed(2)}</td>
                    <td>₹{((item.price || item.basePrice) * item.qty).toFixed(2)}</td>
                  </tr>
                  {remarks && (
                    <tr
                      key={`remark-${i}`}
                      className="border-t border-white/5"
                    >
                      <td
                        colSpan="4"
                        className="px-2.5 py-2 text-sm text-yellow-300/70 italic"
                      >
                        <span className="text-white">Remark:</span>{" "}
                        {remarks}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        {orderItems.find((i) => i.globalRemark) && (
          <div className="mt-1 px-3 py-2 rounded-xl text-xs text-yellow-300/70 italic border border-white/10 bg-white/5">
            📝 Note:{" "}
            {orderItems.find((i) => i.globalRemark)?.globalRemark}
          </div>
        )}
      </div>
    </div>
  );
}
