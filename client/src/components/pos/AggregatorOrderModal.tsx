import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  MapPin,
  Phone,
  User,
  Bike,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UtensilsCrossed,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";
import { api, extractErrorMessage } from "../../services/api.js";
import { getSocket } from "../../services/socket.js";
import type { Order } from "../../types/index.js";
import { Button } from "../common/Button.js";

// Multi-tone chime for incoming online aggregator orders
function playAggregatorChime() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playNote = (freq: number, delay: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
      gain.gain.setValueAtTime(0.35, audioCtx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + delay);
      osc.stop(audioCtx.currentTime + delay + duration);
    };

    // Upbeat attention-grabbing chime
    playNote(523.25, 0, 0.2);     // C5
    playNote(659.25, 0.15, 0.2);  // E5
    playNote(783.99, 0.3, 0.25);  // G5
    playNote(1046.5, 0.45, 0.4);  // C6
  } catch {
    // Browser audio permissions
  }
}

interface AggregatorOrderModalProps {
  franchiseId: string | null;
  isOpen: boolean;
  onClose: () => void;
  activeOrder?: Order | null;
}

export const AggregatorOrderModal: React.FC<AggregatorOrderModalProps> = ({
  franchiseId,
  isOpen,
  onClose,
  activeOrder: externalActiveOrder,
}) => {
  const queryClient = useQueryClient();
  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(15);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("Kitchen overloaded / High prep backlog");
  const [audioMuted, setAudioMuted] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const audioIntervalRef = useRef<any>(null);

  // Fetch pending aggregator orders
  const { data: pendingOrders = [] } = useQuery<Order[]>({
    queryKey: ["aggregator-pending", franchiseId],
    queryFn: async () => {
      if (!franchiseId) return [];
      const res = await api.get(`/aggregators/pending?franchiseId=${franchiseId}`);
      return res.data.data;
    },
    enabled: !!franchiseId,
    refetchInterval: 6000,
  });

  // Listen for real-time socket events
  useEffect(() => {
    const socket = getSocket();

    const handleNewOrder = (_order: Order) => {
      queryClient.invalidateQueries({ queryKey: ["aggregator-pending"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (!audioMuted) {
        playAggregatorChime();
      }
    };

    const handleOrderUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["aggregator-pending"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    };

    socket.on("aggregator:new_order", handleNewOrder);
    socket.on("aggregator:order_accepted", handleOrderUpdate);
    socket.on("aggregator:order_rejected", handleOrderUpdate);

    return () => {
      socket.off("aggregator:new_order", handleNewOrder);
      socket.off("aggregator:order_accepted", handleOrderUpdate);
      socket.off("aggregator:order_rejected", handleOrderUpdate);
    };
  }, [queryClient, audioMuted]);

  // Repeated chime if pending orders exist
  useEffect(() => {
    if (pendingOrders.length > 0 && isOpen && !audioMuted) {
      playAggregatorChime();
      audioIntervalRef.current = setInterval(() => {
        playAggregatorChime();
      }, 10000);
    }
    return () => {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
      }
    };
  }, [pendingOrders.length, isOpen, audioMuted]);

  const currentOrder = externalActiveOrder || pendingOrders[selectedOrderIndex] || null;

  // Accept mutation
  const acceptMutation = useMutation({
    mutationFn: async ({ orderId, prepTime }: { orderId: string; prepTime: number }) => {
      const res = await api.post(`/aggregators/orders/${orderId}/accept`, {
        franchiseId,
        prepTimeMinutes: prepTime,
      });
      return res.data.data;
    },
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ["aggregator-pending"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["kots"] });
      if (pendingOrders.length <= 1) {
        onClose();
      } else {
        setSelectedOrderIndex(0);
      }
    },
    onError: (err) => {
      setActionError(extractErrorMessage(err));
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const res = await api.post(`/aggregators/orders/${orderId}/reject`, {
        franchiseId,
        reason,
      });
      return res.data.data;
    },
    onSuccess: () => {
      setActionError(null);
      setIsRejecting(false);
      queryClient.invalidateQueries({ queryKey: ["aggregator-pending"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (pendingOrders.length <= 1) {
        onClose();
      } else {
        setSelectedOrderIndex(0);
      }
    },
    onError: (err) => {
      setActionError(extractErrorMessage(err));
    },
  });

  if (!isOpen && pendingOrders.length === 0) return null;
  if (!isOpen) return null;

  if (!currentOrder) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl border border-gray-100">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900">All Online Orders Handled!</h3>
          <p className="text-sm text-gray-500 mt-1 mb-5">
            No incoming orders waiting from Swiggy or Zomato right now.
          </p>
          <Button variant="primary" onClick={onClose} className="w-full">
            Return to POS
          </Button>
        </div>
      </div>
    );
  }

  const isSwiggy = currentOrder.orderSource === "SWIGGY";
  const platformName = isSwiggy ? "Swiggy" : "Zomato";
  const brandColor = isSwiggy ? "bg-[#FC8019]" : "bg-[#E23744]";
  const brandTextColor = isSwiggy ? "text-[#FC8019]" : "text-[#E23744]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[92vh]">
        {/* Header with High-Impact Platform Branding */}
        <div className={`${brandColor} text-white p-5 flex items-center justify-between shrink-0 shadow-sm relative overflow-hidden`}>
          {/* Subtle background glow */}
          <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center gap-3 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl shadow-inner border border-white/30">
              {isSwiggy ? "S" : "Z"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest bg-white/25 px-2 py-0.5 rounded-full">
                  NEW ONLINE ORDER
                </span>
                <span className="text-xs font-mono font-bold bg-black/20 px-2 py-0.5 rounded-full">
                  {currentOrder.aggregatorOrderId || currentOrder.orderNumber}
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight mt-0.5 flex items-center gap-2">
                Incoming {platformName} Order
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            <button
              onClick={() => setAudioMuted(!audioMuted)}
              title={audioMuted ? "Unmute alarm" : "Mute alarm"}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
            >
              {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Multi-Order Queue Tabs (if more than 1 pending) */}
        {pendingOrders.length > 1 && (
          <div className="bg-gray-100 px-5 py-2.5 flex items-center gap-2 border-b border-gray-200 overflow-x-auto shrink-0">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">
              Pending Queue ({pendingOrders.length}):
            </span>
            {pendingOrders.map((ord, idx) => (
              <button
                key={ord.id}
                onClick={() => {
                  setSelectedOrderIndex(idx);
                  setIsRejecting(false);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  idx === selectedOrderIndex
                    ? "bg-gray-900 text-white shadow-xs"
                    : "bg-white text-gray-700 hover:bg-gray-200 border border-gray-300"
                }`}
              >
                <span>{ord.orderSource === "SWIGGY" ? "🟠" : "🔴"}</span>
                <span>{ord.aggregatorOrderId || ord.orderNumber}</span>
                <span className="text-[10px] opacity-80">₹{Number(ord.total).toFixed(0)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Action Error Banner */}
        {actionError && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Customer & Delivery Partner Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Customer Details */}
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>Customer</span>
              </div>
              <p className="font-bold text-sm text-gray-900">
                {currentOrder.customerDeliveryName || "Online Guest"}
              </p>
              <p className="text-xs text-gray-600 flex items-center gap-1">
                <Phone className="w-3 h-3 text-gray-400" />
                <span>{currentOrder.customerDeliveryPhone || "No contact"}</span>
              </p>
              <p className="text-xs text-gray-500 flex items-start gap-1 mt-1">
                <MapPin className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{currentOrder.deliveryAddress || "Home / Work Delivery"}</span>
              </p>
            </div>

            {/* Rider & Delivery Timing */}
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <Bike className="w-3.5 h-3.5 text-emerald-600" />
                <span>Rider Assignment</span>
              </div>
              <p className="font-bold text-sm text-gray-900">
                {currentOrder.riderName || "Delivery Partner Assigning..."}
              </p>
              <p className="text-xs text-gray-600 flex items-center gap-1">
                <Phone className="w-3 h-3 text-gray-400" />
                <span>{currentOrder.riderPhone || "Will arrive at pickup"}</span>
              </p>
              <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200 mt-1 font-semibold">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Ordered: {new Date(currentOrder.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          {/* Ordered Dishes & Items */}
          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-100/80 px-4 py-2.5 flex items-center justify-between border-b border-gray-200">
              <div className="flex items-center gap-2 font-bold text-xs text-gray-700 uppercase tracking-wider">
                <UtensilsCrossed className="w-3.5 h-3.5 text-gray-500" />
                <span>Order Items ({currentOrder.items?.length || 0})</span>
              </div>
              <span className="text-xs font-bold text-gray-500">Amount</span>
            </div>

            <div className="divide-y divide-gray-100 bg-white">
              {currentOrder.items?.map((item) => (
                <div key={item.id} className="p-3.5 flex items-center justify-between hover:bg-gray-50/50">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-700 text-xs font-black flex items-center justify-center border border-indigo-200">
                        {item.quantity}×
                      </span>
                      <span className="font-bold text-sm text-gray-900">
                        {item.menuItem?.name || "Dish Item"}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md inline-block font-medium border border-amber-200/60 mt-1 ml-8">
                        Note: {item.notes}
                      </p>
                    )}
                  </div>
                  <span className="font-bold text-sm text-gray-900">
                    ₹{(Number(item.price ?? item.unitPrice ?? item.menuItem?.price ?? 0) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Bill Summary Footer */}
            <div className="bg-gray-50 p-4 border-t border-gray-200 space-y-1.5 text-xs font-medium text-gray-600">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span>₹{Number(currentOrder.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Restaurant GST / Taxes:</span>
                <span>₹{Number(currentOrder.tax).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-gray-200 text-base font-black text-gray-900">
                <span>Gross Order Value:</span>
                <span className={brandTextColor}>₹{Number(currentOrder.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Rejection Panel (If toggled) */}
          {isRejecting ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-rose-900 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Select Reason for Rejecting {platformName} Order
                </span>
                <button
                  onClick={() => setIsRejecting(false)}
                  className="text-xs text-gray-500 hover:text-gray-800 underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-1.5">
                {[
                  "Kitchen overloaded / High prep backlog",
                  "Items ordered are out of stock",
                  "Outlet closing / End of operational hours",
                  "Customer requested cancellation",
                  "Technical / power outage",
                ].map((reason) => (
                  <label
                    key={reason}
                    className="flex items-center gap-2 p-2 rounded-xl bg-white border border-rose-200 hover:border-rose-400 text-xs text-gray-800 font-medium cursor-pointer transition-colors"
                  >
                    <input
                      type="radio"
                      name="rejectReason"
                      value={reason}
                      checked={rejectReason === reason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsRejecting(false)}>
                  Back
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={rejectMutation.isPending}
                  onClick={() =>
                    rejectMutation.mutate({
                      orderId: currentOrder.id,
                      reason: rejectReason,
                    })
                  }
                  icon={<XCircle className="w-4 h-4" />}
                >
                  {rejectMutation.isPending ? "Rejecting..." : "Confirm Reject Order"}
                </Button>
              </div>
            </div>
          ) : (
            /* Prep Time Selector for Kitchen */
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  Estimated Prep Time for Kitchen
                </span>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  Communicated to {platformName} and assigned delivery rider
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {[10, 15, 20, 30, 45].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setPrepTimeMinutes(mins)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      prepTimeMinutes === mins
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white text-gray-700 border border-indigo-200 hover:bg-indigo-100"
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        {!isRejecting && (
          <div className="p-4 bg-gray-50 border-t border-gray-200 px-6 flex items-center justify-between shrink-0">
            <Button
              variant="outline"
              onClick={() => setIsRejecting(true)}
              className="text-rose-600 hover:bg-rose-50 hover:border-rose-300"
              icon={<XCircle className="w-4 h-4" />}
            >
              Reject Order
            </Button>

            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={onClose}>
                Dismiss Alert
              </Button>
              <Button
                variant="primary"
                size="lg"
                disabled={acceptMutation.isPending}
                onClick={() =>
                  acceptMutation.mutate({
                    orderId: currentOrder.id,
                    prepTime: prepTimeMinutes,
                  })
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-emerald-600/20 px-6 font-bold"
                icon={<CheckCircle2 className="w-5 h-5" />}
              >
                {acceptMutation.isPending
                  ? "Routing to Kitchen..."
                  : `Accept & Send to Kitchen (${prepTimeMinutes}m)`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
