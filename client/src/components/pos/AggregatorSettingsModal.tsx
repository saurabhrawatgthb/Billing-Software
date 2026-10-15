import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  Copy,
  Send,
  X,
} from "lucide-react";
import { api, extractErrorMessage } from "../../services/api.js";
import type { AggregatorIntegration } from "../../types/index.js";
import { Button } from "../common/Button.js";
import { Input } from "../common/Input.js";
import { Badge } from "../common/Badge.js";

interface FormState {
  platform: "SWIGGY" | "ZOMATO";
  isEnabled: boolean;
  restaurantId?: string | null;
  apiKey?: string | null;
  autoAccept: boolean;
  prepTimeMinutes: number;
}

interface AggregatorSettingsModalProps {
  franchiseId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSimulateOrder?: (platform: "SWIGGY" | "ZOMATO") => void;
}

export const AggregatorSettingsModal: React.FC<AggregatorSettingsModalProps> = ({
  franchiseId,
  isOpen,
  onClose,
  onSimulateOrder,
}) => {
  const queryClient = useQueryClient();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch aggregator settings for this franchise
  const { data: integrations = [] } = useQuery<AggregatorIntegration[]>({
    queryKey: ["aggregator-settings", franchiseId],
    queryFn: async () => {
      if (!franchiseId) return [];
      const res = await api.get(`/aggregators/settings?franchiseId=${franchiseId}`);
      return res.data.data;
    },
    enabled: isOpen && !!franchiseId,
  });

  const [swiggyForm, setSwiggyForm] = useState<FormState>({
    platform: "SWIGGY",
    isEnabled: false,
    restaurantId: "",
    apiKey: "",
    autoAccept: false,
    prepTimeMinutes: 15,
  });

  const [zomatoForm, setZomatoForm] = useState<FormState>({
    platform: "ZOMATO",
    isEnabled: false,
    restaurantId: "",
    apiKey: "",
    autoAccept: false,
    prepTimeMinutes: 15,
  });

  React.useEffect(() => {
    if (integrations.length > 0) {
      const s = integrations.find((i) => i.platform === "SWIGGY");
      if (s) setSwiggyForm(s);
      const z = integrations.find((i) => i.platform === "ZOMATO");
      if (z) setZomatoForm(z);
    }
  }, [integrations]);

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      platform: "SWIGGY" | "ZOMATO";
      isEnabled: boolean;
      restaurantId?: string;
      autoAccept?: boolean;
      prepTimeMinutes?: number;
    }) => {
      const res = await api.put("/aggregators/settings", {
        ...payload,
        franchiseId,
      });
      return res.data.data;
    },
    onSuccess: (data: AggregatorIntegration) => {
      queryClient.invalidateQueries({ queryKey: ["aggregator-settings"] });
      setSuccessMsg(`${data.platform} settings updated successfully!`);
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err) => {
      setErrorMsg(extractErrorMessage(err));
    },
  });

  const handleCopy = (text: string, id: string) => {
    const fullUrl = text.startsWith("http")
      ? text
      : `${window.location.protocol}//${window.location.host}${text}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
              <Globe className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                Swiggy & Zomato Aggregator Integrations
              </h2>
              <p className="text-xs text-slate-400">
                Direct Cloud POS bridge, automated webhooks, live order popups, and kitchen routing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Body Tabs / Platforms */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Swiggy Card */}
          <div className="rounded-2xl border-2 border-orange-200 bg-orange-50/20 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FC8019] text-white flex items-center justify-center font-black text-lg shadow-sm">
                  S
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-base">Swiggy Merchant Partner</h3>
                  <p className="text-xs text-gray-500">Live order webhook & auto-punch into kitchen</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant={swiggyForm.isEnabled ? "success" : "gray"}>
                  {swiggyForm.isEnabled ? "CONNECTED" : "DISABLED"}
                </Badge>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={swiggyForm.isEnabled}
                    onChange={(e) => {
                      const next = { ...swiggyForm, isEnabled: e.target.checked };
                      setSwiggyForm(next);
                      updateMutation.mutate({
                        platform: "SWIGGY",
                        isEnabled: next.isEnabled,
                        restaurantId: next.restaurantId || undefined,
                        autoAccept: next.autoAccept,
                        prepTimeMinutes: next.prepTimeMinutes,
                      });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FC8019]"></div>
                </label>
              </div>
            </div>

            {/* Inputs & Config */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <Input
                label="Swiggy Outlet / Store ID"
                placeholder="e.g. SWIGGY_DEL_94821"
                value={swiggyForm.restaurantId || ""}
                onChange={(e) => setSwiggyForm({ ...swiggyForm, restaurantId: e.target.value })}
                helperText="Found in your Swiggy Partner Portal outlet settings"
              />

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Webhook URL (Paste in Swiggy Partner)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    readOnly
                    value={`${window.location.origin}/api/aggregators/webhook/SWIGGY/${franchiseId}`}
                    className="w-full text-xs font-mono bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-gray-700"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        `/api/aggregators/webhook/SWIGGY/${franchiseId}`,
                        "swiggy_url"
                      )
                    }
                    className="px-2.5 py-2 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs font-bold cursor-pointer transition-colors shrink-0 flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedKey === "swiggy_url" ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Auto Accept & Quick Test Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-orange-100">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-800">
                <input
                  type="checkbox"
                  checked={swiggyForm.autoAccept}
                  onChange={(e) => {
                    const next = { ...swiggyForm, autoAccept: e.target.checked };
                    setSwiggyForm(next);
                  }}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                <span>Auto-Accept Swiggy Orders (Skip manual cashier approval)</span>
              </label>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    updateMutation.mutate({
                      platform: "SWIGGY",
                      isEnabled: swiggyForm.isEnabled,
                      restaurantId: swiggyForm.restaurantId || undefined,
                      autoAccept: swiggyForm.autoAccept,
                      prepTimeMinutes: swiggyForm.prepTimeMinutes,
                    })
                  }
                  disabled={updateMutation.isPending}
                >
                  Save Swiggy
                </Button>
                {onSimulateOrder && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onSimulateOrder("SWIGGY")}
                    icon={<Send className="w-3.5 h-3.5 text-[#FC8019]" />}
                  >
                    Simulate Test Swiggy Order
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Zomato Card */}
          <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/20 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E23744] text-white flex items-center justify-center font-black text-lg shadow-sm">
                  Z
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-base">Zomato Merchant Partner</h3>
                  <p className="text-xs text-gray-500">Live order webhook & auto-punch into kitchen</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant={zomatoForm.isEnabled ? "success" : "gray"}>
                  {zomatoForm.isEnabled ? "CONNECTED" : "DISABLED"}
                </Badge>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={zomatoForm.isEnabled}
                    onChange={(e) => {
                      const next = { ...zomatoForm, isEnabled: e.target.checked };
                      setZomatoForm(next);
                      updateMutation.mutate({
                        platform: "ZOMATO",
                        isEnabled: next.isEnabled,
                        restaurantId: next.restaurantId || undefined,
                        autoAccept: next.autoAccept,
                        prepTimeMinutes: next.prepTimeMinutes,
                      });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E23744]"></div>
                </label>
              </div>
            </div>

            {/* Inputs & Config */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <Input
                label="Zomato ResID / Outlet ID"
                placeholder="e.g. 18928420"
                value={zomatoForm.restaurantId || ""}
                onChange={(e) => setZomatoForm({ ...zomatoForm, restaurantId: e.target.value })}
                helperText="Found in Zomato Merchant app under Outlet Details"
              />

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Webhook URL (Paste in Zomato Merchant Portal)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    readOnly
                    value={`${window.location.origin}/api/aggregators/webhook/ZOMATO/${franchiseId}`}
                    className="w-full text-xs font-mono bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-gray-700"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        `/api/aggregators/webhook/ZOMATO/${franchiseId}`,
                        "zomato_url"
                      )
                    }
                    className="px-2.5 py-2 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold cursor-pointer transition-colors shrink-0 flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedKey === "zomato_url" ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Auto Accept & Quick Test Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-rose-100">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-800">
                <input
                  type="checkbox"
                  checked={zomatoForm.autoAccept}
                  onChange={(e) => {
                    const next = { ...zomatoForm, autoAccept: e.target.checked };
                    setZomatoForm(next);
                  }}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>Auto-Accept Zomato Orders (Skip manual cashier approval)</span>
              </label>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    updateMutation.mutate({
                      platform: "ZOMATO",
                      isEnabled: zomatoForm.isEnabled,
                      restaurantId: zomatoForm.restaurantId || undefined,
                      autoAccept: zomatoForm.autoAccept,
                      prepTimeMinutes: zomatoForm.prepTimeMinutes,
                    })
                  }
                  disabled={updateMutation.isPending}
                >
                  Save Zomato
                </Button>
                {onSimulateOrder && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onSimulateOrder("ZOMATO")}
                    icon={<Send className="w-3.5 h-3.5 text-[#E23744]" />}
                  >
                    Simulate Test Zomato Order
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
