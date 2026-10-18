import { redirectLegacyDepartment } from "@/lib/legacy-redirect";

// Old product URL — see lib/legacy-redirect.ts.
export default async function LegacyVeterinaryProductPage({ params }: PageProps<"/veterinary/[slug]">): Promise<never> {
  return redirectLegacyDepartment("VETERINARY", (await params).slug);
}
