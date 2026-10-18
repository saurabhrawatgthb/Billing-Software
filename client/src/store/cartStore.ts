import { create } from "zustand";
import type { MenuItem, RestaurantTable } from "../types/index.js";

export interface CartItem {
  cartItemId: string;
  menuItem: MenuItem;
  quantity: number;
  selectedSize?: string;
  price: number;
  notes?: string;
}

interface CartState {
  items: CartItem[];
  selectedTable: RestaurantTable | null;
  discount: number;
  taxRate: number;
  notes: string;
  addItem: (item: MenuItem, selectedSize?: string, customPrice?: number) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  updateItemNotes: (cartItemId: string, notes: string) => void;
  setSelectedTable: (table: RestaurantTable | null) => void;
  setDiscount: (discount: number) => void;
  setTaxRate: (rate: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTax: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  selectedTable: null,
  discount: 0,
  taxRate: 0, // 0% default (only applied if business has a registered GSTIN)
  notes: "",

  addItem: (menuItem, selectedSize, customPrice) => {
    const sizeKey = selectedSize ? selectedSize.trim() : "std";
    const cartItemId = `${menuItem.id}_${sizeKey}`;
    const unitPrice = customPrice !== undefined && !isNaN(customPrice) ? Number(customPrice) : Number(menuItem.price);

    set((state) => {
      const existing = state.items.find((i) => i.cartItemId === cartItemId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            cartItemId,
            menuItem,
            quantity: 1,
            selectedSize: selectedSize || undefined,
            price: unitPrice,
            notes: "",
          },
        ],
      };
    });
  },

  removeItem: (cartItemId) => {
    set((state) => ({
      items: state.items.filter((i) => i.cartItemId !== cartItemId && i.menuItem.id !== cartItemId),
    }));
  },

  updateQuantity: (cartItemId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(cartItemId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.cartItemId === cartItemId || i.menuItem.id === cartItemId ? { ...i, quantity } : i
      ),
    }));
  },

  updateItemNotes: (cartItemId, notes) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.cartItemId === cartItemId || i.menuItem.id === cartItemId ? { ...i, notes } : i
      ),
    }));
  },

  setSelectedTable: (table) => set({ selectedTable: table }),
  setDiscount: (discount) => set({ discount: Math.max(0, discount) }),
  setTaxRate: (taxRate) => set({ taxRate: Math.max(0, taxRate) }),

  clearCart: () =>
    set({
      items: [],
      selectedTable: null,
      discount: 0,
      notes: "",
    }),

  getSubtotal: () => {
    return get().items.reduce(
      (sum, item) => sum + Number(item.price ?? item.menuItem.price) * item.quantity,
      0
    );
  },

  getTax: () => {
    const subtotal = get().getSubtotal();
    const discount = get().discount;
    const taxable = Math.max(0, subtotal - discount);
    return (taxable * get().taxRate) / 100;
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    const discount = get().discount;
    const tax = get().getTax();
    return Math.max(0, subtotal - discount + tax);
  },
}));
