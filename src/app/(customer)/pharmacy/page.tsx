import { redirectLegacyDepartment } from "@/lib/legacy-redirect";

// Old department URL — see lib/legacy-redirect.ts.
export default async function LegacyPharmacyPage(): Promise<never> {
  return redirectLegacyDepartment("PHARMACY");
}
