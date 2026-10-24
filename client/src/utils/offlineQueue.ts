import { idbSaveOrder, idbRemoveOrder } from "./idbStorage.js";
import type { MenuItem, RestaurantTable, Category, BrandSettings } from "../types/index.js";

export interface QueuedOfflineOrder {
  id: string; // Client unique queue ID (e.g. offline-uuid)
  createdAt: string;
  franchiseId: string;
  url: string;
  payload: any;
  displayInvoiceNumber: string;
  displayTotal: number;
  itemSummary: string;
  tableName: string;
  status: "QUEUED" | "SYNCING" | "FAILED";
  retryCount: number;
  lastError?: string;
}

const OFFLINE_QUEUE_KEY = "pos_offline_orders_queue_v1";
const CACHE_MENU_KEY = "pos_cached_menu_items_v1";
const CACHE_TABLES_KEY = "pos_cached_tables_v1";
const CACHE_CATEGORIES_KEY = "pos_cached_categories_v1";
const CACHE_BRAND_KEY = "pos_cached_brand_settings_v1";

/**
 * Retrieves all pending offline orders from persistent browser storage
 */
export function getOfflineQueue(): QueuedOfflineOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("Failed to read offline orders queue:", err);
    return [];
  }
}

/**
 * Adds an order to the persistent offline sync queue
 */
export function enqueueOfflineOrder(
  order: Omit<QueuedOfflineOrder, "id" | "createdAt" | "status" | "retryCount">
): QueuedOfflineOrder {
  const current = getOfflineQueue();
  const newQueueItem: QueuedOfflineOrder = {
    ...order,
    id: `off-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    status: "QUEUED",
    retryCount: 0,
  };

  current.push(newQueueItem);
  idbSaveOrder(newQueueItem).catch(() => {});
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(current));
  } catch (err) {
    console.error("Failed to persist offline order to queue:", err);
  }

  // Dispatch custom storage event so other components update immediately
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("pos:offline_queue_changed"));
  }

  return newQueueItem;
}

/**
 * Removes a successfully synchronized order from the queue
 */
export function dequeueOfflineOrder(id: string): void {
  const current = getOfflineQueue();
  const filtered = current.filter((item) => item.id !== id);
  idbRemoveOrder(id).catch(() => {});
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error("Failed to update offline order queue:", err);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("pos:offline_queue_changed"));
  }
}

/**
 * Updates an item's status or retry count in the queue
 */
export function updateQueueItem(
  id: string,
  updates: Partial<QueuedOfflineOrder>
): void {
  const current = getOfflineQueue();
  const updated = current.map((item) =>
    item.id === id ? { ...item, ...updates } : item
  );
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to update queue item:", err);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("pos:offline_queue_changed"));
  }
}

/**
 * Clears the entire offline queue (e.g. after manual override or purge)
 */
export function clearOfflineQueue(): void {
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch (err) {
    console.error("Failed to clear offline queue:", err);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("pos:offline_queue_changed"));
  }
}

// ==========================================
// POS LOCAL DATA CACHE (FOR ZERO-INTERNET BOOT)
// ==========================================

export function cacheMenuItems(items: MenuItem[]): void {
  if (typeof window === "undefined" || !items || !items.length) return;
  try {
    localStorage.setItem(CACHE_MENU_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn("Failed to cache menu items:", e);
  }
}

export function getCachedMenuItems(): MenuItem[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_MENU_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function cacheTables(tables: RestaurantTable[]): void {
  if (typeof window === "undefined" || !tables || !tables.length) return;
  try {
    localStorage.setItem(CACHE_TABLES_KEY, JSON.stringify(tables));
  } catch (e) {
    console.warn("Failed to cache tables:", e);
  }
}

export function getCachedTables(): RestaurantTable[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_TABLES_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function cacheCategories(categories: Category[]): void {
  if (typeof window === "undefined" || !categories || !categories.length) return;
  try {
    localStorage.setItem(CACHE_CATEGORIES_KEY, JSON.stringify(categories));
  } catch (e) {
    console.warn("Failed to cache categories:", e);
  }
}

export function getCachedCategories(): Category[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_CATEGORIES_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function cacheBrandSettings(brand: BrandSettings): void {
  if (typeof window === "undefined" || !brand) return;
  try {
    localStorage.setItem(CACHE_BRAND_KEY, JSON.stringify(brand));
  } catch (e) {
    console.warn("Failed to cache brand settings:", e);
  }
}

export function getCachedBrandSettings(): BrandSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_BRAND_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ============================================================================
// OFFLINE LICENSE LEASE & ANTI-CRACK SECURITY
// ============================================================================

const LEASE_KEY = "pos_offline_license_lease_v1";
const LAST_MONOTONIC_TIME_KEY = "pos_last_bill_monotonic_time_v1";

export interface OfflineLicenseLease {
  organizationId: string;
  outletId: string;
  plan: string;
  issuedAt: number;
  maxOfflineHours: number;
}

export function saveOnlineHeartbeat(orgId?: string, outletId?: string, plan?: string, maxHours: number = 72) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  localStorage.setItem(LAST_MONOTONIC_TIME_KEY, now.toString());
  if (orgId) {
    const lease: OfflineLicenseLease = {
      organizationId: orgId,
      outletId: outletId || "",
      plan: plan || "PRO",
      issuedAt: now,
      maxOfflineHours: maxHours || 72,
    };
    try {
      localStorage.setItem(LEASE_KEY, JSON.stringify(lease));
    } catch {
      // quota or private mode
    }
  }
}

export function verifyOfflineBillingAllowed(): { allowed: boolean; reason?: string } {
  if (typeof window === "undefined") return { allowed: true };
  const now = Date.now();

  // 1. Anti-Clock Tampering Check: Detect if user rolled back system clock
  const lastMonotonic = Number(localStorage.getItem(LAST_MONOTONIC_TIME_KEY) || 0);
  if (lastMonotonic && now < lastMonotonic - 60000) {
    return {
      allowed: false,
      reason: "Security Alert: System clock anomaly detected. Your device clock is set earlier than recorded transactions. Please restore accurate network time to continue.",
    };
  }
  localStorage.setItem(LAST_MONOTONIC_TIME_KEY, now.toString());

  // 2. Offline Heartbeat Window Check: Maximum 72 hours without cloud verification
  const rawLease = localStorage.getItem(LEASE_KEY);
  if (rawLease) {
    try {
      const lease: OfflineLicenseLease = JSON.parse(rawLease);
      const maxMs = (lease.maxOfflineHours || 72) * 60 * 60 * 1000;
      const elapsed = now - lease.issuedAt;
      if (elapsed > maxMs) {
        return {
          allowed: false,
          reason: `Offline grace period (${lease.maxOfflineHours}h) expired. Connect to the internet for 30 seconds to sync bills and refresh your license.`,
        };
      }
    } catch {
      // fallback
    }
  }

  return { allowed: true };
}
