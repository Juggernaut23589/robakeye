import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VerticalKey } from "@/lib/departments";

// One cart, split into a basket per store. A line is a store listing
// (Product rows belong to exactly one store), so productId alone
// identifies it; the store fields are carried for grouping and links.
export type CartItem = {
  productId: string;
  branchId: string;
  storeSlug: string;
  storeName: string;
  slug: string;
  vertical: VerticalKey;
  name: string;
  priceKobo: number;
  image: string | null;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setItems: (items: CartItem[]) => void;
  clearStore: (branchId: string) => void;
  clear: () => void;
};

export const MAX_LINE_QUANTITY = 99;

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i === existing ? { ...i, ...item, quantity: Math.min(MAX_LINE_QUANTITY, i.quantity + quantity) } : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: Math.min(MAX_LINE_QUANTITY, quantity) }] };
        }),
      removeItem: (productId) => set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId ? { ...i, quantity: Math.min(MAX_LINE_QUANTITY, quantity) } : i,
                ),
        })),
      setItems: (items) => set({ items }),
      clearStore: (branchId) => set((state) => ({ items: state.items.filter((i) => i.branchId !== branchId) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "robakeye-cart",
      // v2: carts became per-store. A v1 line only knew a shared product id
      // plus a branch, which no longer identifies a listing — drop them
      // (a signed-in shopper's server cart was migrated and merges back in).
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as { items?: unknown[] };
        if (version < 2) return { ...state, items: [] } as unknown as CartState;
        return state as unknown as CartState;
      },
    },
  ),
);

export function useCartCount() {
  return useCartStore((state) => state.items.reduce((sum, i) => sum + i.quantity, 0));
}

export function useStoreCartCount(branchId: string | null | undefined) {
  return useCartStore((state) =>
    branchId ? state.items.filter((i) => i.branchId === branchId).reduce((sum, i) => sum + i.quantity, 0) : 0,
  );
}

export type StoreBasket = { branchId: string; storeSlug: string; storeName: string; items: CartItem[] };

export function groupByStore(items: CartItem[]): StoreBasket[] {
  const map = new Map<string, StoreBasket>();
  for (const item of items) {
    const basket = map.get(item.branchId) ?? {
      branchId: item.branchId,
      storeSlug: item.storeSlug,
      storeName: item.storeName,
      items: [],
    };
    basket.items.push(item);
    map.set(item.branchId, basket);
  }
  return Array.from(map.values());
}
