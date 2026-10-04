import { test, expect } from "@playwright/test";

const KMRL_URL = process.env.KMRL_SANDBOX_URL || "http://127.0.0.1:4173/apps/kmrl-sandbox/index.html";

test.setTimeout(60000);

test("KMRL MainSandbox browser validation", async ({ page }) => {
  await page.goto(KMRL_URL, { waitUntil: "networkidle" });

  await expect(page).toHaveTitle("KMRL Main Sandbox");
  await expect(page.locator('[data-kmrl="dynamic-experiment"]')).toHaveCount(0);
  const startupAlert = page.locator('[role="alert"]');
  if (await startupAlert.count()) {
    throw new Error(`Science Sandbox startup failed: ${await startupAlert.first().innerText()}`);
  }
  await expect(page.locator(".kmrl-experiment-library")).toBeVisible();
  await expect(page.locator("h1")).toHaveText("Science Sandbox");
  await expect(page.locator("text=physics-constant-force")).toHaveCount(1);

  const constantForceCard = page.locator(
    '[data-domain="physics"]',
  ).filter({ hasText: "Constant Force Motion" }).first();
  await expect(constantForceCard).toBeVisible();

  await constantForceCard.locator('[data-action="start-experiment"]').click();

  await expect(page.locator('[data-kmrl="dynamic-experiment"]')).toBeVisible();
  await expect(page.locator("h1")).toHaveText("Constant Force Motion");
  await expect(page.locator('[data-action="start"]')).toBeEnabled();

  await page.locator('[data-action="start"]').click();
  await expect(page.locator(".status-running")).toBeVisible();

  await expect(page.locator('[data-action="step"]')).toBeEnabled();
  await page.locator('[data-action="step"]').click();
  await expect(page.locator("text=Tick 1")).toBeVisible();

  await page.locator('[data-action="measure"]').click();
  await expect(page.locator(".kmrl-dynamic-measurement")).toBeVisible();

  await page.locator('[data-action="pause"]').click();
  await expect(page.locator(".status-paused")).toBeVisible();

  await page.locator('[data-action="reset"]').click();
  await expect(page.locator(".status-created")).toBeVisible();

  await page.locator('[data-action="back"]').click();
  await expect(page.locator(".kmrl-experiment-library")).toBeVisible();
  await expect(page.locator("text=Science Sandbox")).toBeVisible();
});
