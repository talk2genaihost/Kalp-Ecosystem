import { test, expect } from "@playwright/test";

const KMRL_URL = process.env.KMRL_SANDBOX_URL || "http://127.0.0.1:4173/apps/kmrl-sandbox/index.html";

test.setTimeout(60000);

test("KMRL MainSandbox browser validation", async ({ page }) => {
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto(KMRL_URL, { waitUntil: "networkidle" });

  await expect(page).toHaveTitle("KMRL Main Sandbox");
  await expect(page.locator('[data-kmrl="dynamic-experiment"]')).toHaveCount(0);

  const startupAlert = page.locator('[role="alert"]');
  if (await startupAlert.count()) {
    throw new Error(`Science Sandbox startup failed: ${await startupAlert.first().innerText()}`);
  }

  if (pageErrors.length || consoleErrors.length) {
    throw new Error(
      `Science Sandbox browser startup errors. pageerror=${JSON.stringify(pageErrors)} console=${JSON.stringify(consoleErrors)} body=${JSON.stringify(await page.locator("body").innerText())}`,
    );
  }

  await expect(page.locator(".kmrl-experiment-library")).toBeVisible();
  await expect(page.locator("h1")).toHaveText("Science Sandbox");
  const constantForceCard = page.locator('[data-domain="physics"]').filter({ hasText: "Constant Force Motion" }).first();
  await expect(constantForceCard).toBeVisible();
  await constantForceCard.locator('[data-action="start-experiment"]').click();

  await expect(page.locator('[data-kmrl="dynamic-experiment"]')).toBeVisible();
  await expect(page.locator("h1")).toHaveText("Constant Force Motion");
  await expect(page.locator('[data-action="start"]')).toBeEnabled();

  await page.locator('[data-action="start"]').click();
  await expect(page.locator(".status-running")).toBeVisible();
  await page.locator('[data-action="step"]').click();
  await expect(page.locator("text=Tick 1")).toBeVisible();
  await page.locator('[data-action="measure"]').click();
  await expect(page.locator(".kmrl-dynamic-measurement")).toHaveCount(3);
  await expect(page.getByText("Position 0.005 m")).toBeVisible();
  await expect(page.getByText("Velocity 0.1 m/s")).toBeVisible();
  await expect(page.getByText("Acceleration 1 m/s2")).toBeVisible();
  await page.locator('[data-action="pause"]').click();
  await expect(page.locator(".status-paused")).toBeVisible();
  await page.locator('[data-action="reset"]').click();
  await expect(page.locator(".status-created")).toBeVisible();
  await page.locator('[data-action="back"]').click();
  await expect(page.locator(".kmrl-experiment-library")).toBeVisible();
  await expect(page.locator("text=Science Sandbox")).toBeVisible();
});


test("KMRL PHY-MEC-007 approved collision browser flow", async ({ page }) => {
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto(KMRL_URL, { waitUntil: "networkidle" });
  const collisionCard = page.locator('article[data-domain="physics"]').filter({ hasText: "Conservation of Momentum" }).first();
  await expect(collisionCard).toBeVisible();
  const launch = collisionCard.locator('[data-action="start-experiment"]');
  await expect(launch).toBeEnabled();
  await launch.click();

  await expect(page.locator('[data-kmrl="dynamic-experiment"]')).toBeVisible();
  await expect(page.locator("h1")).toHaveText("Conservation of Momentum");
  await page.locator('[data-action="start"]').click();
  await page.locator('[data-action="step"]').click();
  await page.locator('[data-action="measure"]').click();

  await expect(page.getByText("Final Velocity 1")).toBeVisible();
  await expect(page.getByText("Final Velocity 2")).toBeVisible();
  await expect(page.getByText("Momentum")).toBeVisible();
  await expect(page.getByText("Kinetic Energy")).toBeVisible();
  await expect(page.getByText("-1 m/s")).toBeVisible();
  await expect(page.getByText("2 m/s")).toBeVisible();
  await expect(page.getByText("1 kg*m/s")).toBeVisible();
  await expect(page.getByText("2.5 J")).toBeVisible();

  if (pageErrors.length || consoleErrors.length) {
    throw new Error(
      `Collision browser errors. pageerror=${JSON.stringify(pageErrors)} console=${JSON.stringify(consoleErrors)}`,
    );
  }
});
