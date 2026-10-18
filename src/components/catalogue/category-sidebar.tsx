import Link from "next/link";

export function CategorySidebar({
  basePath,
  categories,
  activeSlug,
}: {
  basePath: string;
  categories: { slug: string; name: string }[];
  activeSlug?: string;
}) {
  return (
    <nav aria-label="Categories" className="w-full shrink-0 md:w-52">
      <h3 className="mb-2 text-xs font-bold tracking-wide text-rk-n600 uppercase">Category</h3>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 text-sm [scrollbar-width:none] md:mx-0 md:grid md:gap-1 md:overflow-visible md:px-0">
        <li>
          <Link
            href={basePath}
            className={`block rounded-rk-pill px-3 py-1.5 whitespace-nowrap ring-1 ring-rk-n200 md:rounded-rk-sm md:px-2 md:ring-0 ${!activeSlug ? "bg-rk-navy-tint font-semibold text-rk-navy ring-rk-navy-tint" : "bg-white text-rk-ink hover:bg-rk-n50 md:bg-transparent"}`}
          >
            All
          </Link>
        </li>
        {categories.map((c) => (
          <li key={c.slug} className="flex-none">
            <Link
              href={`${basePath}?category=${c.slug}`}
              className={`block rounded-rk-pill px-3 py-1.5 whitespace-nowrap ring-1 ring-rk-n200 md:rounded-rk-sm md:px-2 md:ring-0 ${activeSlug === c.slug ? "bg-rk-navy-tint font-semibold text-rk-navy ring-rk-navy-tint" : "bg-white text-rk-ink hover:bg-rk-n50 md:bg-transparent"}`}
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
