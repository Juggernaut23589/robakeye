"use client";

import { useEffect } from "react";
import { useLocationStore } from "@/store/location";

// Remembers the store being browsed (localStorage + cookie) so the landing
// page can say "last visited" and old links can redirect back here. It
// never decides what a basket contains — every line carries its own store.
export function StoreSync({ store }: { store: { id: string; slug: string; name: string } }) {
  const current = useLocationStore((s) => s.branch);
  const setBranch = useLocationStore((s) => s.setBranch);

  useEffect(() => {
    if (current?.id !== store.id || current.slug !== store.slug || current.name !== store.name) {
      setBranch({ id: store.id, slug: store.slug, name: store.name });
    }
  }, [current, store.id, store.slug, store.name, setBranch]);

  return null;
}
