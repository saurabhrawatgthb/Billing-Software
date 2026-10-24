import { create } from "zustand";

export async function hashPin(pin: string, userId: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`pin:${userId}:${pin}:omnipos_secure_salt_v1`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface PinLockState {
  isLocked: boolean;
  hasPin: (userId?: string | null) => boolean;
  setPin: (userId: string, pin: string) => Promise<void>;
  removePin: (userId: string) => void;
  verifyPin: (userId: string, pin: string) => Promise<boolean>;
  lock: () => void;
  unlock: () => void;
}

// Check initial lock state on application launch
function getInitialLockState(): boolean {
  try {
    const savedUserStr = localStorage.getItem("rms_user");
    if (!savedUserStr) return false;
    const user = JSON.parse(savedUserStr);
    if (!user?.id) return false;

    const hasStoredPin = !!localStorage.getItem(`rms_quick_pin_${user.id}`);
    if (!hasStoredPin) return false;

    // If user has a PIN configured on this PC, default to locked on app launch
    return true;
  } catch {
    return false;
  }
}

export const usePinLockStore = create<PinLockState>((set, get) => ({
  isLocked: getInitialLockState(),

  hasPin: (userId) => {
    if (!userId) return false;
    return !!localStorage.getItem(`rms_quick_pin_${userId}`);
  },

  setPin: async (userId, pin) => {
    const hashed = await hashPin(pin, userId);
    localStorage.setItem(`rms_quick_pin_${userId}`, hashed);
    localStorage.setItem(`rms_pin_enabled_${userId}`, "true");
  },

  removePin: (userId) => {
    localStorage.removeItem(`rms_quick_pin_${userId}`);
    localStorage.removeItem(`rms_pin_enabled_${userId}`);
    localStorage.removeItem("rms_pin_locked");
    set({ isLocked: false });
  },

  verifyPin: async (userId, pin) => {
    const storedHash = localStorage.getItem(`rms_quick_pin_${userId}`);
    if (!storedHash) return false;
    const computedHash = await hashPin(pin, userId);
    const isValid = computedHash === storedHash;
    if (isValid) {
      get().unlock();
    }
    return isValid;
  },

  lock: () => {
    localStorage.setItem("rms_pin_locked", "true");
    set({ isLocked: true });
  },

  unlock: () => {
    localStorage.removeItem("rms_pin_locked");
    set({ isLocked: false });
  },
}));
