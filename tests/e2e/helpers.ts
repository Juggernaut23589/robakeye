import { expect, type Page } from "@playwright/test";

// Waits for the page to hydrate before clicking, then for the button's
// own confirmation — a click on server-rendered HTML before React attaches
// its handlers would otherwise be silently lost.
export async function addToBasket(page: Page, url: string, buttonName: string, quantity = 1) {
  await page.goto(url, { waitUntil: "networkidle" });
  for (let i = 1; i < quantity; i++) await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: buttonName }).click();
  await expect(page.getByRole("button", { name: "Added to basket" })).toBeVisible();
}
