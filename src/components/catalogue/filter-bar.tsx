"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name", label: "Name: A–Z" },
];

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const debouncedMin = useDebounce(minPrice, 400);
  const debouncedMax = useDebounce(maxPrice, 400);

  function updateParam(key: string, value: string | null, resetPage = true) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (resetPage) params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  // Debounced price inputs push to the URL only after the user pauses
  // typing — avoids a router.push on every keystroke.
  useEffect(() => {
    if (debouncedMin !== (searchParams.get("minPrice") ?? "")) updateParam("minPrice", debouncedMin || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only tracks the debounced value
  }, [debouncedMin]);
  useEffect(() => {
    if (debouncedMax !== (searchParams.get("maxPrice") ?? "")) updateParam("maxPrice", debouncedMax || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMax]);

  const inStockOnly = searchParams.get("inStock") === "1";
  const sort = searchParams.get("sort") ?? "newest";
  const view = searchParams.get("view") === "list" ? "list" : "grid";

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-rk-n200 pb-4 text-sm">
      <div className="flex items-center gap-1.5">
        <span className="text-rk-n600">₦</span>
        <input
          type="number"
          min={0}
          placeholder="Min"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          className="w-20 rounded-rk-sm border border-rk-n200 px-2 py-1"
        />
        <span className="text-rk-n400">–</span>
        <input
          type="number"
          min={0}
          placeholder="Max"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="w-20 rounded-rk-sm border border-rk-n200 px-2 py-1"
        />
      </div>

      <label className="flex items-center gap-1.5">
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(e) => updateParam("inStock", e.target.checked ? "1" : null)}
        />
        In stock only
      </label>

      <select
        value={sort}
        onChange={(e) => updateParam("sort", e.target.value)}
        className="rounded-rk-sm border border-rk-n200 px-2 py-1"
        aria-label="Sort by"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <div className="ml-auto flex gap-1 rounded-rk-sm border border-rk-n200 p-0.5">
        <button
          onClick={() => updateParam("view", "grid", false)}
          aria-pressed={view === "grid"}
          className={`rounded-rk-sm px-2 py-1 ${view === "grid" ? "bg-rk-navy text-white" : "text-rk-n600"}`}
        >
          Grid
        </button>
        <button
          onClick={() => updateParam("view", "list", false)}
          aria-pressed={view === "list"}
          className={`rounded-rk-sm px-2 py-1 ${view === "list" ? "bg-rk-navy text-white" : "text-rk-n600"}`}
        >
          List
        </button>
      </div>
    </div>
  );
}
