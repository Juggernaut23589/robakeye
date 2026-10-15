import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  branchId: string;
  name: string;
  priceKobo: number;
  image: string | null;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string, branchId: string) => void;
  updateQuantity: (productId: string, branchId: string, quantity: number) => void;
  setItems: (items: CartItem[]) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === item.productId && i.branchId === item.branchId,
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i === existing ? { ...i, quantity: i.quantity + quantity } : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity }] };
        }),
      removeItem: (productId, branchId) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.branchId === branchId),
          ),
        })),
      updateQuantity: (productId, branchId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter(
                  (i) => !(i.productId === productId && i.branchId === branchId),
                )
              : state.items.map((i) =>
                  i.productId === productId && i.branchId === branchId
                    ? { ...i, quantity }
                    : i,
                ),
        })),
      setItems: (items) => set({ items }),
      clear: () => set({ items: [] }),
    }),
    { name: "robakeye-cart" },
  ),
);

export function useCartCount() {
  return useCartStore((state) => state.items.reduce((sum, i) => sum + i.quantity, 0));
}
