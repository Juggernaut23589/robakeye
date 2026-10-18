import { redirectLegacyDepartment } from "@/lib/legacy-redirect";

// Old product URL — see lib/legacy-redirect.ts.
export default async function LegacyPharmacyProductPage({ params }: PageProps<"/pharmacy/[slug]">): Promise<never> {
  return redirectLegacyDepartment("PHARMACY", (await params).slug);
}
