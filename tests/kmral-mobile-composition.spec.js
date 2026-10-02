import { test, expect } from "@playwright/test";

test("Science Sandbox mobile composition drives the KMRAL boundary", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('[data-kmral="mobile-runtime"]')).toBeVisible();
  await expect(page.getByText("Science Sandbox Mobile")).toBeVisible();
  await expect(page.getByText("science-sandbox")).toBeVisible();
  await expect(page.getByText("KMRL-EXPERIMENT")).toBeVisible();
  await expect(page.locator("#status")).toHaveText("CREATED");

  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.locator("#status")).toHaveText("RUNNING");

  await page.getByRole("button", { name: "Step" }).click();
  await expect(page.locator("#tick")).toHaveText("1");
  await expect(page.locator("#velocity")).toHaveText("0.200 m/s");

  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.locator("#status")).toHaveText("PAUSED");

  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.locator("#status")).toHaveText("CREATED");
});
