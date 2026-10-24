import React, { useState, useEffect, useMemo } from "react";
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
  ShoppingBag,
  Zap,
  Lock,
  Unlock,
  ShieldCheck,
  RotateCcw,
  Package,
} from "lucide-react";
import { api, extractErrorMessage } from "../../services/api.js";
import { useAuthStore } from "../../store/authStore.js";
import { useCartStore } from "../../store/cartStore.js";
import { usePinLockStore } from "../../store/pinLockStore.js";
import { PinSetupModal } from "../../components/auth/PinSetupModal.js";
import {
  printReceiptDirectly,
  printKOTDirectly,
  printKOTThenBillSequentially,
  getSavedPaperSize,
  setSavedPaperSize,
  type ThermalPaperSize,
  type BuildKOTParams,
  type BuildReceiptParams,
} from "../../utils/print.js";
import { searchMenuItems } from "../../utils/menuSearch.js";
import {
  detectSerialPrinter,
  detectUsbPrinter,
  getLastDetectedPrinter,
  type DetectedPrinterInfo,
} from "../../utils/printerPortDetector.js";
import type { Category, MenuItem, RestaurantTable, Customer, BrandSettings, Franchise } from "../../types/index.js";
import { Button } from "../../components/common/Button.js";
import { Input } from "../../components/common/Input.js";
import { Modal } from "../../components/common/Modal.js";
import { LoadingState } from "../../components/common/LoadingState.js";
import { AggregatorOrderModal } from "../../components/pos/AggregatorOrderModal.js";
import { AggregatorSettingsModal } from "../../components/pos/AggregatorSettingsModal.js";
import { TableLayoutModal } from "../../components/pos/TableLayoutModal.js";
import { OfflineQueueModal } from "../../components/pos/OfflineQueueModal.js";
import { useOfflineSync } from "../../hooks/useOfflineSync.js";
import {
  cacheMenuItems,
  getCachedMenuItems,
  cacheTables,
  getCachedTables,
  cacheCategories,
  getCachedCategories,
  cacheBrandSettings,
  getCachedBrandSettings,
  enqueueOfflineOrder,
} from "../../utils/offlineQueue.js";
import { Globe, Bell, LayoutGrid, Store, Cpu, Check, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { usePermissions } from "../../hooks/usePermissions.js";

export const POSPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { selectedFranchiseId, user, setSelectedFranchise } = useAuthStore();
  const { hasPin, lock } = usePinLockStore();
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const {
    isOnline,
    queue: offlineQueue,
    pendingCount: offlinePendingCount,
    isSyncing: isOfflineSyncing,
    syncStatusMsg: offlineSyncStatusMsg,
    syncQueueNow,
  } = useOfflineSync();
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
    toggleItemTakeaway,
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

  // Portion / Size Selection for Pizza (Small / Medium / Large OR Normal / Loaded) & Ice Cream (1 & 2 Scoops)
  const [sizeSelectionItem, setSizeSelectionItem] = useState<MenuItem | null>(null);

  const isPizzaCategory = (item: MenuItem) => {
    return Boolean(item.category?.name?.toLowerCase().includes("pizza"));
  };

  const isPizzaWithSizes = (item: MenuItem) => {
    return isPizzaCategory(item) && Boolean(item.hasSizes);
  };

  const isIceCreamCategory = (item: MenuItem) => {
    const cat = (item.category?.name || "").toLowerCase();
    const name = item.name.toLowerCase();
    return (
      cat.includes("ice cream") ||
      cat.includes("icecream") ||
      name.includes("ice cream") ||
      name.includes("icecream")
    );
  };

  const isIceCreamWithScoops = (item: MenuItem) => {
    return isIceCreamCategory(item) && Boolean(item.hasSizes);
  };

  // Instant keyboard shortcuts for Portion & Scoop Selection (1=1 Scoop/Small/Normal, 2=2 Scoops/Medium/Loaded, 3=Large, Esc=Cancel)
  useEffect(() => {
    if (!sizeSelectionItem) return;

    // Immediately remove focus and clear any active dish code input
    setQuickDishCode("");
    if (quickCodeInputRef.current) {
      quickCodeInputRef.current.blur();
    }
    if (document.activeElement && (document.activeElement as HTMLElement).blur) {
      (document.activeElement as HTMLElement).blur();
    }

    const isIceCream = isIceCreamWithScoops(sizeSelectionItem);
    const hasThreeSizes = sizeSelectionItem.priceMedium != null && Number(sizeSelectionItem.priceMedium) > 0;
    const pSmall = sizeSelectionItem.priceSmall != null ? Number(sizeSelectionItem.priceSmall) : Number(sizeSelectionItem.price);
    const pMedium = sizeSelectionItem.priceMedium != null ? Number(sizeSelectionItem.priceMedium) : Number(sizeSelectionItem.price);
    const pLarge = sizeSelectionItem.priceLarge != null ? Number(sizeSelectionItem.priceLarge) : Number(sizeSelectionItem.price);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Intercept and stop propagation of ALL keys while portion modal is open
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (e.key === "Escape") {
        e.preventDefault();
        setQuickDishCode("");
        setSizeSelectionItem(null);
        return;
      }

      if (isIceCream) {
        // Ice cream scoop selection: 1 = 1 Scoop, 2 = 2 Scoops
        if (e.key === "1" || e.code === "Numpad1") {
          e.preventDefault();
          addItem(sizeSelectionItem, "1 Scoop", pSmall);
          setQuickDishCode("");
          setSizeSelectionItem(null);
        } else if (e.key === "2" || e.code === "Numpad2") {
          e.preventDefault();
          addItem(sizeSelectionItem, "2 Scoops", pLarge);
          setQuickDishCode("");
          setSizeSelectionItem(null);
        }
        return;
      }

      if (hasThreeSizes) {
        if (e.key === "1" || e.code === "Numpad1" || e.key.toLowerCase() === "s") {
          e.preventDefault();
          addItem(sizeSelectionItem, "Small", pSmall);
          setQuickDishCode("");
          setSizeSelectionItem(null);
        } else if (e.key === "2" || e.code === "Numpad2" || e.key.toLowerCase() === "m") {
          e.preventDefault();
          addItem(sizeSelectionItem, "Medium", pMedium);
          setQuickDishCode("");
          setSizeSelectionItem(null);
        } else if (e.key === "3" || e.code === "Numpad3" || e.key.toLowerCase() === "l") {
          e.preventDefault();
          addItem(sizeSelectionItem, "Large", pLarge);
          setQuickDishCode("");
          setSizeSelectionItem(null);
        }
      } else {
        // Normal & Loaded variations
        if (e.key === "1" || e.code === "Numpad1" || e.key.toLowerCase() === "n") {
          e.preventDefault();
          addItem(sizeSelectionItem, "Normal", pSmall);
          setQuickDishCode("");
          setSizeSelectionItem(null);
        } else if (e.key === "2" || e.code === "Numpad2" || e.key.toLowerCase() === "l") {
          e.preventDefault();
          addItem(sizeSelectionItem, "Loaded", pLarge);
          setQuickDishCode("");
          setSizeSelectionItem(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
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

  // POS Order Mode Gate: "DINE_IN" | "TAKEAWAY" | null
  // When null, renders the initial Big Screen Table / Takeaway selection view first!
  const [orderMode, setOrderMode] = useState<"DINE_IN" | "TAKEAWAY" | null>(() => {
    if (selectedTable) return "DINE_IN";
    if (cartItems.length > 0) return "TAKEAWAY";
    return null;
  });

  // Attempt HTML5 browser fullscreen directly on mount
  useEffect(() => {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  // Rush Hour Numpad Dish Code Quick-Add State
  const [quickDishCode, setQuickDishCode] = useState("");
  const [codeFeedbackMsg, setCodeFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const quickCodeInputRef = React.useRef<HTMLInputElement>(null);

  // Initial Big Screen Numpad Table & Packing Selection State
  const [initialNumpadCode, setInitialNumpadCode] = useState("");
  const [initialTableMsg, setInitialTableMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const initialNumpadInputRef = React.useRef<HTMLInputElement>(null);

  // Table filter for initial big screen mode
  const [initialTableFilter, setInitialTableFilter] = useState<"ALL" | "AVAILABLE" | "OCCUPIED">("ALL");
  const [initialTableSearch, setInitialTableSearch] = useState("");

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
      try {
        const res = await api.get("/brand-settings");
        if (res.data?.data) {
          cacheBrandSettings(res.data.data);
          return res.data.data;
        }
      } catch (err) {
        const cached = getCachedBrandSettings();
        if (cached) return cached;
      }
      return getCachedBrandSettings() || ({} as BrandSettings);
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

  // Fetch Tables with resilient offline cache fallback
  const { data: tables = [] } = useQuery<RestaurantTable[]>({
    queryKey: ["tables", effectiveFranchiseId],
    queryFn: async () => {
      try {
        const res = await api.get(effectiveFranchiseId ? `/tables?franchiseId=${effectiveFranchiseId}` : "/tables");
        if (res.data?.data) {
          cacheTables(res.data.data);
          return res.data.data;
        }
      } catch (err) {
        const cached = getCachedTables();
        if (cached && cached.length > 0) return cached;
      }
      return getCachedTables() || [];
    },
  });

  // Fetch Categories with resilient offline cache fallback
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories", effectiveFranchiseId],
    queryFn: async () => {
      try {
        const res = await api.get(effectiveFranchiseId ? `/menu/categories?franchiseId=${effectiveFranchiseId}` : "/menu/categories");
        if (res.data?.data) {
          cacheCategories(res.data.data);
          return res.data.data;
        }
      } catch (err) {
        const cached = getCachedCategories();
        if (cached && cached.length > 0) return cached;
      }
      return getCachedCategories() || [];
    },
  });

  // Fetch Menu Items with resilient offline cache fallback
  const { data: menuItems = [], isLoading: isLoadingMenu } = useQuery<MenuItem[]>({
    queryKey: ["menu-items", effectiveFranchiseId],
    queryFn: async () => {
      try {
        const res = await api.get(effectiveFranchiseId ? `/menu/items?franchiseId=${effectiveFranchiseId}` : "/menu/items");
        if (res.data?.data) {
          cacheMenuItems(res.data.data);
          return res.data.data;
        }
      } catch (err) {
        const cached = getCachedMenuItems();
        if (cached && cached.length > 0) return cached;
      }
      return getCachedMenuItems() || [];
    },
  });

  const handleInitialNumpadSubmit = (overrideVal?: string) => {
    const raw = (overrideVal !== undefined ? overrideVal : initialNumpadCode).trim();
    if (!raw) return;

    // 0, P, or T = Takeaway / Packing
    if (
      raw === "0" ||
      raw.toLowerCase() === "p" ||
      raw.toLowerCase() === "t" ||
      raw.toLowerCase() === "packing" ||
      raw.toLowerCase() === "takeaway"
    ) {
      setSelectedTable(null);
      setOrderMode("TAKEAWAY");
      setInitialNumpadCode("");
      return;
    }

    // Match table number (exact match only)
    const rawNum = raw.replace(/\D/g, "");
    const matched = tables.find((t) => {
      const tClean = t.tableNumber.trim().toLowerCase();
      if (tClean === raw.toLowerCase()) return true;
      if (rawNum && tClean.replace(/\D/g, "") === rawNum) return true;
      return false;
    });

    if (matched) {
      handleTableChange(matched.id);
      setOrderMode("DINE_IN");
      setInitialNumpadCode("");
    } else {
      setInitialTableMsg({ text: `Table "${raw}" not found! (Press 0 for Packing)`, type: "error" });
      setTimeout(() => setInitialTableMsg(null), 2500);
      setInitialNumpadCode("");
    }
  };

  const handleQuickCodeSubmit = (overrideCode?: string) => {
    const query = (overrideCode !== undefined ? overrideCode : quickDishCode).trim();
    if (!query) return;

    const queryClean = query.toLowerCase();

    // 1. Strict exact match on item.code (case-insensitive, trimmed)
    let match = menuItems.find((item) => {
      if (!item.code) return false;
      return item.code.trim().toLowerCase() === queryClean;
    });

    // 2. Strict exact numeric match (e.g. cashier typed 2, item.code is "2" or "02")
    if (!match && !isNaN(Number(queryClean))) {
      const queryNum = Number(queryClean);
      match = menuItems.find((item) => {
        if (!item.code) return false;
        const itemNum = Number(item.code.trim());
        return !isNaN(itemNum) && itemNum === queryNum;
      });
    }

    // 3. Strict exact digits match (e.g. item.code is "D-2" and cashier typed "2")
    // Under no circumstances use startsWith or includes! "2" will NEVER match "26"!
    if (!match) {
      const queryDigits = queryClean.replace(/\D/g, "");
      if (queryDigits) {
        match = menuItems.find((item) => {
          if (!item.code) return false;
          const itemDigits = item.code.trim().toLowerCase().replace(/\D/g, "");
          return itemDigits === queryDigits;
        });
      }
    }

    if (!match) {
      setCodeFeedbackMsg({ text: `Dish code "${query}" not found!`, type: "error" });
      setTimeout(() => setCodeFeedbackMsg(null), 2500);
      setQuickDishCode("");
      quickCodeInputRef.current?.focus();
      return;
    }

    if (!match.isAvailable) {
      setCodeFeedbackMsg({ text: `"${match.name}" is OUT OF STOCK!`, type: "error" });
      setTimeout(() => setCodeFeedbackMsg(null), 2500);
      setQuickDishCode("");
      quickCodeInputRef.current?.focus();
      return;
    }

    // Ice Cream with 1 & 2 Scoops
    if (isIceCreamWithScoops(match)) {
      setQuickDishCode("");
      quickCodeInputRef.current?.blur();
      setSizeSelectionItem(match);
      setCodeFeedbackMsg({
        text: `🍨 ${match.name}: Press 1 (1 Scoop), 2 (2 Scoops)`,
        type: "success",
      });
      setTimeout(() => setCodeFeedbackMsg(null), 3000);
      return;
    }

    // Pizza with portion sizes
    if (isPizzaWithSizes(match)) {
      setQuickDishCode("");
      quickCodeInputRef.current?.blur();
      setSizeSelectionItem(match);
      const hasThreeSizes = match.priceMedium != null && Number(match.priceMedium) > 0;
      setCodeFeedbackMsg({
        text: hasThreeSizes
          ? `🍕 ${match.name}: Press 1 (Small), 2 (Medium), 3 (Large)`
          : `🍕 ${match.name}: Press 1 (Normal), 2 (Loaded)`,
        type: "success",
      });
      setTimeout(() => setCodeFeedbackMsg(null), 3000);
      return;
    }

    // Standard dish
    addItem(match);
    setQuickDishCode("");
    setCodeFeedbackMsg({
      text: `✓ Added: ${match.name} (₹${Number(match.price).toFixed(0)})`,
      type: "success",
    });
    setTimeout(() => setCodeFeedbackMsg(null), 2000);
    quickCodeInputRef.current?.focus();
  };

  // Immediate auto-focus as soon as POS opens or switches mode
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!orderMode) {
        initialNumpadInputRef.current?.focus();
      } else {
        quickCodeInputRef.current?.focus();
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [orderMode]);

  // Keep dish code input auto-focused after closing portion/scoop modal
  useEffect(() => {
    if (!sizeSelectionItem && orderMode) {
      setQuickDishCode("");
      const timer = setTimeout(() => {
        setQuickDishCode("");
        quickCodeInputRef.current?.focus();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [sizeSelectionItem, orderMode]);

  // Keyboard listeners for initial screen shortcuts & rush hour numpad quick-add
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Do not intercept if a modal is open
      if (
        sizeSelectionItem ||
        isBillPayModalOpen ||
        isAggregatorModalOpen ||
        isAggregatorSettingsOpen ||
        isPrinterConfigOpen ||
        isFloorPlanOpen ||
        showCapacityWarning ||
        showQuickAddCustomer
      ) {
        return;
      }

      const activeEl = document.activeElement as HTMLElement | null;
      const isInputFocused =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT");

      // CASE 1: On the Initial Screen (orderMode === null)
      if (!orderMode) {
        if (activeEl === initialNumpadInputRef.current) {
          if (e.key === "Enter") {
            e.preventDefault();
            handleInitialNumpadSubmit();
            return;
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setInitialNumpadCode("");
            if (selectedTable) {
              setOrderMode("DINE_IN");
            } else {
              navigate("/dashboard");
            }
            return;
          }
          return;
        }

        if (!isInputFocused) {
          // Press digit 0-9 routes to initial numpad selector
          if (/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            setInitialNumpadCode((prev) => prev + e.key);
            initialNumpadInputRef.current?.focus();
            return;
          }

          // Press 'T', 't', 'P', 'p' for Takeaway / Packing
          if (e.key.toLowerCase() === "t" || e.key.toLowerCase() === "p") {
            e.preventDefault();
            setSelectedTable(null);
            setOrderMode("TAKEAWAY");
            return;
          }

          // Press Enter if initialNumpadCode has content
          if (e.key === "Enter" && initialNumpadCode.trim()) {
            e.preventDefault();
            handleInitialNumpadSubmit();
            return;
          }

          // Press Escape to resume order or exit POS to dashboard
          if (e.key === "Escape") {
            e.preventDefault();
            if (selectedTable) {
              setOrderMode("DINE_IN");
            } else {
              navigate("/dashboard");
            }
            return;
          }
        }
        return;
      }

      // CASE 2: Inside Menu & Billing View (orderMode != null)
      // If user is focused inside the quick code input:
      if (activeEl === quickCodeInputRef.current) {
        if (e.key === "Enter") {
          e.preventDefault();
          if (quickDishCode.trim()) {
            handleQuickCodeSubmit();
          } else if (cartItems.length > 0) {
            // When input is empty and cart has items, Enter opens Bill & Pay!
            const tot = getTotal();
            setPayMode("CASH");
            setSplitCashAmount(tot);
            setSplitUpiAmount(0);
            setIsBillPayModalOpen(true);
          }
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          if (quickDishCode.trim()) {
            setQuickDishCode("");
          } else {
            // Return to table selection
            setOrderMode(null);
          }
          return;
        }
        return;
      }

      // If NOT focused on any input:
      if (!isInputFocused) {
        // Pressing Enter when cart has items opens Bill & Pay!
        if (e.key === "Enter" && cartItems.length > 0 && !quickDishCode.trim()) {
          e.preventDefault();
          const tot = getTotal();
          setPayMode("CASH");
          setSplitCashAmount(tot);
          setSplitUpiAmount(0);
          setIsBillPayModalOpen(true);
          return;
        }

        // Pressing digit 0-9 routes to quick dish code!
        if (/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          setQuickDishCode((prev) => prev + e.key);
          quickCodeInputRef.current?.focus();
          return;
        }

        // Pressing Enter if quickDishCode has content
        if (e.key === "Enter" && quickDishCode.trim()) {
          e.preventDefault();
          handleQuickCodeSubmit();
          return;
        }

        // Pressing Escape switches back to table selection
        if (e.key === "Escape") {
          e.preventDefault();
          setOrderMode(null);
          return;
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [
    orderMode,
    sizeSelectionItem,
    isBillPayModalOpen,
    isAggregatorModalOpen,
    isAggregatorSettingsOpen,
    isPrinterConfigOpen,
    isFloorPlanOpen,
    showCapacityWarning,
    showQuickAddCustomer,
    quickDishCode,
    initialNumpadCode,
    menuItems,
    tables,
    navigate,
  ]);

  // Handle Smart Table Selection
  const handleTableChange = (tableId: string) => {
    if (!tableId) {
      setSelectedTable(null);
      return;
    }

    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    if (guestCount > table.capacity) {
      const alternatives = tables.filter(
        (t) => t.id !== table.id && t.capacity >= guestCount
      );
      setSuggestedTables(alternatives);
      setPendingTableSelection(table);
      setShowCapacityWarning(true);
    } else {
      setSelectedTable(table);
    }
  };

  // Release table manually (mark vacant)
  const releaseTableMutation = useMutation({
    mutationFn: async (tableId: string) => {
      await api.post(`/tables/${tableId}/close-session`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });

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
          notes: i.isTakeaway
            ? (i.notes ? `[PACKING / PARCEL] ${i.notes}` : "[PACKING / PARCEL]")
            : (i.notes || null),
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

  const subtotal = getSubtotal();
  const tax = getTax();
  const total = getTotal();

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
          name: i.menuItem.name,
          rawName: i.menuItem.name,
          quantity: i.quantity,
          price: itemUnitPrice,
          totalPrice: itemUnitPrice * i.quantity,
          menuItemId: i.menuItem.id,
          selectedSize: i.selectedSize || null,
          notes: i.notes || null,
          isTakeaway: !!i.isTakeaway,
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
          isTakeaway: i.isTakeaway,
        })),
        instructions: partyNameSnapshot ? `Party: ${partyNameSnapshot}` : undefined,
      };

      // 6. Build Bill parameters (Dynamic restaurant branding, item prices, subtotal, tax, total, payments)
      const billParams: BuildReceiptParams = {
        brandName: brandSettings?.businessName || currFranchise?.name || "RESTAURANT",
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
        instagramId: (brandSettings as any)?.whatsappSupportNumber ? undefined : undefined,
        footerMessage: "Thank You! Please Visit Again",
      };

      // 7. INSTANT PRINT SPOOLER: Dispatches KOT FIRST (auto-cut), followed by Customer Bill (auto-cut)
      try {
        if (printKOT) {
          printKOTThenBillSequentially({
            kotParams,
            billParams,
            paperSize,
            logoUrl: brandSettings?.logoUrl || undefined,
          });
        } else {
          printReceiptDirectly(billParams, {
            title: `Invoice #${invoiceNumber}`,
            paperSize,
            logoUrl: brandSettings?.logoUrl || undefined,
            showLogo: true,
          });
        }
      } catch (printErr) {
        console.warn("Direct printer spool warning:", printErr);
      }

      // 8. INSTANT UI RESET: Immediate feedback, zero waiting
      setIsBillPayModalOpen(false);
      clearCart();
      setSelectedTable(null);
      setSelectedCustomer(null);
      setPartyName("");
      setGuestCount(2);
      setOrderMode(null); // Return directly to Big Screen Table / Takeaway selection for next customer!

      // 9. BACKGROUND CLOUD ASYNC SYNC: Syncs order, invoice, payment with Render & MongoDB
      const franchiseToUse = effectiveFranchiseId || (activeFranchises && activeFranchises[0]?.id) || user?.franchiseId;
      const payload = {
        franchiseId: franchiseToUse,
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

      // Fire in background with resilient offline queue fallback
      const fastBillUrl = franchiseToUse ? `/billing/fast-bill?franchiseId=${franchiseToUse}` : "/billing/fast-bill";

      const executeBackgroundSync = async () => {
        try {
          if (!navigator.onLine) {
            throw new Error("Device is currently offline");
          }
          await api.post(fastBillUrl, payload);
          queryClient.invalidateQueries({ queryKey: ["tables"] });
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          queryClient.invalidateQueries({ queryKey: ["invoices"] });
        } catch (syncErr: any) {
          console.warn("Fast-bill background network notice, queueing offline:", syncErr);
          enqueueOfflineOrder({
            franchiseId: String(franchiseToUse || ""),
            url: fastBillUrl,
            payload,
            displayInvoiceNumber: invoiceNumber,
            displayTotal: total,
            itemSummary: itemsSnapshot.map((i) => `${i.quantity}x ${i.rawName}`).join(", "),
            tableName: tableSnapshot ? `Table ${tableSnapshot.tableNumber}` : "Takeaway",
          });
          setPosError(
            `Receipt printed! Bill #${invoiceNumber} queued locally (Offline). Will auto-sync when online.`
          );
          setTimeout(() => setPosError(null), 5000);
        }
      };

      executeBackgroundSync();
    } catch (err: any) {
      console.error("Billing error:", err);
      setPosError("Billing error: " + (err?.message || "Failed to complete payment and print bill"));
    } finally {
      setIsBilling(false);
    }
  };

  // Dedicated keyboard shortcuts for Bill & Pay Settlement Modal (1=Cash, 2=UPI, 3=Card, 4=Split, Enter=Complete & Print, Esc=Cancel)
  useEffect(() => {
    if (!isBillPayModalOpen) return;

    // Immediately blur any non-number inputs (e.g. search boxes) so digit keys select payment mode
    if (document.activeElement && (document.activeElement as HTMLElement).blur) {
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl.tagName === "INPUT" && activeEl.getAttribute("type") !== "number") {
        activeEl.blur();
      }
    }

    const handleBillPayKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isTypingSplit = activeEl && activeEl.tagName === "INPUT" && activeEl.getAttribute("type") === "number";

      if (e.key === "Escape") {
        e.preventDefault();
        setIsBillPayModalOpen(false);
        return;
      }

      // Enter key (standard or numpad): Completes payment and prints KOT + bill!
      if (e.key === "Enter" || e.code === "NumpadEnter") {
        e.preventDefault();
        if (
          !isBilling &&
          !(payMode === "SPLIT" && Math.abs((splitCashAmount + splitUpiAmount) - total) > 0.05)
        ) {
          handleCompletePaymentAndPrint();
        }
        return;
      }

      // If user is actively typing a split number in cash/upi input, let digits pass
      if (isTypingSplit) return;

      if (e.key === "1" || e.code === "Numpad1") {
        e.preventDefault();
        setPayMode("CASH");
        setSplitCashAmount(total);
        setSplitUpiAmount(0);
      } else if (e.key === "2" || e.code === "Numpad2") {
        e.preventDefault();
        setPayMode("UPI");
        setSplitCashAmount(0);
        setSplitUpiAmount(total);
      } else if (e.key === "3" || e.code === "Numpad3") {
        e.preventDefault();
        setPayMode("CARD");
        setSplitCashAmount(0);
        setSplitUpiAmount(0);
      } else if (e.key === "4" || e.code === "Numpad4") {
        e.preventDefault();
        setPayMode("SPLIT");
        const half = Math.round((total / 2) * 100) / 100;
        setSplitCashAmount(half);
        setSplitUpiAmount(Number((total - half).toFixed(2)));
      }
    };

    window.addEventListener("keydown", handleBillPayKeyDown, true);
    return () => window.removeEventListener("keydown", handleBillPayKeyDown, true);
  }, [isBillPayModalOpen, payMode, splitCashAmount, splitUpiAmount, total, isBilling]);


  const filteredItems = useMemo(() => {
    return searchMenuItems(menuItems, searchTerm, activeCategory || null);
  }, [menuItems, activeCategory, searchTerm]);

  // If Super Admin has not selected a specific franchise outlet yet, prompt to pick one
  if (isSuperAdmin && !selectedFranchiseId) {
    return (
      <div className="fixed inset-0 z-50 w-screen h-screen flex items-center justify-center p-6 bg-slate-100 text-gray-900 select-none">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="absolute top-6 right-6 p-2 rounded-xl bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-200 shadow-sm transition-colors cursor-pointer"
          title="Exit to Dashboard"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="max-w-lg w-full bg-white text-gray-900 rounded-3xl p-8 border border-gray-200 shadow-2xl text-center space-y-6">
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

  // Table counts and filtering for Initial Big Screen Mode
  const availableTablesCount = tables.filter((t) => t.status === "AVAILABLE").length;
  const occupiedTablesCount = tables.filter((t) => t.status === "OCCUPIED" || t.status === "BILLING").length;

  const initialFilteredTables = useMemo(() => {
    let list = [...tables];
    // Natural numeric sorting (Table 1, Table 2, Table 3... Table 10)
    list.sort((a, b) => {
      const numA = parseInt(a.tableNumber.replace(/\D/g, "")) || 0;
      const numB = parseInt(b.tableNumber.replace(/\D/g, "")) || 0;
      if (numA !== numB) return numA - numB;
      return a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true });
    });

    if (initialTableFilter === "AVAILABLE") {
      list = list.filter((t) => t.status === "AVAILABLE");
    } else if (initialTableFilter === "OCCUPIED") {
      list = list.filter((t) => t.status === "OCCUPIED" || t.status === "BILLING");
    }
    if (initialTableSearch.trim()) {
      const q = initialTableSearch.toLowerCase().trim();
      list = list.filter((t) => t.tableNumber.toLowerCase().includes(q));
    }
    return list;
  }, [tables, initialTableFilter, initialTableSearch]);

  // INITIAL BIG SCREEN MODE: First select Table or Takeaway before opening menu
  if (!orderMode) {
    return (
      <div className="fixed inset-0 z-50 w-screen h-screen flex flex-col bg-slate-100 text-gray-900 overflow-hidden select-none">
        {/* Top Header of Initial Screen */}
        <div className="px-6 py-3.5 bg-white border-b border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-md shadow-indigo-600/20">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-gray-950">
                  {brandSettings?.businessName?.toUpperCase() || "RESTAURANT"} POS
                </h1>
                <span className="text-[10px] uppercase font-black tracking-widest bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Ready
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {activeFranchises.find((f) => f.id === effectiveFranchiseId)?.name || user?.franchise?.name || "Terminal 01"} • Select Table or Takeaway to Begin Billing
              </p>
            </div>
          </div>

          {/* Quick Numpad Table & Packing Selector */}
          <div className="relative flex items-center">
            <div className="flex items-center gap-2 bg-amber-50/90 border-2 border-amber-400 rounded-2xl px-3 py-1.5 shadow-xs">
              <span className="text-xs font-black text-amber-800 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-600 fill-amber-500" />
                <span className="hidden sm:inline">Numpad:</span>
              </span>
              <input
                ref={initialNumpadInputRef}
                type="text"
                value={initialNumpadCode}
                onChange={(e) => setInitialNumpadCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleInitialNumpadSubmit();
                  }
                }}
                placeholder="Type Table # (or 0 for Packing) + ↵"
                className="w-44 sm:w-56 bg-white text-gray-900 font-mono font-bold text-xs px-2.5 py-1 rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-gray-400"
                title="Type Table number (or 0 for Takeaway / Packing) and press Enter"
              />
              <button
                type="button"
                onClick={() => handleInitialNumpadSubmit()}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-lg transition-colors cursor-pointer"
                title="Press Enter"
              >
                ↵
              </button>
            </div>

            {initialTableMsg && (
              <div
                className={`absolute top-full left-0 mt-2 z-30 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xl whitespace-nowrap animate-in fade-in slide-in-from-top-1 ${
                  initialTableMsg.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                }`}
              >
                {initialTableMsg.text}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Swiggy / Zomato pills */}
            <div className="hidden lg:flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 text-xs">
              <span className="text-gray-500 font-bold">Online:</span>
              <span className={`inline-flex items-center gap-1 font-bold ${isSwiggyEnabled ? "text-[#FC8019]" : "text-gray-400"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isSwiggyEnabled ? "bg-[#FC8019] animate-pulse" : "bg-gray-400"}`} />
                Swiggy
              </span>
              <span className="text-gray-300">•</span>
              <span className={`inline-flex items-center gap-1 font-bold ${isZomatoEnabled ? "text-[#E23744]" : "text-gray-400"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isZomatoEnabled ? "bg-[#E23744] animate-pulse" : "bg-gray-400"}`} />
                Zomato
              </span>
            </div>

            {/* Live Online / Offline Sync Indicator */}
            <button
              type="button"
              onClick={() => setIsOfflineModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                !isOnline
                  ? "bg-rose-50 border-rose-400 text-rose-800 animate-pulse"
                  : offlinePendingCount > 0
                  ? "bg-amber-50 border-amber-300 text-amber-900"
                  : "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
              }`}
              title={
                !isOnline
                  ? "Offline Mode Active (Bills saved locally, click to view queue)"
                  : offlinePendingCount > 0
                  ? `${offlinePendingCount} offline bills pending sync (Click to sync now)`
                  : "Cloud Connected (Online & Synced)"
              }
            >
              {!isOnline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                  <span>Offline {offlinePendingCount > 0 ? `(${offlinePendingCount})` : ""}</span>
                </>
              ) : offlinePendingCount > 0 ? (
                <>
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${isOfflineSyncing ? "animate-spin" : ""}`} />
                  <span>Sync ({offlinePendingCount})</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Online</span>
                </>
              )}
            </button>

            {/* Printer Button */}
            <button
              type="button"
              onClick={() => setIsPrinterConfigOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-gray-500" />
              <span>🖨️ {paperSize}</span>
            </button>

            {/* Quick PIN Lock & Settings Button */}
            {user?.id && hasPin(user.id) ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => lock()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-xs font-bold text-amber-900 shadow-2xs transition-colors cursor-pointer"
                  title="Lock Terminal Screen (Require PIN to unlock)"
                >
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span className="hidden sm:inline">Lock</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-xs font-bold text-emerald-800 shadow-2xs transition-colors cursor-pointer"
                  title="App Lock Settings (Turn Off / Change PIN)"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline">PIN: ON</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsPinModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 hover:bg-indigo-50 border border-dashed border-gray-300 hover:border-indigo-300 text-xs font-bold text-gray-600 hover:text-indigo-700 shadow-2xs transition-colors cursor-pointer"
                title="Setup Quick PIN / Turn On App Lock"
              >
                <Unlock className="w-4 h-4" />
                <span className="hidden sm:inline">PIN: OFF</span>
              </button>
            )}

            {/* Exit POS Button */}
            <button
              type="button"
              onClick={() => {
                if (document.fullscreenElement && document.exitFullscreen) {
                  document.exitFullscreen().catch(() => {});
                }
                navigate("/dashboard");
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-rose-50 border border-gray-200 hover:border-rose-300 text-gray-700 hover:text-rose-700 text-xs font-bold shadow-2xs transition-all cursor-pointer"
              title="Exit POS Terminal to Dashboard"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Exit POS</span>
            </button>
          </div>
        </div>

        {/* Active Selected Table Bar (when switching table or customer not ordering now) */}
        {selectedTable && (
          <div className="px-6 py-2.5 bg-indigo-600 text-white flex flex-wrap items-center justify-between gap-3 text-xs font-bold shadow-md shrink-0 border-b border-indigo-700 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-indigo-200 uppercase tracking-wider text-[10px]">Active Selection:</span>
              <span className="bg-white text-indigo-900 px-3 py-1 rounded-lg font-black text-sm shadow-xs flex items-center gap-1.5">
                🍽️ Table {selectedTable.tableNumber}
              </span>
              {cartItems.length > 0 ? (
                <span className="bg-indigo-700/90 text-indigo-100 px-2.5 py-1 rounded-lg text-xs font-medium">
                  🛒 {cartItems.length} item{cartItems.length > 1 ? "s" : ""} in cart (₹{getTotal().toFixed(0)}) — Click another table below to switch table
                </span>
              ) : (
                <span className="text-indigo-200 text-xs font-medium">
                  Click another table below to switch, or click Release if customer is not ordering now.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedTable(null);
                  if (cartItems.length > 0) clearCart();
                }}
                className="bg-rose-500 hover:bg-rose-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                title="Customer not ordering now: Release table and clear selection"
              >
                <X className="w-3.5 h-3.5" />
                <span>Release Table (Not Ordering Now)</span>
              </button>

              <button
                type="button"
                onClick={() => setOrderMode("DINE_IN")}
                className="bg-white hover:bg-indigo-50 text-indigo-900 px-3.5 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                title="Return to cart & menu for this table"
              >
                <span>Resume Order →</span>
              </button>
            </div>
          </div>
        )}

        {/* Filter & Guest Controls Toolbar */}
        <div className="px-6 py-3 bg-white/90 border-b border-gray-200/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {/* Status Filter Pills */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setInitialTableFilter("ALL")}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  initialTableFilter === "ALL" ? "bg-indigo-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-950"
                }`}
              >
                All Tables ({tables.length})
              </button>
              <button
                type="button"
                onClick={() => setInitialTableFilter("AVAILABLE")}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  initialTableFilter === "AVAILABLE" ? "bg-emerald-600 text-white shadow-xs" : "text-gray-600 hover:text-emerald-700"
                }`}
              >
                🟢 Available ({availableTablesCount})
              </button>
              <button
                type="button"
                onClick={() => setInitialTableFilter("OCCUPIED")}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  initialTableFilter === "OCCUPIED" ? "bg-rose-600 text-white shadow-xs" : "text-gray-600 hover:text-rose-700"
                }`}
              >
                🔴 Occupied ({occupiedTablesCount})
              </button>
            </div>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Find Table #..."
              value={initialTableSearch}
              onChange={(e) => setInitialTableSearch(e.target.value)}
              className="w-36 sm:w-44 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
            />
          </div>

          {/* Guest Count for Dine-In selection */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-bold hidden sm:inline">Dine-In Guests:</span>
            <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                className="w-6 h-6 rounded-lg bg-white hover:bg-gray-200 text-gray-800 font-bold flex items-center justify-center text-xs shadow-2xs border border-gray-200 cursor-pointer"
              >
                -
              </button>
              <span className="w-6 text-center font-black text-indigo-700 text-sm">{guestCount}</span>
              <button
                type="button"
                onClick={() => setGuestCount(guestCount + 1)}
                className="w-6 h-6 rounded-lg bg-white hover:bg-gray-200 text-gray-800 font-bold flex items-center justify-center text-xs shadow-2xs border border-gray-200 cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Unified Table & Packing Grid */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin bg-slate-100/70">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {/* TILE 1: TAKEAWAY / PACKING (Integrated directly with tables!) */}
            <button
              type="button"
              onClick={() => {
                setSelectedTable(null);
                setOrderMode("TAKEAWAY");
              }}
              className="p-5 rounded-2xl border-2 text-left flex flex-col justify-between transition-all duration-150 cursor-pointer active:scale-95 group relative bg-white hover:bg-indigo-50/40 border-indigo-300 hover:border-indigo-500 shadow-xs hover:shadow-xl min-h-[170px]"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border bg-indigo-50 text-indigo-700 border-indigo-200">
                    🛍️ Parcel / Counter
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300">
                    Key [0 / P]
                  </span>
                </div>

                <div className="flex items-center gap-3 my-2">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-950 group-hover:text-indigo-900 transition-colors leading-tight">
                      Takeaway / Packing
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      No table assigned
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:text-indigo-800">
                <span>Open Menu</span>
                <span className="text-indigo-600 group-hover:translate-x-1 transition-transform font-black">→</span>
              </div>
            </button>

            {/* TILES 2...N: DINING TABLES */}
            {initialFilteredTables.map((t) => {
              const isAvail = t.status === "AVAILABLE";
              const isOcc = t.status === "OCCUPIED" || (t.currentOccupancy || 0) > 0;
              const isSelected = selectedTable?.id === t.id;

              return (
                <div
                  key={t.id}
                  onClick={() => {
                    handleTableChange(t.id);
                    setOrderMode("DINE_IN");
                  }}
                  className={`p-5 rounded-2xl border-2 text-left flex flex-col justify-between transition-all duration-150 cursor-pointer active:scale-95 group relative min-h-[175px] ${
                    isSelected
                      ? "bg-indigo-50/90 border-indigo-600 ring-4 ring-indigo-500/40 shadow-xl"
                      : isOcc
                      ? "bg-rose-50/90 border-2 border-rose-500 shadow-md shadow-rose-200/50 hover:border-rose-600"
                      : isAvail
                      ? "bg-white hover:bg-emerald-50/50 border-emerald-300 hover:border-emerald-500 shadow-xs hover:shadow-xl"
                      : "bg-indigo-50/60 hover:bg-indigo-50 border-indigo-300 hover:border-indigo-400 shadow-xs"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                            : isOcc
                            ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                            : isAvail
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-indigo-100 text-indigo-800 border-indigo-200"
                        }`}
                      >
                        {isSelected ? "👑 Current Table" : isOcc ? "🔴 Occupied" : isAvail ? "🟢 Available" : "🔵 Billing"}
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200">
                        Key [{t.tableNumber}]
                      </span>
                    </div>

                    <h3 className="text-2xl font-black text-gray-950 group-hover:text-indigo-900 transition-colors">
                      Table {t.tableNumber}
                    </h3>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-600 font-bold">
                        🪑 {t.capacity} Seats
                      </span>
                      {isOcc && (
                        <span className="text-[11px] text-rose-700 font-extrabold bg-rose-100 px-1.5 py-0.5 rounded">
                          Occupied
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-gray-500">
                    <span className={isSelected ? "text-indigo-700 font-black" : isOcc ? "text-rose-700 font-black" : selectedTable ? "text-indigo-600 font-bold" : ""}>
                      {isSelected ? "Current Table (Resume)" : isOcc ? "Re-Bill / New Order →" : selectedTable ? `Switch to Table ${t.tableNumber}` : "Select Table →"}
                    </span>
                    {isOcc && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          releaseTableMutation.mutate(t.id);
                        }}
                        className="text-[11px] font-bold bg-white hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 border border-emerald-300 hover:border-emerald-500 px-2.5 py-1 rounded-lg shadow-2xs transition-colors cursor-pointer"
                        title="Click to release table if customer has left"
                      >
                        Mark Vacant
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen flex flex-col lg:flex-row gap-3 p-3 bg-slate-100 text-gray-900 overflow-hidden select-none">
      {/* LEFT COLUMN: Catalog & Item Selection */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden text-gray-900">
        {/* Aggregator Status & Incoming Order Alert Ribbon */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 text-gray-700">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-gray-500 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-600" />
              Aggregators:
            </span>

            {/* Swiggy status */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] ${
                isSwiggyEnabled
                  ? "bg-[#FC8019]/15 text-[#FC8019] border border-[#FC8019]/30"
                  : "bg-gray-100 text-gray-400 border border-gray-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isSwiggyEnabled ? "bg-[#FC8019] animate-pulse" : "bg-gray-400"
                }`}
              />
              Swiggy {isSwiggyEnabled ? "Live" : "Offline"}
            </span>

            {/* Zomato status */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] ${
                isZomatoEnabled
                  ? "bg-[#E23744]/15 text-[#E23744] border border-[#E23744]/30"
                  : "bg-gray-100 text-gray-400 border border-gray-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isZomatoEnabled ? "bg-[#E23744] animate-pulse" : "bg-gray-400"
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
                className="text-[11px] text-gray-500 hover:text-gray-900 cursor-pointer flex items-center gap-1"
              >
                <Bell className="w-3 h-3 text-gray-400" />
                <span>Online Orders</span>
              </button>
            )}

            {/* Test Simulation Buttons */}
            <div className="flex items-center gap-1 pl-1 border-l border-gray-200">
              <button
                type="button"
                onClick={() => simulateOrderMutation.mutate("SWIGGY")}
                disabled={simulateOrderMutation.isPending}
                className="px-2 py-1 rounded-md bg-gray-100 hover:bg-[#FC8019] text-gray-600 hover:text-white font-semibold text-[11px] border border-gray-200 transition-colors cursor-pointer"
                title="Simulate incoming test order from Swiggy"
              >
                + Test Swiggy
              </button>
              <button
                type="button"
                onClick={() => simulateOrderMutation.mutate("ZOMATO")}
                disabled={simulateOrderMutation.isPending}
                className="px-2 py-1 rounded-md bg-gray-100 hover:bg-[#E23744] text-gray-600 hover:text-white font-semibold text-[11px] border border-gray-200 transition-colors cursor-pointer"
                title="Simulate incoming test order from Zomato"
              >
                + Test Zomato
              </button>
            </div>

            {/* Settings Button */}
            <button
              type="button"
              onClick={() => setIsAggregatorSettingsOpen(true)}
              className="px-2.5 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 font-semibold text-[11px] border border-gray-200 transition-colors cursor-pointer"
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

          {/* Active Order Mode Indicator & Switch Table / Mode Button */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs font-bold shadow-2xs shrink-0">
            {selectedTable ? (
              <button
                type="button"
                onClick={() => setOrderMode(null)}
                className="flex items-center gap-1.5 text-indigo-700 hover:text-indigo-950 font-black cursor-pointer group"
                title="Click to Change Table Number or Switch to Takeaway"
              >
                <span className="flex items-center gap-1 group-hover:underline">
                  🍽️ Table {selectedTable.tableNumber}
                </span>
                <span className="text-gray-500 text-[11px] font-normal">
                  ({guestCount}p)
                </span>
                <span className="text-[10px] bg-white group-hover:bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-200 transition-colors font-bold ml-1 shadow-2xs">
                  ⇄ Change Table
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setOrderMode(null)}
                className="flex items-center gap-1.5 text-emerald-700 hover:text-emerald-950 font-black cursor-pointer group"
                title="Click to Switch to Dine-In Table"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                <span className="group-hover:underline">Takeaway / Packing</span>
                <span className="text-[10px] bg-white group-hover:bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 transition-colors font-bold ml-1 shadow-2xs">
                  ⇄ Switch
                </span>
              </button>
            )}

            {/* Direct button to Release Table / Go Back to Select Table Menu if customer doesn't want to order */}
            <button
              type="button"
              onClick={() => {
                if (cartItems.length === 0) {
                  setSelectedTable(null);
                  setOrderMode(null);
                } else {
                  if (window.confirm("Release this table and return to table selection? (Cart items will be cleared)")) {
                    clearCart();
                    setSelectedTable(null);
                    setOrderMode(null);
                  }
                }
              }}
              className="ml-1 text-[11px] bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-900 px-2.5 py-1 rounded-lg border border-rose-200 hover:border-rose-300 transition-colors cursor-pointer shadow-2xs font-bold flex items-center gap-1"
              title="Customer not ordering now: Release table and return to table selection"
            >
              <RotateCcw className="w-3 h-3 text-rose-500" />
              <span>← Back to Tables</span>
            </button>
          </div>

          {/* Rush Hour Numpad Quick-Add Input */}
          <div className="relative flex items-center shrink-0">
            <div className="flex items-center gap-1.5 bg-amber-50 border-2 border-amber-400/80 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <span className="text-[11px] font-black text-amber-800 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                <span className="hidden xl:inline">Code:</span>
              </span>
              <input
                ref={quickCodeInputRef}
                type="text"
                disabled={Boolean(sizeSelectionItem)}
                value={quickDishCode}
                onChange={(e) => {
                  if (sizeSelectionItem) return;
                  setQuickDishCode(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (sizeSelectionItem) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                placeholder="Numpad # + ↵"
                className={`w-24 sm:w-28 text-xs font-mono font-black text-amber-950 bg-white border border-amber-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase placeholder:text-amber-400 placeholder:font-normal ${
                  sizeSelectionItem ? "opacity-50 cursor-not-allowed" : ""
                }`}
                title="Type dish code from keyboard numpad and press Enter to instantly add to cart"
              />
              <button
                type="button"
                onClick={() => handleQuickCodeSubmit()}
                className="text-[10px] font-black bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 rounded-lg transition-colors cursor-pointer"
                title="Press Enter to add dish"
              >
                ↵
              </button>
            </div>

            {codeFeedbackMsg && (
              <div
                className={`absolute top-full left-0 mt-1 z-30 px-2.5 py-1 rounded-lg text-xs font-bold shadow-md whitespace-nowrap animate-in fade-in slide-in-from-top-1 ${
                  codeFeedbackMsg.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                }`}
              >
                {codeFeedbackMsg.text}
              </div>
            )}
          </div>

          <Input
            placeholder="Search dish by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-gray-400" />}
            className="w-full sm:max-w-xs"
          />

          {/* Quick Actions & Guests */}
          <div className="w-full sm:w-auto flex-1 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFloorPlanOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-xs font-bold text-indigo-700 shadow-2xs transition-colors cursor-pointer"
            >
              <LayoutGrid className="w-4 h-4 text-indigo-600" />
              <span>🪑 Floor Plan ({tables.length})</span>
            </button>

            {/* Live Online / Offline Sync Indicator */}
            <button
              type="button"
              onClick={() => setIsOfflineModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                !isOnline
                  ? "bg-rose-50 border-rose-400 text-rose-800 animate-pulse"
                  : offlinePendingCount > 0
                  ? "bg-amber-50 border-amber-300 text-amber-900"
                  : "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
              }`}
              title={
                !isOnline
                  ? "Offline Mode Active (Bills saved locally, click to view queue)"
                  : offlinePendingCount > 0
                  ? `${offlinePendingCount} offline bills pending sync (Click to sync now)`
                  : "Cloud Connected (Online & Synced)"
              }
            >
              {!isOnline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                  <span>Offline {offlinePendingCount > 0 ? `(${offlinePendingCount})` : ""}</span>
                </>
              ) : offlinePendingCount > 0 ? (
                <>
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${isOfflineSyncing ? "animate-spin" : ""}`} />
                  <span>Sync ({offlinePendingCount})</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden xl:inline">Online</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsPrinterConfigOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-700 shadow-2xs transition-colors cursor-pointer"
              title="Configure thermal printer port, 58mm / 80mm paper size, and test print"
            >
              <Printer className="w-4 h-4 text-gray-500" />
              <span>🖨️ Printer ({paperSize})</span>
            </button>

            {user?.id && hasPin(user.id) ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => lock()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-xs font-bold text-amber-900 shadow-2xs transition-colors cursor-pointer"
                  title="Lock Terminal Screen (Require PIN to unlock)"
                >
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>Lock</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-xs font-bold text-emerald-800 shadow-2xs transition-colors cursor-pointer"
                  title="App Lock Settings (Turn Off / Change PIN)"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>PIN: ON</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsPinModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 hover:bg-indigo-50 border border-dashed border-gray-300 hover:border-indigo-300 text-xs font-bold text-gray-600 hover:text-indigo-700 shadow-2xs transition-colors cursor-pointer"
                title="Setup Quick PIN / Turn On App Lock"
              >
                <Unlock className="w-4 h-4" />
                <span>PIN: OFF</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (document.fullscreenElement && document.exitFullscreen) {
                  document.exitFullscreen().catch(() => {});
                }
                navigate("/dashboard");
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-rose-50 border border-gray-200 hover:border-rose-300 text-gray-700 hover:text-rose-700 text-xs font-bold shadow-2xs transition-all cursor-pointer"
              title="Exit POS Terminal to Dashboard"
            >
              <X className="w-4 h-4" />
              <span>Exit POS</span>
            </button>

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
                  onClick={() => (isPizzaWithSizes(item) || isIceCreamWithScoops(item) ? setSizeSelectionItem(item) : addItem(item))}
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
                    {isIceCreamWithScoops(item) ? (
                      <span className="text-xs font-bold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-200/60">
                        🍨 1 & 2 Scoops • ₹{Number(item.priceSmall || item.price).toFixed(0)}+
                      </span>
                    ) : isPizzaWithSizes(item) ? (
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60">
                        {item.priceMedium != null && Number(item.priceMedium) > 0 ? "S/M/L" : "Normal/Loaded"} • ₹{Number(item.priceSmall || item.price).toFixed(0)}+
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
        <div className="p-4 border-b border-gray-200 bg-white text-gray-900 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-600" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm leading-none text-gray-950">Current Order</h3>
                {selectedTable && (
                  <button
                    type="button"
                    onClick={() => setOrderMode(null)}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-extrabold underline cursor-pointer"
                    title="Change Table Number"
                  >
                    ⇄ Change Table
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {selectedTable ? (
                  <span className="font-bold text-indigo-700">🍽️ Table {selectedTable.tableNumber} ({guestCount}p)</span>
                ) : (
                  <span>Takeaway / Walk-in</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* If cart is empty and a table was selected (customer not ordering now) */}
            {selectedTable && cartItems.length === 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTable(null);
                  setOrderMode(null);
                }}
                className="text-xs text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Customer not ordering now: Release table and return to table selection"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Release Table</span>
              </button>
            )}

            {cartItems.length > 0 && (
              <button
                onClick={() => {
                  clearCart();
                  if (selectedTable && window.confirm("Also release this table and go back to table selection?")) {
                    setSelectedTable(null);
                    setOrderMode(null);
                  }
                }}
                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer font-semibold px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                title="Clear all items in cart"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
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

        {/* Offline sync status notification */}
        {offlineSyncStatusMsg && (
          <div
            className={`p-2.5 px-3 border-b text-xs font-bold flex items-center gap-2 ${
              offlineSyncStatusMsg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : offlineSyncStatusMsg.type === "warning"
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-indigo-50 border-indigo-200 text-indigo-800"
            }`}
          >
            <Wifi className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{offlineSyncStatusMsg.text}</span>
          </div>
        )}

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
                      {item.isTakeaway && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500 text-white shadow-2xs flex items-center gap-1 animate-in fade-in">
                          <Package className="w-3 h-3" />
                          <span>PACKING</span>
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

                  {/* Pack / Parcel toggle button */}
                  <button
                    type="button"
                    onClick={() => toggleItemTakeaway(item.cartItemId)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs active:scale-95 ${
                      item.isTakeaway
                        ? "bg-amber-500 text-white border-amber-600 hover:bg-amber-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-400"
                    }`}
                    title={
                      item.isTakeaway
                        ? "Marked for Packing / Parcel (Click to switch to Dine-In)"
                        : item.quantity > 1
                        ? "Click to split 1 unit for Packing / Parcel"
                        : "Click to mark for Packing / Parcel"
                    }
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>{item.isTakeaway ? "📦 Packed" : item.quantity > 1 ? "Pack 1" : "Pack"}</span>
                  </button>

                  {/* Quantity controls */}
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden shrink-0 bg-white">
                    <button
                      onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                      className="p-2 sm:p-1.5 hover:bg-rose-50 hover:text-rose-600 text-gray-600 cursor-pointer active:scale-90 transition-transform"
                      title="Decrease quantity"
                    >
                      <Minus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    </button>
                    <span className="px-2.5 text-xs font-black text-gray-900 min-w-[24px] text-center select-none">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                      className="p-2 sm:p-1.5 hover:bg-emerald-50 hover:text-emerald-600 text-gray-600 cursor-pointer active:scale-90 transition-transform"
                      title="Increase quantity"
                    >
                      <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
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
                    isTakeaway: !!i.isTakeaway,
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
            setOrderMode("DINE_IN");
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
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Select Payment Method *
              </label>
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                Press [1, 2, 3, 4] then [Enter ↵]
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "CASH", label: "Cash", icon: "💵", key: "1" },
                { id: "UPI", label: "UPI", icon: "📱", key: "2" },
                { id: "CARD", label: "Card", icon: "💳", key: "3" },
                { id: "SPLIT", label: "UPI + Cash", icon: "💵+📱", key: "4" },
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
                    } else if (mode === "CASH") {
                      setSplitCashAmount(total);
                      setSplitUpiAmount(0);
                    } else if (mode === "UPI") {
                      setSplitCashAmount(0);
                      setSplitUpiAmount(total);
                    }
                  }}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                    payMode === m.id
                      ? "bg-indigo-50 border-indigo-600 text-indigo-950 font-black shadow-sm ring-2 ring-indigo-400"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 font-bold"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xl">{m.icon}</span>
                    <span
                      className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${
                        payMode === m.id
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-700 border border-gray-200"
                      }`}
                    >
                      [{m.key}]
                    </span>
                  </div>
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
              Cancel (Esc)
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
              <span className="flex items-center gap-1.5">
                <span>Complete Payment & Print {printKOT ? "KOT + Bill" : "Bill"}</span>
                <span className="bg-emerald-800 text-emerald-100 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                  [Enter ↵]
                </span>
              </span>
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
          ${(brandSettings?.businessName || "RESTAURANT").toUpperCase()}
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
Thanks For Visiting ${(brandSettings?.businessName || "Our Restaurant")}`;
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

          {/* Zero-Click Silent Printing Tip */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
            <p className="font-bold text-amber-950 flex items-center gap-1.5">
              <span>⚡</span> 100% Zero-Click Silent Printing (Kiosk Mode)
            </p>
            <p className="text-[11px] text-amber-900 leading-relaxed">
              To make your POS print directly to your default thermal printer <strong>without opening ANY browser dialogs</strong> (no prompt for printer, pages, or copies), launch Chrome or Edge with the <code>--kiosk-printing</code> flag on your desktop shortcut.
            </p>
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-gray-100">
            <Button variant="primary" size="sm" onClick={() => setIsPrinterConfigOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* Portion / Size / Scoop Selection Modal for Pizza & Ice Cream */}
      {sizeSelectionItem && (() => {
        const isIceCream = isIceCreamWithScoops(sizeSelectionItem);
        const hasThreeSizes = sizeSelectionItem.priceMedium != null && Number(sizeSelectionItem.priceMedium) > 0;
        const pSmall = sizeSelectionItem.priceSmall != null ? Number(sizeSelectionItem.priceSmall) : Number(sizeSelectionItem.price);
        const pMedium = sizeSelectionItem.priceMedium != null ? Number(sizeSelectionItem.priceMedium) : Number(sizeSelectionItem.price);
        const pLarge = sizeSelectionItem.priceLarge != null ? Number(sizeSelectionItem.priceLarge) : Number(sizeSelectionItem.price);

        const modalTitle = isIceCream
          ? `🍨 Select Scoops: ${sizeSelectionItem.name}`
          : hasThreeSizes
          ? `🍕 Select Size: ${sizeSelectionItem.name}`
          : `✨ Select Portion: ${sizeSelectionItem.name}`;

        return (
          <Modal
            isOpen={Boolean(sizeSelectionItem)}
            onClose={() => setSizeSelectionItem(null)}
            title={modalTitle}
            maxWidth="sm"
          >
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs">
                <span className="font-semibold text-indigo-950">
                  {isIceCream
                    ? "Press [1] for 1 Scoop or [2] for 2 Scoops:"
                    : hasThreeSizes
                    ? "Press [1] Small, [2] Medium, or [3] Large:"
                    : "Press [1] Normal or [2] Loaded:"}
                </span>
                <span className="text-[11px] font-mono font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-200">
                  Esc to Cancel
                </span>
              </div>

              {isIceCream ? (
                /* Ice Cream Scoop Selection (1 Scoop vs 2 Scoops) */
                <div className="grid grid-cols-2 gap-3.5">
                  {/* 1 Scoop */}
                  <button
                    type="button"
                    onClick={() => {
                      addItem(sizeSelectionItem, "1 Scoop", pSmall);
                      setQuickDishCode("");
                      setSizeSelectionItem(null);
                    }}
                    className="p-4 rounded-2xl border-2 border-pink-200 hover:border-pink-600 bg-white hover:bg-pink-50/70 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-xs hover:shadow-md active:scale-95"
                  >
                    <span className="w-10 h-10 rounded-full bg-pink-100 text-pink-700 font-black text-base flex items-center justify-center group-hover:bg-pink-600 group-hover:text-white transition-colors">
                      1
                    </span>
                    <div className="text-center">
                      <span className="text-sm font-black text-gray-900 group-hover:text-pink-950 block">
                        1 Scoop 🍨
                      </span>
                      <span className="text-xs text-pink-700 font-mono font-bold">[Key 1]</span>
                    </div>
                    <span className="text-sm font-extrabold text-pink-600">
                      ₹{pSmall.toFixed(2)}
                    </span>
                  </button>

                  {/* 2 Scoops */}
                  <button
                    type="button"
                    onClick={() => {
                      addItem(sizeSelectionItem, "2 Scoops", pLarge);
                      setQuickDishCode("");
                      setSizeSelectionItem(null);
                    }}
                    className="p-4 rounded-2xl border-2 border-pink-400 hover:border-pink-600 bg-pink-50/60 hover:bg-pink-100/70 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-xs hover:shadow-md active:scale-95 ring-2 ring-pink-300/40"
                  >
                    <span className="w-10 h-10 rounded-full bg-pink-600 text-white font-black text-base flex items-center justify-center shadow-xs">
                      2
                    </span>
                    <div className="text-center">
                      <span className="text-sm font-black text-gray-900 group-hover:text-pink-950 block">
                        2 Scoops 🍨🍨
                      </span>
                      <span className="text-xs text-pink-700 font-mono font-bold">[Key 2]</span>
                    </div>
                    <span className="text-sm font-extrabold text-pink-600">
                      ₹{pLarge.toFixed(2)}
                    </span>
                  </button>
                </div>
              ) : hasThreeSizes ? (
                <div className="grid grid-cols-3 gap-3">
                  {/* Small */}
                  <button
                    type="button"
                    onClick={() => {
                      addItem(sizeSelectionItem, "Small", pSmall);
                      setQuickDishCode("");
                      setSizeSelectionItem(null);
                    }}
                    className="p-3.5 rounded-2xl border-2 border-indigo-100 hover:border-indigo-600 bg-white hover:bg-indigo-50/70 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-xs hover:shadow-md active:scale-95"
                  >
                    <span className="w-9 h-9 rounded-full bg-slate-100 text-slate-800 font-black text-sm flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      1
                    </span>
                    <div className="text-center">
                      <span className="text-xs font-black text-gray-900 group-hover:text-indigo-900 block">
                        Small (7")
                      </span>
                      <span className="text-[11px] text-indigo-700 font-mono font-bold">[Key 1]</span>
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
                      setQuickDishCode("");
                      setSizeSelectionItem(null);
                    }}
                    className="p-3.5 rounded-2xl border-2 border-indigo-300 hover:border-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/70 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-xs hover:shadow-md active:scale-95 ring-2 ring-indigo-400/30"
                  >
                    <span className="w-9 h-9 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                      2
                    </span>
                    <div className="text-center">
                      <span className="text-xs font-black text-gray-900 group-hover:text-indigo-900 block">
                        Medium (10")
                      </span>
                      <span className="text-[11px] text-indigo-700 font-mono font-bold">[Key 2]</span>
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
                      setQuickDishCode("");
                      setSizeSelectionItem(null);
                    }}
                    className="p-3.5 rounded-2xl border-2 border-indigo-100 hover:border-indigo-600 bg-white hover:bg-indigo-50/70 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-xs hover:shadow-md active:scale-95"
                  >
                    <span className="w-9 h-9 rounded-full bg-slate-100 text-slate-800 font-black text-sm flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      3
                    </span>
                    <div className="text-center">
                      <span className="text-xs font-black text-gray-900 group-hover:text-indigo-900 block">
                        Large (12")
                      </span>
                      <span className="text-[11px] text-indigo-700 font-mono font-bold">[Key 3]</span>
                    </div>
                    <span className="text-sm font-extrabold text-emerald-600">
                      ₹{pLarge.toFixed(2)}
                    </span>
                  </button>
                </div>
              ) : (
                /* Normal & Loaded */
                <div className="grid grid-cols-2 gap-3.5">
                  {/* Normal */}
                  <button
                    type="button"
                    onClick={() => {
                      addItem(sizeSelectionItem, "Normal", pSmall);
                      setQuickDishCode("");
                      setSizeSelectionItem(null);
                    }}
                    className="p-4 rounded-2xl border-2 border-emerald-100 hover:border-emerald-600 bg-white hover:bg-emerald-50/70 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-xs hover:shadow-md active:scale-95"
                  >
                    <span className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-black text-base flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      1
                    </span>
                    <div className="text-center">
                      <span className="text-sm font-black text-gray-900 group-hover:text-emerald-950 block">
                        Normal
                      </span>
                      <span className="text-xs text-emerald-700 font-mono font-bold">[Key 1]</span>
                    </div>
                    <span className="text-sm font-extrabold text-emerald-600">
                      ₹{pSmall.toFixed(2)}
                    </span>
                  </button>

                  {/* Loaded */}
                  <button
                    type="button"
                    onClick={() => {
                      addItem(sizeSelectionItem, "Loaded", pLarge);
                      setQuickDishCode("");
                      setSizeSelectionItem(null);
                    }}
                    className="p-4 rounded-2xl border-2 border-emerald-300 hover:border-emerald-600 bg-emerald-50/60 hover:bg-emerald-100/70 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-xs hover:shadow-md active:scale-95 ring-2 ring-emerald-400/30"
                  >
                    <span className="w-10 h-10 rounded-full bg-emerald-600 text-white font-black text-base flex items-center justify-center shadow-xs">
                      2
                    </span>
                    <div className="text-center">
                      <span className="text-sm font-black text-gray-900 group-hover:text-emerald-950 block">
                        Loaded / Special 🧀
                      </span>
                      <span className="text-xs text-emerald-700 font-mono font-bold">[Key 2]</span>
                    </div>
                    <span className="text-sm font-extrabold text-emerald-600">
                      ₹{pLarge.toFixed(2)}
                    </span>
                  </button>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-gray-100">
                <Button variant="outline" size="sm" onClick={() => setSizeSelectionItem(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Quick PIN Setup / Change Modal */}
      <PinSetupModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
      />

      {/* Offline Sync Queue Modal */}
      <OfflineQueueModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
        isOnline={isOnline}
        isSyncing={isOfflineSyncing}
        queue={offlineQueue}
        onSyncNow={syncQueueNow}
      />
    </div>
  );
};
