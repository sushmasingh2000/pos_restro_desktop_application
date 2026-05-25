// import React, { useRef } from "react";

// const KOTPrintSlip = ({ kotData, onClose }) => {
//   const printRef = useRef();

//   const handlePrint = () => {
//     const printContents = printRef.current.innerHTML;
//     const win = window.open("", "_blank", "width=400,height=600");
//     win.document.write(`
//       <html>
//         <head>
//           <title>KOT Print</title>
//           <style>
//             @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
//             * { margin: 0; padding: 0; box-sizing: border-box; }
//             body {
//               font-family: 'Courier Prime', 'Courier New', monospace;
//               font-size: 13px;
//               background: #fff;
//               color: #000;
//               width: 80mm;
//               padding: 8px;
//             }
//             .center { text-align: center; }
//             .bold { font-weight: 700; }
//             .uppercase { text-transform: uppercase; }
//             .dashed { border-top: 1px dashed #000; margin: 6px 0; }
//             .header-row { display: flex; justify-content: space-between; }
//             .item-row { display: flex; justify-content: space-between; margin: 6px 0; }
//             .item-name { flex: 1; font-size: 14px; font-weight: 700; }
//             .item-qty { font-size: 14px; font-weight: 700; min-width: 30px; text-align: right; }
//             .remark { font-size: 11px; color: #333; padding-left: 8px; font-style: italic; }
//             .meta-row { display: flex; gap: 4px; font-size: 12px; margin: 2px 0; }
//             .meta-label { font-weight: 700; min-width: 110px; }
//           </style>
//         </head>
//         <body>${printContents}</body>
//       </html>
//     `);
//     win.document.close();
//     win.focus();
//     setTimeout(() => {
//       win.print();
//       win.close();
//     }, 300);
//   };

//   if (!kotData) return null;

//   const {
//     orderNo,
//     tableNo,
//     kotNo,
//     captainName,
//     type,
//     dateTime,
//     items = [],
//   } = kotData;

//   return (
//     // ── Overlay ──────────────────────────────────────────────
//     <div
//       className="fixed inset-0 z-50 flex items-center justify-center"
//       style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
//     >
//       <div className="Order_Details_modal">
//          {/* HEADER */}
//         <div className="Order_Details_modal_header">
//           <div className="flex items-center gap-3">
//               <div className="modal_header_icon">🍳</div>
//               <div>
//               <h2>KOT Preview</h2>
//               <p>Kitchen Order Ticket</p>
//             </div>
//           </div>
//           <button onClick={onClose}>×</button>
//         </div>
//         <div className="ordre_table_lBoxs" ref={printRef}>
//             <div className="ordre_table_list">
//               <ul>
//                 <li>ORDER NO.- <span>{orderNo || "—"}</span></li>
//                 <li>TABLE NO.- <span>{tableNo || "—"}</span></li>
//                 <li>KOT NO.- <span>{kotNo || "1"}</span></li>
//                 <li>CAPTAIN NAME.- <span>{captainName || "—"}</span></li>
//                 <li>TYPE.- <span>{type || "—"}</span></li>
//                 <li>DATE & TIME.- <span>{dateTime || "—"}</span></li>
//               </ul>
//             </div>
//             <div className="ordre_table_list_2">
//               <ul>
//                 <li>
//                   <h6>ITEM</h6>
//                   <span>
//                     <h6>QTY</h6>
//                   </span>
//                 </li>

//                 {items.map((item, idx) => {
//                   // Collect all remarks
//                   const remarks = [];

//                   if (item.predefinedRemarks?.length > 0) {
//                     remarks.push(...item.predefinedRemarks);
//                   }

//                   if (item.qtyRemark?.trim()) {
//                     remarks.push(item.qtyRemark.trim());
//                   }

//                   if (item.globalRemark?.trim()) {
//                     remarks.push(`Note: ${item.globalRemark.trim()}`);
//                   }

//                   return (
//                     <React.Fragment key={idx}>
//                       <li>
//                         <b>{item.name}</b>
//                         <span>{item.qty}</span>
//                       </li>

//                       {/* Remarks */}
//                       {remarks.map((r, ri) => (
//                         <p
//                           key={ri}
//                           style={{
//                             fontSize: 11,
//                             color: "#444",
//                             paddingLeft: 10,
//                             fontStyle: "italic",
//                             margin: 0,
//                           }}
//                         >
//                           ↳ {r}
//                         </p>
//                       ))}
//                     </React.Fragment>
//                   );
//                 })}
//               </ul>
//             </div>
//         </div>
       
        

       

//         {/* ── Buttons ─── */}
//         <div className="flex justify-between gap-3 modal_footer px-3 py-3">
//           <button
//             onClick={onClose}
//             className="cancel_btn">
//             ✕ Close
//           </button>
//           <button
//             onClick={handlePrint}
//             className="update_btn">
//             🖨 Print KOT
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };


// export default KOTPrintSlip;

import React, { useRef } from "react";
import toast from "react-hot-toast";

const KOTPrintSlip = ({ kotData, onClose }) => {
  const printRef = useRef();

  const handlePrint = async () => {
    const token = localStorage.getItem("token");

    if (window.electronAPI?.printKot) {
      const result = await window.electronAPI.printKot({
        kotData: {
          orderId: kotData.orderNo,
          table_no: kotData.tableNo,
          kotNo: kotData.kotNo,
          captainName: kotData.captainName,
          type: kotData.type,
          dateTime: kotData.dateTime,
          items: (kotData.items || []).map((i) => ({
            name: i.name,
            qty: i.qty,
            predefinedRemarks: i.predefinedRemarks || [],
            qtyRemark: i.qtyRemark || "",
            globalRemark: i.globalRemark || "",
          })),
        },
        token,
      });
      if (result.success) {
        toast.success("KOT printed!");
      } else {
        toast.error(`Print failed: ${result.message}`);
      }
    } else {
      // Fallback — browser print (dev mode)
      const printContents = printRef.current.innerHTML;
      const win = window.open("", "_blank", "width=400,height=600");
      win.document.write(`
        <html>
          <head>
            <title>KOT Print</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Courier Prime', 'Courier New', monospace;
                font-size: 13px;
                background: #fff;
                color: #000;
                width: 80mm;
                padding: 8px;
              }
              .addon {
                font-size: 11px;
                padding-left: 12px;
                font-style: italic;
                color: #444;
                margin: 2px 0;
              }
              .ordre_table_lBoxs { padding: 8px; }
              .ordre_table_list ul { list-style: none; padding: 0; margin: 0 0 6px 0; }
              .ordre_table_list ul li {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
                margin: 2px 0;
              }
              .ordre_table_list ul li span { font-weight: 700; }
              .ordre_table_list_2 ul { list-style: none; padding: 0; margin: 0; }
              .ordre_table_list_2 ul li {
                display: flex;
                justify-content: space-between;
                font-size: 14px;
                font-weight: 700;
                margin: 6px 0;
                border-top: 1px dashed #ccc;
                padding-top: 4px;
              }
              .ordre_table_list_2 ul li:first-child { border-top: none; }
            </style>
          </head>
          <body>${printContents}</body>
        </html>
      `);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        win.close();
      }, 300);
    }
  };

  if (!kotData) return null;

  const {
    orderNo,
    tableNo,
    kotNo,
    captainName,
    type,
    dateTime,
    items = [],
  } = kotData;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
    >
      <div className="Order_Details_modal">
        {/* HEADER */}
        <div className="Order_Details_modal_header">
          <div className="flex items-center gap-3">
            <div className="modal_header_icon">🍳</div>
            <div>
              <h2>KOT Preview</h2>
              <p>Kitchen Order Ticket</p>
            </div>
          </div>
          <button onClick={onClose}>×</button>
        </div>

        {/* PRINTABLE AREA */}
        <div className="ordre_table_lBoxs" ref={printRef}>
          {/* Meta info */}
          <div className="ordre_table_list">
            <ul>
              <li>ORDER NO.-      <span>{orderNo || "—"}</span></li>
              <li>TABLE NO.-      <span>{tableNo || "—"}</span></li>
              <li>KOT NO.-        <span>{kotNo || "1"}</span></li>
              <li>CAPTAIN NAME.-  <span>{captainName || "—"}</span></li>
              <li>TYPE.-          <span>{type || "—"}</span></li>
              <li>DATE &amp; TIME.- <span>{dateTime || "—"}</span></li>
            </ul>
          </div>

          {/* Items */}
          <div className="ordre_table_list_2">
            <ul>
              {/* Header row */}
              <li>
                <h6>ITEM</h6>
                <span><h6>QTY</h6></span>
              </li>

              {items.map((item, idx) => {
                const remarks = [];
                if (item.predefinedRemarks?.length > 0) {
                  remarks.push(...item.predefinedRemarks);
                }
                if (item.qtyRemark?.trim()) {
                  remarks.push(item.qtyRemark.trim());
                }
                if (item.globalRemark?.trim()) {
                  remarks.push(`Note: ${item.globalRemark.trim()}`);
                }

                return (
                  <React.Fragment key={idx}>
                    <li>
                      <b>{item.name}</b>
                      <span>{item.qty}</span>
                    </li>
                    {remarks.map((r, ri) => (
                      <p
                        key={ri}
                        className="addon"
                        style={{
                          fontSize: 11,
                          color: "#444",
                          paddingLeft: 12,
                          fontStyle: "italic",
                          margin: "2px 0",
                        }}
                      >
                        ↳ {r}
                      </p>
                    ))}
                  </React.Fragment>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-between gap-3 modal_footer px-3 py-3">
          <button onClick={onClose} className="cancel_btn">
            ✕ Close
          </button>
          <button onClick={handlePrint} className="update_btn">
            🖨 Print KOT
          </button>
        </div>
      </div>
    </div>
  );
};

export default KOTPrintSlip;