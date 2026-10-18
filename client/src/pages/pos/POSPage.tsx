import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ShoppingCart,
  Trash2,
  ChefHat,
  Plus,
  Minus,
  UtensilsCrossed,
  AlertCircle,
  Users,
  UserCheck,
  UserPlus,
  Sparkles,
  Phone,
  X,
  MessageSquare,
  Tag,
  Percent,
  BadgePercent,
  Printer,
} from "lucide-react";
import { api, extractErrorMessage } from "../../services/api.js";
import { useAuthStore } from "../../store/authStore.js";
import { useCartStore } from "../../store/cartStore.js";
import {
  printReceiptDirectly,
  printKOTDirectly,
  printCombinedKOTAndBillDirectly,
  getSavedPaperSize,
  setSavedPaperSize,
  buildThermalReceiptText,
  type ThermalPaperSize,
  type BuildKOTParams,
  type BuildReceiptParams,
} from "../../utils/print.js";
import {
  detectSerialPrinter,
  detectUsbPrinter,
  getLastDetectedPrinter,
  type DetectedPrinterInfo,
} from "../../utils/printerPortDetector.js";
import type { Category, MenuItem, RestaurantTable, Customer, BrandSettings, Franchise } from "../../types/index.js";
import { Button } from "../../components/common/Button.js";
import { Input } from "../../components/common/Input.js";
import { Select } from "../../components/common/Select.js";
import { Modal } from "../../components/common/Modal.js";
import { LoadingState } from "../../components/common/LoadingState.js";
import { AggregatorOrderModal } from "../../components/pos/AggregatorOrderModal.js";
import { AggregatorSettingsModal } from "../../components/pos/AggregatorSettingsModal.js";
import { TableLayoutModal } from "../../components/pos/TableLayoutModal.js";
import { Globe, Bell, LayoutGrid, Store, Cpu, Check } from "lucide-react";
import { usePermissions } from "../../hooks/usePermissions.js";

export const POSPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { selectedFranchiseId, user, setSelectedFranchise } = useAuthStore();
  const { isSuperAdmin: isPermAdmin, canApplyDiscounts, maxDiscountPercent } = usePermissions();
  const isSuperAdmin = user?.role === "SUPER_ADMIN" || isPermAdmin;
  const effectiveFranchiseId = selectedFranchiseId || user?.franchiseId;

  const {
    items: cartItems,
    selectedTable,
    discount,
    taxRate,
    addItem,
    updateQuantity,
    updateItemNotes,
    setSelectedTable,
    setDiscount,
    setTaxRate,
    clearCart,
    getSubtotal,
    getTax,
    getTotal,
  } = useCartStore();

  // Bill & Pay Settlement Modal State (UPI / Cash / UPI+Cash)
  const [isBillPayModalOpen, setIsBillPayModalOpen] = useState(false);
  const [payMode, setPayMode] = useState<"CASH" | "UPI" | "SPLIT" | "CARD">("CASH");
  const [splitCashAmount, setSplitCashAmount] = useState<number>(0);
  const [splitUpiAmount, setSplitUpiAmount] = useState<number>(0);
  const [printKOT, setPrintKOT] = useState<boolean>(true);

  // Portion / Size Selection for Pizza (Small / Medium / Large)
  const [sizeSelectionItem, setSizeSelectionItem] = useState<MenuItem | null>(null);

  const isPizzaOrSized = (item: MenuItem) => {
    return (
      Boolean(item.hasSizes) ||
      item.name.toLowerCase().includes("pizza") ||
      Boolean(item.category?.name?.toLowerCase().includes("pizza"))
    );
  };

  // Instant keyboard shortcuts for Portion Selection (1=Small, 2=Medium, 3=Large, Esc=Cancel)
  useEffect(() => {
    if (!sizeSelectionItem) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      const pSmall = sizeSelectionItem.priceSmall != null ? Number(sizeSelectionItem.priceSmall) : Number(sizeSelectionItem.price);
      const pMedium = sizeSelectionItem.priceMedium != null ? Number(sizeSelectionItem.priceMedium) : Number(sizeSelectionItem.price);
      const pLarge = sizeSelectionItem.priceLarge != null ? Number(sizeSelectionItem.priceLarge) : Number(sizeSelectionItem.price);

      if (e.key === "1" || e.key.toLowerCase() === "s") {
        e.preventDefault();
        addItem(sizeSelectionItem, "Small", pSmall);
        setSizeSelectionItem(null);
      } else if (e.key === "2" || e.key.toLowerCase() === "m") {
        e.preventDefault();
        addItem(sizeSelectionItem, "Medium", pMedium);
        setSizeSelectionItem(null);
      } else if (e.key === "3" || e.key.toLowerCase() === "l") {
        e.preventDefault();
        addItem(sizeSelectionItem, "Large", pLarge);
        setSizeSelectionItem(null);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSizeSelectionItem(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sizeSelectionItem, addItem]);

  // Printer Paper Size (58mm vs 80mm) & Hardware Port Detection
  const [paperSize, setPaperSize] = useState<ThermalPaperSize>(getSavedPaperSize());
  const [isPrinterConfigOpen, setIsPrinterConfigOpen] = useState(false);
  const [detectedPrinter, setDetectedPrinter] = useState<DetectedPrinterInfo | null>(getLastDetectedPrinter());
  const [isDetectingPrinter, setIsDetectingPrinter] = useState(false);
  const [printerDetectMsg, setPrinterDetectMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [posError, setPosError] = useState<string | null>(null);

  // Table Seating & Party Size State
  const [isFloorPlanOpen, setIsFloorPlanOpen] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [guestCount, setGuestCount] = useState<number>(2);
  const [showCapacityWarning, setShowCapacityWarning] = useState(false);
  const [suggestedTables, setSuggestedTables] = useState<RestaurantTable[]>([]);
  const [pendingTableSelection, setPendingTableSelection] = useState<RestaurantTable | null>(null);


  // Customer CRM Recognition State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerPhoneQuery, setCustomerPhoneQuery] = useState("");
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [customerSearchMsg, setCustomerSearchMsg] = useState<string | null>(null);
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({
    name: "",
    phone: "",
    email: "",
    marketingConsent: true,
  });

  // CRM Campaign Promo & Loyalty Discount State
  const [couponCode, setCouponCode] = useState("");
  const [promoMessage, setPromoMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Fetch Brand Settings for business info and loyalty discount rates
  const { data: brandSettings } = useQuery<BrandSettings>({
    queryKey: ["brand-settings"],
    queryFn: async () => {
      const res = await api.get("/brand-settings");
      return res.data.data;
    },
  });

  // Synchronize tax rate with brand settings (0% if brand has no GSTIN or defaultGstRate is 0)
  React.useEffect(() => {
    if (brandSettings) {
      const isGstRegistered = Boolean(brandSettings.taxNumber && brandSettings.taxNumber.trim());
      const rate = isGstRegistered ? Number(brandSettings.defaultGstRate || 0) : 0;
      setTaxRate(rate);
    }
  }, [brandSettings, setTaxRate]);

  // Fetch Active Campaigns to validate promo codes
  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: ["crm-campaigns", effectiveFranchiseId],
    queryFn: async () => {
      const res = await api.get(effectiveFranchiseId ? `/crm/campaigns?franchiseId=${effectiveFranchiseId}` : "/crm/campaigns");
      return res.data.data;
    },
  });

  // Fetch active franchises for Super Admin outlet selection
  const { data: franchises = [] } = useQuery<Franchise[]>({
    queryKey: ["navbar-franchises"],
    queryFn: async () => {
      const res = await api.get("/franchises");
      return res.data.data;
    },
    enabled: isSuperAdmin,
  });
  const activeFranchises = franchises.filter((f) => f.isActive);

  // Auto-select first active franchise if Super Admin enters POS with no franchise selected
  React.useEffect(() => {
    if (isSuperAdmin && !selectedFranchiseId && activeFranchises.length > 0) {
      setSelectedFranchise(activeFranchises[0].id);
    }
  }, [isSuperAdmin, selectedFranchiseId, activeFranchises, setSelectedFranchise]);

  // Aggregator Online Orders (Swiggy / Zomato) State
  const [isAggregatorModalOpen, setIsAggregatorModalOpen] = useState(false);
  const [isAggregatorSettingsOpen, setIsAggregatorSettingsOpen] = useState(false);

  // Fetch Pending Aggregator Orders
  const { data: pendingAggregatorOrders = [] } = useQuery<any[]>({
    queryKey: ["aggregator-pending", effectiveFranchiseId],
    queryFn: async () => {
      if (!effectiveFranchiseId) return [];
      const res = await api.get(`/aggregators/pending?franchiseId=${effectiveFranchiseId}`);
      return res.data.data;
    },
    enabled: !!effectiveFranchiseId,
  });

  // Fetch Aggregator Settings
  const { data: aggregatorSettings = [] } = useQuery<any[]>({
    queryKey: ["aggregator-settings", effectiveFranchiseId],
    queryFn: async () => {
      if (!effectiveFranchiseId) return [];
      const res = await api.get(`/aggregators/settings?franchiseId=${effectiveFranchiseId}`);
      return res.data.data;
    },
    enabled: !!effectiveFranchiseId,
  });

  const isSwiggyEnabled = aggregatorSettings.find((i: any) => i.platform === "SWIGGY")?.isEnabled ?? true;
  const isZomatoEnabled = aggregatorSettings.find((i: any) => i.platform === "ZOMATO")?.isEnabled ?? true;

  // Auto-open modal on new pending online order
  const prevPendingCountRef = React.useRef(0);
  React.useEffect(() => {
    if (pendingAggregatorOrders.length > prevPendingCountRef.current && pendingAggregatorOrders.length > 0) {
      setIsAggregatorModalOpen(true);
    }
    prevPendingCountRef.current = pendingAggregatorOrders.length;
  }, [pendingAggregatorOrders.length]);

  // Simulate Order Mutation
  const simulateOrderMutation = useMutation({
    mutationFn: async (platform: "SWIGGY" | "ZOMATO") => {
      const res = await api.post("/aggregators/simulate", {
        franchiseId: effectiveFranchiseId,
        platform,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aggregator-pending"] });
      setIsAggregatorModalOpen(true);
    },
  });

  const getCustomerLoyaltyDiscountRate = (segment?: string) => {
    if (!segment) return 0;
    const vipRate = brandSettings?.loyaltyVipDiscount ? Number(brandSettings.loyaltyVipDiscount) : 20;
    const loyalRate = brandSettings?.loyaltyLoyalDiscount ? Number(brandSettings.loyaltyLoyalDiscount) : 15;
    const regRate = brandSettings?.loyaltyRegularDiscount ? Number(brandSettings.loyaltyRegularDiscount) : 10;
    if (segment === "VIP" || segment === "HIGH_VALUE") return vipRate;
    if (segment === "LOYAL") return loyalRate;
    if (segment === "REGULAR") return regRate;
    return 0;
  };

  const applyLoyaltyDiscount = () => {
    if (!canApplyDiscounts) {
      setPromoMessage({ text: "Permission denied: You do not have permission to apply discounts.", type: "error" });
      return;
    }
    if (!selectedCustomer) return;
    let rate = getCustomerLoyaltyDiscountRate(selectedCustomer.segment);
    if (rate <= 0) return;
    if (maxDiscountPercent != null && rate > maxDiscountPercent) {
      rate = maxDiscountPercent;
    }
    const currentSubtotal = getSubtotal();
    const disc = Number(((currentSubtotal * rate) / 100).toFixed(2));
    setDiscount(disc);
    setPromoMessage({ text: `${selectedCustomer.segment} loyalty discount (${rate}% = -₹${disc}) applied!`, type: "success" });
  };

  const applyPromoCode = (codeToApply?: string) => {
    if (!canApplyDiscounts) {
      setPromoMessage({ text: "Permission denied: You do not have permission to apply discounts.", type: "error" });
      return;
    }
    const code = (codeToApply || couponCode).trim().toUpperCase();
    if (!code) return;
    const currentSubtotal = getSubtotal();
    if (currentSubtotal <= 0) {
      setPromoMessage({ text: "Add items to cart before applying coupon", type: "error" });
      return;
    }

    let pct = 0;
    const matched = campaigns.find((c: any) => c.discountCode && c.discountCode.toUpperCase() === code);
    if (matched && matched.discountPercent) {
      pct = Number(matched.discountPercent);
    } else if (code === "WELCOME10") {
      pct = 10;
    } else if (code === "VIP20") {
      pct = 20;
    } else if (code === "LOYAL15") {
      pct = 15;
    } else if (code === "FESTIVE25") {
      pct = 25;
    } else {
      setPromoMessage({ text: `Invalid or expired coupon "${code}"`, type: "error" });
      return;
    }

    if (maxDiscountPercent != null && pct > maxDiscountPercent) {
      setPromoMessage({
        text: `Discount clamped to maximum allowed ${maxDiscountPercent}% (Coupon offered ${pct}%)`,
        type: "error",
      });
      pct = maxDiscountPercent;
    }

    const disc = Number(((currentSubtotal * pct) / 100).toFixed(2));
    setDiscount(disc);
    setPromoMessage({ text: `Coupon "${code}" applied: ${pct}% OFF (-₹${disc})`, type: "success" });
  };

  const handleCustomerLookup = async (phoneToLookup?: string) => {
    const q = phoneToLookup !== undefined ? phoneToLookup : customerPhoneQuery;
    if (!q || q.trim().length < 3) return;

    setIsSearchingCustomer(true);
    setCustomerSearchMsg(null);
    try {
      const res = await api.get("/crm/lookup", { params: { phone: q.trim() } });
      if (res.data.data) {
        setSelectedCustomer(res.data.data);
        if (!partyName) {
          setPartyName(res.data.data.name);
        }
        setCustomerSearchMsg(null);
      } else {
        setCustomerSearchMsg("Not found. Click '+ Add' to register walk-in.");
      }
    } catch {
      setCustomerSearchMsg("Error looking up customer");
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  const quickAddCustomerMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/crm/customers", {
        ...quickAddForm,
        franchiseId: effectiveFranchiseId,
      });
      return res.data.data;
    },
    onSuccess: (customer: Customer) => {
      setSelectedCustomer(customer);
      if (!partyName) setPartyName(customer.name);
      setShowQuickAddCustomer(false);
      setCustomerPhoneQuery("");
      setQuickAddForm({ name: "", phone: "", email: "", marketingConsent: true });
    },
    onError: (err) => {
      setPosError(extractErrorMessage(err));
    },
  });

  // Fetch Tables
  const { data: tables = [] } = useQuery<RestaurantTable[]>({
    queryKey: ["tables", effectiveFranchiseId],
    queryFn: async () => {
      const res = await api.get(effectiveFranchiseId ? `/tables?franchiseId=${effectiveFranchiseId}` : "/tables");
      return res.data.data;
    },
  });

  // Fetch Categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories", effectiveFranchiseId],
    queryFn: async () => {
      const res = await api.get(effectiveFranchiseId ? `/menu/categories?franchiseId=${effectiveFranchiseId}` : "/menu/categories");
      return res.data.data;
    },
  });

  // Fetch Menu Items
  const { data: menuItems = [], isLoading: isLoadingMenu } = useQuery<MenuItem[]>({
    queryKey: ["menu-items", effectiveFranchiseId],
    queryFn: async () => {
      const res = await api.get(effectiveFranchiseId ? `/menu/items?franchiseId=${effectiveFranchiseId}` : "/menu/items");
      return res.data.data;
    },
  });

  // Handle Smart Table Selection with capacity check
  const handleTableChange = (tableId: string) => {
    if (!tableId) {
      setSelectedTable(null);
      return;
    }

    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    const remainingSeats = table.capacity - (table.currentOccupancy || 0);
    if (guestCount > remainingSeats) {
      const alternatives = tables.filter(
        (t) => t.id !== table.id && (t.capacity - (t.currentOccupancy || 0)) >= guestCount
      );
      setSuggestedTables(alternatives);
      setPendingTableSelection(table);
      setShowCapacityWarning(true);
    } else {
      setSelectedTable(table);
    }
  };

  // Place Order & Send KOT Mutation
  const placeOrderAndKOTMutation = useMutation({
    mutationFn: async () => {
      if (cartItems.length === 0) throw new Error("Order cart is empty");

      const payload = {
        tableId: selectedTable?.id || null,
        customerId: selectedCustomer?.id || null,
        discount,
        taxRate,
        partyName: partyName || undefined,
        guestCount: guestCount || undefined,
        kotDecision: "SENT",
        items: cartItems.map((i) => ({
          menuItemId: i.menuItem.id,
          quantity: i.quantity,
          selectedSize: i.selectedSize || undefined,
          unitPrice: Number(i.price ?? i.menuItem.price),
          notes: i.notes || null,
        })),
      };

      const orderRes = await api.post("/orders", payload);
      const createdOrder = orderRes.data.data;

      // Auto generate KOT
      await api.post("/kot/generate", { orderId: createdOrder.id });
      return createdOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["kots"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      clearCart();
      setSelectedCustomer(null);
      navigate("/orders");
    },
    onError: (err) => {
      setPosError(extractErrorMessage(err));
    },
  });

  const [isBilling, setIsBilling] = useState(false);

  // Instant Optimistic Thermal Billing & Direct Spooler (0ms Latency)
  // Automatically prints KOT FIRST (items + table no only) and then BILL!
  const handleCompletePaymentAndPrint = async () => {
    if (cartItems.length === 0) {
      setPosError("Cart is empty! Please add items before completing payment.");
      return;
    }
    if (isBilling) return;
    setIsBilling(true);

    try {
      // 1. Synchronously pre-calculate date, invoiceNumber, orderNumber
      const now = new Date();
      const datePrefix = `${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const invoiceNumber = `INV-${datePrefix}-${randomSuffix}`;
      const orderNumber = `ORD-${datePrefix}-${randomSuffix}`;

      // 2. Identify active franchise details with safety fallbacks
      const currFranchise =
        (activeFranchises && activeFranchises.find((f) => f.id === effectiveFranchiseId)) ||
        user?.franchise ||
        undefined;

      // 3. Prepare payment records
      const paymentRecords =
        payMode === "SPLIT"
          ? [
              { method: "CASH", amount: Number(splitCashAmount.toFixed(2)), status: "COMPLETED" },
              { method: "UPI", amount: Number(splitUpiAmount.toFixed(2)), status: "COMPLETED" },
            ]
          : [{ method: payMode, amount: Number(total.toFixed(2)), status: "COMPLETED" }];

      // 4. Capture cart & checkout state snapshot
      const itemsSnapshot = cartItems.map((i) => {
        const itemUnitPrice = Number(i.price ?? i.menuItem.price);
        return {
          name: i.selectedSize ? `${i.menuItem.name} (${i.selectedSize})` : i.menuItem.name,
          rawName: i.menuItem.name,
          quantity: i.quantity,
          price: itemUnitPrice,
          totalPrice: itemUnitPrice * i.quantity,
          menuItemId: i.menuItem.id,
          selectedSize: i.selectedSize || null,
          notes: i.notes || null,
        };
      });
      const subtotalSnapshot = subtotal;
      const discountSnapshot = discount;
      const taxSnapshot = tax;
      const totalSnapshot = total;
      const tableSnapshot = selectedTable;
      const customerSnapshot = selectedCustomer;
      const partyNameSnapshot = partyName;
      const guestCountSnapshot = guestCount;
      const payModeSnapshot = payMode;

      // 5. Build KOT parameters (Strictly Table Number & Items only, NO prices)
      const kotParams: BuildKOTParams = {
        tableNumber: tableSnapshot?.tableNumber || null,
        orderNumber,
        orderType: tableSnapshot ? `Dine-In (Table ${tableSnapshot.tableNumber})` : "Takeaway / Counter",
        date: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        items: itemsSnapshot.map((i) => ({
          name: i.rawName,
          quantity: i.quantity,
          selectedSize: i.selectedSize,
          notes: i.notes,
        })),
        instructions: partyNameSnapshot ? `Party: ${partyNameSnapshot}` : undefined,
      };

      // 6. Build Bill parameters (Madrasi Dosa branding, item prices, subtotal, tax, total, payments)
      const billParams: BuildReceiptParams = {
        brandName: brandSettings?.businessName || "MADRASI DOSA",
        franchiseName: currFranchise?.name,
        franchiseAddress: (currFranchise as any)?.address || brandSettings?.address || undefined,
        franchisePhone: (currFranchise as any)?.phone || brandSettings?.phone || undefined,
        gstin: brandSettings?.taxNumber || undefined,
        fssaiNumber: brandSettings?.fssaiNumber || undefined,
        invoiceNumber,
        orderNumber,
        orderType: tableSnapshot ? `Dine-In (Table ${tableSnapshot.tableNumber})` : "Takeaway / Counter",
        date: now.toLocaleString(),
        currencySymbol: brandSettings?.currencySymbol || "₹",
        items: itemsSnapshot,
        subtotal: subtotalSnapshot,
        discount: discountSnapshot,
        tax: taxSnapshot,
        total: totalSnapshot,
        payments: paymentRecords,
        footerMessage: "Thanks For Visiting Madrasi Dosa",
      };

      // 7. INSTANT PRINT SPOOLER: Dispatches KOT FIRST, followed immediately by Customer Bill
      if (printKOT) {
        printCombinedKOTAndBillDirectly({
          kotParams,
          billParams,
          paperSize,
          logoUrl: brandSettings?.logoUrl || undefined,
        });
      } else {
        const receiptText = buildThermalReceiptText(billParams, paperSize);
        printReceiptDirectly(receiptText, {
          title: `Invoice #${invoiceNumber}`,
          paperSize,
          logoUrl: brandSettings?.logoUrl || undefined,
          showLogo: true,
        });
      }

      // 8. INSTANT UI RESET: Immediate feedback, zero waiting
      setIsBillPayModalOpen(false);
      clearCart();
      setSelectedTable(null);
      setSelectedCustomer(null);
      setPartyName("");
      setGuestCount(2);

      // 9. BACKGROUND CLOUD ASYNC SYNC: Syncs order, invoice, payment with Render & MongoDB
      const payload = {
        invoiceNumber,
        orderNumber,
        tableId: tableSnapshot?.id || null,
        customerId: customerSnapshot?.id || null,
        discount: discountSnapshot,
        taxRate,
        partyName: partyNameSnapshot || undefined,
        guestCount: guestCountSnapshot || undefined,
        items: itemsSnapshot.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          selectedSize: i.selectedSize || undefined,
          unitPrice: i.price,
          notes: i.notes,
        })),
        ...(payModeSnapshot === "SPLIT"
          ? {
              splitPayments: [
                { method: "CASH", amount: Number(splitCashAmount.toFixed(2)) },
                { method: "UPI", amount: Number(splitUpiAmount.toFixed(2)) },
              ],
            }
          : { paymentMethod: payModeSnapshot }),
      };

      // Fire in background without blocking UI
      api.post("/billing/fast-bill", payload)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["tables"] });
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          queryClient.invalidateQueries({ queryKey: ["invoices"] });
        })
        .catch((err) => {
          console.warn("Background billing sync notice:", err);
          setPosError("Bill printed locally! Cloud sync delayed: " + extractErrorMessage(err));
        });
    } catch (err: any) {
      console.error("Billing print error:", err);
      setPosError("Billing error: " + (err?.message || "Failed to complete payment and print bill"));
    } finally {
      setIsBilling(false);
    }
  };


  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = activeCategory ? item.categoryId === activeCategory : true;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const subtotal = getSubtotal();
  const tax = getTax();
  const total = getTotal();

  // If Super Admin has not selected a specific franchise outlet yet, prompt to pick one
  if (isSuperAdmin && !selectedFranchiseId) {
    return (
      <div className="h-[calc(100vh-6.5rem)] flex items-center justify-center p-6 bg-slate-50/50">
        <div className="max-w-lg w-full bg-white rounded-3xl p-8 border border-gray-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Store className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-950">Select POS Outlet</h2>
            <p className="text-sm text-gray-500 mt-1.5">
              You are signed in as <strong>Super Admin</strong>. POS billing, live table seating, and kitchen tickets require an active branch scope:
            </p>
          </div>

          {activeFranchises.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-sm">
              <p className="font-bold">No active franchise found</p>
              <p className="text-xs text-amber-700 mt-1">Please create or activate an outlet under the Franchises tab first.</p>
              <Button
                variant="primary"
                size="sm"
                className="mt-3"
                onClick={() => navigate("/franchises")}
              >
                Go to Franchises
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {activeFranchises.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFranchise(f.id)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50/40 transition-all text-left cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-indigo-100 text-gray-600 group-hover:text-indigo-600 flex items-center justify-center transition-colors">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 group-hover:text-indigo-900">{f.name}</p>
                      <p className="text-xs text-gray-500">{f.code} • {f.address || "Main Branch"}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white px-3 py-1.5 rounded-xl transition-all">
                    Open POS &rarr;
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto overflow-hidden">
      {/* LEFT COLUMN: Catalog & Item Selection */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        {/* Aggregator Status & Incoming Order Alert Ribbon */}
        <div className="bg-slate-900 text-white px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-400 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              Aggregators:
            </span>

            {/* Swiggy status */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] ${
                isSwiggyEnabled
                  ? "bg-[#FC8019]/20 text-[#FC8019] border border-[#FC8019]/40"
                  : "bg-slate-800 text-slate-500 border border-slate-700"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isSwiggyEnabled ? "bg-[#FC8019] animate-pulse" : "bg-slate-500"
                }`}
              />
              Swiggy {isSwiggyEnabled ? "Live" : "Offline"}
            </span>

            {/* Zomato status */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] ${
                isZomatoEnabled
                  ? "bg-[#E23744]/20 text-[#E23744] border border-[#E23744]/40"
                  : "bg-slate-800 text-slate-500 border border-slate-700"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isZomatoEnabled ? "bg-[#E23744] animate-pulse" : "bg-slate-500"
                }`}
              />
              Zomato {isZomatoEnabled ? "Live" : "Offline"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Pending Incoming Orders Alert Button */}
            {pendingAggregatorOrders.length > 0 ? (
              <button
                onClick={() => setIsAggregatorModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black animate-bounce shadow-md cursor-pointer transition-all"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{pendingAggregatorOrders.length} New Online Order{pendingAggregatorOrders.length > 1 ? "s" : ""}!</span>
              </button>
            ) : (
              <button
                onClick={() => setIsAggregatorModalOpen(true)}
                className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer flex items-center gap-1"
              >
                <Bell className="w-3 h-3 text-slate-500" />
                <span>Online Orders</span>
              </button>
            )}

            {/* Test Simulation Buttons */}
            <div className="flex items-center gap-1 pl-1 border-l border-slate-700">
              <button
                type="button"
                onClick={() => simulateOrderMutation.mutate("SWIGGY")}
                disabled={simulateOrderMutation.isPending}
                className="px-2 py-1 rounded-md bg-slate-800 hover:bg-[#FC8019] text-slate-200 hover:text-white font-semibold text-[11px] border border-slate-700 transition-colors cursor-pointer"
                title="Simulate incoming test order from Swiggy"
              >
                + Test Swiggy
              </button>
              <button
                type="button"
                onClick={() => simulateOrderMutation.mutate("ZOMATO")}
                disabled={simulateOrderMutation.isPending}
                className="px-2 py-1 rounded-md bg-slate-800 hover:bg-[#E23744] text-slate-200 hover:text-white font-semibold text-[11px] border border-slate-700 transition-colors cursor-pointer"
                title="Simulate incoming test order from Zomato"
              >
                + Test Zomato
              </button>
            </div>

            {/* Settings Button */}
            <button
              type="button"
              onClick={() => setIsAggregatorSettingsOpen(true)}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-[11px] border border-slate-700 transition-colors cursor-pointer"
            >
              ⚙️ Integrations
            </button>
          </div>
        </div>

        {/* Top Control Bar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-center gap-3">
          {isSuperAdmin && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs font-bold text-indigo-950 shrink-0 shadow-2xs">
              <Store className="w-4 h-4 text-indigo-600" />
              <span>{activeFranchises.find((f) => f.id === selectedFranchiseId)?.name || "Active Outlet"}</span>
              <button
                type="button"
                onClick={() => setSelectedFranchise(null)}
                className="text-[11px] text-indigo-600 hover:text-indigo-900 underline font-extrabold cursor-pointer ml-1"
                title="Switch branch"
              >
                Change
              </button>
            </div>
          )}

          <Input
            placeholder="Search dish by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-gray-400" />}
            className="w-full sm:max-w-xs"
          />

          {/* Table Selector & Guests */}
          <div className="w-full sm:w-auto flex-1 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFloorPlanOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-xs font-bold text-indigo-700 shadow-2xs transition-colors cursor-pointer"
            >
              <LayoutGrid className="w-4 h-4 text-indigo-600" />
              <span>🪑 Floor Plan ({tables.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPrinterConfigOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
              title="Configure thermal printer port, 58mm / 80mm paper size, and test print"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>🖨️ Printer ({paperSize})</span>
            </button>

            <div className="flex-1 min-w-[180px]">
              <Select
                options={[
                  { value: "", label: "🛍️ Takeaway / Direct Counter" },
                  ...tables.map((t) => ({
                    value: t.id,
                    label: `🪑 Table ${t.tableNumber} (${t.currentOccupancy || 0}/${t.capacity} seated - ${t.status})`,
                  })),
                ]}
                value={selectedTable?.id || ""}
                onChange={(e) => handleTableChange(e.target.value)}
                className="w-full font-semibold"
              />
            </div>

            {selectedTable && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-gray-100 px-2 py-1.5 rounded-lg text-xs">
                  <Users className="w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={guestCount}
                    onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-10 text-center font-bold bg-white border border-gray-300 rounded text-xs py-0.5"
                    title="Party Size / Guests"
                  />
                  <span className="text-gray-500 font-medium">Guests</span>
                </div>

                <input
                  type="text"
                  placeholder="Party Name (opt)"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="w-28 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Category Pills Slider */}
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveCategory("")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              activeCategory === ""
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Dish Catalog Grid */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {isLoadingMenu ? (
            <LoadingState message="Loading dishes..." />
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <UtensilsCrossed className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">No menu items found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  disabled={!item.isAvailable}
                  onClick={() => (isPizzaOrSized(item) ? setSizeSelectionItem(item) : addItem(item))}
                  className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer ${
                    item.isAvailable
                      ? "bg-white border-gray-200/90 hover:border-indigo-400 hover:shadow-md active:scale-98"
                      : "bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider truncate">
                        {item.category?.name}
                      </span>
                      {item.code && (
                        <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                          {item.code}
                        </span>
                      )}
                      {!item.isAvailable && (
                        <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                          Out of Stock
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">
                      {item.name}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                    {isPizzaOrSized(item) ? (
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60">
                        S/M/L • ₹{Number(item.priceSmall || item.price).toFixed(0)}+
                      </span>
                    ) : (
                      <span className="text-sm font-extrabold text-gray-900">
                        ₹{Number(item.price).toFixed(2)}
                      </span>
                    )}
                    <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      +
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Cart Terminal */}
      <div className="w-full lg:w-96 bg-white rounded-2xl border border-gray-200/80 shadow-xs flex flex-col overflow-hidden shrink-0">
        {/* Cart Header */}
        <div className="p-4 border-b border-gray-100 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-sm leading-none">Current Order</h3>
              <p className="text-[11px] text-slate-400 mt-1">
                {selectedTable ? `Table ${selectedTable.tableNumber}` : "Takeaway / Walk-in"}
              </p>
            </div>
          </div>
          {cartItems.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Customer CRM Recognition & Lookup */}
        <div className="p-3 border-b border-gray-100 bg-slate-50 space-y-2">
          {selectedCustomer ? (
            <div className="p-2.5 rounded-xl bg-indigo-50/80 border border-indigo-200/80 relative">
              <div className="flex items-start justify-between pr-5">
                <div>
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-xs text-gray-900">{selectedCustomer.name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-600 text-white uppercase">
                      {selectedCustomer.segment}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-600 font-mono mt-0.5">
                    {selectedCustomer.phone} • {selectedCustomer.totalVisits} visits • ₹{Number(selectedCustomer.totalSpend).toLocaleString("en-IN")}
                  </div>
                  {selectedCustomer.preference?.favoriteItemName && (
                    <div className="text-[10px] text-indigo-700 font-medium mt-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Prefers: {selectedCustomer.preference.favoriteItemName}
                    </div>
                  )}

                  {getCustomerLoyaltyDiscountRate(selectedCustomer.segment) > 0 && (
                    <div className="mt-2 pt-2 border-t border-indigo-200/60 flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-indigo-900 flex items-center gap-1">
                        <BadgePercent className="w-3.5 h-3.5 text-indigo-600" />
                        {getCustomerLoyaltyDiscountRate(selectedCustomer.segment)}% Tier Discount
                      </span>
                      <button
                        type="button"
                        onClick={applyLoyaltyDiscount}
                        className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold shadow-xs cursor-pointer flex items-center gap-1 transition-colors"
                      >
                        <Percent className="w-2.5 h-2.5" /> Apply
                      </button>
                    </div>
                  )}

                  <div className="mt-1.5 flex items-center gap-2">
                    <a
                      href={`https://wa.me/${selectedCustomer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Hi ${selectedCustomer.name}! Thank you for dining with ${brandSettings?.businessName || "us"}. As our valued ${selectedCustomer.segment} customer, enjoy your visit!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-medium transition-colors cursor-pointer"
                      title="Send WhatsApp Greeting"
                    >
                      <MessageSquare className="w-2.5 h-2.5" /> WhatsApp Offer
                    </a>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
                  title="Detach customer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Customer phone..."
                    value={customerPhoneQuery}
                    onChange={(e) => {
                      setCustomerPhoneQuery(e.target.value);
                      if (e.target.value.trim().length >= 10) {
                        handleCustomerLookup(e.target.value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCustomerLookup();
                      }
                    }}
                    className="w-full bg-white border border-gray-200 rounded-lg pl-8 pr-2 py-1 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleCustomerLookup()}
                  disabled={isSearchingCustomer || !customerPhoneQuery}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  {isSearchingCustomer ? "..." : "Find"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickAddForm((prev) => ({ ...prev, phone: customerPhoneQuery }));
                    setShowQuickAddCustomer(true);
                  }}
                  className="px-2 py-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-0.5"
                  title="Quick Add Customer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                </button>
              </div>
              {customerSearchMsg && (
                <p className="text-[11px] text-amber-700 px-0.5">{customerSearchMsg}</p>
              )}
            </div>
          )}
        </div>

        {/* Error notification */}
        {posError && (
          <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{posError}</span>
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin divide-y divide-gray-100">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-12">
              <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-xs font-semibold">Cart is empty</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Click any dish on the left to add to this order
              </p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.cartItemId || item.menuItem.id} className="pt-3 first:pt-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-gray-900 text-xs leading-tight">
                        {item.menuItem.name}
                      </p>
                      {item.selectedSize && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-700 border border-indigo-200">
                          {item.selectedSize}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                      ₹{Number(item.price ?? item.menuItem.price).toFixed(2)} each
                    </p>
                  </div>
                  <span className="font-bold text-gray-900 text-xs">
                    ₹{(Number(item.price ?? item.menuItem.price) * item.quantity).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  {/* Notes input */}
                  <input
                    type="text"
                    placeholder="Notes (e.g. less spicy)..."
                    value={item.notes || ""}
                    onChange={(e) => updateItemNotes(item.cartItemId, e.target.value)}
                    className="flex-1 text-[11px] bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />

                  {/* Quantity controls */}
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden shrink-0">
                    <button
                      onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                      className="p-1 hover:bg-gray-100 text-gray-600 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 text-xs font-bold text-gray-900 min-w-[20px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                      className="p-1 hover:bg-gray-100 text-gray-600 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill Calculations & Checkout Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/80 space-y-3">
          <div className="space-y-1.5 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-semibold text-gray-900">₹{subtotal.toFixed(2)}</span>
            </div>

            {/* Coupon / Promo Code Input */}
            <div className="pt-1 space-y-1">
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Tag className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Coupon (e.g. WELCOME10)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyPromoCode();
                      }
                    }}
                    className="w-full text-[11px] uppercase bg-white border border-gray-200 rounded pl-6 pr-2 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => applyPromoCode()}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-semibold rounded cursor-pointer transition-colors"
                >
                  Apply
                </button>
              </div>
              {promoMessage && (
                <p className={`text-[10px] font-medium px-0.5 ${promoMessage.type === "success" ? "text-emerald-700" : "text-rose-600"}`}>
                  {promoMessage.text}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="shrink-0">Discount (₹):</span>
              <input
                type="number"
                min="0"
                max={maxDiscountPercent != null ? (subtotal * maxDiscountPercent) / 100 : subtotal}
                value={discount}
                disabled={!canApplyDiscounts}
                onChange={(e) => {
                  if (!canApplyDiscounts) return;
                  let val = Number(e.target.value);
                  if (maxDiscountPercent != null) {
                    const maxAllowedVal = (subtotal * maxDiscountPercent) / 100;
                    if (val > maxAllowedVal) val = maxAllowedVal;
                  }
                  setDiscount(val);
                }}
                className={`w-20 text-right text-xs bg-white border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold ${!canApplyDiscounts ? "opacity-50 cursor-not-allowed text-gray-400" : "text-emerald-700"}`}
                title={!canApplyDiscounts ? "You do not have permission to apply discounts" : (maxDiscountPercent != null ? `Max discount: ${maxDiscountPercent}%` : undefined)}
              />
            </div>

            <div className="flex justify-between">
              <span>Tax ({taxRate > 0 ? `${taxRate}% GST` : "0% Non-GST"}):</span>
              <span className="font-semibold text-gray-900">₹{tax.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-200">
              <span>TOTAL:</span>
              <span className="text-emerald-600">₹{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons: 1. Send to KOT, 2. Bill & Pay */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
            <Button
              variant="secondary"
              size="md"
              disabled={cartItems.length === 0}
              onClick={() => {
                const now = new Date();
                const kotParams: BuildKOTParams = {
                  tableNumber: selectedTable?.tableNumber || null,
                  orderType: selectedTable ? `Dine-In (Table ${selectedTable.tableNumber})` : "Takeaway / Counter",
                  date: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  items: cartItems.map((i) => ({
                    name: i.menuItem.name,
                    quantity: i.quantity,
                    selectedSize: i.selectedSize || null,
                    notes: i.notes || null,
                  })),
                  instructions: partyName ? `Party: ${partyName}` : undefined,
                };
                printKOTDirectly(kotParams, { paperSize });
                placeOrderAndKOTMutation.mutate();
              }}
              isLoading={placeOrderAndKOTMutation.isPending}
              icon={<ChefHat className="w-4 h-4 text-amber-600" />}
              className="py-3 font-bold"
            >
              1. Send KOT
            </Button>

            <Button
              variant="primary"
              size="md"
              disabled={cartItems.length === 0}
              onClick={() => {
                const tot = getTotal();
                setPayMode("CASH");
                setSplitCashAmount(tot);
                setSplitUpiAmount(0);
                setIsBillPayModalOpen(true);
              }}
              icon={<Printer className="w-4 h-4" />}
              className="py-3 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
            >
              2. Bill & Pay
            </Button>
          </div>
        </div>
      </div>

      {/* Table Capacity Warning Modal */}
      {showCapacityWarning && pendingTableSelection && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle className="w-7 h-7 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-gray-900">Table Capacity Alert</h3>
                <p className="text-xs text-gray-500">
                  Party size ({guestCount} guests) exceeds Table {pendingTableSelection.tableNumber}'s remaining capacity ({pendingTableSelection.capacity - (pendingTableSelection.currentOccupancy || 0)} seats free).
                </p>
              </div>
            </div>

            {suggestedTables.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-700">Recommended Alternative Tables:</p>
                <div className="grid grid-cols-2 gap-2">
                  {suggestedTables.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTable(t);
                        setShowCapacityWarning(false);
                        setPendingTableSelection(null);
                      }}
                      className="p-2.5 text-left border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer"
                    >
                      <p className="text-xs font-bold text-indigo-950">Table {t.tableNumber}</p>
                      <p className="text-[11px] text-indigo-600">
                        {t.capacity - (t.currentOccupancy || 0)} free / {t.capacity} total
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                No single empty table has enough seats for {guestCount} guests.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowCapacityWarning(false);
                  setPendingTableSelection(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedTable(pendingTableSelection);
                  setShowCapacityWarning(false);
                  setPendingTableSelection(null);
                }}
              >
                Seat Anyway (Shared Seating)
              </Button>
            </div>
          </div>
        </div>
      )}


      {/* Quick Add Customer Modal */}
      {showQuickAddCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-gray-900">Quick Add Customer</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddCustomer(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <Input
                label="Full Name *"
                placeholder="e.g. Ananya Patel"
                value={quickAddForm.name}
                onChange={(e) => setQuickAddForm({ ...quickAddForm, name: e.target.value })}
                required
              />

              <Input
                label="Phone Number *"
                placeholder="e.g. +91 9876543210"
                value={quickAddForm.phone}
                onChange={(e) => setQuickAddForm({ ...quickAddForm, phone: e.target.value })}
                required
              />

              <Input
                label="Email (Optional)"
                type="email"
                placeholder="ananya@example.com"
                value={quickAddForm.email}
                onChange={(e) => setQuickAddForm({ ...quickAddForm, email: e.target.value })}
              />

              <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={quickAddForm.marketingConsent}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, marketingConsent: e.target.checked })}
                  className="rounded text-indigo-600 mt-0.5"
                />
                <span>Consent received for order bills, loyalty rewards & offers via SMS/WhatsApp</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="secondary" size="sm" onClick={() => setShowQuickAddCustomer(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => quickAddCustomerMutation.mutate()}
                isLoading={quickAddCustomerMutation.isPending}
                disabled={!quickAddForm.name || !quickAddForm.phone}
              >
                Register & Attach
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Swiggy & Zomato Order Pop-up Modal */}
      <AggregatorOrderModal
        franchiseId={effectiveFranchiseId || null}
        isOpen={isAggregatorModalOpen}
        onClose={() => setIsAggregatorModalOpen(false)}
      />

      {/* Swiggy & Zomato Webhooks & Integration Config Modal */}
      <AggregatorSettingsModal
        franchiseId={effectiveFranchiseId || null}
        isOpen={isAggregatorSettingsOpen}
        onClose={() => setIsAggregatorSettingsOpen(false)}
        onSimulateOrder={(platform) => simulateOrderMutation.mutate(platform)}
      />

      {/* Visual Dine-In Floor Plan & Table Structure Modal */}
      <TableLayoutModal
        isOpen={isFloorPlanOpen}
        onClose={() => setIsFloorPlanOpen(false)}
        selectedTableId={selectedTable?.id}
        onSelectTable={(table) => {
          setSelectedTable(table);
          if (table) {
            setGuestCount(table.capacity || 2);
          }
        }}
        franchiseId={effectiveFranchiseId}
      />

      {/* ============================================================== */}
      {/* MODAL: BILL & PAY SETTLEMENT (UPI / CASH / UPI+CASH)           */}
      {/* ============================================================== */}
      <Modal
        isOpen={isBillPayModalOpen}
        onClose={() => setIsBillPayModalOpen(false)}
        title="Bill & Payment Settlement"
      >
        <div className="space-y-5">
          {/* Amount Due Banner */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-md text-center space-y-1">
            <span className="text-xs uppercase font-extrabold tracking-wider text-indigo-300">
              Total Amount Payable
            </span>
            <div className="text-3xl font-black text-emerald-400 font-mono">
              ₹{total.toFixed(2)}
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-slate-300 pt-2 border-t border-indigo-800/60">
              <span>Subtotal: ₹{subtotal.toFixed(2)}</span>
              {discount > 0 && <span className="text-rose-300">Discount: -₹{discount.toFixed(2)}</span>}
              <span>Tax ({taxRate}%): ₹{tax.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              Select Payment Method *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "CASH", label: "Cash", icon: "💵" },
                { id: "UPI", label: "UPI", icon: "📱" },
                { id: "SPLIT", label: "UPI + Cash", icon: "💵+📱" },
                { id: "CARD", label: "Card", icon: "💳" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    const mode = m.id as any;
                    setPayMode(mode);
                    if (mode === "SPLIT") {
                      const half = Math.round((total / 2) * 100) / 100;
                      setSplitCashAmount(half);
                      setSplitUpiAmount(Number((total - half).toFixed(2)));
                    }
                  }}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                    payMode === m.id
                      ? "bg-indigo-50 border-indigo-600 text-indigo-950 font-black shadow-sm ring-2 ring-indigo-400"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 font-bold"
                  }`}
                >
                  <span className="text-xl">{m.icon}</span>
                  <span className="text-xs">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Split Payment Inputs when UPI + Cash is selected */}
          {payMode === "SPLIT" && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3 animate-in fade-in zoom-in-95">
              <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <span>⚡ Split Payment Breakdown</span>
                <span className="text-[11px] font-normal text-amber-700">(Sum must equal ₹{total.toFixed(2)})</span>
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                    💵 Cash Portion (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={total}
                    step="0.01"
                    value={splitCashAmount}
                    onChange={(e) => {
                      const val = Math.max(0, parseFloat(e.target.value) || 0);
                      setSplitCashAmount(val);
                      setSplitUpiAmount(Number(Math.max(0, total - val).toFixed(2)));
                    }}
                    className="w-full text-sm font-bold bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                    📱 UPI Portion (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={total}
                    step="0.01"
                    value={splitUpiAmount}
                    onChange={(e) => {
                      const val = Math.max(0, parseFloat(e.target.value) || 0);
                      setSplitUpiAmount(val);
                      setSplitCashAmount(Number(Math.max(0, total - val).toFixed(2)));
                    }}
                    className="w-full text-sm font-bold bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="text-[11px] flex justify-between font-bold pt-1 border-t border-amber-200/80">
                <span>Total Split: ₹{(splitCashAmount + splitUpiAmount).toFixed(2)}</span>
                <span className={Math.abs((splitCashAmount + splitUpiAmount) - total) < 0.01 ? "text-emerald-700" : "text-rose-600"}>
                  {Math.abs((splitCashAmount + splitUpiAmount) - total) < 0.01 ? "✓ Exact Match" : `Difference: ₹${(total - (splitCashAmount + splitUpiAmount)).toFixed(2)}`}
                </span>
              </div>
            </div>
          )}

          {/* Print KOT First Toggle */}
          <div className="flex items-center justify-between p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs">
            <label className="flex items-center gap-2 font-bold text-emerald-950 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={printKOT}
                onChange={(e) => setPrintKOT(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500 cursor-pointer"
              />
              <span>🍳 Print KOT First (Kitchen Slip with Table & Items)</span>
            </label>
            <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-md">
              KOT ➔ Bill
            </span>
          </div>

          {/* Paper Size Quick Check */}
          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-gray-800">Thermal Paper Size:</span>
            </div>
            <div className="flex items-center gap-1.5">
              {(["58mm", "80mm"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setPaperSize(s);
                    setSavedPaperSize(s);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    paperSize === s
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {s === "58mm" ? "58mm (Small)" : "80mm (Standard)"}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsBillPayModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleCompletePaymentAndPrint}
              isLoading={isBilling}
              disabled={
                isBilling ||
                (payMode === "SPLIT" &&
                  Math.abs((splitCashAmount + splitUpiAmount) - total) > 0.05)
              }
              icon={<Printer className="w-4 h-4" />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 px-5 font-bold cursor-pointer"
            >
              Complete Payment & Print {printKOT ? "KOT + Bill" : "Bill"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: THERMAL PRINTER CONFIGURATION & HARDWARE PORT SCANNER    */}
      {/* ============================================================== */}
      <Modal
        isOpen={isPrinterConfigOpen}
        onClose={() => setIsPrinterConfigOpen(false)}
        title="Thermal Receipt Printer Setup & Port Detection"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Configure your POS thermal receipt printer paper size and auto-detect connected USB or Serial (COM) ports.
          </p>

          {/* Paper Size Configuration */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-900">Receipt Paper Roll Width</h4>
                <p className="text-[11px] text-gray-500">
                  Continuous roll dynamic height stops printing right after footer text to prevent wasting paper.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setPaperSize("58mm");
                  setSavedPaperSize("58mm");
                }}
                className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                  paperSize === "58mm"
                    ? "bg-indigo-50 border-indigo-600 text-indigo-950 font-bold ring-2 ring-indigo-400"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 font-medium"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">58mm (2-inch Small Roll)</span>
                  {paperSize === "58mm" && <Check className="w-4 h-4 text-indigo-600" />}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">Compact format for handheld and mini POS printers.</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaperSize("80mm");
                  setSavedPaperSize("80mm");
                }}
                className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                  paperSize === "80mm"
                    ? "bg-indigo-50 border-indigo-600 text-indigo-950 font-bold ring-2 ring-indigo-400"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 font-medium"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">80mm (3-inch Standard Roll)</span>
                  {paperSize === "80mm" && <Check className="w-4 h-4 text-indigo-600" />}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">Wide standard format for full restaurant billing.</p>
              </button>
            </div>
          </div>

          {/* Hardware Port Auto-Detection */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-indigo-950">Hardware Port & Device Detection</h4>
              </div>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                USB / COM Serial
              </span>
            </div>

            {detectedPrinter ? (
              <div className="p-3 bg-white border border-indigo-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">{detectedPrinter.deviceName}</span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                    READY
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Manufacturer: {detectedPrinter.manufacturer} | Type: {detectedPrinter.type}
                </p>
                {detectedPrinter.vendorId && (
                  <p className="text-[10px] font-mono text-gray-400">
                    Vendor ID: {detectedPrinter.vendorId} | Product ID: {detectedPrinter.productId}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-indigo-700">
                Connect your thermal printer via USB or Serial port, then click below to identify device.
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={isDetectingPrinter}
                onClick={async () => {
                  setIsDetectingPrinter(true);
                  setPrinterDetectMsg(null);
                  try {
                    const dev = await detectSerialPrinter();
                    setDetectedPrinter(dev);
                    setPrinterDetectMsg({ text: `Detected: ${dev.deviceName}`, type: "success" });
                  } catch (err: any) {
                    try {
                      const usbDev = await detectUsbPrinter();
                      setDetectedPrinter(usbDev);
                      setPrinterDetectMsg({ text: `Detected: ${usbDev.deviceName}`, type: "success" });
                    } catch (e2: any) {
                      setPrinterDetectMsg({ text: extractErrorMessage(err) || extractErrorMessage(e2), type: "error" });
                    }
                  } finally {
                    setIsDetectingPrinter(false);
                  }
                }}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{isDetectingPrinter ? "Scanning Ports..." : "Scan & Identify Printer Port"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const testBill = `================================
          MADRASI DOSA
     --- MALYANA BRANCH ---
  Shop 7, Kanha Plaza, Malyana
       Phone: 8279707880
================================
Sample Test Receipt
Date: ${new Date().toLocaleString()}
Paper Size: ${paperSize}
--------------------------------
Item             Qty      Price
--------------------------------
Masala Dosa        1     ₹100.00
Fanta              1      ₹30.00
--------------------------------
TOTAL:                   ₹130.00
================================
PAYMENTS:
  CASH    : ₹130.00 [COMPLETED]
--------------------------------
Thanks For Visiting Madrasi Dosa`;
                  printReceiptDirectly(testBill, { title: "POS Test Print", paperSize, logoUrl: brandSettings?.logoUrl });
                }}
                className="px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-gray-500" />
                <span>Test Print ({paperSize})</span>
              </button>
            </div>

            {printerDetectMsg && (
              <p className={`text-xs font-medium ${printerDetectMsg.type === "success" ? "text-emerald-700" : "text-rose-600"}`}>
                {printerDetectMsg.text}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-gray-100">
            <Button variant="primary" size="sm" onClick={() => setIsPrinterConfigOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* Portion / Size Selection Modal for Pizza (Small / Medium / Large) */}
      {sizeSelectionItem && (() => {
        const pSmall = sizeSelectionItem.priceSmall != null ? Number(sizeSelectionItem.priceSmall) : Number(sizeSelectionItem.price);
        const pMedium = sizeSelectionItem.priceMedium != null ? Number(sizeSelectionItem.priceMedium) : Number(sizeSelectionItem.price);
        const pLarge = sizeSelectionItem.priceLarge != null ? Number(sizeSelectionItem.priceLarge) : Number(sizeSelectionItem.price);

        return (
          <Modal
            isOpen={Boolean(sizeSelectionItem)}
            onClose={() => setSizeSelectionItem(null)}
            title={`🍕 Select Pizza Size: ${sizeSelectionItem.name}`}
            maxWidth="sm"
          >
            <div className="space-y-4 pt-1">
              <p className="text-xs text-gray-500 font-medium">
                Choose size to immediately add to order (or press 1, 2, 3 on keyboard):
              </p>

              <div className="grid grid-cols-3 gap-3">
                {/* Small */}
                <button
                  type="button"
                  onClick={() => {
                    addItem(sizeSelectionItem, "Small", pSmall);
                    setSizeSelectionItem(null);
                  }}
                  className="p-3.5 rounded-2xl border-2 border-indigo-100 hover:border-indigo-600 bg-white hover:bg-indigo-50/70 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-xs hover:shadow-md active:scale-95"
                >
                  <span className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-black text-sm flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    S
                  </span>
                  <div className="text-center">
                    <span className="text-xs font-black text-gray-900 group-hover:text-indigo-900 block">
                      Small
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">[Key 1]</span>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-600">
                    ₹{pSmall.toFixed(2)}
                  </span>
                </button>

                {/* Medium */}
                <button
                  type="button"
                  onClick={() => {
                    addItem(sizeSelectionItem, "Medium", pMedium);
                    setSizeSelectionItem(null);
                  }}
                  className="p-3.5 rounded-2xl border-2 border-indigo-300 hover:border-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/70 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-xs hover:shadow-md active:scale-95 ring-2 ring-indigo-400/30"
                >
                  <span className="w-9 h-9 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    M
                  </span>
                  <div className="text-center">
                    <span className="text-xs font-black text-gray-900 group-hover:text-indigo-900 block">
                      Medium
                    </span>
                    <span className="text-[10px] text-indigo-600 font-mono font-bold">[Key 2]</span>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-600">
                    ₹{pMedium.toFixed(2)}
                  </span>
                </button>

                {/* Large */}
                <button
                  type="button"
                  onClick={() => {
                    addItem(sizeSelectionItem, "Large", pLarge);
                    setSizeSelectionItem(null);
                  }}
                  className="p-3.5 rounded-2xl border-2 border-indigo-100 hover:border-indigo-600 bg-white hover:bg-indigo-50/70 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-xs hover:shadow-md active:scale-95"
                >
                  <span className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-black text-sm flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    L
                  </span>
                  <div className="text-center">
                    <span className="text-xs font-black text-gray-900 group-hover:text-indigo-900 block">
                      Large
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">[Key 3]</span>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-600">
                    ₹{pLarge.toFixed(2)}
                  </span>
                </button>
              </div>

              <div className="flex justify-end pt-3 border-t border-gray-100">
                <Button variant="outline" size="sm" onClick={() => setSizeSelectionItem(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};
