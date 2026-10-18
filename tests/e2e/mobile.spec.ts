import { expect, test } from "@playwright/test";

test("landing page and store menu work on a phone", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Where would you like to shop today?" })).toBeVisible();
  const noHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(noHorizontalScroll).toBe(true);

  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog");
  await expect(menu.getByRole("link", { name: /Flagship Branch \(Sheu\)/ })).toBeVisible();
  await menu.getByRole("link", { name: /Ojoo Branch/ }).click();
  await expect(page).toHaveURL(/\/store\/ojoo$/);
  await expect(page.getByRole("link", { name: /Shopping at Ojoo Branch/ })).toBeVisible();
});
