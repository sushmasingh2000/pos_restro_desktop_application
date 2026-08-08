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
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
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
  const isLending = paymentSplits.some(p => p.mode?.toLowerCase() === "lending");
  const isAdvance = selectedMode?.toLowerCase() === "advance";
  const isSplitLending = isLending && paymentSplits.length > 1;
  const lendingSplitAmt = isSplitLending
    ? parseFloat(paymentSplits.find(p => p.mode?.toLowerCase() === "lending")?.amount || 0)
    : 0;
  const nonLendingPaid = isSplitLending
    ? paymentSplits.filter(p => p.mode?.toLowerCase() !== "lending").reduce((s, p) => s + parseFloat(p.amount || 0), 0)
    : 0;
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

  // Single payment ke liye amount auto-normalize (empty amount fix)
  const getFinalSplits = () => {
    if (!isLending && !isAdvance && paymentSplits.length === 1) {
      return [{ mode: paymentSplits[0].mode, amount: afterWalletTotal.toFixed(2) }];
    }
    return paymentSplits;
  };

  // ── Sirf Close Table ke liye validation ──
  const validateForClose = () => {
    if (!paymentSplits[0]?.mode?.trim()) {
      toast.error("Select payment method!");
      return false;
    }
    if (!isLending && !isAdvance && paymentSplits.length === 1) {
      const paidAmt = parseFloat(paymentSplits[0].amount || 0);
      if (paidAmt > afterWalletTotal + 0.5) {
        toast.error(`Payment ₹${paidAmt.toFixed(2)} bill total ₹${afterWalletTotal.toFixed(2)} se zyada nahi ho sakta!`);
        return false;
      }
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
        else if (bill.paymentMethod?.toLowerCase() === "lending")
          // Lending bill jiska abhi tak kuch paid hi nahi hua (paid_amount 0) —
          // "Given Amount" ko poore total se pre-fill mat karo, warna staff
          // bina dhyan diye save/close kar de to poora bill galti se "paid"
          // ho jaata hai jabki customer ne ek rupaya bhi nahi diya.
          setGivenAmount("0");
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
        } else if (bill.paymentMethod && bill.paymentMethod !== "Pending") {
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
    ? (isSplitLending ? lendingSplitAmt : Math.max(0, afterWalletTotal - givenAmt))
    : 0;

  // ── Active offers ─────────────────────────────────
  // "ItemPrice" offers (jaise "Cappuccino @ Rs79") POS pe item add karte
  // waqt hi automatic lag chuke hote hain — inhe yahan coupon ki tarah
  // dobara "apply" karne dena double-discount kar deta (item pe already
  // offer price hai, phir coupon se ek aur discount kat jaata). Isliye
  // is list se hamesha hata do. Query hamesha chalao (sirf coupon tab
  // khulne par nahi) — offer-item detection (neeche) ko bhi in data ki
  // zaroorat hai, chahe staff "Discount" tab hi dekh raha ho.
  const { data: offersData } = useQuery(
    ["active_offers_bill"],
    () => apiConnectorGet(endpoint.get_active_offers_api),
    { staleTime: 5 * 60 * 1000, retry: false }
  );
  const allActiveOffers = offersData?.data?.result || [];
  const AUTO_ITEM_TYPES = ["ItemPrice", "ItemFlatDiscount", "ItemPercentDiscount"];
  const AUTO_CATEGORY_TYPES = ["CategoryDiscount", "CategoryPercentDiscount", "CategoryFixedPrice"];
  const AUTO_OFFER_TYPES = [...AUTO_ITEM_TYPES, ...AUTO_CATEGORY_TYPES];
  const activeOffers = allActiveOffers.filter(
    (o) => !AUTO_OFFER_TYPES.includes(o.dg037_offer_type)
  );
  // Auto item/category offers (fixed price, flat ₹ off, or % off) auto-apply
  // just like ItemPrice — union all of them into one menu_id set for offer
  // detection.
  const itemPriceMenuIds = new Set([
    ...allActiveOffers
      .filter((o) => AUTO_ITEM_TYPES.includes(o.dg037_offer_type) && o.dg037_menu_id)
      .map((o) => String(o.dg037_menu_id)),
    ...allActiveOffers
      .filter((o) => AUTO_CATEGORY_TYPES.includes(o.dg037_offer_type))
      .flatMap((o) => o.menu_ids || [])
      .map((id) => String(id)),
  ]);

  // ── Offer-priced items already in the cart ─────────
  // Agar cart mein koi item pehle se offer-price ke saath hai, to us order
  // pe coupon bilkul nahi lagne dena (double-discount ka risk) — discount
  // sirf tab allow karo jab cart mein koi non-offer item bhi ho.
  //
  // "isOfferItem" flag sirf usी POS session mein turant-add-kiye items pe
  // milta hai — agar staff table dobara khole (order backend se reload
  // hua), ye flag nahi hota. Isliye menu_id ko live active offers se bhi
  // match karo, chahe item kahin se bhi aaya ho (naya add ho ya pehle se
  // saved order se load hua ho).
  const isItemOffered = (i) => {
    if (i.isOfferItem) return true;
    const menuId = i.id ?? i.dg09_menu_id ?? i.dg07_menu_id ?? i.menu_id;
    return menuId != null && itemPriceMenuIds.has(String(menuId));
  };
  const hasOfferItem = orderItems.some(isItemOffered);
  const hasNonOfferItem = orderItems.some((i) => !isItemOffered(i));
  const couponBlocked = hasOfferItem;
  const discountBlocked = hasOfferItem && !hasNonOfferItem;

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
      charge_amount: totalCharges,
      discount: discountAmount,
      round_off: roundOff,

      total_amount: grandTotal,

      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_address: customer.address,
      customer_id: selectedCustomerId,

      paymentMethod: paymentSplits.map((p) => p.mode).join("+"),
      payment_splits: getFinalSplits(),

      paid_amount: isLending ? (isSplitLending ? nonLendingPaid : givenAmt) : isAdvance ? maxWalletUse : grandTotal,

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
            business_name: branch.business_name || "",
            restaurant_name: branch.branch_name || "Restaurant",
            outlet_name: branch.outlet_name || "",
            lic_no: branch.lic_no || "",
            bill_title: branch.bill_title || "",
            restaurant_address: branch.address || "",
            gstin: branch.gst_no || "",
            captain_name: branch.captain_name || "",
            upi_id: branch.upi_id || "",
            upi_payee_name: branch.upi_payee_name || "",
            uniqueOrderId: billUniqueOrderId || uniqueOrderId || orderId,
            billNo: billRes.data.billNo,
            table_no: tableId ? tableNameMap[tableId] || tableId : null,
            date_time: new Date().toLocaleString("en-IN"),
            tax_breakdown: taxBreakdown,
            charge_breakdown: chargeBreakdown,
            items: orderItems.map((i) => {
              const itemRate = parseFloat(i.price ?? i.basePrice);
              return {
                name: i.dg09_name,
                qty: i.qty,
                rate: itemRate.toFixed(2),
                total: (itemRate * i.qty).toFixed(2),
                remark: [...(i.predefinedRemarks || []), i.qtyRemark || ""].filter(Boolean).join(", "),
              };
            }),
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
            payment_splits: getFinalSplits(),
            customer_id: selectedCustomerId,
            customer_name: customer.name,
            customer_phone: customer.phone,
            customer_address: customer.address,
            discount: discountAmount,
            paid_amount: isLending ? (isSplitLending ? nonLendingPaid : givenAmt) : isAdvance ? maxWalletUse : grandTotal,
            remaining_amount: isLending ? lendingRemaining : isAdvance ? advanceRemaining : 0,
            wallet_used: useWallet && !isAdvance ? maxWalletUse : 0,
            advance_used: isAdvance ? maxWalletUse : 0,
          }
        );
      }

      // ── ONLINE — normal bill data ─────────────
      const billData = {
        business_name: branch.business_name || "",
        restaurant_name: branch.branch_name || "Restaurant",
        outlet_name: branch.outlet_name || "",
        lic_no: branch.lic_no || "",
        bill_title: branch.bill_title || "",
        restaurant_address: branch.address || "",
        gstin: branch.gst_no || "",
        captain_name: branch.captain_name || "",
        upi_id: branch.upi_id || "",
        upi_payee_name: branch.upi_payee_name || "",
        billNo: finalBillNo || finalBillId,
        uniqueOrderId: billUniqueOrderId || uniqueOrderId || orderId,
        orderId,
        table_no: tableId ? tableNameMap[tableId] || tableId : null,
        date_time: new Date().toLocaleString("en-IN"),
        tax_breakdown: taxBreakdown,
        charge_breakdown: chargeBreakdown,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_address: customer.address,
        subtotal: subTotal.toFixed(2),
        discount: discountAmount.toFixed(2),
        coupon_name: appliedOfferName || null,
        wallet_used: useWallet || isAdvance ? maxWalletUse.toFixed(2) : 0,
        advance_used: isAdvance ? maxWalletUse.toFixed(2) : 0,
        total_amount: grandTotal.toFixed(2),
        paymentMethod: paymentSplits.map((p) => p.mode).join("+"),
        payment_splits: getFinalSplits(),
        paid_amount: isLending ? (isSplitLending ? nonLendingPaid.toFixed(2) : givenAmt.toFixed(2)) : isAdvance ? maxWalletUse.toFixed(2) : grandTotal.toFixed(2),
        remaining_amount: isLending ? lendingRemaining.toFixed(2) : isAdvance ? advanceRemaining.toFixed(2) : 0,
        is_lending: isLending,
        is_advance: isAdvance,
        round_off: roundOff,
        items: orderItems.map((i) => {
          const itemRate = parseFloat(i.basePrice || i.price);
          return {
            name: i.dg09_name,
            qty: i.qty,
            rate: itemRate.toFixed(2),
            total: (itemRate * i.qty).toFixed(2),
            remark: [...(i.predefinedRemarks || []), i.qtyRemark || ""].filter(Boolean).join(", "),
          };
        }),
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

  const openCloseConfirm = () => {
    if (loading) return;
    if (!validateForClose()) return;
    setShowCloseConfirm(true);
  };

  const handleCloseTable = async () => {
    if (loading) return;
    if (!validateForClose()) return;
    setShowCloseConfirm(false);
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
            payment_splits: getFinalSplits(),
            customer_id: selectedCustomerId,
            customer_name: customer.name,
            customer_phone: customer.phone,
            customer_address: customer.address,
            discount: discountAmount,
            paid_amount: isLending ? (isSplitLending ? nonLendingPaid : givenAmt) : isAdvance ? maxWalletUse : grandTotal,
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

  const _dbModes = paymentModes.length > 0
    ? paymentModes.map((m) => ({ id: m.dg041_mode_id, name: m.dg041_name }))
    : [{ id: "cash", name: "Cash" }, { id: "upi", name: "UPI" }, { id: "card", name: "Card" }];
  const _hasLending = _dbModes.some(m => m.name?.toLowerCase() === "lending");
  const _hasAdvance = _dbModes.some(m => m.name?.toLowerCase() === "advance");
  const allModes = [
    ..._dbModes,
    ...(!_hasLending ? [{ id: "lending", name: "Lending" }] : []),
    ...(!_hasAdvance ? [{ id: "advance", name: "Advance" }] : []),
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
          couponBlocked={couponBlocked}
          discountBlocked={discountBlocked}
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
          {isReprint &&
            currentStatus !== "completed" &&
            (orderType !== "delivery" || currentStatus === "out_for_delivery") && (
              <button
                onClick={openCloseConfirm}
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
          business_name: branch.business_name || "",
          restaurant_name: branch.branch_name || "Restaurant",
          outlet_name: branch.outlet_name || "",
          lic_no: branch.lic_no || "",
          bill_title: branch.bill_title || "",
          restaurant_address: branch.address || "",
          gstin: branch.gst_no || "",
          uniqueOrderId: billUniqueOrderId || uniqueOrderId || orderId,
          captain_name: branch.captain_name || "",
          customer_name: customer.name,
          customer_phone: customer.phone,
          billNo: billUniqueOrderId || uniqueOrderId || savedBillNo,
          table_no: tableId ? tableNameMap[tableId] || tableId : null,
          date_time: new Date().toLocaleString("en-IN"),
          items: orderItems.map((i) => ({
            name: i.dg09_name,
            qty: i.qty,
            // basePrice addon/option surcharge (jaise "Large" size) ya offer
            // discount include nahi karta — bill ki Rate/Amt hamesha asli
            // final per-unit price (price) se dikhao, warna line ka Rate x Qty
            // Sub Total se match hi nahi karta.
            rate: Number(i.price ?? i.basePrice).toFixed(2),
            total: ((i.price ?? i.basePrice) * i.qty).toFixed(2),
            remark: [...(i.predefinedRemarks || []), i.qtyRemark || ""].filter(Boolean).join(", "),
          })),
          subtotal: subTotal.toFixed(2),
          tax_breakdown: taxBreakdown,
          charge_breakdown: chargeBreakdown,
          total_charges: totalCharges,
          discount: discountAmount.toFixed(2),
          total_amount: grandTotal.toFixed(2),
          round_off: roundOff,
          payment_splits: getFinalSplits(),
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

      {/* ── Close Table confirm ── */}
      {showCloseConfirm && (
        <div
          onClick={() => setShowCloseConfirm(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 24,
              padding: "36px 32px 28px",
              width: 320,
              textAlign: "center",
              boxShadow: "0 24px 64px rgba(0,0,0,0.25), 0 0 0 1px rgba(239,68,68,0.2)",
            }}
          >
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "rgba(239,68,68,0.1)",
              border: "3px solid #F94E34",
              margin: "0 auto 20px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 38,
              boxShadow: "0 0 0 6px rgba(239,68,68,0.08)",
            }}>
              🔒
            </div>

            <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}>
              Are you sure?
            </div>

            <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 28 }}>
              Close this table with{" "}
              <span style={{
                fontWeight: 700, color: "#F94E34",
                background: "rgba(239,68,68,0.1)",
                padding: "2px 8px", borderRadius: 6,
              }}>
                {paymentSplits.map((p) => p.mode).join(" + ")}
              </span>
              {" "}— ₹{afterWalletTotal.toFixed(2)}?
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowCloseConfirm(false)}
                style={{
                  flex: 1, padding: "12px", borderRadius: 12,
                  fontSize: 14, fontWeight: 700,
                  background: "#f1f5f9", border: "1px solid #e2e8f0",
                  color: "#64748b", cursor: "pointer",
                }}
              >
                ✕ Cancel
              </button>
              <button
                onClick={handleCloseTable}
                disabled={loading}
                style={{
                  flex: 1, padding: "12px", borderRadius: 12,
                  fontSize: 14, fontWeight: 700,
                  background: "linear-gradient(135deg, #F94E34, rgba(239,68,68,0.75))",
                  border: "none", color: "#fff", cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(239,68,68,0.4)",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "Processing..." : "✓ Yes, Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}