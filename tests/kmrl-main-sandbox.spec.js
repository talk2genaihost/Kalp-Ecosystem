import { test, expect } from "@playwright/test";

const KMRL_URL = process.env.KMRL_SANDBOX_URL || "http://127.0.0.1:4173/apps/kmrl-sandbox/index.html";

test.setTimeout(60000);

test("KMRL MainSandbox browser validation", async ({ page }) => {
  await page.goto(KMRL_URL, { waitUntil: "networkidle" });

  await expect(page).toHaveTitle("KMRL Main Sandbox");
  await expect(page.locator('[data-kmrl="main-sandbox"]')).toBeVisible();
  await expect(page.locator("h1")).toHaveText("Main Sandbox");
  await expect(page.locator("text=physics-constant-force")).toBeVisible();
  await expect(page.locator('[data-action="start"]')).toBeEnabled();

  await page.locator('[data-action="start"]').click();
  await expect(page.locator(".status-running")).toBeVisible();

  await expect(page.locator('[data-action="step"]')).toBeEnabled();
  await page.locator('[data-force]').fill("2");
  await page.locator('[data-action="step"]').click();
  await expect(page.locator("text=0.1 m/s")).toBeVisible();

  await page.locator('[data-action="measure"]').click();
  await expect(page.locator(".kmrl-measurement")).toBeVisible();

  await page.locator('[data-action="pause"]').click();
  await expect(page.locator(".status-paused")).toBeVisible();

  await page.locator('[data-action="reset"]').click();
  await expect(page.locator(".status-created")).toBeVisible();

  await page.locator('[data-action="open-library"]').click();
  await expect(page.locator(".kmrl-experiment-library")).toBeVisible();
  await expect(page.locator("text=Experiment Library")).toBeVisible();

  await page.locator('button', { hasText: "Start Experiment" }).first().click();
  await expect(page.locator('[data-kmrl="main-sandbox"]')).toBeVisible();
});
