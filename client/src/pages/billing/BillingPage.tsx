import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  DollarSign,
  Printer,
  CheckCircle2,
  Eye,
  MapPin,
  Store,
  RefreshCw,
  FileSpreadsheet,
  ShieldAlert,
  ShieldCheck,
  Download,
  Calendar,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { api, extractErrorMessage } from "../../services/api.js";
import { useAuthStore } from "../../store/authStore.js";
import type { Invoice, PaymentMethod, BrandSettings } from "../../types/index.js";
import { Button } from "../../components/common/Button.js";
import { Input } from "../../components/common/Input.js";
import { Select } from "../../components/common/Select.js";
import { Modal } from "../../components/common/Modal.js";
import { Badge } from "../../components/common/Badge.js";
import { LoadingState } from "../../components/common/LoadingState.js";
import { EmptyState } from "../../components/common/EmptyState.js";

export const BillingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { selectedFranchiseId, user } = useAuthStore();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isAccountant = user?.role === "ACCOUNTANT";
  const canAudit = isSuperAdmin || isAccountant;

  const [activeTab, setActiveTab] = useState<"invoices" | "gst_audit" | "dormant">("invoices");
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [dormantViewFilter, setDormantViewFilter] = useState<string>("all"); // "all" | "active" | "dormant"

  // Selected Invoices & View Modals
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Manager Anti-Fraud Void Modal State
  const [isDormantModalOpen, setIsDormantModalOpen] = useState(false);
  const [dormantInvoice, setDormantInvoice] = useState<Invoice | null>(null);
  const [dormantReason, setDormantReason] = useState("Accidental duplicate punch / item error");
  const [dormantNotes, setDormantNotes] = useState("");
  const [dormantModalError, setDormantModalError] = useState<string | null>(null);

  // Super Admin Verification Modal State
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyInvoice, setVerifyInvoice] = useState<Invoice | null>(null);
  const [verifyAction, setVerifyAction] = useState<"APPROVE_VOID" | "REINSTATE">("APPROVE_VOID");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [singleMethod, setSingleMethod] = useState<PaymentMethod>("CASH");
  const [singleAmount, setSingleAmount] = useState<number>(0);
  const [singleTxnId, setSingleTxnId] = useState("");

  const [splits, setSplits] = useState<
    { method: PaymentMethod; amount: number; transactionId: string }[]
  >([
    { method: "CASH", amount: 0, transactionId: "" },
    { method: "UPI", amount: 0, transactionId: "" },
  ]);

  const [formError, setFormError] = useState<string | null>(null);

  // Receipt Modal State
  const [printPayload, setPrintPayload] = useState<string | null>(null);

  // GST Audit Date Filters
  const [gstStartDate, setGstStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // 1st day of current month
    return d.toISOString().split("T")[0];
  });
  const [gstEndDate, setGstEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [includeDormantInGst, setIncludeDormantInGst] = useState(false);

  // Fetch Invoices with isFetching for smooth reload
  const {
    data: invoices = [],
    isLoading,
    isFetching: isFetchingInvoices,
    refetch: refetchInvoices,
  } = useQuery<Invoice[]>({
    queryKey: ["invoices", selectedFranchiseId, dormantViewFilter, sourceFilter],
    queryFn: async () => {
      let url = "/billing/invoices";
      const params = new URLSearchParams();
      if (dormantViewFilter === "active") params.append("isDormant", "false");
      if (dormantViewFilter === "dormant") params.append("isDormant", "true");
      if (sourceFilter) params.append("orderSource", sourceFilter);

      const qs = params.toString();
      if (qs) url += `?${qs}`;

      const res = await api.get(url);
      return res.data.data;
    },
  });

  // Fetch Brand Settings for receipt printing and tax currency
  const { data: brandSettings } = useQuery<BrandSettings>({
    queryKey: ["brand-settings"],
    queryFn: async () => {
      const res = await api.get("/brand-settings");
      return res.data.data;
    },
  });

  // Fetch Super Admin GST Audit Report
  const {
    data: gstAuditData,
    isFetching: isGstFetching,
    refetch: refetchGst,
  } = useQuery<{
    summary: {
      totalInvoicesCount: number;
      grossTotal: number;
      taxableTotal: number;
      cgstTotal: number;
      sgstTotal: number;
      igstTotal: number;
      totalTaxCollected: number;
      dormantCount: number;
      dormantTotal: number;
    };
    invoices: Invoice[];
  }>({
    queryKey: ["gst-audit", selectedFranchiseId, gstStartDate, gstEndDate, includeDormantInGst],
    queryFn: async () => {
      let url = `/billing/gst-audit?startDate=${gstStartDate}&endDate=${gstEndDate}&includeDormant=${includeDormantInGst}`;
      const res = await api.get(url);
      return res.data.data;
    },
    enabled: canAudit && activeTab === "gst_audit",
  });

  // Process Payment Mutation
  const payMutation = useMutation({
    mutationFn: async () => {
      if (!paymentInvoice) throw new Error("No invoice selected");

      if (isSplitMode) {
        const validSplits = splits.filter((s) => s.amount > 0);
        if (validSplits.length === 0) {
          throw new Error("Enter amounts for split payment");
        }
        const totalSplit = validSplits.reduce((sum, s) => sum + s.amount, 0);
        const rem = paymentInvoice.remainingBalance ?? Number(paymentInvoice.total);
        if (totalSplit > rem + 0.01) {
          throw new Error(`Total split payment (₹${totalSplit}) exceeds remaining balance (₹${rem})`);
        }

        const res = await api.post(`/billing/invoices/${paymentInvoice.id}/payments/split`, {
          payments: validSplits,
        });
        return res.data.data;
      } else {
        if (singleAmount <= 0) throw new Error("Payment amount must be greater than 0");
        const res = await api.post(`/billing/invoices/${paymentInvoice.id}/payments`, {
          amount: singleAmount,
          method: singleMethod,
          transactionId: singleTxnId || undefined,
        });
        return res.data.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["gst-audit"] });
      setIsPaymentModalOpen(false);
      setPaymentInvoice(null);
      setFormError(null);
    },
    onError: (err) => {
      setFormError(extractErrorMessage(err));
    },
  });

  // Mark Dormant Mutation (Manager anti-fraud void)
  const markDormantMutation = useMutation({
    mutationFn: async () => {
      if (!dormantInvoice) throw new Error("No bill selected");
      const res = await api.post(`/billing/invoices/${dormantInvoice.id}/dormant`, {
        reason: dormantReason,
        notes: dormantNotes,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["gst-audit"] });
      setIsDormantModalOpen(false);
      setDormantInvoice(null);
      setDormantNotes("");
      setDormantModalError(null);
    },
    onError: (err) => {
      setDormantModalError(extractErrorMessage(err));
    },
  });

  // Super Admin Verify Dormant Mutation
  const verifyDormantMutation = useMutation({
    mutationFn: async () => {
      if (!verifyInvoice) throw new Error("No bill selected");
      const res = await api.post(`/billing/invoices/${verifyInvoice.id}/verify-dormant`, {
        action: verifyAction,
        notes: verifyNotes,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["gst-audit"] });
      setIsVerifyModalOpen(false);
      setVerifyInvoice(null);
      setVerifyNotes("");
      setVerifyError(null);
    },
    onError: (err) => {
      setVerifyError(extractErrorMessage(err));
    },
  });

  // Print Receipt Mutation
  const printMutation = useMutation({
    mutationFn: async (invoice: Invoice) => {
      const res = await api.post("/printers/print-job", {
        type: "RECEIPT",
        targetId: invoice.id,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      setPrintPayload(data.rawText);
    },
    onError: (err) => alert(extractErrorMessage(err)),
  });

  const handleOpenPayment = (inv: Invoice) => {
    setPaymentInvoice(inv);
    const paid =
      inv.payments
        ?.filter((p) => p.status === "COMPLETED")
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const remaining = Math.max(0, Number(inv.total) - paid);

    setSingleAmount(remaining);
    setSingleMethod("CASH");
    setSingleTxnId("");
    setSplits([
      { method: "CASH", amount: remaining, transactionId: "" },
      { method: "UPI", amount: 0, transactionId: "" },
    ]);
    setFormError(null);
    setIsPaymentModalOpen(true);
  };

  const handleOpenDormantModal = (inv: Invoice) => {
    setDormantInvoice(inv);
    setDormantReason("Accidental duplicate punch / item error");
    setDormantNotes("");
    setDormantModalError(null);
    setIsDormantModalOpen(true);
  };

  const handleOpenVerifyModal = (inv: Invoice, action: "APPROVE_VOID" | "REINSTATE") => {
    setVerifyInvoice(inv);
    setVerifyAction(action);
    setVerifyNotes("");
    setVerifyError(null);
    setIsVerifyModalOpen(true);
  };

  // Filtered operational invoices
  const filtered = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.order?.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.franchise?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.franchise?.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.order?.customerDeliveryName || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Dormant bills count
  const dormantBills = invoices.filter((inv) => inv.isDormant);
  const pendingDormantCount = dormantBills.filter(
    (inv) => !inv.dormantStatus || inv.dormantStatus === "PENDING_AUDIT"
  ).length;

  const currSym = brandSettings?.currencySymbol || brandSettings?.currency || "₹";

  // CSV Generator for GSTR-1
  const handleExportGstr1Csv = () => {
    const sourceInvoices = gstAuditData?.invoices || invoices;
    if (sourceInvoices.length === 0) {
      alert("No invoices found for the selected date range to export.");
      return;
    }

    const headers = [
      "Invoice Number",
      "Invoice Date",
      "Franchise Outlet",
      "Branch Code",
      "Order Channel",
      "Customer Name",
      "Customer GSTIN",
      "Taxable Value (INR)",
      "CGST Rate (%)",
      "CGST Amount (INR)",
      "SGST Rate (%)",
      "SGST Amount (INR)",
      "IGST Amount (INR)",
      "Total Invoice Value (INR)",
      "Payment Status",
      "Audit / Dormant Status",
      "Void Reason",
      "Marked Dormant By",
    ];

    const rows = sourceInvoices.map((inv) => {
      const taxable = inv.taxableAmount !== null && inv.taxableAmount !== undefined
        ? Number(inv.taxableAmount)
        : Math.max(0, Number(inv.subtotal) - Number(inv.discount));
      const cgstAmt = inv.cgstAmount ?? Number((Number(inv.tax) / 2).toFixed(2));
      const sgstAmt = inv.sgstAmount ?? Number((Number(inv.tax) / 2).toFixed(2));
      const cgstRt = inv.cgstRate ?? 2.5;
      const sgstRt = inv.sgstRate ?? 2.5;

      const isPaid = (inv.payments || [])
        .filter((p) => p.status === "COMPLETED")
        .reduce((s, p) => s + Number(p.amount), 0) >= Number(inv.total) - 0.01;

      return [
        `"${inv.invoiceNumber}"`,
        `"${new Date(inv.createdAt).toLocaleDateString("en-IN")}"`,
        `"${inv.franchise?.name || "Main Outlet"}"`,
        `"${inv.franchise?.code || "HQ"}"`,
        `"${inv.order?.orderSource || "POS"}"`,
        `"${inv.order?.customerDeliveryName || (inv.order as any)?.customer?.name || "B2C Consumer"}"`,
        `"${inv.gstin || "N/A"}"`,
        taxable.toFixed(2),
        cgstRt,
        cgstAmt.toFixed(2),
        sgstRt,
        sgstAmt.toFixed(2),
        (inv.igstAmount || 0).toFixed(2),
        Number(inv.total).toFixed(2),
        isPaid ? "PAID" : "PENDING",
        inv.isDormant ? `DORMANT (${inv.dormantStatus || "PENDING_AUDIT"})` : "ACTIVE",
        `"${inv.dormantReason || ""}"`,
        `"${inv.dormantBy || ""}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `GSTR1_Audit_Report_${gstStartDate}_to_${gstEndDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <span>Billing, Tax & Audit Center</span>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Process payments, inspect dormant bills, and file statutory GST (CGST/SGST) audit returns.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            disabled={isFetchingInvoices || isGstFetching}
            onClick={async () => {
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["invoices"] }),
                queryClient.invalidateQueries({ queryKey: ["gst-audit"] }),
              ]);
              refetchInvoices();
              if (canAudit) refetchGst();
            }}
            icon={<RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isFetchingInvoices || isGstFetching ? "animate-spin" : ""}`} />}
          >
            {isFetchingInvoices || isGstFetching ? "Refreshing..." : "Refresh Bills"}
          </Button>

          {canAudit && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportGstr1Csv}
              icon={<Download className="w-3.5 h-3.5 text-emerald-600" />}
            >
              Export GSTR-1 (CSV)
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab("invoices")}
            className={`pb-3 text-sm font-bold flex items-center gap-2 cursor-pointer border-b-2 transition-all ${
              activeTab === "invoices"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <span>All Bills & POS Registers</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
              {invoices.length}
            </span>
          </button>

          {canAudit && (
            <button
              onClick={() => setActiveTab("gst_audit")}
              className={`pb-3 text-sm font-bold flex items-center gap-2 cursor-pointer border-b-2 transition-all ${
                activeTab === "gst_audit"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Super Admin GST Filing & Audit</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab("dormant")}
            className={`pb-3 text-sm font-bold flex items-center gap-2 cursor-pointer border-b-2 transition-all ${
              activeTab === "dormant"
                ? "border-amber-600 text-amber-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Dormant Bills Queue</span>
            {pendingDormantCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 font-black animate-pulse">
                {pendingDormantCount} Pending
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                {dormantBills.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: ALL BILLS & COUNTER OPERATIONS                          */}
      {/* ============================================================== */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs">
            <Input
              placeholder="Search by Bill #, Order #, Customer, or Branch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-gray-400" />}
              className="w-full sm:max-w-md"
            />

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Order Source Filter */}
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-gray-700 cursor-pointer"
              >
                <option value="">All Channels (POS, Swiggy, Zomato)</option>
                <option value="POS">In-Store POS</option>
                <option value="SWIGGY">Swiggy Delivery</option>
                <option value="ZOMATO">Zomato Delivery</option>
              </select>

              {/* Dormant / Active Filter */}
              <select
                value={dormantViewFilter}
                onChange={(e) => setDormantViewFilter(e.target.value)}
                className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-gray-700 cursor-pointer"
              >
                <option value="all">Active & Dormant Bills</option>
                <option value="active">Active Operational Only</option>
                <option value="dormant">Dormant Bills Only</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <LoadingState message="Loading invoices & financial records..." />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No Invoices Found"
              description="No billing records match your search criteria or filter range."
            />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50/75 border-b border-gray-100 text-[11px] uppercase tracking-wider font-bold text-gray-500">
                    <tr>
                      <th className="px-6 py-4">Invoice #</th>
                      <th className="px-6 py-4">Outlet & Address</th>
                      <th className="px-6 py-4">Channel & Order</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Total</th>
                      <th className="px-6 py-4">Paid</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((inv) => {
                      const totalPaid =
                        inv.payments
                          ?.filter((p) => p.status === "COMPLETED")
                          .reduce((sum, p) => sum + Number(p.amount), 0) || 0;
                      const isPaid = totalPaid >= Number(inv.total) - 0.01;
                      const tableStr = inv.order?.tableSession?.table
                        ? `Table ${inv.order.tableSession.table.tableNumber}`
                        : "Takeaway";
                      const channel = inv.order?.orderSource || "POS";

                      return (
                        <tr
                          key={inv.id}
                          className={`hover:bg-gray-50/80 transition-colors ${
                            inv.isDormant ? "bg-amber-50/30" : ""
                          }`}
                        >
                          <td className="px-6 py-4 font-mono font-bold text-xs text-indigo-600">
                            {inv.invoiceNumber}
                            {inv.isDormant && (
                              <div className="mt-0.5">
                                <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                                  DORMANT
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Branch & Printed Bill Address */}
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                              <Store className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span className="truncate">{inv.franchise?.name || "Main Outlet"}</span>
                            </p>
                            <p className="text-xs text-gray-500 truncate max-w-xs flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                              <span>{inv.franchise?.address || "HQ Address"}</span>
                            </p>
                          </td>

                          {/* Channel & Order */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              {channel === "SWIGGY" && (
                                <span className="px-1.5 py-0.5 text-[10px] font-black rounded bg-orange-100 text-orange-800">
                                  SWIGGY
                                </span>
                              )}
                              {channel === "ZOMATO" && (
                                <span className="px-1.5 py-0.5 text-[10px] font-black rounded bg-rose-100 text-rose-800">
                                  ZOMATO
                                </span>
                              )}
                              {channel === "POS" && (
                                <span className="px-1.5 py-0.5 text-[10px] font-black rounded bg-gray-100 text-gray-700">
                                  IN-STORE
                                </span>
                              )}
                              <span className="font-semibold text-gray-900">{inv.order?.orderNumber}</span>
                            </div>
                            <span className="text-xs text-gray-500">{tableStr}</span>
                          </td>

                          <td className="px-6 py-4 text-xs text-gray-500">
                            {new Date(inv.createdAt).toLocaleString()}
                          </td>

                          <td className="px-6 py-4 font-black text-gray-900">
                            {currSym}{Number(inv.total).toFixed(2)}
                          </td>

                          <td className="px-6 py-4 font-semibold text-emerald-600">
                            {currSym}{totalPaid.toFixed(2)}
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            {inv.isDormant ? (
                              <div className="space-y-0.5">
                                <Badge variant="warning" dot>
                                  {inv.dormantStatus || "PENDING AUDIT"}
                                </Badge>
                                <p className="text-[10px] text-gray-500 truncate max-w-[140px]" title={inv.dormantReason || ""}>
                                  {inv.dormantReason}
                                </p>
                              </div>
                            ) : (
                              <Badge variant={isPaid ? "success" : "warning"} dot>
                                {isPaid ? "PAID" : "PENDING"}
                              </Badge>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="px-6 py-4 text-right space-x-1.5 shrink-0 whitespace-nowrap">
                            {!isPaid && !inv.isDormant && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleOpenPayment(inv)}
                                icon={<DollarSign className="w-3.5 h-3.5" />}
                              >
                                Pay
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => printMutation.mutate(inv)}
                              icon={<Printer className="w-3.5 h-3.5" />}
                            >
                              Receipt
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedInvoice(inv)}
                              icon={<Eye className="w-3.5 h-3.5" />}
                            >
                              View
                            </Button>

                            {/* Manager Void / Dormant Action Button */}
                            {!inv.isDormant && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDormantModal(inv)}
                                className="text-amber-700 hover:bg-amber-50 hover:border-amber-300"
                                icon={<ShieldAlert className="w-3.5 h-3.5 text-amber-600" />}
                                title="Managers cannot delete bills. Click to mark dormant with mandatory reason for Super Admin audit."
                              >
                                Void / Dormant
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: SUPER ADMIN GST TAX AUDIT & FILING CENTER               */}
      {/* ============================================================== */}
      {activeTab === "gst_audit" && canAudit && (
        <div className="space-y-6">
          {/* Date Selector & Presets Banner */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-gray-900 text-sm">GST Statutory Filing Date Window</h3>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const now = new Date();
                    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                    setGstStartDate(firstDay.toISOString().split("T")[0]);
                    setGstEndDate(now.toISOString().split("T")[0]);
                  }}
                >
                  This Month
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const now = new Date();
                    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                    setGstStartDate(firstDayLastMonth.toISOString().split("T")[0]);
                    setGstEndDate(lastDayLastMonth.toISOString().split("T")[0]);
                  }}
                >
                  Last Month
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const now = new Date();
                    const yearStart = new Date(now.getFullYear(), 0, 1);
                    setGstStartDate(yearStart.toISOString().split("T")[0]);
                    setGstEndDate(now.toISOString().split("T")[0]);
                  }}
                >
                  Current Year
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <Input
                label="Start Date"
                type="date"
                value={gstStartDate}
                onChange={(e) => setGstStartDate(e.target.value)}
              />
              <Input
                label="End Date"
                type="date"
                value={gstEndDate}
                onChange={(e) => setGstEndDate(e.target.value)}
              />

              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeDormantInGst}
                    onChange={(e) => setIncludeDormantInGst(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Include Dormant / Voided Bills in Audit Table</span>
                </label>
              </div>
            </div>
          </div>

          {/* Statutory Tax Summary Cards */}
          {gstAuditData?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-1">
                <span className="text-[11px] font-black uppercase text-gray-400">Total B2C Bills</span>
                <p className="text-xl font-black text-gray-900">
                  {gstAuditData.summary.totalInvoicesCount}
                </p>
                <p className="text-[10px] text-gray-500">Clean Active Invoices</p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-1">
                <span className="text-[11px] font-black uppercase text-gray-400">Taxable Turnover</span>
                <p className="text-xl font-black text-indigo-600">
                  {currSym}{gstAuditData.summary.taxableTotal.toFixed(2)}
                </p>
                <p className="text-[10px] text-gray-500">Net of Discounts</p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-1">
                <span className="text-[11px] font-black uppercase text-gray-400">CGST (Central)</span>
                <p className="text-xl font-black text-emerald-600">
                  {currSym}{gstAuditData.summary.cgstTotal.toFixed(2)}
                </p>
                <p className="text-[10px] text-gray-500">50% Statutory Split</p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-1">
                <span className="text-[11px] font-black uppercase text-gray-400">SGST (State)</span>
                <p className="text-xl font-black text-emerald-600">
                  {currSym}{gstAuditData.summary.sgstTotal.toFixed(2)}
                </p>
                <p className="text-[10px] text-gray-500">50% Statutory Split</p>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-2xs space-y-1">
                <span className="text-[11px] font-black uppercase text-emerald-800">Total GST Liability</span>
                <p className="text-xl font-black text-emerald-950">
                  {currSym}{gstAuditData.summary.totalTaxCollected.toFixed(2)}
                </p>
                <p className="text-[10px] text-emerald-700">Total CGST + SGST</p>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 shadow-2xs space-y-1">
                <span className="text-[11px] font-black uppercase text-amber-800">Dormant Deducted</span>
                <p className="text-xl font-black text-amber-950">
                  {gstAuditData.summary.dormantCount} bills
                </p>
                <p className="text-[10px] text-amber-700 font-semibold">
                  {currSym}{gstAuditData.summary.dormantTotal.toFixed(2)} voided
                </p>
              </div>
            </div>
          )}

          {/* GSTR-1 Audit Table */}
          <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-2xs">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-gray-700">
                GSTR-1 Statutory Invoice Register ({gstAuditData?.invoices?.length || 0} Records)
              </span>
              <Button
                size="sm"
                variant="primary"
                onClick={handleExportGstr1Csv}
                icon={<Download className="w-3.5 h-3.5" />}
              >
                Download GSTR-1 Excel/CSV
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-100/70 border-b border-gray-200 font-bold text-gray-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Invoice #</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Outlet</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Taxable Value</th>
                    <th className="px-4 py-3">CGST</th>
                    <th className="px-4 py-3">SGST</th>
                    <th className="px-4 py-3">Total Value</th>
                    <th className="px-4 py-3">GSTIN</th>
                    <th className="px-4 py-3">Audit Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {gstAuditData?.invoices?.map((inv) => {
                    const taxable = inv.taxableAmount !== null && inv.taxableAmount !== undefined
                      ? Number(inv.taxableAmount)
                      : Math.max(0, Number(inv.subtotal) - Number(inv.discount));
                    const cgst = inv.cgstAmount ?? Number((Number(inv.tax) / 2).toFixed(2));
                    const sgst = inv.sgstAmount ?? Number((Number(inv.tax) / 2).toFixed(2));

                    return (
                      <tr
                        key={inv.id}
                        className={`hover:bg-gray-50/80 ${inv.isDormant ? "bg-amber-50/30" : ""}`}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-indigo-600">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(inv.createdAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {inv.franchise?.name || "Main Outlet"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                            {inv.order?.orderSource || "POS"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900">
                          {currSym}{taxable.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-emerald-700 font-semibold">
                          {currSym}{cgst.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-emerald-700 font-semibold">
                          {currSym}{sgst.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 font-black text-gray-900">
                          {currSym}{Number(inv.total).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px]">
                          {inv.gstin || "Unregistered"}
                        </td>
                        <td className="px-4 py-3">
                          {inv.isDormant ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                              DORMANT ({inv.dormantStatus || "VOID"})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              FILED
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: DORMANT BILLS ANTI-FRAUD VERIFICATION QUEUE             */}
      {/* ============================================================== */}
      {activeTab === "dormant" && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <p className="font-bold">Anti-Fraud Protection: Manager Void & Dormant Governance</p>
              <p>
                Branch managers cannot delete customer bills from the system. When a bill is voided, it is locked as <strong>DORMANT</strong>, immediately removed from physical cashier shift tallies, and submitted to the Super Admin for audit inspection and verification.
              </p>
            </div>
          </div>

          {dormantBills.length === 0 ? (
            <EmptyState
              title="No Dormant Bills"
              description="All bills across all franchise outlets are active and verified. No voided or dormant bills found."
            />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50/75 border-b border-gray-100 text-[11px] uppercase tracking-wider font-bold text-gray-500">
                    <tr>
                      <th className="px-6 py-4">Bill #</th>
                      <th className="px-6 py-4">Outlet</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Marked By Staff</th>
                      <th className="px-6 py-4">Void Reason Given</th>
                      <th className="px-6 py-4">Audit Status</th>
                      <th className="px-6 py-4 text-right">Super Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dormantBills.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-xs text-indigo-600">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          {inv.franchise?.name || "Main Outlet"}
                        </td>
                        <td className="px-6 py-4 font-black text-rose-600">
                          {currSym}{Number(inv.total).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-700">
                          <p className="font-bold">{inv.dormantBy || "Branch Manager"}</p>
                          <p className="text-[11px] text-gray-400">
                            {inv.dormantAt ? new Date(inv.dormantAt).toLocaleString() : ""}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-gray-800 max-w-xs">
                          <p className="bg-amber-50 p-2 rounded-lg border border-amber-200/80 text-amber-950 font-medium">
                            "{inv.dormantReason}"
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={
                              inv.dormantStatus === "VERIFIED_VOID"
                                ? "danger"
                                : inv.dormantStatus === "REINSTATED"
                                ? "success"
                                : "warning"
                            }
                            dot
                          >
                            {inv.dormantStatus || "PENDING AUDIT"}
                          </Badge>
                          {inv.verifiedBy && (
                            <p className="text-[10px] text-gray-500 mt-1">
                              By: {inv.verifiedBy}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                          {isSuperAdmin ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenVerifyModal(inv, "REINSTATE")}
                                className="text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                                icon={<RotateCcw className="w-3.5 h-3.5 text-emerald-600" />}
                              >
                                Reinstate
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleOpenVerifyModal(inv, "APPROVE_VOID")}
                                icon={<ShieldCheck className="w-3.5 h-3.5" />}
                              >
                                Verify Void
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400 italic">
                              Super Admin Audit Required
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: MARK BILL AS DORMANT (Manager Anti-Fraud Void)          */}
      {/* ============================================================== */}
      {isDormantModalOpen && dormantInvoice && (
        <Modal
          isOpen={isDormantModalOpen}
          onClose={() => setIsDormantModalOpen(false)}
          title={
            <div className="flex items-center gap-2 text-amber-900 font-bold">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <span>Mark Bill #{dormantInvoice.invoiceNumber} as Dormant</span>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
              <p className="font-bold">Anti-Fraud Notice for Managers & Cashiers:</p>
              <p className="mt-0.5">
                Bills cannot be hard-deleted. Marking this bill dormant immediately zeroes its contribution from physical day shift drawer totals and flags it on the Super Admin audit desk.
              </p>
            </div>

            {dormantModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{dormantModalError}</span>
              </div>
            )}

            <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1">
              <div className="flex justify-between text-gray-600">
                <span>Invoice Total:</span>
                <span className="font-bold text-gray-900">{currSym}{Number(dormantInvoice.total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Outlet:</span>
                <span className="font-semibold text-gray-900">{dormantInvoice.franchise?.name || "Main Outlet"}</span>
              </div>
            </div>

            <Select
              label="Mandatory Reason for Voiding / Dormant Status *"
              value={dormantReason}
              onChange={(e) => setDormantReason(e.target.value)}
              options={[
                { value: "Accidental duplicate punch / item error", label: "Accidental duplicate punch / item error" },
                { value: "Customer walked out / refused food", label: "Customer walked out / refused food" },
                { value: "Wrong table / party billing mixup", label: "Wrong table / party billing mixup" },
                { value: "Order cancelled prior to kitchen preparation", label: "Order cancelled prior to kitchen preparation" },
                { value: "Payment failed / card dispute", label: "Payment failed / card dispute" },
                { value: "Manager administrative correction", label: "Manager administrative correction" },
              ]}
            />

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Additional Operational Notes / Explanation
              </label>
              <textarea
                rows={3}
                value={dormantNotes}
                onChange={(e) => setDormantNotes(e.target.value)}
                placeholder="Explain the circumstance of the void for the Super Admin audit..."
                className="w-full text-xs bg-white border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="ghost" onClick={() => setIsDormantModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={markDormantMutation.isPending || !dormantReason}
                onClick={() => markDormantMutation.mutate()}
                icon={<ShieldAlert className="w-4 h-4" />}
              >
                {markDormantMutation.isPending ? "Flagging Dormant..." : "Confirm Dormant Status"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* MODAL: SUPER ADMIN VERIFY / REINSTATE DORMANT BILL             */}
      {/* ============================================================== */}
      {isVerifyModalOpen && verifyInvoice && (
        <Modal
          isOpen={isVerifyModalOpen}
          onClose={() => setIsVerifyModalOpen(false)}
          title={
            <div className="flex items-center gap-2 text-indigo-950 font-bold">
              {verifyAction === "REINSTATE" ? (
                <>
                  <RotateCcw className="w-5 h-5 text-emerald-600" />
                  <span>Reinstate Bill #{verifyInvoice.invoiceNumber} to Active</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 text-rose-600" />
                  <span>Approve & Verify Void for #{verifyInvoice.invoiceNumber}</span>
                </>
              )}
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Bill Value:</span>
                <span className="font-bold text-gray-900">{currSym}{Number(verifyInvoice.total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Flagged By:</span>
                <span className="font-semibold text-gray-900">{verifyInvoice.dormantBy || "Staff"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Reason Given:</span>
                <span className="font-medium text-amber-900">"{verifyInvoice.dormantReason}"</span>
              </div>
            </div>

            {verifyError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{verifyError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Super Admin Audit Review Remarks
              </label>
              <textarea
                rows={3}
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                placeholder="Enter audit decision remarks for compliance log..."
                className="w-full text-xs bg-white border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="ghost" onClick={() => setIsVerifyModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={verifyAction === "REINSTATE" ? "primary" : "danger"}
                disabled={verifyDormantMutation.isPending}
                onClick={() => verifyDormantMutation.mutate()}
                icon={verifyAction === "REINSTATE" ? <RotateCcw className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
              >
                {verifyDormantMutation.isPending
                  ? "Processing..."
                  : verifyAction === "REINSTATE"
                  ? "Confirm Reinstatement"
                  : "Approve Permanent Void"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* MODAL: COLLECT PAYMENT                                         */}
      {/* ============================================================== */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Collect Payment - ${paymentInvoice?.invoiceNumber}`}
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
              {formError}
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center text-sm">
            <div>
              <p className="text-gray-500 text-xs">Total Bill Amount</p>
              <p className="text-lg font-bold text-gray-900">
                {currSym}{Number(paymentInvoice?.total || 0).toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-xs">Remaining Balance</p>
              <p className="text-lg font-bold text-rose-600">
                {currSym}
                {Number(
                  paymentInvoice?.remainingBalance ?? paymentInvoice?.total ?? 0
                ).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsSplitMode(false)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                !isSplitMode
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              Single Payment
            </button>
            <button
              type="button"
              onClick={() => setIsSplitMode(true)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                isSplitMode
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              Split / Multi-Tender
            </button>
          </div>

          {!isSplitMode ? (
            <div className="space-y-3 pt-2">
              <Select
                label="Payment Method"
                value={singleMethod}
                onChange={(e) => setSingleMethod(e.target.value as PaymentMethod)}
                options={[
                  { value: "CASH", label: "💵 Cash" },
                  { value: "UPI", label: "📱 UPI / QR" },
                  { value: "CARD", label: "💳 Debit / Credit Card" },
                  { value: "OTHER", label: "🔹 Other" },
                ]}
              />

              <Input
                label="Amount"
                type="number"
                min="0.01"
                step="0.01"
                value={singleAmount}
                onChange={(e) => setSingleAmount(parseFloat(e.target.value) || 0)}
              />

              {singleMethod !== "CASH" && (
                <Input
                  label="Transaction / Reference ID (Optional)"
                  placeholder="e.g. UPI Ref / Card Last 4 digits"
                  value={singleTxnId}
                  onChange={(e) => setSingleTxnId(e.target.value)}
                />
              )}
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-medium text-gray-500">Enter tender breakdown:</p>
              {splits.map((split, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <div className="w-1/3">
                    <Select
                      options={[
                        { value: "CASH", label: "Cash" },
                        { value: "UPI", label: "UPI" },
                        { value: "CARD", label: "Card" },
                        { value: "OTHER", label: "Other" },
                      ]}
                      value={split.method}
                      onChange={(e) => {
                        const newSplits = [...splits];
                        newSplits[idx].method = e.target.value as PaymentMethod;
                        setSplits(newSplits);
                      }}
                    />
                  </div>
                  <div className="w-1/3">
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={split.amount || ""}
                      onChange={(e) => {
                        const newSplits = [...splits];
                        newSplits[idx].amount = parseFloat(e.target.value) || 0;
                        setSplits(newSplits);
                      }}
                    />
                  </div>
                  <div className="w-1/3">
                    <Input
                      placeholder="Txn ID (opt)"
                      value={split.transactionId}
                      onChange={(e) => {
                        const newSplits = [...splits];
                        newSplits[idx].transactionId = e.target.value;
                        setSplits(newSplits);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={payMutation.isPending}
              onClick={() => payMutation.mutate()}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              {payMutation.isPending ? "Processing..." : "Complete Payment"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: PRINT THERMAL RECEIPT PREVIEW                           */}
      {/* ============================================================== */}
      <Modal
        isOpen={!!printPayload}
        onClose={() => setPrintPayload(null)}
        title="Thermal Receipt Output"
      >
        <div className="space-y-4">
          <div className="bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-xs whitespace-pre overflow-x-auto max-h-96">
            {printPayload}
          </div>
          <div className="flex justify-between items-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const printWindow = window.open("", "_blank");
                if (printWindow) {
                  printWindow.document.write(`<pre style="font-family: monospace; font-size: 12px;">${printPayload}</pre>`);
                  printWindow.document.close();
                  printWindow.print();
                }
              }}
              icon={<Printer className="w-4 h-4" />}
            >
              Direct Print (Browser Spooler)
            </Button>
            <Button variant="primary" onClick={() => setPrintPayload(null)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: INVOICE DETAILS & BREAKDOWN                             */}
      {/* ============================================================== */}
      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title={`Invoice Breakdown - ${selectedInvoice?.invoiceNumber}`}
      >
        {selectedInvoice && (
          <div className="space-y-4">
            {/* Franchise Outlet Header */}
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-indigo-950 text-sm">
                  <Store className="w-4 h-4 text-indigo-600" />
                  <span>{selectedInvoice.franchise?.name || "Main Outlet"}</span>
                </div>
                <span className="text-[11px] font-mono font-bold bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded">
                  {selectedInvoice.franchise?.code || "BRANCH"}
                </span>
              </div>
              <div className="flex items-start gap-1.5 text-xs text-slate-700 pt-0.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Printed Bill Address:</strong>{" "}
                  {selectedInvoice.franchise?.address || "Central HQ Address"}
                </span>
              </div>
              {selectedInvoice.franchise?.phone && (
                <div className="text-xs text-slate-600 pl-5">
                  Branch Phone: {selectedInvoice.franchise.phone}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl text-sm">
              <div>
                <p className="text-xs text-gray-500">Order ID</p>
                <p className="font-semibold text-gray-900">
                  {selectedInvoice.order?.orderNumber || selectedInvoice.orderId}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                {selectedInvoice.isDormant ? (
                  <Badge variant="warning">
                    DORMANT ({selectedInvoice.dormantStatus || "VOID"})
                  </Badge>
                ) : (
                  <Badge variant={selectedInvoice.isFullyPaid ? "success" : "warning"}>
                    {selectedInvoice.isFullyPaid ? "PAID" : "PARTIAL / UNPAID"}
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Date</p>
                <p className="font-medium text-gray-800">
                  {new Date(selectedInvoice.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="border border-gray-100 rounded-xl overflow-hidden text-sm">
              <div className="bg-gray-50 px-4 py-2 font-medium text-gray-700">Financial Breakdown</div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{currSym}{Number(selectedInvoice.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax (CGST + SGST)</span>
                  <span>{currSym}{Number(selectedInvoice.tax).toFixed(2)}</span>
                </div>
                {Number(selectedInvoice.discount) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span>-{currSym}{Number(selectedInvoice.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-2 text-base">
                  <span>Total Amount</span>
                  <span className="text-emerald-600">
                    {currSym}{Number(selectedInvoice.total).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 pt-1">
                  <span>Paid Amount</span>
                  <span>{currSym}{Number(selectedInvoice.totalPaid || 0).toFixed(2)}</span>
                </div>
                {(selectedInvoice.remainingBalance || 0) > 0 && (
                  <div className="flex justify-between text-xs text-rose-500 font-semibold pt-1">
                    <span>Remaining Balance</span>
                    <span>{currSym}{Number(selectedInvoice.remainingBalance).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => printMutation.mutate(selectedInvoice)}
                icon={<Printer className="w-3.5 h-3.5" />}
              >
                Print Receipt
              </Button>
              <Button variant="ghost" onClick={() => setSelectedInvoice(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
