import { useState, useEffect } from "react";
import { useQuery } from "react-query";
import { apiConnectorGet, apiConnectorPost } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import BillPreviewModal from "./BillpriviewModal";
import BillItemsTable from "./bill/BillItemsTable";
import BillBreakdown from "./bill/BillBreakdown";
import BillPaymentSection from "./bill/BillPaymentSection";
import BillRightPanel from "./bill/BillRightPanel";
import BillDeliverySection from "./bill/BillDeliverySection";

export default function BillPage() {
  const location = useLocation();
  const {
    orderItems = [],
    orderId,
    uniqueOrderId,
    tableId,
    orderType,
    tableNameMap = {},
    existingBillId = null,
    orderStatus = "",
    deliveryCustomerName = "",
    deliveryCustomerPhone = "",
    deliveryCustomerAddress = "",
  } = location.state || {};

  // ── Customer ──────────────────────────────────────
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerList, setCustomerList] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [reprintWalletUsed, setReprintWalletUsed] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState("");
  const [currentStatus, setCurrentStatus] = useState(orderStatus);
  const [statusLoading, setStatusLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  // ── Top pe state add karo ──
  const [billUniqueOrderId, setBillUniqueOrderId] = useState(uniqueOrderId || null);
  const [customer, setCustomer] = useState({
    name: deliveryCustomerName || "",
    phone: deliveryCustomerPhone || "",
    address: deliveryCustomerAddress || "",
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
  const [appliedOfferName, setAppliedOfferName] = useState("");

  // ── Payment ───────────────────────────────────────
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
    { enabled: true, refetchOnWindowFocus: false }
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
      toast.error("Please Select customer !");
      return false;
    }
    return true;
  };

  // ── Print Bill ke liye — sirf basic check ──
  const validateForPrint = () => {
    if (isReprint) return true;
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
    if (!savedBillId) return;
    const fetchBillDetails = async () => {
      try {
        const res = await apiConnectorGet(
          `${endpoint.get_bill_by_id_api}/${savedBillId}`
        );
        const bill = res?.data?.result;
        if (!bill) return;
        setBillUniqueOrderId(bill.uniqueOrderId || null); // ← पहली line में add karo

        setCustomer({
          name: bill.customer_name || "",
          phone: bill.customer_phone || "",
          address: bill.customer_address || "",
          tax_id: bill.customer_tax_id || "",
          dob: bill.customer_dob || "",
          anniversary: bill.customer_anniversary || "",
        });
        if (bill.paid_amount && parseFloat(bill.paid_amount) > 0)
          setGivenAmount(String(bill.paid_amount));
        else if (bill.total_amount && parseFloat(bill.total_amount) > 0)
          setGivenAmount(parseFloat(bill.total_amount).toFixed(2));
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
        if (bill.payment_splits?.length > 0) {
          setPaymentSplits(bill.payment_splits);
        } else if (bill.paymentMethod) {
          setPaymentSplits([
            {
              mode: bill.paymentMethod,
              amount: bill.paid_amount || "",
            },
          ]);
        }
        if (bill.paid_amount && parseFloat(bill.paid_amount) > 0) {
          setReprintWalletUsed(
            parseFloat(bill.advance_used || bill.wallet_used || 0)
          );
        }
      } catch (err) {
        console.error("Bill fetch failed:", err);
      }
    };
    fetchBillDetails();
  }, [savedBillId]);

  // ── Wallet fetch — jab customer select ho ─────────
  useEffect(() => {
    if (!selectedCustomerId) return;
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
  }, [selectedCustomerId]);

  // ─────────────────────────────────────────────────
  //ADVANCE auto-enable wallet
  // ─────────────────────────────────────────────────
  useEffect(() => {
    if (isAdvance && walletBalance > 0) {
      setUseWallet(true);
    } else if (!isAdvance) {
      setUseWallet(false);
    }
  }, [isAdvance, walletBalance]);

  // ── Fetch payment modes ───────────────────────────
  const { data: modesData } = useQuery(
    ["get_payment_modes"],
    () => apiConnectorGet(endpoint.payment_mode_get_api),
    { enabled: true, refetchOnWindowFocus: false }
  );
  const paymentModes = modesData?.data?.result || [];

  // ── Fetch taxes ───────────────────────────────────
  const { data: taxData } = useQuery(
    ["get_taxes"],
    () => apiConnectorGet(endpoint.tax_get_api),
    { enabled: true, refetchOnWindowFocus: false }
  );
  const taxes = taxData?.data?.result || [];

  // ── Fetch charges (filtered by orderType) ─────────
  const { data: chargesData } = useQuery(
    ["get_charges", orderType],
    () => apiConnectorGet(`${endpoint.charge_get_api}?orderType=${orderType || ""}`),
    { enabled: true, refetchOnWindowFocus: false }
  );
  const charges = chargesData?.data?.result || [];

  // ── Calculations ──────────────────────────────────
  const taxableSubTotal = orderItems.reduce((acc, i) =>
    i.tax_group_id ? acc + parseFloat(i.basePrice) * i.qty : acc, 0
  );

  const nonTaxableSubTotal = orderItems.reduce((acc, i) =>
    !i.tax_group_id ? acc + i.price * i.qty : acc, 0
  );

  const subTotal = taxableSubTotal + nonTaxableSubTotal;

  const taxBreakdown = taxes.map((t) => ({
    name: t.dg032_name,
    pct: parseFloat(t.dg032_percentage),
    amount: Math.round(((taxableSubTotal * parseFloat(t.dg032_percentage)) / 100) * 100) / 100,
  }));
  const totalTax = taxBreakdown.reduce((s, t) => s + t.amount, 0);

  const totalItemQty = orderItems.reduce((s, i) => s + i.qty, 0);

  const chargeableSubTotal = orderItems.reduce((acc, i) =>
    i.dg09_apply_charges === 1 || i.dg09_apply_charges === true
      ? acc + parseFloat(i.basePrice || i.price) * i.qty
      : acc, 0
  );

  const chargeBreakdown = chargeableSubTotal > 0
    ? charges.map((c) => {
      const isItemLevel = c.dg035_field === "Item";
      const baseAmount =
        c.dg035_type === "Percentage"
          ? (chargeableSubTotal * parseFloat(c.dg035_value)) / 100
          : parseFloat(c.dg035_value);
      const amount =
        isItemLevel && c.dg035_type !== "Percentage"
          ? baseAmount * totalItemQty
          : baseAmount;
      return { name: c.dg035_name, amount, field: c.dg035_field };
    })
    : [];
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

  // ── Active offers ─────────────────────────────────
  const { data: offersData } = useQuery(
    ["active_offers_bill"],
    () => apiConnectorGet(endpoint.get_active_offers_api),
    { enabled: discountMode === "coupon", staleTime: 5 * 60 * 1000, retry: false }
  );
  const activeOffers = offersData?.data?.result || [];

  // ── Coupon apply ──────────────────────────────────
  const applyCoupon = async (code) => {
    const c = (code || couponCode).trim();
    if (!c) return toast.error("Please enter coupon code!");
    if (code) setCouponCode(code);
    const categoryIds = [...new Set(orderItems.map(i => i.category_id || i.dg09_category_id).filter(Boolean))];
    try {
      const res = await apiConnectorPost(endpoint.apply_coupon_api, {
        coupon_code: c,
        order_amount: subTotal,
        category_ids: categoryIds,
      });
      if (res?.data?.success) {
        setCouponDiscount(res?.data?.discount_amount || 0);
        setAppliedOfferName(res?.data?.offer_name || c);
        toast.success(res?.data?.message || "Coupon applied!");
      } else {
        toast.error(res?.data?.message || "Invalid coupon");
      }
    } catch {
      toast.error("Failed to validate coupon");
    }
  };

  const applyOfferDirect = (offer) => {
    const minAmt = parseFloat(offer.dg037_min_amount || 0);
    if (minAmt > 0 && subTotal < minAmt) {
      toast.error(`Minimum order ₹${minAmt} required for this offer`);
      return;
    }
    const pct = parseFloat(offer.dg037_offer_price_pct || 0);
    const flat = parseFloat(offer.dg037_offer_price || 0);
    let disc = 0;
    if (offer.dg037_offer_type === "Percentage") disc = (subTotal * pct) / 100;
    else if (offer.dg037_offer_type === "Flat") disc = flat;
    else if (offer.dg037_offer_type === "BOGO" || offer.dg037_is_bogo) disc = flat || (subTotal * pct) / 100;
    else disc = flat > 0 ? flat : (subTotal * pct) / 100;
    disc = Math.min(Math.round(disc * 100) / 100, subTotal);
    setCouponDiscount(disc);
    setCouponCode(`__offer_${offer.dg037_offer_id}`);
    setAppliedOfferName(offer.dg037_offer_name);
    toast.success(`"${offer.dg037_offer_name}" applied!`);
  };

  // ── Validate ──────────────────────────────────────
  const validate = () => {
    if (isReprint) return true;
    if (!paymentSplits[0]?.mode?.trim()) {
      toast.error("Please select payment method!");
      return false;
    }

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

      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_address: customer.address,
      customer_id: selectedCustomerId,

      paymentMethod: paymentSplits.map((p) => p.mode).join("+"),
      payment_splits: paymentSplits,

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
        type: isAdvance ? "advance" : "wallet",
      });
    } catch (err) {
      console.error("Wallet/Advance deduct failed:", err);
      toast.error(" Bill saved but deduction failed. Check manually.");
    }
  };

  const handlePrintBill = async () => {
    if (loading) return;
    if (!isReprint && !validateForPrint()) return;
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
          return;
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
        charge_breakdown: chargeBreakdown,
        customer_name: customer.name,
        customer_phone: customer.phone,
        subtotal: subTotal.toFixed(2),
        discount: discountAmount.toFixed(2),
        coupon_name: appliedOfferName || null,
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
      await apiConnectorPost(endpoint.update_order_status_api, {
        orderId,
        status: "completed"
      });

      if (orderType === "dine_in" && tableId) {
        await apiConnectorPost(endpoint.update_table_status_api, {
          tableId,
          status: "Available",
        });
      }

      toast.success(
        isLending
          ? `Due saved! Remaining: ₹${lendingRemaining}`
          : isAdvance && advanceRemaining > 0
            ? `Advance partially used! Due: ₹${advanceRemaining}`
            : "Table closed successfully!"
      );

      navigate("/userdashboard");
      window.location.reload();

    } catch (err) {
      console.error(err);
      toast.error("Server error");
    }

    setLoading(false);
  };

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
        <button onClick={() => navigate(-1)}>← Back</button>
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
              {reprintRemainingDue > 0 && (
                <div className="mt-2 text-red-300 font-bold text-base">
                  Remaining Due: ₹{reprintRemainingDue.toFixed(2)}
                </div>
              )}
            </div>
          )}

          <BillItemsTable orderItems={orderItems} />

          <BillBreakdown
            subTotal={subTotal}
            taxBreakdown={taxBreakdown}
            chargeBreakdown={chargeBreakdown}
            totalItemQty={totalItemQty}
            discountAmount={discountAmount}
            roundOff={roundOff}
            grandTotal={grandTotal}
            isAdvance={isAdvance}
            maxWalletUse={maxWalletUse}
            afterWalletTotal={afterWalletTotal}
            useWallet={useWallet}
            isReprint={isReprint}
            reprintWalletUsed={reprintWalletUsed}
            reprintRemainingDue={reprintRemainingDue}
            advanceRemaining={advanceRemaining}
          />

          <BillPaymentSection
            paymentSplits={paymentSplits}
            setPaymentSplits={setPaymentSplits}
            allModes={allModes}
            isLending={isLending}
            isAdvance={isAdvance}
            isReprint={isReprint}
            afterWalletTotal={afterWalletTotal}
            givenAmount={givenAmount}
            setGivenAmount={setGivenAmount}
            lendingRemaining={lendingRemaining}
            returnAmt={returnAmt}
          />
        </div>

        <BillRightPanel
          customer={customer}
          setCustomer={setCustomer}
          customerSearch={customerSearch}
          setCustomerSearch={setCustomerSearch}
          customerList={customerList}
          setCustomerList={setCustomerList}
          selectedCustomerId={selectedCustomerId}
          setSelectedCustomerId={setSelectedCustomerId}
          walletBalance={walletBalance}
          useWallet={useWallet}
          setUseWallet={setUseWallet}
          isAdvance={isAdvance}
          isReprint={isReprint}
          grandTotal={grandTotal}
          maxWalletUse={maxWalletUse}
          afterWalletTotal={afterWalletTotal}
          advanceRemaining={advanceRemaining}
          isLending={isLending}
          discountMode={discountMode}
          setDiscountMode={setDiscountMode}
          discountPct={discountPct}
          setDiscountPct={setDiscountPct}
          couponCode={couponCode}
          setCouponCode={setCouponCode}
          couponDiscount={couponDiscount}
          setCouponDiscount={setCouponDiscount}
          discountAmount={discountAmount}
          subTotal={subTotal}
          activeOffers={activeOffers}
          applyCoupon={applyCoupon}
          applyOfferDirect={applyOfferDirect}
        />
      </div>

      <BillDeliverySection
        orderType={orderType}
        orderId={orderId}
        currentStatus={currentStatus}
        setCurrentStatus={setCurrentStatus}
        statusLoading={statusLoading}
        setStatusLoading={setStatusLoading}
        estimatedTime={estimatedTime}
        setEstimatedTime={setEstimatedTime}
        confirmDialog={confirmDialog}
        setConfirmDialog={setConfirmDialog}
      />

      <div className="flex justify-between gap-3 modal_footer px-3 py-3">
        <button onClick={() => navigate(-1)} className="cancel_btn">
          Cancel
        </button>
        <div className="flex justify-end gap-3" style={{ width: "50%" }}>
          {(savedBillId || orderType === "dine_in") &&
            currentStatus !== "completed" &&
            (orderType !== "delivery" || currentStatus === "out_for_delivery") && (
              <button
                onClick={handleCloseTable}
                disabled={loading}
                className="update_btn disabled:opacity-50"
                style={{
                  background: "rgba(239,68,68,0.2)",
                  border: "1px solid rgba(248,113,113,0.35)",
                  color: "#F94E34",
                }}
              >
                {loading
                  ? "Processing..."
                  : isLending
                    ? "📋 Save Due & Close"
                    : isAdvance && advanceRemaining > 0
                      ? `Save Advance & Close (Due: ₹${isReprint ? reprintRemainingDue.toFixed(2) : advanceRemaining.toFixed(2)})`
                      : orderType === "dine_in"
                        ? "🔒 Close Table"
                        : "✅ Delivery Done"}
              </button>
            )}

          <button
            onClick={() => setShowPreview(true)}
            disabled={loading}
            className="update_btn disabled:opacity-50"
          >
            {loading
              ? "Saving..."
              : isReprint
                ? "⟳ Reprint Bill"
                : "🖨 Print Bill"}
          </button>
        </div>
      </div>

      <BillPreviewModal
        isOpen={showPreview}
        loading={loading}
        billData={{
          restaurant_name: branch.branch_name || "Restaurant",
          restaurant_address: branch.address || "",
          gstin: branch.gst_no || "",
          uniqueOrderId: billUniqueOrderId || uniqueOrderId || orderId,  // ← यह भी fix karo
          captain_name: branch.captain_name || "",
          customer_name: customer.name,
          customer_phone: customer.phone,
          billNo: billUniqueOrderId || uniqueOrderId || savedBillNo,
          table_no: tableId ? tableNameMap[tableId] || tableId : null,
          date_time: new Date().toLocaleString("en-IN"),
          items: orderItems.map((i) => ({
            name: i.dg09_name,
            qty: i.qty,
            rate: Number(i.basePrice || i.price).toFixed(2),
            total: ((i.basePrice || i.price) * i.qty).toFixed(2),
            remark: [...(i.predefinedRemarks || []), i.qtyRemark || ""].filter(Boolean).join(", "),
          })),
          subtotal: subTotal.toFixed(2),
          tax_breakdown: taxBreakdown,
          charge_breakdown: chargeBreakdown,
          total_charges: totalCharges,
          discount: discountAmount.toFixed(2),
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