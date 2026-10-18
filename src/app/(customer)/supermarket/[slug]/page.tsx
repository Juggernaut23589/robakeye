import { redirectLegacyDepartment } from "@/lib/legacy-redirect";

// Old product URL — see lib/legacy-redirect.ts.
export default async function LegacySupermarketProductPage({ params }: PageProps<"/supermarket/[slug]">): Promise<never> {
  return redirectLegacyDepartment("SUPERMARKET", (await params).slug);
}
