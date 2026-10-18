import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { E2E_SHOPPER, E2E_STAFF, e2eDatabaseUrl } from "./fixtures";

async function signIn(page: Page, email: string) {
  await page.goto("/login?callbackUrl=/dashboard", { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(E2E_SHOPPER.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname === "/dashboard");
}

test("an Ojoo inventory manager only sees and edits Ojoo's listings", async ({ page }) => {
  await signIn(page, E2E_STAFF.inventory.email);
  await page.goto("/products", { waitUntil: "networkidle" });
  const storeCells = page.locator("tbody tr td:nth-child(2)");
  await expect(storeCells.first()).toHaveText("Ojoo Branch");
  expect(new Set(await storeCells.allTextContents())).toEqual(new Set(["Ojoo Branch"]));

  const prisma = new PrismaClient({ datasources: { db: { url: e2eDatabaseUrl() } } });
  try {
    const [sheuRice, ojooBread] = await Promise.all([
      prisma.product.findFirstOrThrow({ where: { slug: "long-grain-rice-5kg", branch: { slug: "sheu" } } }),
      prisma.product.findFirstOrThrow({ where: { slug: "sliced-bread", branch: { slug: "ojoo" } } }),
    ]);

    // Another store's listing isn't reachable.
    expect((await page.goto(`/products/${sheuRice.id}`))?.status()).toBe(404);

    // Own store's stock is editable.
    await page.goto(`/products/${ojooBread.id}`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Stock at Ojoo Branch" })).toBeVisible();
    await page.getByLabel("Quantity on hand").fill("31");
    await page.getByRole("button", { name: "Save stock" }).click();
    await expect(page.getByText("Stock saved")).toBeVisible();
    const after = await prisma.product.findUniqueOrThrow({ where: { id: ojooBread.id } });
    expect(after.stockQuantity).toBe(31);
  } finally {
    await prisma.$disconnect();
  }
});

test("an Ojoo delivery coordinator only gets Ojoo riders and orders", async ({ page }) => {
  await signIn(page, E2E_STAFF.delivery.email);
  await page.goto("/delivery", { waitUntil: "networkidle" });
  await expect(page.getByText("Ojoo Branch rider")).toBeVisible();
  await expect(page.getByText("Flagship Branch rider")).toHaveCount(0);
  await expect(page.getByText("Shared courier — any store")).toBeVisible();
  // Delivery-area editors only for their own store.
  await expect(page.getByText("Flagship Branch (Sheu)", { exact: true })).toHaveCount(0);
});
