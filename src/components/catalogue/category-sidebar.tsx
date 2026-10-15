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
    <nav aria-label="Categories" className="w-full shrink-0 sm:w-48">
      <h3 className="mb-2 text-xs font-bold tracking-wide text-rk-n600 uppercase">Category</h3>
      <ul className="grid gap-1 text-sm">
        <li>
          <Link
            href={basePath}
            className={`block rounded-rk-sm px-2 py-1.5 ${!activeSlug ? "bg-rk-navy-tint font-semibold text-rk-navy" : "text-rk-ink hover:bg-rk-n50"}`}
          >
            All
          </Link>
        </li>
        {categories.map((c) => (
          <li key={c.slug}>
            <Link
              href={`${basePath}?category=${c.slug}`}
              className={`block rounded-rk-sm px-2 py-1.5 ${activeSlug === c.slug ? "bg-rk-navy-tint font-semibold text-rk-navy" : "text-rk-ink hover:bg-rk-n50"}`}
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
