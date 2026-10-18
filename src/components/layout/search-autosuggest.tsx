"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";
import { formatNaira } from "@/lib/utils";
import { productPath, storePath, storeShortName } from "@/lib/departments";
import { ProductImage } from "@/components/catalogue/product-image";

type SearchResult = {
  id: string;
  slug: string;
  name: string;
  priceKobo: number;
  vertical: string;
  images: string[];
  stockQuantity: number;
};

// Searches the store the shopper is in — never every store at once, since
// each store has its own shelves and prices.
export function SearchAutosuggest({
  store,
  className,
  autoFocus,
  onNavigate,
}: {
  store: { slug: string; name: string };
  className?: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 250);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // No synchronous setState here: the dropdown render below already
    // gates on this same length check, so a short query simply renders
    // nothing without needing to clear stale `results` state.
    if (debouncedQuery.trim().length < 2) return;
    const controller = new AbortController();
    // This is React's own documented "fetching data in an effect" idiom
    // (react.dev/learn/synchronizing-with-effects#fetching-data): flip a
    // loading flag, then fetch. The react-hooks/set-state-in-effect rule
    // flags any synchronous setState in an effect body on principle, but
    // there's no non-effect alternative for "a debounced value changed, so
    // start a new request" — it isn't a derivable render-time value.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/products/search?store=${encodeURIComponent(store.slug)}&q=${encodeURIComponent(debouncedQuery)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => setResults(data.results ?? []))
      .catch((err) => {
        if (err.name !== "AbortError") console.error("Search failed", err);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [debouncedQuery, store.slug]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`${storePath(store.slug)}/search?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
      onNavigate?.();
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <form onSubmit={onSubmit} role="search" className="flex items-center gap-1.5 rounded-rk-pill border border-transparent bg-rk-lavender-mist px-3.5 py-2 text-sm text-rk-n600 focus-within:border-rk-navy focus-within:bg-white">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 flex-none">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={`Search ${storeShortName(store.name)} store…`}
          aria-label={`Search products at ${store.name}`}
          className="w-full bg-transparent outline-none placeholder:text-rk-n400"
        />
      </form>

      {open && debouncedQuery.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 rounded-rk-md border border-rk-n200 bg-white p-2 shadow-lg">
          {loading ? (
            <p className="px-2 py-3 text-sm text-rk-n600">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-2 py-3 text-sm text-rk-n600">
              Nothing at {storeShortName(store.name)} matches &ldquo;{debouncedQuery}&rdquo;.
            </p>
          ) : (
            <ul className="grid gap-0.5">
              {results.map((r) => (
                <li key={r.id}>
                  <Link
                    href={productPath(store.slug, r.vertical, r.slug)}
                    onClick={() => {
                      setOpen(false);
                      onNavigate?.();
                    }}
                    className="flex items-center gap-3 rounded-rk-sm px-2 py-1.5 text-sm text-rk-navy hover:bg-rk-navy-tint"
                  >
                    <ProductImage src={r.images[0]} alt="" className="size-9 flex-none rounded-rk-sm" />
                    <span className="flex-1">
                      <span className="line-clamp-1">{r.name}</span>
                      {r.stockQuantity === 0 && <span className="text-xs text-rk-n600">Out of stock here</span>}
                    </span>
                    <span className="font-mono text-xs text-rk-n600">{formatNaira(r.priceKobo)}</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={`${storePath(store.slug)}/search?q=${encodeURIComponent(debouncedQuery.trim())}`}
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                  }}
                  className="block rounded-rk-sm px-2 py-2 text-xs font-semibold text-rk-blue hover:bg-rk-navy-tint"
                >
                  See all results at {storeShortName(store.name)} →
                </Link>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
