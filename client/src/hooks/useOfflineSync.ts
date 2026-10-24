import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, extractErrorMessage } from "../services/api.js";
import {
  getOfflineQueue,
  dequeueOfflineOrder,
  updateQueueItem,
  saveOnlineHeartbeat,
  verifyOfflineBillingAllowed,
  type QueuedOfflineOrder,
} from "../utils/offlineQueue.js";

export function useOfflineSync() {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });
  const [queue, setQueue] = useState<QueuedOfflineOrder[]>(() => getOfflineQueue());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{
    text: string;
    type: "success" | "warning" | "info";
  } | null>(null);

  const isSyncingRef = useRef(false);

  // Refresh local queue state whenever it changes
  const refreshQueue = useCallback(() => {
    setQueue(getOfflineQueue());
  }, []);

  // Sync all pending offline orders to the server
  const syncQueueNow = useCallback(async (): Promise<{
    synced: number;
    failed: number;
  }> => {
    if (isSyncingRef.current) return { synced: 0, failed: 0 };
    const pendingItems = getOfflineQueue();
    if (pendingItems.length === 0) return { synced: 0, failed: 0 };

    isSyncingRef.current = true;
    setIsSyncing(true);

    let syncedCount = 0;
    let failedCount = 0;

    for (const item of pendingItems) {
      try {
        updateQueueItem(item.id, { status: "SYNCING" });
        await api.post(item.url, item.payload);

        // Successfully synchronized
        dequeueOfflineOrder(item.id);
        syncedCount++;
      } catch (err: any) {
        // If error indicates duplicate invoice or already recorded, safely dequeue
        const errMsg = extractErrorMessage(err);
        if (
          errMsg.toLowerCase().includes("unique constraint") ||
          errMsg.toLowerCase().includes("already exists") ||
          errMsg.toLowerCase().includes("duplicate")
        ) {
          dequeueOfflineOrder(item.id);
          syncedCount++;
        } else {
          failedCount++;
          updateQueueItem(item.id, {
            status: "FAILED",
            retryCount: item.retryCount + 1,
            lastError: errMsg,
          });
        }
      }
    }

    refreshQueue();
    isSyncingRef.current = false;
    setIsSyncing(false);

    if (syncedCount > 0) {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });

      setSyncStatusMsg({
        text: `✓ Successfully synced ${syncedCount} offline bill${syncedCount > 1 ? "s" : ""} to cloud!`,
        type: "success",
      });
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } else if (failedCount > 0) {
      setSyncStatusMsg({
        text: `⚠ ${failedCount} offline bill(s) could not sync. Will retry automatically.`,
        type: "warning",
      });
      setTimeout(() => setSyncStatusMsg(null), 4000);
    }

    return { synced: syncedCount, failed: failedCount };
  }, [queryClient, refreshQueue]);

  // Network listener & Custom storage event listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      saveOnlineHeartbeat();
      // Auto-trigger sync as soon as connection is back!
      syncQueueNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatusMsg({
        text: "Offline mode active. Bills will print and save locally.",
        type: "info",
      });
      setTimeout(() => setSyncStatusMsg(null), 4000);
    };

    const handleQueueChange = () => {
      refreshQueue();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("pos:offline_queue_changed", handleQueueChange);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("pos:offline_queue_changed", handleQueueChange);
    };
  }, [syncQueueNow, refreshQueue]);

  // Periodic background sync interval (every 20s if online and queue is not empty)
  useEffect(() => {
    if (!isOnline || queue.length === 0) return;

    const interval = setInterval(() => {
      if (!isSyncingRef.current && navigator.onLine) {
        saveOnlineHeartbeat();
        syncQueueNow();
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [isOnline, queue.length, syncQueueNow]);

  return {
    isOnline,
    queue,
    pendingCount: queue.length,
    isSyncing,
    syncStatusMsg,
    syncQueueNow,
    verifyOfflineBillingAllowed,
  };
}
