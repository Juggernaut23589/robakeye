"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";
import { formatNaira } from "@/lib/utils";

type SearchResult = {
  id: string;
  slug: string;
  name: string;
  priceKobo: number;
  vertical: string;
};

export function SearchAutosuggest({
  className,
  autoFocus,
}: {
  className?: string;
  autoFocus?: boolean;
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
    fetch(`/api/products/search?q=${encodeURIComponent(debouncedQuery)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => setResults(data.results ?? []))
      .catch((err) => {
        if (err.name !== "AbortError") console.error("Search failed", err);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [debouncedQuery]);

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
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <form onSubmit={onSubmit} className="flex items-center gap-1.5 rounded-rk-pill bg-rk-lavender-mist px-3.5 py-2 text-sm text-rk-n600">
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
          placeholder="Search medicines, pet food, groceries…"
          aria-label="Search products"
          className="w-full bg-transparent outline-none placeholder:text-rk-n400"
        />
      </form>

      {open && debouncedQuery.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 rounded-rk-md border border-rk-n200 bg-white p-2 shadow-lg">
          {loading ? (
            <p className="px-2 py-3 text-sm text-rk-n600">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-2 py-3 text-sm text-rk-n600">
              No products found for &ldquo;{debouncedQuery}&rdquo;.
            </p>
          ) : (
            <ul className="grid gap-0.5">
              {results.map((r) => (
                <li key={r.id}>
                  <a
                    href={`/${r.vertical.toLowerCase()}/${r.slug}`}
                    className="flex items-center justify-between rounded-rk-sm px-2 py-2 text-sm text-rk-navy hover:bg-rk-navy-tint"
                  >
                    <span>{r.name}</span>
                    <span className="font-mono text-xs text-rk-n600">
                      {formatNaira(r.priceKobo)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
