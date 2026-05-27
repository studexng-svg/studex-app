import { create } from "zustand";
import { api } from "@/lib/api";

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
export interface WishlistItemVendor {
  id: number;
  username: string;
  business_name: string | null;
}

export interface WishlistItem {
  id: number;          // listing_id — what /api/wishlist/remove/{id}/ expects
  listing_id: number;  // same value; kept for explicit access
  title: string;
  price: number;
  image: string;
  vendor: WishlistItemVendor | null;
}

// Raw shape returned by GET /api/wishlist/
interface RawWishlistItem {
  id?: number;         // wishlist row pk — ignored; backend remove URL uses listing_id
  listing_id: number;
  title: string;
  price: string | number;
  img?: string;
  image?: string;
  vendor?: {
    id?: number;
    username?: string;
    business_name?: string | null;
  } | string | null;
}

// ─────────────────────────────────────────
// Store shape
// ─────────────────────────────────────────
interface WishlistState {
  items: WishlistItem[];
  isLoading: boolean;

  fetchWishlist: () => Promise<void>;
  addItem: (listing_id: number) => Promise<void>;
  removeItem: (wishlistItemId: number) => Promise<void>;
  clearWishlist: () => Promise<void>;
  isInWishlist: (listing_id: number) => boolean;
}

// ─────────────────────────────────────────
// Map raw backend response to WishlistItem
// ─────────────────────────────────────────
function mapRawItem(raw: RawWishlistItem): WishlistItem {
  let vendor: WishlistItemVendor | null = null;
  if (raw.vendor && typeof raw.vendor === "object") {
    vendor = {
      id: raw.vendor.id ?? 0,
      username: raw.vendor.username ?? "",
      business_name: raw.vendor.business_name ?? null,
    };
  }

  return {
    // Backend remove endpoint uses listing_id in the URL (web store confirms this)
    id: raw.listing_id,
    listing_id: raw.listing_id,
    title: raw.title,
    price: parseFloat(String(raw.price)),
    image: raw.image ?? raw.img ?? "",
    vendor,
  };
}

// ─────────────────────────────────────────
// Store
// Not persisted — wishlist is always fetched fresh from the backend.
// Requires the user to be authenticated (no guest wishlist on mobile).
// ─────────────────────────────────────────
export const useWishlistStore = create<WishlistState>()((set, get) => ({
  items: [],
  isLoading: false,

  // ── fetchWishlist ────────────────────────────────────────────────────────
  fetchWishlist: async () => {
    set({ isLoading: true });
    try {
      const data = await api.get<RawWishlistItem[]>("/api/wishlist/");
      const items = Array.isArray(data) ? data.map(mapRawItem) : [];
      set({ items, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  // ── addItem ──────────────────────────────────────────────────────────────
  addItem: async (listing_id: number) => {
    set({ isLoading: true });
    try {
      await api.post("/api/wishlist/add/", { listing_id });
      await get().fetchWishlist();
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  // ── removeItem ───────────────────────────────────────────────────────────
  removeItem: async (wishlistItemId: number) => {
    // Optimistic removal so UI updates immediately even if backend is slow/fails
    set((s) => ({ items: s.items.filter((i) => i.id !== wishlistItemId) }));
    try {
      await api.delete(`/api/wishlist/remove/${wishlistItemId}/`);
    } catch {}
    // Re-sync in background; ignore errors (e.g. item already removed)
    get().fetchWishlist().catch(() => {});
  },

  // ── clearWishlist ────────────────────────────────────────────────────────
  clearWishlist: async () => {
    set({ isLoading: true });
    try {
      await api.post("/api/wishlist/clear/");
      set({ items: [], isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  // ── isInWishlist ─────────────────────────────────────────────────────────
  // Checks by listing_id, not by wishlist item id.
  isInWishlist: (listing_id: number) =>
    get().items.some((item) => item.listing_id === listing_id),
}));
