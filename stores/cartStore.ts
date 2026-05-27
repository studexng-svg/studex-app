import { create } from "zustand";
import { api } from "@/lib/api";

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
export interface CartItemVendor {
  id: number;
  username: string;
  business_name: string | null;
}

export interface CartItem {
  id: number;          // cart item's own backend id (used for PATCH/DELETE)
  listing_id: number;  // the listing this cart item refers to
  title: string;
  price: number;
  image: string;
  quantity: number;
  vendor: CartItemVendor | null;
}

// Raw shape returned by GET /api/cart/
interface RawCartItem {
  id?: number;
  listing_id: number;
  title: string;
  price: string | number;
  img?: string;
  image?: string;
  quantity: number;
  vendor?: {
    id?: number;
    username?: string;
    business_name?: string | null;
  } | string | null;
}

// ─────────────────────────────────────────
// Store shape
// ─────────────────────────────────────────
interface CartState {
  items: CartItem[];
  isLoading: boolean;

  fetchCart: () => Promise<void>;
  addItem: (listing_id: number, quantity?: number) => Promise<void>;
  removeItem: (listingId: number) => Promise<void>;
  updateQuantity: (listingId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotal: () => number;
  getItemCount: () => number;
}

// ─────────────────────────────────────────
// Map raw backend response to CartItem
// ─────────────────────────────────────────
function mapRawItem(raw: RawCartItem): CartItem {
  let vendor: CartItemVendor | null = null;
  if (raw.vendor && typeof raw.vendor === "object") {
    vendor = {
      id: raw.vendor.id ?? 0,
      username: raw.vendor.username ?? "",
      business_name: raw.vendor.business_name ?? null,
    };
  }

  return {
    // Fall back to listing_id if the backend doesn't return a separate cart item id
    id: raw.id ?? raw.listing_id,
    listing_id: raw.listing_id,
    title: raw.title,
    price: parseFloat(String(raw.price)),
    image: raw.image ?? raw.img ?? "",
    quantity: raw.quantity,
    vendor,
  };
}

// ─────────────────────────────────────────
// Store
// Not persisted — cart is always fetched fresh from the backend.
// Requires the user to be authenticated (no guest cart on mobile).
// ─────────────────────────────────────────
export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  isLoading: false,

  // ── fetchCart ────────────────────────────────────────────────────────────
  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const data = await api.get<RawCartItem[]>("/api/cart/");
      const items = Array.isArray(data) ? data.map(mapRawItem) : [];
      set({ items, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  // ── addItem ──────────────────────────────────────────────────────────────
  addItem: async (listing_id: number, quantity = 1) => {
    set({ isLoading: true });
    try {
      await api.post("/api/cart/add/", { listing_id, quantity });
      await get().fetchCart();
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  // ── removeItem ───────────────────────────────────────────────────────────
  removeItem: async (listingId: number) => {
    set({ isLoading: true });
    try {
      await api.delete(`/api/cart/remove/${listingId}/`);
      await get().fetchCart();
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  // ── updateQuantity ───────────────────────────────────────────────────────
  updateQuantity: async (listingId: number, quantity: number) => {
    const qty = Math.max(1, quantity);
    set({ isLoading: true });
    try {
      await api.patch(`/api/cart/update/${listingId}/`, { quantity: qty });
      await get().fetchCart();
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  // ── clearCart ────────────────────────────────────────────────────────────
  clearCart: async () => {
    set({ isLoading: true });
    try {
      await api.post("/api/cart/clear/");
      set({ items: [], isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  // ── getTotal ─────────────────────────────────────────────────────────────
  getTotal: () =>
    get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

  // ── getItemCount ─────────────────────────────────────────────────────────
  getItemCount: () =>
    get().items.reduce((sum, item) => sum + item.quantity, 0),
}));
