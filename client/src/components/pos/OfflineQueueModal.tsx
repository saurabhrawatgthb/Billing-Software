import React from "react";
import { Modal } from "../common/Modal.js";
import { Button } from "../common/Button.js";
import { Wifi, WifiOff, RefreshCw, CheckCircle2, Clock } from "lucide-react";
import type { QueuedOfflineOrder } from "../../utils/offlineQueue.js";

interface OfflineQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  isSyncing: boolean;
  queue: QueuedOfflineOrder[];
  onSyncNow: () => void;
}

export const OfflineQueueModal: React.FC<OfflineQueueModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  isSyncing,
  queue,
  onSyncNow,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-emerald-600" />
          ) : (
            <WifiOff className="w-5 h-5 text-amber-600 animate-pulse" />
          )}
          <span className="font-extrabold text-base text-gray-900">
            Offline Billing & Sync Queue ({queue.length})
          </span>
        </div>
      }
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Status banner */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
            isOnline
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isOnline ? (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            )}
            <div>
              <p className="text-xs font-black">
                {isOnline ? "Internet Connected (Online)" : "No Internet Connection (Offline Mode)"}
              </p>
              <p className="text-[11px] opacity-80 mt-0.5">
                {isOnline
                  ? "Pending orders are automatically synced to MongoDB in the background."
                  : "All orders are safely printed and stored in browser memory. Nothing will be lost."}
              </p>
            </div>
          </div>

          {queue.length > 0 && isOnline && (
            <Button
              variant="primary"
              size="sm"
              disabled={isSyncing}
              onClick={onSyncNow}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />}
            >
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>
          )}
        </div>

        {/* Queue Items List */}
        {queue.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-80" />
            <p className="text-sm font-bold text-gray-700">All Bills Synchronized</p>
            <p className="text-xs text-gray-400 mt-0.5">
              There are no pending offline orders. All receipts are safely stored in cloud database.
            </p>
          </div>
        ) : (
          <div className="max-h-[340px] overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
            {queue.map((item) => {
              const timeStr = new Date(item.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={item.id}
                  className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gray-900">
                        {item.displayInvoiceNumber}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-gray-100 text-gray-700">
                        {item.tableName || "Takeaway"}
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                          item.status === "SYNCING"
                            ? "bg-indigo-100 text-indigo-700 animate-pulse"
                            : item.status === "FAILED"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" /> {timeStr}
                      </span>
                      <span>•</span>
                      <span className="truncate max-w-[200px]">{item.itemSummary}</span>
                    </div>

                    {item.lastError && (
                      <p className="text-[10px] text-rose-600 mt-1 font-mono">
                        Error: {item.lastError}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-sm font-black text-gray-900 block">
                      ₹{item.displayTotal.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-gray-400 font-semibold">
                      {item.retryCount > 0 ? `${item.retryCount} retries` : "Queued"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
