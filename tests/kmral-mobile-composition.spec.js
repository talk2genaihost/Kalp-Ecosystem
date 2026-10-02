import { test, expect } from "@playwright/test";

test("Science Sandbox mobile composition persists state and recovers offline mutations", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.locator('[data-kmral="mobile-runtime"]')).toBeVisible();
  await expect(page.getByText("Science Sandbox Mobile")).toBeVisible();
  await expect(page.getByText("science-sandbox")).toBeVisible();
  await expect(page.getByText("KMRL-EXPERIMENT")).toBeVisible();
  await expect(page.locator("#status")).toHaveText("CREATED");
  await expect(page.locator("#connection")).toHaveText("ONLINE");
  await expect(page.locator("#pending")).toHaveText("0");

  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.locator("#status")).toHaveText("RUNNING");

  await page.getByRole("button", { name: "Step" }).click();
  await expect(page.locator("#tick")).toHaveText("1");
  await expect(page.locator("#velocity")).toHaveText("0.200 m/s");
  await expect(page.locator("#pending")).toHaveText("2");

  await page.reload();
  await expect(page.locator("#status")).toHaveText("RUNNING");
  await expect(page.locator("#tick")).toHaveText("1");
  await expect(page.locator("#velocity")).toHaveText("0.200 m/s");
  await expect(page.locator("#pending")).toHaveText("2");

  await page.getByRole("button", { name: "Sync Local Queue" }).click();
  await expect(page.locator("#pending")).toHaveText("0");
  await expect(page.locator("#last-sync")).toHaveText("2 mutation(s)");

  await page.getByRole("button", { name: "Go Offline" }).click();
  await expect(page.locator("#connection")).toHaveText("OFFLINE");

  await page.getByRole("button", { name: "Step" }).click();
  await expect(page.locator("#tick")).toHaveText("2");
  await expect(page.locator("#velocity")).toHaveText("0.400 m/s");
  await expect(page.locator("#pending")).toHaveText("1");

  await page.getByRole("button", { name: "Go Online" }).click();
  await expect(page.locator("#connection")).toHaveText("ONLINE");
  await page.getByRole("button", { name: "Sync Local Queue" }).click();
  await expect(page.locator("#pending")).toHaveText("0");
  await expect(page.locator("#last-sync")).toHaveText("1 mutation(s)");

  await page.reload();
  await expect(page.locator("#status")).toHaveText("RUNNING");
  await expect(page.locator("#tick")).toHaveText("2");
  await expect(page.locator("#velocity")).toHaveText("0.400 m/s");
});
