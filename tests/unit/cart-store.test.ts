import { beforeEach, describe, expect, it } from "vitest";
import { groupByStore, useCartStore, type CartItem } from "@/store/cart";

const item = (productId: string, branchId: string, storeName: string): Omit<CartItem, "quantity"> => ({
  productId,
  branchId,
  storeSlug: storeName.toLowerCase(),
  storeName,
  slug: productId,
  vertical: "SUPERMARKET",
  name: productId,
  priceKobo: 100_000,
  image: null,
});

describe("cart store", () => {
  beforeEach(() => useCartStore.setState({ items: [] }));

  it("keys lines by listing id and adds quantities", () => {
    const { addItem } = useCartStore.getState();
    addItem(item("rice@sheu", "sheu", "Sheu"));
    addItem(item("rice@sheu", "sheu", "Sheu"), 2);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(3);
  });

  it("keeps the same product from two stores as two separate lines", () => {
    const { addItem } = useCartStore.getState();
    addItem(item("rice@sheu", "sheu", "Sheu"));
    addItem(item("rice@ojoo", "ojoo", "Ojoo"));
    const baskets = groupByStore(useCartStore.getState().items);
    expect(baskets.map((b) => b.storeName)).toEqual(["Sheu", "Ojoo"]);
  });

  it("clearStore empties only that store's basket", () => {
    const { addItem, clearStore } = useCartStore.getState();
    addItem(item("rice@sheu", "sheu", "Sheu"));
    addItem(item("bread@ojoo", "ojoo", "Ojoo"));
    clearStore("sheu");
    expect(useCartStore.getState().items.map((i) => i.productId)).toEqual(["bread@ojoo"]);
  });

  it("caps a line at 99 and removes it at zero", () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    addItem(item("water@sheu", "sheu", "Sheu"), 500);
    expect(useCartStore.getState().items[0].quantity).toBe(99);
    updateQuantity("water@sheu", 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
