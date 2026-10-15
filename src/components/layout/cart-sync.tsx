"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useCartStore, type CartItem } from "@/store/cart";
import { getServerCart, syncServerCart } from "@/actions/cart";

function mergeCartItems(local: CartItem[], server: CartItem[]): CartItem[] {
  const merged = new Map<string, CartItem>();
  for (const item of server) merged.set(`${item.productId}:${item.branchId}`, item);
  for (const item of local) {
    const key = `${item.productId}:${item.branchId}`;
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, quantity: existing.quantity + item.quantity } : item);
  }
  return Array.from(merged.values());
}

// sessionStorage, not a plain useRef: a ref resets on every remount, and
// a full page load (not just a client-side navigation) remounts this
// component — without a flag that survives that, the additive merge below
// would re-sum local+server on every single page refresh, silently
// doubling cart quantities each time. This flag makes "merge" mean "once
// per browser tab session", not "once per component lifetime".
const MERGE_FLAG_KEY = "robakeye-cart-merged";

// Invisible component mounted once in the customer layout. Zustand +
// localStorage (store/cart.ts) stays the source of truth for rendering;
// this just mirrors it to the DB Cart row while signed in, per the
// brief's "synced to DB for logged-in users."
export function CartSync() {
  const { status } = useSession();
  const skipNextSyncRef = useRef(false);

  // On login: merge whatever was in the guest's local cart with whatever
  // was already saved to their account, write the merged result back to
  // both local state and the DB, once per browser session.
  useEffect(() => {
    if (status !== "authenticated") return;
    try {
      if (sessionStorage.getItem(MERGE_FLAG_KEY) === "1") return;
    } catch {
      // sessionStorage unavailable — fall through and merge anyway rather than silently skipping it forever.
    }

    getServerCart().then((serverItems) => {
      const localItems = useCartStore.getState().items;
      const merged = mergeCartItems(localItems, serverItems);
      skipNextSyncRef.current = true; // the setItems below shouldn't itself trigger a redundant sync
      useCartStore.getState().setItems(merged);
      syncServerCart(merged);
      try {
        sessionStorage.setItem(MERGE_FLAG_KEY, "1");
      } catch {
        // non-fatal — worst case this tab merges again next reload
      }
    });
  }, [status]);

  // After the initial merge, mirror every subsequent local change to the
  // DB (debounced) while the user is signed in.
  useEffect(() => {
    if (status !== "authenticated") return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = useCartStore.subscribe((state) => {
      if (skipNextSyncRef.current) {
        skipNextSyncRef.current = false;
        return;
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => syncServerCart(state.items), 600);
    });

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [status]);

  return null;
}
