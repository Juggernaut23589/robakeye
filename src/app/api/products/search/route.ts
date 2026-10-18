import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// MVP search per docs/technical-architecture.html: Postgres ILIKE now,
// Algolia/Elasticsearch flagged as a Phase 2 upgrade. Always scoped to one
// store — results are that store's listings, prices and stock.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const storeSlug = req.nextUrl.searchParams.get("store")?.trim();
  if (!q || q.length < 2 || !storeSlug) {
    return NextResponse.json({ results: [] });
  }

  const store = await prisma.branch.findUnique({ where: { slug: storeSlug }, select: { id: true } });
  if (!store) return NextResponse.json({ results: [] });

  const results = await prisma.product.findMany({
    // CONTROLLED products never appear in search — same rule as listings.
    where: {
      branchId: store.id,
      isActive: true,
      class: { not: "CONTROLLED" },
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { category: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    select: { id: true, slug: true, name: true, priceKobo: true, images: true, vertical: true, stockQuantity: true },
    orderBy: [{ stockQuantity: "desc" }, { name: "asc" }],
    take: 8,
  });

  return NextResponse.json({ results });
}
