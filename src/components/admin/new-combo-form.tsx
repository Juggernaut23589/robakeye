"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createComboDeal, listProductsForPicker } from "@/actions/promotions-admin";
import { formatNaira } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Product = { id: string; name: string; sku: string; priceKobo: number };

function inDaysIso(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

export function NewComboForm({ branches }: { branches: { id: string; name: string }[] }) {
  const router = useRouter();
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [products, setProducts] = useState<Product[]>([]);

  // Bundles combine one store's own listings, so the picker reloads when
  // the store changes and the selection is cleared.
  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    listProductsForPicker(branchId).then((rows) => {
      if (!cancelled) setProducts(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [branchId]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [discountType, setDiscountType] = useState<"FIXED_PRICE" | "PERCENT_OFF">("FIXED_PRICE");
  const [bundlePriceNaira, setBundlePriceNaira] = useState(0);
  const [percentOff, setPercentOff] = useState(15);
  const [startsAt, setStartsAt] = useState(inDaysIso(0));
  const [endsAt, setEndsAt] = useState(inDaysIso(14));
  const [featured, setFeatured] = useState(false);
  const [headline, setHeadline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function toggleProduct(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  const combinedPriceKobo = products
    .filter((p) => selected.includes(p.id))
    .reduce((sum, p) => sum + p.priceKobo, 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await createComboDeal({
      branchId,
      name,
      productIds: selected,
      discountType,
      valueKobo: discountType === "FIXED_PRICE" ? Math.round(bundlePriceNaira * 100) : undefined,
      percentOff: discountType === "PERCENT_OFF" ? percentOff : undefined,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      isFeatured: featured,
      bannerHeadline: headline || undefined,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setName("");
    setSelected([]);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-rk-md border border-rk-n200 bg-white p-5">
      <label className="text-xs text-rk-n600">
        Store
        <select
          value={branchId}
          onChange={(e) => {
            setBranchId(e.target.value);
            setSelected([]);
          }}
          className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1.5"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-rk-n600">
        Deal name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Baby Care Combo"
          className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1.5"
        />
      </label>

      <div>
        <p className="mb-1 text-xs text-rk-n600">Products in the bundle (pick 2+, from this store)</p>
        <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
          {products.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggleProduct(p.id)}
              className={`rounded-rk-pill border px-3 py-1 text-xs ${
                selected.includes(p.id) ? "border-rk-navy bg-rk-navy-tint text-rk-navy" : "border-rk-n200 text-rk-n600"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
        {selected.length > 0 && (
          <p className="mt-1 text-xs text-rk-n600">Combined price: {formatNaira(combinedPriceKobo)}</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-rk-n600">
          Discount type
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as typeof discountType)}
            className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1.5"
          >
            <option value="FIXED_PRICE">Bundle sells for a fixed price</option>
            <option value="PERCENT_OFF">Percentage off the bundle</option>
          </select>
        </label>
        {discountType === "FIXED_PRICE" ? (
          <label className="text-xs text-rk-n600">
            Bundle price (₦)
            <input
              type="number"
              min={0}
              value={bundlePriceNaira}
              onChange={(e) => setBundlePriceNaira(Number(e.target.value))}
              className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1.5"
            />
          </label>
        ) : (
          <label className="text-xs text-rk-n600">
            % off
            <input
              type="number"
              min={1}
              max={100}
              value={percentOff}
              onChange={(e) => setPercentOff(Number(e.target.value))}
              className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1.5"
            />
          </label>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-rk-n600">
          Starts
          <input
            type="date"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1.5"
          />
        </label>
        <label className="text-xs text-rk-n600">
          Ends
          <input
            type="date"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1.5"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
        Feature on this store&apos;s home page
      </label>
      {featured && (
        <label className="text-xs text-rk-n600">
          Banner headline (optional — defaults to deal name)
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1.5"
          />
        </label>
      )}

      {error && <p className="text-sm text-rk-alert">{error}</p>}
      <Button type="submit" size="sm" loading={pending} disabled={selected.length < 2} className="w-fit">
        Create combo deal
      </Button>
    </form>
  );
}
