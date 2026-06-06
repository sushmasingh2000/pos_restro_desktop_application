import { useState, useEffect } from "react";
import { useQuery } from "react-query";
import { apiConnectorGet, apiConnectorPost } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import BillPreviewModal from "./BillpriviewModal";

export default function BillModal({
  isOpen,
  onClose,
  orderItems = [],
  orderId,
  uniqueOrderId,
  tableId,
  orderType,
  tableNameMap = {},
  onBillDone,
  existingBillId = null,
}) {
  // ── Customer ──────────────────────────────────────
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerList, setCustomerList] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [reprintWalletUsed, setReprintWalletUsed] = useState(0); //NAYA
  const [showPreview, setShowPreview] = useState(false);

  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    tax_id: "",
    dob: "",
    anniversary: "",
  });

  // ── Wallet ────────────────────────────────────────
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);

  // ── Discount ──────────────────────────────────────
  const [discountMode, setDiscountMode] = useState("percent");
  const [discountPct, setDiscountPct] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);

  // ── Payment ───────────────────────────────────────
  // const [selectedMode, setSelectedMode] = useState("");
  // ADD karo ye:
  const [paymentSplits, setPaymentSplits] = useState([
    { mode: "", amount: "" },
  ]);

  const selectedMode = paymentSplits[0]?.mode || "";
  const isLending = selectedMode?.toLowerCase() === "lending";
  const isAdvance = selectedMode?.toLowerCase() === "advance";
  const [givenAmount, setGivenAmount] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Bill state ────────────────────────────────────
  const [savedBillId, setSavedBillId] = useState(existingBillId);
  const [savedBillNo, setSavedBillNo] = useState(null);
  const isReprint = !!savedBillId;
  const [reprintRemainingDue, setReprintRemainingDue] = useState(0);

  const { data: branchData } = useQuery(
    ["branch_profile"],
    () => apiConnectorGet(endpoint.branch_profile_api),
    { enabled: isOpen, refetchOnWindowFocus: false }
  );

  const branch = branchData?.data?.result || {};

  const navigate = useNavigate();

  // ── Sirf Close Table ke liye validation ──
  const validateForClose = () => {
    if (!paymentSplits[0]?.mode?.trim()) {
      toast.error("Select payment method!");
      return false;
    }
    if (!isLending && !isAdvance && paymentSplits.length > 1) {
      const allModesSelected = paymentSplits.every((p) => p.mode?.trim());
      if (!allModesSelected) {
        toast.error("Select split methods!");
        return false;
      }
      const totalSplitPaid = paymentSplits.reduce(
        (s, p) => s + parseFloat(p.amount || 0), 0
      );
      if (Math.abs(totalSplitPaid - afterWalletTotal) > 0.5) {
        toast.error(`Split total ₹${afterWalletTotal.toFixed(2)} hona chahiye!`);
        return false;
      }
    }
    if (isLending && !customer.phone.trim()) {
      toast.error("Customer phone required for Lending!");
      return false;
    }
    if (isLending && !customer.name.trim()) {
      toast.error("Customer name required for Lending!");
      return false;
    }
    if (isAdvance && !selectedCustomerId) {
      toast.error("Customer select for Advance payment!");
      return false;
    }
    if (isAdvance && walletBalance <= 0) {
      toast.error("Your wallet balance is zero!");
      return false;
    }
    if (useWallet && !selectedCustomerId) {
      toast.error("Wallet use ke liye customer select karo!");
      return false;
    }
    return true;
  };

  // ── Print Bill ke liye — sirf basic check ──
  const validateForPrint = () => {
    if (isReprint) return true;
    // payment method optional for print
    return true;
  };
  useEffect(() => {
    if (!customerSearch.trim()) return;
    const fetchCustomers = async () => {
      try {
        const res = await apiConnectorGet(
          `${endpoint.customer_search_api}?q=${customerSearch}`
        );
        setCustomerList(res?.data?.result || []);
      } catch {
        console.log("Customer search failed");
      }
    };
    const delay = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(delay);
  }, [customerSearch]);

  // ── Bill fetch (reprint) ──────────────────────────
  useEffect(() => {
    if (!savedBillId || !isOpen) return;
    const fetchBillDetails = async () => {
      try {
        const res = await apiConnectorGet(
          `${endpoint.get_bill_by_id_api}/${savedBillId}`
        );
        const bill = res?.data?.result;
        if (!bill) return;
        setCustomer({
          name: bill.customer_name || "",
          phone: bill.customer_phone || "",
          address: bill.customer_address || "",
          tax_id: bill.customer_tax_id || "",
          dob: bill.customer_dob || "",
          anniversary: bill.customer_anniversary || "",
        });
        // if (bill.paymentMethod) setSelectedMode(bill.paymentMethod);
        if (bill.paid_amount && parseFloat(bill.paid_amount) > 0)
          setGivenAmount(String(bill.paid_amount));
        const discAmt = parseFloat(bill.discount || 0);
        const sub = parseFloat(bill.subtotal || 0);
        if (discAmt > 0 && sub > 0) {
          setDiscountMode("percent");
          setDiscountPct(((discAmt / sub) * 100).toFixed(2));
        }
        if (bill.customer_id) setSelectedCustomerId(bill.customer_id);
        if (bill.remaining_amount) {
          setReprintRemainingDue(parseFloat(bill.remaining_amount));
        }
        // fetchBillDetails mein:
        // if (bill.payment_splits?.length > 0) {
        //   setPaymentSplits(bill.payment_splits);
        // } else if (bill.paymentMethod) {
        //   setPaymentSplits([
        //     { mode: bill.paymentMethod, amount: bill.paid_amount || "" },
        //   ]);
        // }
        if (bill.payment_splits?.length > 0) {
          setPaymentSplits(bill.payment_splits);
        } else if (bill.paymentMethod) {
          // "Cash+Card" ko split mat karo, single mode treat karo
          setPaymentSplits([
            {
              mode: bill.paymentMethod,
              amount: bill.paid_amount || "",
            },
          ]);
        }
        if (bill.paid_amount && parseFloat(bill.paid_amount) > 0) {
          // setReprintWalletUsed(parseFloat(bill.given_amount));
          setReprintWalletUsed(
            parseFloat(bill.advance_used || bill.wallet_used || 0)
          );
        }
      } catch (err) {
        console.error("Bill fetch failed:", err);
      }
    };
    fetchBillDetails();
  }, [savedBillId, isOpen]);

  // ── Wallet fetch — jab customer select ho ─────────
  useEffect(() => {
    if (!selectedCustomerId || !isOpen) return;
    const fetchWallet = async () => {
      try {
        const res = await apiConnectorGet(
          `${endpoint.customer_ledger_api}/${customer.phone}`
        );
        const bal = res?.data?.result?.customer?.walletBalance || 0;
        setWalletBalance(bal);
      } catch {
        setWalletBalance(0);
      }
    };
    fetchWallet();
  }, [selectedCustomerId, isOpen]);

  // ─────────────────────────────────────────────────
  //ADVANCE auto-enable wallet
  // Jab isAdvance ON ho aur walletBalance > 0 →
  // useWallet automatically true kar do
  // Jab advance hatao → useWallet reset
  // ─────────────────────────────────────────────────
  useEffect(() => {
    if (isAdvance && walletBalance > 0) {
      setUseWallet(true);
    } else if (!isAdvance) {
      setUseWallet(false);
    }
  }, [isAdvance, walletBalance]);

  // ── Reset on open ─────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setCustomer({
        name: "",
        phone: "",
        address: "",
        tax_id: "",
        dob: "",
        anniversary: "",
      });
      setSelectedCustomerId(null);
      setWalletBalance(0);
      setUseWallet(false);
      setDiscountMode("percent");
      setDiscountPct(0);
      setCouponCode("");
      setCouponDiscount(0);
      // setSelectedMode("");
      setPaymentSplits([{ mode: "", amount: "" }]);

      setGivenAmount("");
      setSavedBillId(existingBillId || null);
      setSavedBillNo(null);
    }
  }, [isOpen, existingBillId]);

  // ── Fetch payment modes ───────────────────────────
  const { data: modesData } = useQuery(
    ["get_payment_modes"],
    () => apiConnectorGet(endpoint.payment_mode_get_api),
    { enabled: isOpen, refetchOnWindowFocus: false }
  );
  const paymentModes = modesData?.data?.result || [];

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
  // Sirf taxable items ka total
  const taxableSubTotal = orderItems.reduce((acc, i) =>
    i.tax_group_id ? acc + parseFloat(i.basePrice) * i.qty : acc, 0
  );

  // Non-taxable items ka total  
  const nonTaxableSubTotal = orderItems.reduce((acc, i) =>
    !i.tax_group_id ? acc + i.price * i.qty : acc, 0
  );

  // SubTotal = dono ka sum (basePrice use karo taxable ke liye)
  const subTotal = taxableSubTotal + nonTaxableSubTotal;

  // Tax sirf taxable items pe
  const taxBreakdown = taxes.map((t) => ({
    name: t.dg032_name,
    pct: parseFloat(t.dg032_percentage),
    amount: Math.round(((taxableSubTotal * parseFloat(t.dg032_percentage)) / 100) * 100) / 100,
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

  const discountAmount =
    discountMode === "percent"
      ? (subTotal * parseFloat(discountPct || 0)) / 100
      : parseFloat(couponDiscount || 0);

  const beforeRound =
    Math.round((subTotal + totalTax + totalCharges - discountAmount) * 100) /
    100;
  const grandTotal = Math.round(beforeRound);
  const roundOff = parseFloat((grandTotal - beforeRound).toFixed(2));

  const maxWalletUse = useWallet ? Math.min(walletBalance, grandTotal) : 0;
  const afterWalletTotal = Math.max(0, grandTotal - maxWalletUse);
  const advanceRemaining = isAdvance ? afterWalletTotal : 0;

  const givenAmt = parseFloat(givenAmount || 0);
  const returnAmt =
    !isLending && !isAdvance && givenAmt > 0
      ? Math.max(0, givenAmt - afterWalletTotal)
      : 0;
  const lendingRemaining = isLending
    ? Math.max(0, afterWalletTotal - givenAmt)
    : 0;

  // ── Coupon apply ──────────────────────────────────
  const applyCoupon = async () => {
    if (!couponCode.trim()) return toast.error("Please enter coupon code!");
    try {
      const res = await apiConnectorPost(endpoint.apply_coupon_api, {
        coupon_code: couponCode,
        order_amount: subTotal,
      });
      if (res?.data?.success) {
        setCouponDiscount(res?.data?.discount_amount || 0);
        toast.success("Coupon applied!");
      } else {
        toast.error(res?.data?.message || "Invalid coupon");
      }
    } catch {
      toast.error("Failed to validate coupon");
    }
  };

  // ── Validate ──────────────────────────────────────
  const validate = () => {
    if (isReprint) return true;
    if (!paymentSplits[0]?.mode?.trim()) {
      toast.error("Please select payment method!");
      return false;
    }

    // ── NEW: Split amounts check (multi-split ke liye) ──
    if (!isLending && !isAdvance && paymentSplits.length > 1) {
      const allModesSelected = paymentSplits.every((p) => p.mode?.trim());
      if (!allModesSelected) {
        toast.error("Please select payment method for all splits!");
        return false;
      }
      const totalSplitPaid = paymentSplits.reduce(
        (s, p) => s + parseFloat(p.amount || 0),
        0
      );
      if (Math.abs(totalSplitPaid - afterWalletTotal) > 0.5) {
        toast.error(
          `Split total ₹${afterWalletTotal.toFixed(
            2
          )} hona chahiye! Abhi: ₹${totalSplitPaid.toFixed(2)}`
        );
        return false;
      }
    }
    if (isLending && !customer.phone.trim()) {
      toast.error("Customer phone required for Lending!");
      return false;
    }
    if (isLending && !customer.name.trim()) {
      toast.error("Customer name required for Lending!");
      return false;
    }
    // ─────────────────────────────────────────────────
    //ADVANCE validations
    // ─────────────────────────────────────────────────
    if (isAdvance && !selectedCustomerId) {
      toast.error("Select Customer  for Advance payment!");
      return false;
    }
    if (isAdvance && walletBalance <= 0) {
      toast.error("Your wallet balance is zero!");
      return false;
    }
    if (useWallet && !selectedCustomerId) {
      toast.error("Select Customer for Wallet payment!");
      return false;
    }
    return true;
  };

  const saveBill = () =>
    apiConnectorPost(endpoint.generate_bill_api, {
      orderId,

      subtotal: subTotal,
      tax_amount: totalTax,
      discount: discountAmount,
      round_off: roundOff,

      total_amount: grandTotal,

      // paymentMethod: selectedMode,

      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_address: customer.address,
      customer_id: selectedCustomerId,

      paymentMethod: paymentSplits.map((p) => p.mode).join("+"), // "Cash+UPI"
      payment_splits: paymentSplits, // [{mode:"Cash",amount:"70"},{mode:"UPI",amount:"30"}]

      // NEW
      paid_amount: isLending ? givenAmt : isAdvance ? maxWalletUse : grandTotal,

      remaining_amount: isLending
        ? lendingRemaining
        : isAdvance
          ? advanceRemaining
          : 0,

      wallet_used: useWallet && !isAdvance ? maxWalletUse : 0,

      advance_used: isAdvance ? maxWalletUse : 0,

      is_lending: isLending,
      is_advance: isAdvance,

      // ← BAS YE ADD KAR ooffline
      items: orderItems.map((i) => ({
        name: i.dg09_name,
        qty: i.qty,
        price: Number(i.price).toFixed(2),
        total: (i.price * i.qty).toFixed(2),
        remark: [...(i.predefinedRemarks || []), i.qtyRemark || ""]
          .filter(Boolean)
          .join(", "),
      })),
    });

  // ── Wallet/Advance deduct ─────────────────────────
  const deductWalletIfNeeded = async (billId) => {
    if ((!useWallet && !isAdvance) || maxWalletUse <= 0 || !selectedCustomerId)
      return;
    try {
      await apiConnectorPost(endpoint.wallet_deduct_api, {
        customerId: selectedCustomerId,
        amount: maxWalletUse,
        orderId,
        billId,
        // backend ko pata ho ki advance tha ya normal wallet
        type: isAdvance ? "advance" : "wallet",
      });
    } catch (err) {
      console.error("Wallet/Advance deduct failed:", err);
      toast.error(" Bill saved but deduction failed. Check manually.");
    }
  };

  const handlePrintBill = async () => {
    if (loading) return;
    if (!isReprint && !validateForPrint()) return; // ← sirf basic check
    setLoading(true);

    try {
      let finalBillId = savedBillId;
      let finalBillNo = savedBillNo;

      // ── Bill Save ────────────────────────────
      if (!isReprint) {
        const billRes = await saveBill();
        if (!billRes?.data?.success) {
          toast.error(billRes?.data?.message || "Bill save failed");
          setLoading(false);
          return;
        }
        finalBillId = billRes?.data?.billId || billRes?.data?.bill?.billId;
        finalBillNo = billRes?.data?.billNo || billRes?.data?.bill?.billNo;
        if (finalBillId) setSavedBillId(finalBillId);
        if (finalBillNo) setSavedBillNo(finalBillNo);

        // ── OFFLINE — printData seedha response mein hai ──
        if (billRes?.data?.offline) {
          const offlinePrintData = {
            ...billRes.data.printData,
            billNo: billRes.data.billNo,
            table_no: tableId ? tableNameMap[tableId] || tableId : null,
            date_time: new Date().toLocaleString("en-IN"),
            tax_breakdown: taxBreakdown,
          };

          const token = localStorage.getItem("token");
          if (window.electronAPI?.printBill) {
            const printResult = await window.electronAPI.printBill({
              billData: offlinePrintData,
              token,
            });
            if (printResult.success) {
              toast.success("Bill printed successfully!");
            } else {
              toast.error(`Print failed: ${printResult.message}`);
            }
          } else {
            toast.success("Bill saved offline!");
          }
          setLoading(false);
          return;  // ← offline mein yahan se nikal jao
        }

        await deductWalletIfNeeded(finalBillId);

      } else {
        // ── Reprint ───────────────────────────
        await apiConnectorPost(
          `${endpoint.update_bill_details_api}/${savedBillId}`,
          {
            paymentMethod: paymentSplits.map((p) => p.mode).join("+"),
            payment_splits: paymentSplits,
            customer_name: customer.name,
            customer_phone: customer.phone,
            customer_address: customer.address,
            discount: discountAmount,
            paid_amount: isLending ? givenAmt : isAdvance ? maxWalletUse : grandTotal,
            remaining_amount: isLending ? lendingRemaining : isAdvance ? advanceRemaining : 0,
            wallet_used: useWallet && !isAdvance ? maxWalletUse : 0,
            advance_used: isAdvance ? maxWalletUse : 0,
          }
        );
      }

      // ── ONLINE — normal bill data ─────────────
      const billData = {
        billNo: finalBillNo || finalBillId,
        orderId,
        table_no: tableId ? tableNameMap[tableId] || tableId : null,
        date_time: new Date().toLocaleString("en-IN"),
        tax_breakdown: taxBreakdown,
        customer_name: customer.name,
        customer_phone: customer.phone,
        subtotal: subTotal.toFixed(2),
        discount: discountAmount.toFixed(2),
        wallet_used: useWallet || isAdvance ? maxWalletUse.toFixed(2) : 0,
        advance_used: isAdvance ? maxWalletUse.toFixed(2) : 0,
        total_amount: grandTotal.toFixed(2),
        paymentMethod: paymentSplits.map((p) => p.mode).join("+"),
        payment_splits: paymentSplits,
        paid_amount: isLending ? givenAmt.toFixed(2) : isAdvance ? maxWalletUse.toFixed(2) : grandTotal.toFixed(2),
        remaining_amount: isLending ? lendingRemaining.toFixed(2) : isAdvance ? advanceRemaining.toFixed(2) : 0,
        is_lending: isLending,
        is_advance: isAdvance,
        round_off: roundOff,
        items: orderItems.map((i) => ({
          name: i.dg09_name,
          qty: i.qty,
          rate: Number(i.price).toFixed(2),
          total: (i.price * i.qty).toFixed(2),
          remark: [...(i.predefinedRemarks || []), i.qtyRemark || ""].filter(Boolean).join(", "),
        })),
      };

      const token = localStorage.getItem("token");
      if (window.electronAPI?.printBill) {
        const printResult = await window.electronAPI.printBill({ billData, token });
        if (printResult.success) {
          toast.success(isReprint ? "Bill reprinted!" : "Bill printed successfully!");
        } else {
          toast.error(`Print failed: ${printResult.message}`);
        }
      } else {
        toast.success("Bill saved!");
      }

    } catch (err) {
      console.error(err);
      toast.error("Printing failed");
    }

    setLoading(false);
  };

  const handleCloseTable = async () => {
    if (loading) return;
    if (!validateForClose()) return;
    setLoading(true);

    try {
      if (!savedBillId) {
        // Naya bill banao
        const billRes = await saveBill();
        if (!billRes?.data?.success) {
          toast.error(billRes?.data?.message || "Bill save failed");
          setLoading(false);
          return;
        }
        const newBillId = billRes?.data?.billId || billRes?.data?.bill?.billId;
        const newBillNo = billRes?.data?.billNo || billRes?.data?.bill?.billNo;
        if (newBillId) setSavedBillId(newBillId);
        if (newBillNo) setSavedBillNo(newBillNo);
        if (!billRes?.data?.offline) {
          await deductWalletIfNeeded(newBillId);
        }
      } else {
        // ✅ Bill exist karta hai — payment method update karo
        await apiConnectorPost(
          `${endpoint.update_bill_details_api}/${savedBillId}`,
          {
            paymentMethod: paymentSplits.map((p) => p.mode).join("+"),
            payment_splits: paymentSplits,
            customer_name: customer.name,
            customer_phone: customer.phone,
            customer_address: customer.address,
            discount: discountAmount,
            paid_amount: isLending ? givenAmt : isAdvance ? maxWalletUse : grandTotal,
            remaining_amount: isLending ? lendingRemaining : isAdvance ? advanceRemaining : 0,
            wallet_used: useWallet && !isAdvance ? maxWalletUse : 0,
            advance_used: isAdvance ? maxWalletUse : 0,
          }
        );
      }

      if (orderType === "dine_in" && tableId) {
        await apiConnectorPost(endpoint.update_table_status_api, {
          tableId,
          status: "Available",
        });
      }

      toast.success(
        isLending
          ? `Udhaar saved! Remaining: ₹${lendingRemaining}`
          : isAdvance && advanceRemaining > 0
            ? `Advance partially used! Due: ₹${advanceRemaining}`
            : "Table closed successfully!"
      );

      onBillDone?.();
      onClose();
      navigate("/userdashboard");
      window.location.reload();

    } catch (err) {
      console.error(err);
      toast.error("Server error");
    }

    setLoading(false);
  };

  // const handleCloseTable = async () => {
  //   if (loading) return;
  //   if (!validate()) return;
  //   setLoading(true);
  //   try {
  //     if (!savedBillId) {
  //       const billRes = await saveBill();
  //       if (!billRes?.data?.success) {
  //         toast.error(billRes?.data?.message || "Bill save failed");
  //         setLoading(false);
  //         return;
  //       }
  //       const newBillId = billRes?.data?.billId || billRes?.data?.bill?.billId;
  //       const newBillNo = billRes?.data?.billNo || billRes?.data?.bill?.billNo;
  //       if (newBillId) setSavedBillId(newBillId);
  //       if (newBillNo) setSavedBillNo(newBillNo);
  //       await deductWalletIfNeeded(newBillId);
  //     }
  //     if (orderType === "dine_in" && tableId) {
  //       await apiConnectorPost(endpoint.update_table_status_api, {
  //         tableId,
  //         status: "Available",
  //       });
  //     }
  //     // ─────────────────────────────────────────────
  //     //Advance partial toast — alag message
  //     // ─────────────────────────────────────────────
  //     toast.success(
  //       isLending
  //         ? `Udhaar saved! Remaining: ₹${lendingRemaining}`
  //         : isAdvance && advanceRemaining > 0
  //           ? `Advance partially used! Due: ₹${advanceRemaining}`
  //           : "Table closed successfully!"
  //     );
  //     onBillDone?.();
  //     onClose();
  //     navigate("/userdashboard");
  //     window.location.reload();
  //   } catch (err) {
  //     console.error(err);
  //     toast.error("Server error");
  //   }
  //   setLoading(false);
  // };

  if (!isOpen) return null;

  const inp = "";

  const allModes =
    paymentModes.length > 0
      ? paymentModes.map((m) => ({ id: m.dg041_mode_id, name: m.dg041_name }))
      : [
        { id: "cash", name: "Cash" },
        { id: "upi", name: "UPI" },
        { id: "card", name: "Card" },
        { id: "lending", name: "Lending" },
        { id: "advance", name: "Advance" },
      ];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="Order_Details_modal"
        style={{ width: "100%", maxWidth: "100%" }}
      >
        {/* HEADER */}
        <div className="Order_Details_modal_header">
          <div className="flex items-center gap-3">
            <div className="modal_header_icon">🧾</div>
            <div>
              <h2>Bill Summary</h2>
              <p>
                Order #{orderId}
                {savedBillNo
                  ? ` • ${savedBillNo}`
                  : savedBillId
                    ? ` • Bill #${savedBillId}`
                    : ""}
                {orderType === "dine_in" && tableId
                  ? ` • Table: ${tableNameMap[tableId] || tableId}`
                  : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose}>×</button>
        </div>

        <div
          className="flex overflow-y-auto"
          style={{ maxHeight: "calc(95vh - 200px)" }}
        >
          {/* ═══ LEFT — Bill breakdown ═══ */}
          <div className="flex-1 p-3 border-r border-white/10 space-y-4">
            {isReprint && (
              <div className=" main_bill_payment">
                ⟳ Bill already saved ({savedBillNo || `Bill #${savedBillId}`}) —
                Reprint bill or close table?
                {/*Advance partial due dikhao reprint mein */}
                {reprintRemainingDue > 0 && (
                  <div className="mt-2 text-red-300 font-bold text-base">
                    Remaining Due: ₹{reprintRemainingDue.toFixed(2)}
                  </div>
                )}
              </div>
            )}

            {/* Items table */}
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
                            <td>₹{Number(item.price).toFixed(2)}</td>
                            <td>₹{(item.price * item.qty).toFixed(2)}</td>
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

            {/* Calculation breakdown */}
            <div className="rounded-xl border border-white/10 overflow-hidden text-sm">
              <Row label="Sub-Total" value={`₹${subTotal.toFixed(2)}`} />
              <Row
                label="Bill Amount"
                value={`₹${subTotal.toFixed(2)}`}
                muted
              />
              <div className="border-t border-white/5" />
              {taxBreakdown.length === 0 ? (
                <Row label="Tax" value="₹0.00" muted />
              ) : (
                taxBreakdown.map((t, i) => (
                  <Row
                    key={i}
                    label={`${t.name} (${t.pct}%)`}
                    value={`₹${t.amount.toFixed(2)}`}
                    muted
                  />
                ))
              )}
              {chargeBreakdown.map((c, i) => (
                <Row
                  key={i}
                  label={`${c.name} (Charge)`}
                  value={`₹${c.amount.toFixed(2)}`}
                  muted
                />
              ))}
              <div className="border-t border-white/5" />
              <Row
                label="Discount"
                value={
                  discountAmount > 0
                    ? `-₹${discountAmount.toFixed(2)}`
                    : "₹0.00"
                }
                muted
              />
              <Row
                label="Charges"
                value={
                  totalCharges > 0 ? `₹${totalCharges.toFixed(2)}` : "₹0.00"
                }
                muted
              />
              <Row
                label="Round Off"
                value={`${roundOff >= 0 ? "+" : ""}${roundOff}`}
                muted
              />
              <div className="border-t border-white/5" />
              <Row label="Grand Total" value={`₹${grandTotal}`} bold />

              {/* Wallet applied */}
              {(isReprint ? reprintWalletUsed : maxWalletUse) > 0 && (
                <>
                  <div
                    className="flex justify-between items-center px-3 py-2 border-t border-white/5"
                    style={{ background: "rgba(16,185,129,0.08)" }}
                  >
                    <span className="text-sm" style={{ color: "#6ee7b7" }}>
                      {isAdvance ? "Advance Applied" : "Wallet Applied"}
                    </span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: "#6ee7b7" }}
                    >
                      -₹
                      {(isReprint ? reprintWalletUsed : maxWalletUse).toFixed(
                        2
                      )}
                    </span>
                  </div>
                  <div
                    className="flex justify-between items-center px-3 py-2 border-t border-white/5"
                    style={{ background: "rgba(16,185,129,0.05)" }}
                  >
                    <span className="text-sm font-bold text-white">
                      Payable Amount
                    </span>
                    <span className="text-sm font-bold text-white">
                      ₹{isReprint ? reprintRemainingDue : afterWalletTotal}
                    </span>
                  </div>
                </>
              )}

              {/* ─────────────────────────────────────────────
               ADVANCE REMAINING DUE — naya block
                Sirf tab dikhao jab advance partial ho
              ───────────────────────────────────────────── */}
              {isAdvance && advanceRemaining > 0 && (
                <div
                  className="flex justify-between items-center px-3 py-2 border-t border-white/5"
                  style={{ background: "rgba(239,68,68,0.12)" }}
                >
                  <span
                    className="text-sm font-bold"
                    style={{ color: "#fca5a5" }}
                  >
                    Advance Remaining Due
                  </span>
                  <span
                    className="text-sm font-bold"
                    style={{ color: "#fca5a5" }}
                  >
                    ₹
                    {isReprint
                      ? reprintRemainingDue.toFixed(2)
                      : advanceRemaining.toFixed(2)}{" "}
                  </span>
                </div>
              )}

              {/* Advance fully covered */}
              {isAdvance && advanceRemaining === 0 && maxWalletUse > 0 && (
                <div
                  className="px-3 py-2 border-t border-white/5 text-center text-xs font-semibold"
                  style={{
                    background: "rgba(16,185,129,0.1)",
                    color: "#6ee7b7",
                  }}
                >
                  Advance fully covers this order!
                </div>
              )}
            </div>

            {/* Given / Return — Normal mode only */}
            {!isReprint && !isAdvance && (
              <div className="grid grid-cols-2 gap-3">
                <div className="main_input">
                  <label>
                    {isLending ? "Amount Paid Now (optional)" : "Given Amount"}
                  </label>
                  <input
                    type="number"
                    value={givenAmount}
                    onChange={(e) => setGivenAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="main_input" s>
                  <label>
                    {isLending ? "Remaining Credit" : "Return Amount"}
                  </label>
                  <div
                    className="px-3 py-2 rounded-xl text-sm font-bold text-center"
                    style={
                      isLending
                        ? {
                          background: "rgba(239,68,68,0.15)",
                          border: "1px solid rgba(248,113,113,0.4)",
                          color: "#fca5a5",
                        }
                        : {
                          background: "rgba(16,185,129,0.15)",
                          border: "1px solid rgba(52,211,153,0.3)",
                          color: "#6ee7b7",
                        }
                    }
                  >
                    ₹
                    {isLending
                      ? lendingRemaining.toFixed(2)
                      : returnAmt.toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            {/* Lending banner */}
            {isLending && !isReprint && (
              <div
                className="rounded-xl px-4 py-3 text-sm font-semibold text-center"
                style={{
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(248,113,113,0.35)",
                  color: "#fca5a5",
                }}
              >
                Lending Mode — Customer details required
                {lendingRemaining > 0 && (
                  <div className="text-lg font-bold mt-1 text-red-300">
                    DUE: ₹{lendingRemaining.toFixed(2)}
                  </div>
                )}
              </div>
            )}

            {/* ─────────────────────────────────────────────
             ADVANCE BANNER — Lending jaisa lekin alag color
            ───────────────────────────────────────────── */}
            {isAdvance && !isReprint && (
              <div
                className="rounded-xl px-4 py-3 text-sm font-semibold text-center"
                style={{
                  background: "rgba(16,185,129,0.12)",
                  border: "1px solid rgba(52,211,153,0.35)",
                  color: "#6ee7b7",
                }}
              >
                Advance Mode — Customer wallet se payment hogi
                {advanceRemaining > 0 ? (
                  <div className="text-lg font-bold mt-1 text-red-300">
                    REMAINING DUE: ₹{advanceRemaining.toFixed(2)}
                  </div>
                ) : maxWalletUse > 0 ? (
                  <div className="text-sm font-bold mt-1 text-green-300">
                    Fully covered by advance!
                  </div>
                ) : null}
              </div>
            )}

            {/* Payment modes */}
            {/* <div>
              <label className="text-xs text-white/40 uppercase tracking-widest mb-2 block">
                Payment Method {!isReprint && "*"}
              </label>
              <div className="flex flex-wrap gap-2 pb-3">
                {allModes.map((m) => {
                  const isSelected =
                    selectedMode?.toLowerCase() === m.name?.toLowerCase() ||
                    selectedMode === String(m.id);
                  const isLendingBtn = m.name?.toLowerCase() === "lending";
                  const isAdvanceBtn = m.name?.toLowerCase() === "advance";
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMode(m.name)}
                      className="px-4 py-2 rounded-xl text-sm font-semibold transition-all border"
                      style={
                        isSelected
                          ? isLendingBtn
                            ? {
                              background: "rgba(239,68,68,0.3)",
                              border: "1px solid rgba(248,113,113,0.5)",
                              color: "#fca5a5",
                            }
                            : isAdvanceBtn
                              ? {
                                background: "rgba(16,185,129,0.25)",
                                border: "1px solid rgba(52,211,153,0.5)",
                                color: "#6ee7b7",
                              }
                              : {
                                background: "rgba(124,58,237,0.4)",
                                border: "1px solid rgba(167,139,250,0.5)",
                                color: "#e9d5ff",
                              }
                          : {
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            color: "rgba(255,255,255,0.6)",
                          }
                      }
                    >
                      {isLendingBtn
                        ? "Lending"
                        : isAdvanceBtn
                          ? "Advance"
                          : m.name}
                    </button>
                  );
                })}
              </div>
            </div> */}
            {/* Payment modes — MULTIPLE SPLIT */}
            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest mb-2 block">
                Payment Method {!isReprint && "*"}
              </label>

              {paymentSplits.map((split, idx) => {
                const isFirst = idx === 0;
                return (
                  <div key={idx} className="mb-3">
                    {/* Mode buttons */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {allModes.map((m) => {
                        const isSelected =
                          split.mode?.toLowerCase() === m.name?.toLowerCase();
                        const isLendingBtn =
                          m.name?.toLowerCase() === "lending";
                        const isAdvanceBtn =
                          m.name?.toLowerCase() === "advance";
                        // Lending/Advance sirf first split mein allowed
                        if (!isFirst && (isLendingBtn || isAdvanceBtn))
                          return null;
                        return (
                          <button
                            key={m.id}
                            onClick={() => {
                              const updated = [...paymentSplits];
                              updated[idx].mode = m.name;
                              // Agar sirf ek split hai to full amount auto-fill
                              if (paymentSplits.length === 1) {
                                updated[idx].amount =
                                  afterWalletTotal.toFixed(2);
                              }
                              setPaymentSplits(updated);
                            }}
                            className="payment_method_btn"
                            style={
                              isSelected
                                ? isLendingBtn
                                  ? {
                                    background: "rgba(239,68,68,0.3)",
                                    border: "1px solid rgba(248,113,113,0.5)",
                                    color: "#fca5a5",
                                  }
                                  : isAdvanceBtn
                                    ? {
                                      background: "rgba(16,185,129,0.25)",
                                      border: "1px solid rgba(52,211,153,0.5)",
                                      color: "#6ee7b7",
                                    }
                                    : {
                                      background: "rgba(124,58,237,0.4)",
                                      border: "1px solid rgba(167,139,250,0.5)",
                                      color: "#e9d5ff",
                                    }
                                : {
                                  background: "rgba(255,255,255,0.06)",
                                  border: "1px solid rgba(255,255,255,0.12)",
                                  color: "rgba(255,255,255,0.6)",
                                }
                            }
                          >
                            {m.name}
                          </button>
                        );
                      })}
                    </div>

                    {/* Amount input — multi-split mein dikhao */}
                    <div className="flex items-center gap-2">
                      <div className="main_input">
                        <input
                          type="number"
                          value={split.amount}
                          onChange={(e) => {
                            const updated = [...paymentSplits];
                            updated[idx].amount = e.target.value;
                            setPaymentSplits(updated);
                          }}
                          placeholder="Amount"
                          // Single split mein amount readonly (auto = total)
                          readOnly={paymentSplits.length === 1}
                        />
                      </div>
                      {/* Remove button — first split nahi hata sakte */}
                      {!isFirst && (
                        <button
                          onClick={() =>
                            setPaymentSplits(
                              paymentSplits.filter((_, i) => i !== idx)
                            )
                          }
                          className="px-3 py-2 rounded-xl text-sm font-bold"
                          style={{
                            background: "rgba(239,68,68,0.2)",
                            border: "1px solid rgba(248,113,113,0.35)",
                            color: "#fca5a5",
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Split summary + Add button */}
              {(() => {
                const totalSplitPaid = paymentSplits.reduce(
                  (s, p) => s + parseFloat(p.amount || 0),
                  0
                );
                const splitRemaining = parseFloat(
                  (afterWalletTotal - totalSplitPaid).toFixed(2)
                );
                const canAdd =
                  !isLending && !isAdvance && paymentSplits.length < 4;
                return (
                  <>
                    {paymentSplits.length > 1 && (
                      <div
                        className="rounded-xl px-3 py-2 mb-2 text-sm"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <div className="flex justify-between text-white/60">
                          <span>Total Entered</span>
                          <span>₹{totalSplitPaid.toFixed(2)}</span>
                        </div>
                        <div
                          className="flex justify-between font-bold mt-1"
                          style={{
                            color: splitRemaining === 0 ? "#6ee7b7" : "#fca5a5",
                          }}
                        >
                          <span>
                            {splitRemaining === 0 ? "✅ Balanced" : "Remaining"}
                          </span>
                          <span>₹{Math.abs(splitRemaining).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                    {canAdd && (
                      <button
                        onClick={() => {
                          const totalSoFar = paymentSplits.reduce(
                            (s, p) => s + parseFloat(p.amount || 0),
                            0
                          );
                          const rem = Math.max(
                            0,
                            afterWalletTotal - totalSoFar
                          );
                          setPaymentSplits([
                            ...paymentSplits,
                            { mode: "", amount: rem.toFixed(2) },
                          ]);
                        }}
                        className="main_btn mt-1"
                      >
                        + Add Another Payment Method
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* ═══ RIGHT — Customer + Discount + Wallet ═══ */}
          <div className="w-96 p-5 space-y-4 flex-shrink-0">
            {/* Customer Search */}
            {!isReprint && (
              <div className="main_input">
                <label>
                  s Search Customer
                  {/*Advance ke liye mandatory indicator */}
                  {isAdvance && (
                    <span className="text-red-400 ml-1">
                      * (Advance ke liye required)
                    </span>
                  )}
                </label>
                <input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search by name or phone"
                  className={`${3} ${isAdvance && !selectedCustomerId ? "" : ""
                    }`}
                />
                {customerList.length > 0 && (
                  <div className="bg-white/10 border border-white/20 rounded-xl mt-2 max-h-40 overflow-y-auto">
                    {customerList.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          setCustomer({
                            name: c.name,
                            phone: c.phone,
                            address: c.address || "",
                            tax_id: c.tax_id || "",
                            dob: c.dob || "",
                            anniversary: c.anniversary || "",
                          });
                          setCustomerSearch(c.name);
                          setCustomerList([]);
                        }}
                        className="px-3 py-2 hover:bg-white/10 cursor-pointer text-sm"
                      >
                        {c.name} - {c.phone}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Wallet section */}
            {selectedCustomerId && !isReprint && (
              <div
                className="rounded-xl p-3"
                style={{
                  background:
                    walletBalance > 0
                      ? "rgba(16,185,129,0.08)"
                      : "rgba(255,255,255,0.04)",
                  border:
                    walletBalance > 0
                      ? "1px solid rgba(52,211,153,0.25)"
                      : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-xs text-white/40 uppercase tracking-widest">
                      {/*Label change: advance mode mein "Advance Balance" dikhao */}
                      {isAdvance ? "Advance Balance" : "Wallet Balance"}
                    </div>
                    <div
                      className="text-lg font-bold mt-0.5"
                      style={{
                        color:
                          walletBalance > 0
                            ? "#6ee7b7"
                            : "rgba(255,255,255,0.3)",
                      }}
                    >
                      ₹{walletBalance.toFixed(2)}
                    </div>
                    {/*Advance mode mein remaining bhi dikhao */}
                    {isAdvance && advanceRemaining > 0 && (
                      <div
                        className="text-xs mt-1"
                        style={{ color: "#fca5a5" }}
                      >
                        After order: ₹{advanceRemaining.toFixed(2)} due
                      </div>
                    )}
                    {isAdvance &&
                      advanceRemaining === 0 &&
                      walletBalance > 0 && (
                        <div
                          className="text-xs mt-1"
                          style={{ color: "#6ee7b7" }}
                        >
                          Fully covers ₹{grandTotal} order
                        </div>
                      )}
                  </div>

                  {/* Toggle — advance mode mein auto ON, sirf normal mode mein manual toggle */}
                  {walletBalance > 0 && !isAdvance && (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <span className="text-xs text-white/50">Use wallet</span>
                      <div
                        onClick={() => setUseWallet((w) => !w)}
                        className="relative w-10 h-5 rounded-full transition-all cursor-pointer"
                        style={{
                          background: useWallet
                            ? "rgba(16,185,129,0.6)"
                            : "rgba(255,255,255,0.15)",
                          border: useWallet
                            ? "1px solid rgba(52,211,153,0.5)"
                            : "1px solid rgba(255,255,255,0.15)",
                        }}
                      >
                        <div
                          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                          style={{
                            left: useWallet ? "calc(100% - 18px)" : "2px",
                          }}
                        />
                      </div>
                    </label>
                  )}

                  {/* Advance mode mein toggle nahi, auto-on indicator dikhao */}
                  {walletBalance > 0 && isAdvance && (
                    <div
                      className="text-xs px-2 py-1 rounded-lg font-semibold"
                      style={{
                        background: "rgba(16,185,129,0.2)",
                        color: "#6ee7b7",
                        border: "1px solid rgba(52,211,153,0.3)",
                      }}
                    >
                      Auto Applied
                    </div>
                  )}
                </div>

                {useWallet && maxWalletUse > 0 && (
                  <div
                    className="rounded-lg px-3 py-2 text-xs text-center font-semibold"
                    style={{
                      background: "rgba(16,185,129,0.15)",
                      color: "#6ee7b7",
                      border: "1px solid rgba(52,211,153,0.2)",
                    }}
                  >
                    ₹{maxWalletUse.toFixed(2)}{" "}
                    {isAdvance ? "advance" : "wallet"} se apply hoga
                    {afterWalletTotal === 0 && " — Fully covered!"}
                  </div>
                )}

                {walletBalance <= 0 && (
                  <div className="text-xs text-white/30 text-center">
                    {isAdvance ? "No advance balance" : "Empty Wallet"}
                  </div>
                )}
              </div>
            )}

            <div
              className="px-3 py-2 rounded-xl text-xs"
              style={
                isLending
                  ? {
                    background: "rgba(239,68,68,0.15)",
                    border: "1px solid rgba(248,113,113,0.3)",
                    color: "#fca5a5",
                  }
                  : isAdvance
                    ? {
                      background: "rgba(16,185,129,0.1)",
                      border: "1px solid rgba(52,211,153,0.25)",
                      color: "#6ee7b7",
                    }
                    : {
                      background: "rgba(245,158,11,0.1)",
                      border: "1px solid rgba(245,158,11,0.2)",
                      color: "rgba(252,211,77,0.8)",
                    }
              }
            >
              {isLending
                ? " Lending selected — Name & Phone required"
                : isAdvance
                  ? "Advance selected — Customer mandatory, wallet auto-apply"
                  : "*Note: Contact Number mandatory to save customer"}
            </div>

            <div className="space-y-3">
              <div className="main_input">
                <label>
                  Customer Name
                  {(isLending || isAdvance) && (
                    <span className="text-red-400"> *</span>
                  )}
                </label>
                <input
                  value={customer.name}
                  onChange={(e) =>
                    setCustomer((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Enter name"
                  className={`${inp} ${(isLending || isAdvance) && !customer.name
                    ? "border-red-400/50"
                    : ""
                    }`}
                  disabled={isReprint}
                />
              </div>
              <div className="main_input">
                <label>
                  Phone
                  {(isLending || isAdvance) && (
                    <span className="text-red-400"> *</span>
                  )}
                </label>
                <input
                  value={customer.phone}
                  onChange={(e) =>
                    setCustomer((p) => ({ ...p, phone: e.target.value }))
                  }
                  placeholder="Phone number"
                  type="tel"
                  className={`${inp} ${(isLending || isAdvance) && !customer.phone
                    ? "border-red-400/50"
                    : ""
                    }`}
                  disabled={isReprint}
                />
              </div>
              <div className="main_input">
                <input
                  value={customer.address}
                  onChange={(e) =>
                    setCustomer((p) => ({ ...p, address: e.target.value }))
                  }
                  placeholder="Customer Address"
                  className={inp}
                  disabled={isReprint}
                />
              </div>
              <div className="main_input">
                <input
                  value={customer.tax_id}
                  onChange={(e) =>
                    setCustomer((p) => ({ ...p, tax_id: e.target.value }))
                  }
                  placeholder="Customer Tax ID"
                  className={inp}
                  disabled={isReprint}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="main_input">
                <label>Date of Birth</label>
                <input
                  type="date"
                  value={customer.dob}
                  onChange={(e) =>
                    setCustomer((p) => ({ ...p, dob: e.target.value }))
                  }
                  disabled={isReprint}
                />
              </div>
              <div className="main_input">
                <label>Anniversary</label>
                <input
                  type="date"
                  value={customer.anniversary}
                  onChange={(e) =>
                    setCustomer((p) => ({ ...p, anniversary: e.target.value }))
                  }
                  disabled={isReprint}
                />
              </div>
            </div>

            {/* Discount */}
            <div
              style={{
                opacity: isReprint ? 0.4 : 1,
                pointerEvents: isReprint ? "none" : "auto",
              }}
            >
              <div className="flex gap-4 mb-3">
                {["percent", "coupon"].map((m) => (
                  <label
                    key={m}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <div
                      onClick={() => setDiscountMode(m)}
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer"
                      style={{
                        borderColor:
                          discountMode === m
                            ? "#a78bfa"
                            : "rgba(255,255,255,0.3)",
                      }}
                    >
                      {discountMode === m && (
                        <div className="w-2 h-2 rounded-full bg-purple-400" />
                      )}
                    </div>
                    <span className="text-white/70 capitalize">
                      {m === "percent" ? "Discount" : "Coupon"}
                    </span>
                  </label>
                ))}
              </div>
              {discountMode === "percent" ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="main_input">
                    <label>Discount %</label>
                    <input
                      type="number"
                      value={discountPct}
                      onChange={(e) => setDiscountPct(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="main_input">
                    <label>Discount Amount</label>
                    <div className="px-3 py-2 rounded-xl text-sm text-white/60 bg-white/5 border border-white/10">
                      ₹{discountAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="main_input">
                    <input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Enter coupon code"
                      className={inp}
                    />
                  </div>
                  <button onClick={applyCoupon} className="main_btn">
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-3 modal_footer px-3 py-3">
          <button onClick={onClose} className="cancel_btn">
            Cancel
          </button>
          <div className="flex gap-3" style={{ width: "50%" }}>
            {orderType === "dine_in" && (
              <button
                onClick={handleCloseTable}
                disabled={loading}
                className="update_btn disabled:opacity-50"
                style={{
                  background: "rgba(239,68,68,0.2)",
                  border: "1px solid rgba(248,113,113,0.35)",
                  color: "#fca5a5",
                }}
              >
                {loading
                  ? "Processing..."
                  : isLending
                    ? "📋 Save Udhaar & Close"
                    : isAdvance && advanceRemaining > 0
                      ? `Save Advance & Close (Due: ₹${isReprint
                        ? reprintRemainingDue.toFixed(2)
                        : advanceRemaining.toFixed(2)
                      })`
                      : "🔒 Close Table"}
              </button>
            )}
            <button
              onClick={() => setShowPreview(true)} // ← YAHI CHANGE HAI
              disabled={loading}
              className="update_btn disabled:opacity-50"
            >
              {loading
                ? "Saving..."
                : isReprint
                  ? "⟳ Reprint Bill"
                  : "🖨 Print Bill"}
            </button>
            {/* <button
              onClick={handlePrintBill}

              disabled={loading}
              className="update_btn disabled:opacity-50"
            >
              {loading
                ? "Saving..."
                : isReprint
                  ? "⟳ Reprint Bill"
                  : isLending
                    ? "📋 Print & Save Udhaar"
                    : isAdvance
                      ? "Print & Apply Advance"
                      : "🖨 Print Bill"}
            </button> */}
          </div>
        </div>
      </div>
      <BillPreviewModal
        isOpen={showPreview}
        loading={loading}
        billData={{
          restaurant_name: branch.branch_name || "Restaurant",
          restaurant_address: branch.address || "",
          gstin: branch.gst_no || "",
          uniqueOrderId: uniqueOrderId || orderId,  // ← unique_order_id pehle, fallback orderId
          captain_name: branch.captain_name || "",
          customer_name: customer.name,
          customer_phone: customer.phone,
          billNo: savedBillNo,
          table_no: tableId ? tableNameMap[tableId] || tableId : null,
          date_time: new Date().toLocaleString("en-IN"),
          items: orderItems.map((i) => ({
            name: i.dg09_name,
            qty: i.qty,
            rate: Number(i.price).toFixed(2),
            total: (i.price * i.qty).toFixed(2),
            remark: [...(i.predefinedRemarks || []), i.qtyRemark || ""].filter(Boolean).join(", "),
          })),
          subtotal: subTotal.toFixed(2),
          tax_breakdown: taxBreakdown,
          total_amount: grandTotal.toFixed(2),
          round_off: roundOff,
          payment_splits: paymentSplits,
          paymentMethod: paymentSplits.map((p) => p.mode).join("+"),
          wallet_used: useWallet || isAdvance ? maxWalletUse.toFixed(2) : 0,
          advance_used: isAdvance ? maxWalletUse.toFixed(2) : 0,
          is_lending: isLending,
          is_advance: isAdvance,
          remaining_amount: isLending
            ? lendingRemaining.toFixed(2)
            : isAdvance
              ? advanceRemaining.toFixed(2)
              : 0,
        }}
        onConfirm={() => {
          setShowPreview(false);
          handlePrintBill();
        }}
        onClose={() => setShowPreview(false)}
      />
    </div>
  );
}

function Row({ label, value, bold, highlight, muted }) {
  return (
    <div className="flex justify-between items-center px-3 py-2 border-b border-white/5 last:border-0">
      <span
        className={`text-sm ${muted
          ? "text-white/50"
          : bold
            ? "text-white font-semibold"
            : "text-white/80"
          }`}
      >
        {label} :
      </span>
      <span
        className={`text-sm font-medium ${highlight
          ? "text-purple-300"
          : bold
            ? "text-white font-bold"
            : "text-white/80"
          }`}
      >
        {value}
      </span>
    </div>
  );
}
