import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { E2E_SHOPPER, e2eDatabaseUrl } from "./fixtures";
import { addToBasket } from "./helpers";

test("checkout places a single-store order and enforces the delivery radius", async ({ page }) => {
  // Sign in.
  await page.goto("/login?callbackUrl=/store/ojoo", { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(E2E_SHOPPER.email);
  await page.getByLabel("Password").fill(E2E_SHOPPER.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  // (The login URL itself ends in "callbackUrl=/store/ojoo", so match the path.)
  await page.waitForURL((url) => url.pathname === "/store/ojoo");

  // Two stores in the basket.
  await addToBasket(page, "/store/ojoo/supermarket/sliced-bread", "Add to Ojoo basket", 2);
  await addToBasket(page, "/store/sheu/supermarket/long-grain-rice-5kg", "Add to Sheu basket");

  await page.goto("/cart");
  await page.getByRole("link", { name: "Checkout at Ojoo" }).click();
  await expect(page).toHaveURL(/\/checkout\?store=ojoo/);
  await expect(page.getByRole("heading", { level: 1, name: "Ojoo Branch" })).toBeVisible();
  await page.waitForLoadState("networkidle");

  // An address far outside Ojoo's radius is refused…
  await page.getByRole("button", { name: /E2E far away/ }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("delivery area");
  await expect(page.getByRole("button", { name: "Continue to review" })).toBeDisabled();

  // …a nearby one is quoted a fee.
  await page.getByRole("button", { name: /E2E near Ojoo/ }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Continue to review" })).toBeEnabled();

  // Pickup is free and always available.
  await page.getByRole("button", { name: /Pick up at Ojoo/ }).click();
  await expect(page.getByText("Free (pickup)")).toBeVisible();
  await page.getByRole("button", { name: "Continue to review" }).click();
  await page.getByRole("button", { name: /Place order/ }).click();
  await expect(page.getByText(/is saved — pay/)).toBeVisible();
  const orderNumber = (await page.getByText(/is saved — pay/).locator("b").first().textContent())?.trim();
  expect(orderNumber).toMatch(/^RK-\d{8}-\d{4}$/);

  // The order belongs to Ojoo only and contains only Ojoo's listing.
  const prisma = new PrismaClient({ datasources: { db: { url: e2eDatabaseUrl() } } });
  try {
    const order = await prisma.order.findUniqueOrThrow({
      where: { orderNumber: orderNumber! },
      include: { branch: true, items: { include: { product: true } } },
    });
    expect(order.branch.slug).toBe("ojoo");
    expect(order.status).toBe("PENDING_PAYMENT");
    expect(order.deliveryMethod).toBe("PICKUP");
    expect(order.items).toHaveLength(1);
    expect(order.items[0].product.branchId).toBe(order.branchId);
    expect(order.items[0].quantity).toBe(2);
  } finally {
    await prisma.$disconnect();
  }

  // The Sheu basket is untouched.
  await page.goto("/cart");
  await expect(page.getByText(/Everything here comes from Flagship Branch \(Sheu\)/)).toBeVisible();
});
