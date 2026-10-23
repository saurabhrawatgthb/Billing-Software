import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChefHat, Clock, CheckCircle2, Flame, RefreshCw, Volume2, VolumeX, Bell, AlertTriangle } from "lucide-react";
import { api } from "../../services/api.js";
import { getSocket } from "../../services/socket.js";
import { useAuthStore } from "../../store/authStore.js";
import type { KOT, KOTStatus, PreparationStation } from "../../types/index.js";
import { Button } from "../../components/common/Button.js";
import { LoadingState } from "../../components/common/LoadingState.js";
import { EmptyState } from "../../components/common/EmptyState.js";
import { KitchenPrepModal } from "../../components/kitchen/KitchenPrepModal.js";

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext() {
  try {
    if (!sharedAudioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        sharedAudioCtx = new AudioContextClass();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function playNotificationSound(type: "normal" | "urgent" = "normal") {
  try {
    const audioCtx = getAudioContext();
    if (!audioCtx) return;

    if (type === "urgent") {
      [0, 0.16, 0.32].forEach((delay) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + delay);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.13);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + 0.13);
      });
    } else {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    }
  } catch {
    // Ignore audio permission restrictions
  }
}

export const KitchenPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { selectedFranchiseId } = useAuthStore();

  const [selectedStation, setSelectedStation] = useState<string>("");
  const [viewMode, setViewMode] = useState<"ACTIVE" | "READY" | "ALL">("ACTIVE");
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(() => {
    return typeof window !== "undefined" && localStorage.getItem("kds_audio_enabled") === "true";
  });
  const [lastChimeStatus, setLastChimeStatus] = useState<string | null>(null);
  const [isPrepModalOpen, setIsPrepModalOpen] = useState(false);

  // Fetch Preparation Stations
  const { data: stations = [] } = useQuery<PreparationStation[]>({
    queryKey: ["stations", selectedFranchiseId],
    queryFn: async () => {
      const res = await api.get("/menu/stations");
      return res.data.data;
    },
  });

  // Fetch KOTs
  const { data: kots = [], isLoading, isFetching, refetch } = useQuery<KOT[]>({
    queryKey: ["kots", selectedFranchiseId, selectedStation],
    queryFn: async () => {
      const url = selectedStation ? `/kot?stationId=${selectedStation}` : "/kot";
      const res = await api.get(url);
      return res.data.data;
    },
  });

  // Socket.IO event listeners for live kitchen updates
  useEffect(() => {
    const socket = getSocket();

    const handleNewKOT = () => {
      playNotificationSound();
      queryClient.invalidateQueries({ queryKey: ["kots"] });
    };

    const handleStatusChange = () => {
      queryClient.invalidateQueries({ queryKey: ["kots"] });
    };

    socket.on("kot:new", handleNewKOT);
    socket.on("kot:status_changed", handleStatusChange);

    return () => {
      socket.off("kot:new", handleNewKOT);
      socket.off("kot:status_changed", handleStatusChange);
    };
  }, [queryClient]);

  // Update KOT Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: KOTStatus }) => {
      return api.patch(`/kot/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kots"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  // Filter KOTs
  const filteredKOTs = kots.filter((kot) => {
    if (viewMode === "ACTIVE") {
      return ["CREATED", "PRINTED", "ACCEPTED", "PREPARING"].includes(kot.status);
    }
    if (viewMode === "READY") {
      return kot.status === "READY";
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <ChefHat className="w-7 h-7 text-indigo-600" />
            Kitchen Display System (KDS)
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Live digital order routing, station tickets, preparation timers, and ready alerts
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Audio Chime Controls */}
          {audioUnlocked ? (
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl shadow-2xs">
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <Volume2 className="w-4 h-4 text-emerald-600" />
                Audio Alerts Active
              </span>
              <button
                type="button"
                onClick={() => {
                  playNotificationSound("normal");
                  setLastChimeStatus("Chimed!");
                  setTimeout(() => setLastChimeStatus(null), 2500);
                }}
                className="text-[11px] font-bold px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors cursor-pointer flex items-center gap-1 ml-1"
                title="Test audio chime"
              >
                <Bell className="w-3 h-3" /> Test
              </button>
              {lastChimeStatus && (
                <span className="text-[10px] font-bold text-emerald-700 animate-pulse ml-0.5">
                  ({lastChimeStatus})
                </span>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                getAudioContext();
                playNotificationSound("normal");
                setAudioUnlocked(true);
                localStorage.setItem("kds_audio_enabled", "true");
                setLastChimeStatus("Audio alerts enabled!");
                setTimeout(() => setLastChimeStatus(null), 2500);
              }}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer animate-pulse"
            >
              <VolumeX className="w-4 h-4" />
              Enable Kitchen Sound Alerts
            </button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPrepModalOpen(true)}
            icon={<ChefHat className="w-3.5 h-3.5 text-amber-600" />}
          >
            Prep Estimator
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={async () => {
              await queryClient.invalidateQueries({ queryKey: ["kots"] });
              refetch();
            }}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />}
          >
            {isFetching ? "Refreshing KDS..." : "Refresh KDS"}
          </Button>
        </div>
      </div>

      {/* Station & Status Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
        {/* Station Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-none">
          <button
            onClick={() => setSelectedStation("")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              selectedStation === ""
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All Stations
          </button>
          {stations.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStation(s.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedStation === s.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* View Mode Pills */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode("ACTIVE")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "ACTIVE" ? "bg-white text-indigo-600 shadow-xs" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            🔥 Active Cooking
          </button>
          <button
            onClick={() => setViewMode("READY")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "READY" ? "bg-white text-emerald-600 shadow-xs" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            ✅ Ready to Serve
          </button>
          <button
            onClick={() => setViewMode("ALL")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "ALL" ? "bg-white text-slate-800 shadow-xs" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            All Tickets
          </button>
        </div>
      </div>

      {/* KOT Tickets Grid */}
      {isLoading ? (
        <LoadingState message="Connecting to Kitchen Station Stream..." />
      ) : filteredKOTs.length === 0 ? (
        <EmptyState
          title="No Kitchen Tickets in Queue"
          description="All caught up! New orders placed from POS terminals will instantly pop up here."
          icon={<ChefHat className="w-12 h-12" />}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredKOTs.map((kot) => {
            const tableStr = kot.order?.tableSession?.table
              ? `Table ${kot.order.tableSession.table.tableNumber}`
              : "Takeaway";
            const stationName = kot.station?.name || "Main Kitchen";
            const isCreated = kot.status === "CREATED" || kot.status === "PRINTED";
            const isPreparing = kot.status === "PREPARING" || kot.status === "ACCEPTED";
            const isReady = kot.status === "READY";
            const elapsedMinutes = Math.floor(
              (new Date().getTime() - new Date(kot.createdAt).getTime()) / 60000
            );
            const isOverdue = !isReady && elapsedMinutes >= 15;
            const isDelayed = !isReady && elapsedMinutes >= 8 && elapsedMinutes < 15;

            return (
              <div
                key={kot.id}
                className={`rounded-2xl border-2 overflow-hidden shadow-sm flex flex-col justify-between transition-all ${
                  isReady
                    ? "bg-emerald-50/50 border-emerald-400"
                    : isOverdue
                    ? "bg-rose-50/80 border-rose-600 ring-2 ring-rose-500/50 shadow-md animate-pulse"
                    : isPreparing
                    ? "bg-amber-50/30 border-amber-400"
                    : isDelayed
                    ? "bg-amber-50/60 border-amber-500"
                    : "bg-white border-indigo-400 animate-pulse"
                }`}
              >
                <div>
                  {/* Ticket Header */}
                  <div className={`p-3.5 text-white flex items-center justify-between ${
                    isOverdue ? "bg-rose-950" : "bg-slate-900"
                  }`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400 block">
                          {kot.kotNumber}
                        </span>
                        {isOverdue && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-600 text-white uppercase tracking-wider flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> OVERDUE
                          </span>
                        )}
                      </div>
                      <h3 className="font-black text-base text-white tracking-tight">{tableStr}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-indigo-300 block uppercase">
                        {stationName}
                      </span>
                      <span className={`text-xs flex items-center gap-1 font-mono justify-end font-bold ${
                        isOverdue ? "text-rose-400" : isDelayed ? "text-amber-400" : "text-slate-300"
                      }`}>
                        <Clock className="w-3 h-3 text-amber-400" />
                        {elapsedMinutes}m ago
                      </span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-4 space-y-2.5">
                    {kot.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 bg-white rounded-xl border border-gray-100 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base font-black text-gray-900">
                            {item.quantity}×
                          </span>
                          <span className="text-sm font-bold text-gray-800 flex-1 ml-2.5">
                            {item.menuItem?.name}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-1.5 rounded-md mt-1.5">
                            ⚠️ Note: {item.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-3.5 bg-gray-50 border-t border-gray-100">
                  {isCreated && (
                    <Button
                      variant="primary"
                      className="w-full font-bold"
                      onClick={() =>
                        updateStatusMutation.mutate({ id: kot.id, status: "PREPARING" })
                      }
                      isLoading={updateStatusMutation.isPending}
                      icon={<Flame className="w-4 h-4 text-amber-300" />}
                    >
                      Start Cooking
                    </Button>
                  )}

                  {isPreparing && (
                    <Button
                      variant="success"
                      className="w-full font-bold"
                      onClick={() =>
                        updateStatusMutation.mutate({ id: kot.id, status: "READY" })
                      }
                      isLoading={updateStatusMutation.isPending}
                      icon={<CheckCircle2 className="w-4 h-4" />}
                    >
                      Mark Ready (Ding!)
                    </Button>
                  )}

                  {isReady && (
                    <Button
                      variant="secondary"
                      className="w-full font-bold"
                      onClick={() =>
                        updateStatusMutation.mutate({ id: kot.id, status: "SERVED" })
                      }
                      isLoading={updateStatusMutation.isPending}
                    >
                      Mark Dispatched / Served
                    </Button>
                  )}

                  {kot.status === "SERVED" && (
                    <div className="text-center text-xs font-bold text-emerald-600 py-1 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Served to Guest
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Daily Kitchen Prep & Batter Forecaster Modal */}
      <KitchenPrepModal
        isOpen={isPrepModalOpen}
        onClose={() => setIsPrepModalOpen(false)}
      />
    </div>
  );
};
