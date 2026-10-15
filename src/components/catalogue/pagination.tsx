import Link from "next/link";

export function Pagination({
  page,
  pageCount,
  searchParams,
}: {
  page: number;
  pageCount: number;
  searchParams: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v && k !== "page") params.set(k, v);
    }
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `?${qs}` : "?";
  }

  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-1 text-sm">
      <Link
        href={hrefFor(Math.max(1, page - 1))}
        aria-disabled={page === 1}
        className={`rounded-rk-sm px-3 py-1.5 ${page === 1 ? "pointer-events-none text-rk-n400" : "text-rk-navy hover:bg-rk-navy-tint"}`}
      >
        ← Prev
      </Link>
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
        <Link
          key={p}
          href={hrefFor(p)}
          aria-current={p === page ? "page" : undefined}
          className={`rounded-rk-sm px-3 py-1.5 ${p === page ? "bg-rk-navy text-white" : "text-rk-navy hover:bg-rk-navy-tint"}`}
        >
          {p}
        </Link>
      ))}
      <Link
        href={hrefFor(Math.min(pageCount, page + 1))}
        aria-disabled={page === pageCount}
        className={`rounded-rk-sm px-3 py-1.5 ${page === pageCount ? "pointer-events-none text-rk-n400" : "text-rk-navy hover:bg-rk-navy-tint"}`}
      >
        Next →
      </Link>
    </nav>
  );
}
