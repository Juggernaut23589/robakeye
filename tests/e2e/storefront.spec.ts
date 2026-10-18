import { expect, test } from "@playwright/test";
import { addToBasket } from "./helpers";

test.describe("landing page", () => {
  test("shows the store chooser over a three-slide banner", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Where would you like to shop today?" })).toBeVisible();
    const slides = page.locator('[aria-roledescription="slide"]');
    await expect(slides).toHaveCount(3);
    for (const name of ["Ojoo", "Ajadi", "Sheu"]) {
      await expect(page.getByRole("link", { name: new RegExp(`^${name}`) }).first()).toBeVisible();
    }
    await expect(page.getByRole("contentinfo")).toBeVisible(); // footer
  });

  test("slide controls switch the banner", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Show The Vet Clinic" }).click();
    await expect(page.locator('[aria-roledescription="slide"][aria-hidden="false"]')).toHaveAttribute("aria-label", /The Vet Clinic/);
  });

  test("a location card opens that store", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /^Ojoo/ }).first().click();
    await expect(page).toHaveURL(/\/store\/ojoo$/);
    await expect(page.getByRole("heading", { level: 1, name: "Ojoo Branch" })).toBeVisible();
    // Ojoo has no vet clinic, so no vet department tab.
    const tabs = page.getByRole("navigation", { name: /Ojoo Branch departments/ });
    await expect(tabs.getByRole("link", { name: "Pharmacy" })).toBeVisible();
    await expect(tabs.getByRole("link", { name: "Vet Clinic" })).toHaveCount(0);
  });
});

test.describe("store-owned catalogues", () => {
  test("a department the store doesn't run is a 404", async ({ page }) => {
    const res = await page.goto("/store/ojoo/veterinary");
    expect(res?.status()).toBe(404);
  });

  test("a product another store doesn't list is a 404 there", async ({ page }) => {
    expect((await page.goto("/store/sheu/pharmacy/tramadol-50mg"))?.status()).toBe(200);
    expect((await page.goto("/store/ojoo/pharmacy/tramadol-50mg"))?.status()).toBe(404);
  });

  test("each store shows its own price and stock", async ({ page }) => {
    await page.goto("/store/ojoo/supermarket/vegetable-oil-1l");
    await expect(page.getByText("Out of stock at Ojoo")).toBeVisible();
    await expect(page.getByText(/Email me when Ojoo restocks/)).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Flagship Branch (Sheu)" })).toBeVisible(); // "also sold at"

    await page.goto("/store/sheu/supermarket/vegetable-oil-1l");
    await expect(page.getByText(/In stock at Sheu|left at Sheu/)).toBeVisible();
  });

  test("search only covers the current store and hides controlled medicines", async ({ page }) => {
    await page.goto("/store/sheu/search?q=tramadol");
    await expect(page.getByText(/Nothing at Sheu matches/)).toBeVisible();
    await page.goto("/store/ojoo/search?q=bread");
    await expect(page.getByRole("link", { name: "Sliced Bread (large loaf)" }).first()).toBeVisible();
  });

  test("prescription-only medicine can't be added without an approved prescription", async ({ page }) => {
    await page.goto("/store/sheu/pharmacy/amoxicillin-500mg");
    await expect(page.getByRole("link", { name: "Upload prescription" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Add to .* basket/ })).toHaveCount(0);
  });

  test("controlled medicine is information-only", async ({ page }) => {
    await page.goto("/store/sheu/pharmacy/tramadol-50mg");
    await expect(page.getByText(/can't be ordered online/)).toBeVisible();
  });

  test("old department links land inside a store", async ({ page }) => {
    await page.goto("/supermarket/sliced-bread");
    await expect(page).toHaveURL(/\/store\/[a-z]+\/supermarket\/sliced-bread$/);
    await page.goto("/pharmacy");
    await expect(page).toHaveURL(/\/store\/[a-z]+\/pharmacy$/);
  });
});

test.describe("basket", () => {
  test("items from two stores become two baskets, each checked out separately", async ({ page }) => {
    await addToBasket(page, "/store/ojoo/supermarket/sliced-bread", "Add to Ojoo basket");
    await addToBasket(page, "/store/sheu/supermarket/long-grain-rice-5kg", "Add to Sheu basket");

    await page.goto("/cart");
    await expect(page.getByText(/You have items from 2 stores/)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Ojoo Branch/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Flagship Branch \(Sheu\)/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Checkout at Ojoo" })).toHaveAttribute("href", "/checkout?store=ojoo");
    await expect(page.getByRole("link", { name: "Checkout at Sheu" })).toHaveAttribute("href", "/checkout?store=sheu");

    // Removing the Sheu line leaves a single Ojoo basket.
    await page.getByRole("button", { name: "Remove Long-Grain Rice, 5kg" }).click();
    await expect(page.getByText(/Everything here comes from Ojoo Branch/)).toBeVisible();
  });

  test("the store's bundle deal is discounted server-side", async ({ page }) => {
    await page.goto("/store/sheu", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Add bundle to basket" }).click();
    await expect(page.getByRole("button", { name: "Added to basket" })).toBeVisible();
    await page.goto("/cart");
    await expect(page.getByText("Bundle discount")).toBeVisible();
  });
});
