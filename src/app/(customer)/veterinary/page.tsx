import { redirectLegacyDepartment } from "@/lib/legacy-redirect";

// Old department URL — see lib/legacy-redirect.ts.
export default async function LegacyVeterinaryPage(): Promise<never> {
  return redirectLegacyDepartment("VETERINARY");
}
