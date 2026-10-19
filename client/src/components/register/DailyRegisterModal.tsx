import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Printer,
  X,
} from "lucide-react";
import { api, extractErrorMessage } from "../../services/api.js";
import { useAuthStore } from "../../store/authStore.js";
import { Button } from "../common/Button.js";

interface DailyRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  franchiseId?: string | null;
}

export const DailyRegisterModal: React.FC<DailyRegisterModalProps> = ({
  isOpen,
  onClose,
  franchiseId,
}) => {
  const queryClient = useQueryClient();
  const { user, selectedFranchiseId } = useAuthStore();
  const effectiveFranchiseId = franchiseId || selectedFranchiseId || user?.franchiseId;

  const [openingFloat, setOpeningFloat] = useState<number>(500);
  const [openingNotes, setOpeningNotes] = useState<string>("");
  const [closingCash, setClosingCash] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [zReportData, setZReportData] = useState<any | null>(null);

  // Fetch Current Active Register Session
  const { data: registerData } = useQuery({
    queryKey: ["current-register", effectiveFranchiseId],
    queryFn: async () => {
      if (!effectiveFranchiseId) return null;
      const res = await api.get(`/registers/current?franchiseId=${effectiveFranchiseId}`);
      return res.data.data;
    },
    enabled: isOpen && !!effectiveFranchiseId,
    refetchInterval: isOpen ? 5000 : false,
  });

  // Open Register Mutation
  const openMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/registers/open", {
        franchiseId: effectiveFranchiseId,
        openingFloat: Number(openingFloat),
        notes: openingNotes || undefined,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-register"] });
      setFormError(null);
      setOpeningNotes("");
    },
    onError: (err) => {
      setFormError(extractErrorMessage(err));
    },
  });

  // Close Register Mutation
  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!registerData) throw new Error("No active register session to close");
      const res = await api.post("/registers/close", {
        registerId: registerData.id,
        closingCash: Number(closingCash),
        notes: closingNotes || undefined,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["current-register"] });
      setZReportData(data);
      setFormError(null);
      setClosingNotes("");
    },
    onError: (err) => {
      setFormError(extractErrorMessage(err));
    },
  });

  if (!isOpen) return null;

  const live = registerData?.liveMetrics;
  const isRegisterOpen = registerData && registerData.status === "OPEN";

  const expectedCash = isRegisterOpen ? (live?.expectedCash ?? registerData.openingFloat) : 0;
  const variance = Number(closingCash) - expectedCash;

  const handlePrintZReport = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                isRegisterOpen ? "bg-emerald-600" : "bg-indigo-600"
              }`}
            >
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Daily Register & Cash Drawer</h2>
                <span
                  className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                    isRegisterOpen
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-400/30"
                  }`}
                >
                  {isRegisterOpen ? "Shift / Day Open" : "Day Closed"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {registerData?.franchise?.name
                  ? `${registerData.franchise.name} (${registerData.franchise.code})`
                  : "Track opening float, counted cash, and end-of-day Z-Report"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Z-Report Summary View */}
          {zReportData ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Day Closed & Z-Report Generated Successfully!
                  </span>
                  <button
                    onClick={handlePrintZReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Z-Report</span>
                  </button>
                </div>
                <p className="text-xs text-emerald-800">
                  Daily register for {zReportData.franchise?.name} closed by {user?.name}.
                </p>
              </div>

              {/* Printable Z-Report Receipt Slip */}
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs text-slate-800 space-y-3 shadow-inner">
                <div className="text-center border-b border-dashed border-slate-300 pb-3">
                  <h3 className="font-bold text-base uppercase">DAILY Z-REPORT SUMMARY</h3>
                  <p className="text-[11px] text-slate-500">{zReportData.franchise?.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(zReportData.openedAt).toLocaleString("en-IN")} —{" "}
                    {new Date(zReportData.closedAt).toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3">
                  <div className="flex justify-between">
                    <span>Opening Float:</span>
                    <span className="font-bold">₹{zReportData.openingFloat.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cash Sales:</span>
                    <span className="font-bold">₹{zReportData.cashSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>UPI / QR Sales:</span>
                    <span className="font-bold">₹{zReportData.upiSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Card Sales:</span>
                    <span className="font-bold">₹{zReportData.cardSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Aggregators (Swiggy/Zomato):</span>
                    <span className="font-bold">₹{zReportData.aggregatorSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-200">
                    <span>TOTAL SALES:</span>
                    <span className="text-emerald-700">₹{zReportData.totalSales.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3">
                  <div className="flex justify-between">
                    <span>Orders Settled:</span>
                    <span>{zReportData.totalOrdersCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST Tax Collected:</span>
                    <span>₹{zReportData.totalTaxCollected.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Discounts:</span>
                    <span>₹{zReportData.totalDiscounts.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between">
                    <span>Expected Cash in Drawer:</span>
                    <span className="font-bold">₹{zReportData.expectedCash.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Counted Cash at Close:</span>
                    <span className="font-bold">₹{zReportData.closingCash.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-300">
                    <span>DRAWER VARIANCE:</span>
                    <span
                      className={
                        zReportData.cashDifference === 0
                          ? "text-emerald-600"
                          : zReportData.cashDifference > 0
                          ? "text-amber-600"
                          : "text-rose-600"
                      }
                    >
                      {zReportData.cashDifference === 0
                        ? "₹0.00 (Balanced)"
                        : `${zReportData.cashDifference > 0 ? "+" : ""}₹${zReportData.cashDifference.toFixed(2)} (${
                            zReportData.cashDifference > 0 ? "Surplus" : "Shortage"
                          })`}
                    </span>
                  </div>
                </div>

                <div className="text-center pt-2 text-[10px] text-slate-400">
                  Closed by {user?.name} ({user?.role})
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    setZReportData(null);
                    onClose();
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          ) : isRegisterOpen ? (
            /* ACTIVE OPEN REGISTER VIEW */
            <div className="space-y-5">
              {/* Live Session Overview Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-slate-50 to-indigo-500/10 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                      Active Shift In Progress
                    </span>
                    <p className="text-xs text-gray-600">
                      Opened at {new Date(registerData.openedAt).toLocaleTimeString("en-IN")} by{" "}
                      <strong>{registerData.openedBy?.name}</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500">Starting Float</span>
                    <p className="text-lg font-black text-gray-900">
                      ₹{registerData.openingFloat.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Sales Breakdown Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-100">
                  <div className="bg-white p-2.5 rounded-xl border border-gray-100 text-center shadow-2xs">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Cash Sales</span>
                    <span className="text-sm font-bold text-gray-800">
                      ₹{(live?.cashSales ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-gray-100 text-center shadow-2xs">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">UPI / QR</span>
                    <span className="text-sm font-bold text-indigo-700">
                      ₹{(live?.upiSales ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-gray-100 text-center shadow-2xs">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Card</span>
                    <span className="text-sm font-bold text-purple-700">
                      ₹{(live?.cardSales ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-gray-100 text-center shadow-2xs">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Sales</span>
                    <span className="text-sm font-black text-emerald-700">
                      ₹{(live?.totalSales ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Expected Cash in Hand */}
                <div className="flex items-center justify-between p-3 bg-emerald-600 text-white rounded-xl shadow-xs">
                  <div>
                    <p className="text-xs font-medium text-emerald-100">Expected Cash in Drawer Right Now</p>
                    <p className="text-[11px] text-emerald-200">
                      (Float ₹{registerData.openingFloat} + Cash Sales ₹{(live?.cashSales ?? 0).toFixed(2)})
                    </p>
                  </div>
                  <span className="text-xl font-black tracking-tight">₹{expectedCash.toFixed(2)}</span>
                </div>
              </div>

              {/* Closing Form */}
              <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Close Restaurant & Cash Drawer</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Count all physical cash and coins in the drawer and enter below to reconcile.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Actual Counted Cash in Drawer (₹) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={closingCash}
                      onChange={(e) => setClosingCash(Number(e.target.value))}
                      placeholder="e.g. 4500"
                      className="w-full text-base font-bold px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  {/* Discrepancy Alert */}
                  {closingCash > 0 && (
                    <div
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                        variance === 0
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                          : variance > 0
                          ? "bg-amber-50 border-amber-300 text-amber-800"
                          : "bg-rose-50 border-rose-300 text-rose-800"
                      }`}
                    >
                      <span>Drawer Discrepancy Status:</span>
                      <span>
                        {variance === 0
                          ? "✓ Perfectly Balanced"
                          : `${variance > 0 ? "Surplus (Extra)" : "Shortage (Missing)"}: ₹${Math.abs(
                              variance
                            ).toFixed(2)}`}
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Closing Shift Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={closingNotes}
                      onChange={(e) => setClosingNotes(e.target.value)}
                      placeholder="e.g. Handed over cash to bank drop / evening cashier..."
                      className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <Button
                    variant="danger"
                    className="w-full"
                    onClick={() => closeMutation.mutate()}
                    isLoading={closeMutation.isPending}
                    icon={<Clock className="w-4 h-4" />}
                  >
                    {closeMutation.isPending ? "Reconciling..." : "Close Register & Print Z-Report"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* OPEN REGISTER / MORNING START FORM */
            <div className="space-y-5">
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-950 space-y-1">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Morning Register Opening / Restaurant Start
                </h4>
                <p className="text-xs text-indigo-700">
                  Open the restaurant session by recording your morning cash float (petty cash in drawer
                  for giving change to customers).
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Opening Cash Float (₹) *
                  </label>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(Number(e.target.value))}
                    placeholder="e.g. 1000"
                    className="w-full text-base font-bold px-3 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Enter petty cash kept in the register drawer at start of business.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Opening Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={openingNotes}
                    onChange={(e) => setOpeningNotes(e.target.value)}
                    placeholder="e.g. Morning opening shift by Cashier Shubh..."
                    className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <Button variant="outline" size="sm" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openMutation.mutate()}
                    isLoading={openMutation.isPending}
                    icon={<Clock className="w-4 h-4" />}
                  >
                    {openMutation.isPending ? "Opening..." : "Open Daily Register"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
