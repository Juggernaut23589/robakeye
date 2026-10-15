import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// MVP full-text search per docs/technical-architecture.html's call: Postgres
// ILIKE now, Algolia/Elasticsearch flagged as a Phase 2 upgrade.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = await prisma.product.findMany({
    // CONTROLLED products never appear in search either — same rule as
    // the catalogue listings (lib/catalogue.ts), since search exists to
    // route a customer toward purchasing something.
    where: { isActive: true, class: { not: "CONTROLLED" }, name: { contains: q, mode: "insensitive" } },
    select: { id: true, slug: true, name: true, priceKobo: true, images: true, vertical: true },
    take: 8,
  });

  return NextResponse.json({ results });
}
