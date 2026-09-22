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


test("Retro 64 browser smoke: 12-shot Reel generation and Resume continuity", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/cinematic-studio/", { waitUntil: "networkidle" });
  await page.locator('[data-nav="retro"]').click();
  await page.locator("#retroGame").selectOption("G001");
  await page.locator("#retroMode").selectOption("EXPANSION");
  await page.locator("#retroReelCount").selectOption("3");
  await page.locator("#retroIntent").fill("Night jungle mission with heavy rain and helicopter pursuit.");
  await page.locator("#retroGenerate").click();

  await expect(page.locator("#retroStatus")).toContainText("GENERATED · EXPANSION · VALIDATED");
  await expect(page.locator("#retroGenerateReel")).toBeEnabled();

  await page.locator("#retroGenerateReel").click();
  await expect(page.locator("#retroStatus")).toContainText("REEL 1 GENERATED · 12 SHOTS");
  let episode = JSON.parse(await page.locator("#retroJson").textContent());
  expect(episode.reels).toHaveLength(1);
  expect(episode.reels[0].shots).toHaveLength(12);
  expect(episode.reels[0].ending_state.reel).toBe(1);
  expect(episode.reels[0].ending_state.status).toBe("IN_PROGRESS");

  const reel1Ending = episode.reels[0].ending_state;
  await expect(page.locator("#retroResumeReel")).toBeEnabled();
  await page.locator("#retroResumeReel").click();
  await expect(page.locator("#retroStatus")).toContainText("REEL 2 GENERATED · 12 SHOTS");
  episode = JSON.parse(await page.locator("#retroJson").textContent());
  expect(episode.reels).toHaveLength(2);
  expect(episode.reels[1].shots).toHaveLength(12);
  expect(episode.reels[1].starting_state.continuity_anchor).toBe(reel1Ending.continuity_anchor);
  expect(episode.reels[1].shots[0].continuity_from).toBe(reel1Ending.continuity_anchor);
  expect(episode.reels[1].starting_state.world_state).toBe(reel1Ending.world_state);
  expect(episode.reels[1].starting_state.character_state).toBe(reel1Ending.character_state);
  expect(episode.reels[1].starting_state.objective_state).toBe(reel1Ending.objective_state);

  await page.locator("#retroResumeReel").click();
  await expect(page.locator("#retroStatus")).toContainText("REEL 3 GENERATED · 12 SHOTS · MISSION COMPLETE");
  episode = JSON.parse(await page.locator("#retroJson").textContent());
  expect(episode.reels).toHaveLength(3);
  expect(episode.reels[2].shots).toHaveLength(12);
  expect(episode.reels[2].shots[11].is_resolution_shot).toBe(true);
  expect(episode.reels[2].ending_state.status).toBe("COMPLETE");
  await expect(page.locator("#retroResumeReel")).toBeDisabled();
});


test("Retro 64 browser smoke: desert intent overrides reference jungle props", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/cinematic-studio/", { waitUntil: "networkidle" });
  await page.locator('[data-nav="retro"]').click();
  await page.locator("#retroGame").selectOption("G001");
  await page.locator("#retroMode").selectOption("EXPANSION");
  await page.locator("#retroIntent").fill("Contra mission in desert to rescue the president");
  await page.locator("#retroGenerate").click();
  await expect(page.locator("#retroStatus")).toContainText("GENERATED · EXPANSION · VALIDATED");
  const cards = page.locator("#storyboardGrid .viewcard");
  await expect(cards).toHaveCount(9);
  const sceneText = await cards.evaluateAll(nodes => nodes.slice(1).map(n => n.textContent || "").join("\n"));
  expect(sceneText).toMatch(/desert/i);
  expect(sceneText).toMatch(/dunes|dry rocks|dust|tents/i);
  expect(sceneText).not.toMatch(/dense tropical jungle|rainforest|muddy shoulders|jungle/i);
  expect(sceneText).not.toMatch(/heavy rain|helicopter rotor/i);
});
