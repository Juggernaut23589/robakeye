// Local-only test account created by global-setup.ts in the E2E database.
// Never exists in production.
export const E2E_SHOPPER = {
  email: "e2e-shopper@robakeye.test",
  password: process.env.E2E_SHOPPER_PASSWORD ?? "e2e-Local-Only-Pass-1",
  name: "E2E Shopper",
};

// Store-scoped staff (roles without mandatory 2FA), assigned to Ojoo only.
export const E2E_STAFF = {
  inventory: { email: "e2e-ojoo-inventory@robakeye.test", role: "INVENTORY_MANAGER" },
  delivery: { email: "e2e-ojoo-delivery@robakeye.test", role: "DELIVERY_COORDINATOR" },
} as const;

export function e2eDatabaseUrl() {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) throw new Error("Set E2E_DATABASE_URL to a LOCAL Postgres database (the one the dev server uses).");
  const host = new URL(url).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error(`Refusing to run E2E setup against non-local database host "${host}".`);
  }
  return url;
}
