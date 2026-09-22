import { test, expect } from "@playwright/test";

test("Retro 64 browser smoke: Generate → Storyboard", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/cinematic-studio/", { waitUntil: "networkidle" });

  await page.locator('[data-nav="retro"]').click();
  await expect(page.locator('[data-view="retro"]')).toBeVisible();

  await expect(page.locator("#retroGame")).toHaveValue("G001");
  await page.locator("#retroMode").selectOption("EXPANSION");
  await page.locator("#retroIntent").fill(
    "Night jungle mission with heavy rain and helicopter pursuit."
  );

  await page.locator("#retroGenerate").click();

  await expect(page.locator("#retroStatus")).toContainText("GENERATED · EXPANSION · VALIDATED");
  await expect(page.locator("#retroStoryboard")).toBeEnabled();

  const storyboard = page.locator('[data-view="storyboard"]');
  await expect(storyboard).toBeVisible();
  await expect(page.locator("#storyboardGrid .viewcard")).toHaveCount(9);

  await expect(page.locator("#storyboardGrid")).toContainText("ENTRY");
  await expect(page.locator("#storyboardGrid")).toContainText("NEXT_THREAT");
  await expect(page.locator("#storyboardGrid")).toContainText("Night jungle mission with heavy rain and helicopter pursuit.");
});


test("Retro 64 browser smoke: underwater intent uses underwater props and suppresses helicopter", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/cinematic-studio/", { waitUntil: "networkidle" });
  await page.locator('[data-nav="retro"]').click();
  await page.locator("#retroGame").selectOption("G001");
  await page.locator("#retroMode").selectOption("EXPANSION");
  await page.locator("#retroIntent").fill(
    "Contra should run and fight underwater with a helicopter pursuit."
  );
  await page.locator("#retroGenerate").click();

  await expect(page.locator("#retroStatus")).toContainText("GENERATED · EXPANSION · VALIDATED");
  await expect(page.locator("#retroStoryboard")).toBeEnabled();

  const cards = page.locator("#storyboardGrid .viewcard");
  await expect(cards).toHaveCount(9);
  const sceneText = await cards.evaluateAll(nodes => nodes.slice(1).map(n => n.textContent || "").join("\n"));
  expect(sceneText).toMatch(/underwater|aquatic|swim|submerged/i);
  expect(sceneText).not.toMatch(/helicopter|sky|clouds|military jeep|cargo truck|radio tower/i);
});
