import { test, expect } from "@playwright/test";

const CINEMATIC_URL = process.env.KALP_CINEMATIC_URL || "http://127.0.0.1:4173/cinematic-studio/";

async function waitForRetroReady(page) {
  await page.waitForFunction(() => window.__retroReady && typeof window.__retroReady.then === "function", null, { timeout: 15000 });
  await page.evaluate(() => window.__retroReady);
  await expect(page.locator('#retroGame option[value="G001"]')).toHaveCount(1, { timeout: 15000 });
}

test("Retro 64 browser smoke: Generate → Storyboard", async ({ page }) => {
  await page.goto(CINEMATIC_URL, { waitUntil: "networkidle" });

  await page.locator('[data-nav="retro"]').click();
  await waitForRetroReady(page);
  await expect(page.locator('[data-view="retro"]')).toBeVisible();

  await expect(page.locator("#retroGame")).toHaveValue("G001", { timeout: 15000 });
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
  await page.goto(CINEMATIC_URL, { waitUntil: "networkidle" });
  await page.locator('[data-nav="retro"]').click();
  await waitForRetroReady(page);
  await expect(page.locator('#retroGame option[value="G001"]')).toHaveCount(1, { timeout: 15000 });
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
  await page.goto(CINEMATIC_URL, { waitUntil: "networkidle" });
  await page.locator('[data-nav="retro"]').click();
  await waitForRetroReady(page);
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
  await page.goto(CINEMATIC_URL, { waitUntil: "networkidle" });
  await page.locator('[data-nav="retro"]').click();
  await waitForRetroReady(page);
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


test("Retro 64 → Cinematic Studio production handoff", async ({ page }) => {
  await page.goto(CINEMATIC_URL, { waitUntil: "networkidle" });
  await page.locator('[data-nav="retro"]').click();
  await waitForRetroReady(page);
  await page.locator("#retroGame").selectOption("G001");
  await page.locator("#retroMode").selectOption("EXPANSION");
  await page.locator("#retroReelCount").selectOption("3");
  await page.locator("#retroIntent").fill("Night jungle mission with heavy rain and helicopter pursuit.");
  await page.locator("#retroGenerate").click();
  await expect(page.locator("#retroStatus")).toContainText("GENERATED · EXPANSION · VALIDATED");

  await page.locator("#retroGenerateReel").click();
  await page.locator("#retroResumeReel").click();
  await page.locator("#retroResumeReel").click();
  await expect(page.locator("#retroStatus")).toContainText("REEL 3 GENERATED · 12 SHOTS · MISSION COMPLETE");
  await expect(page.locator("#retroSendProduction")).toBeEnabled();

  await page.locator("#retroSendProduction").click();

  await expect(page.locator("#retroStatus")).toContainText("PRODUCTION HANDOFF READY · 36 SHOTS · APPROVED");
  const handoff = await page.evaluate(() => JSON.parse(localStorage.getItem("KALP_PRODUCTION_PACKAGE") || "{}"));
  expect(handoff.production_type).toBe("RETRO64_MISSION");
  expect(handoff.status).toBe("APPROVED");
  expect(handoff.shot_count).toBe(36);
  expect(handoff.source_studio).toBe("CINEMATIC_STUDIO");
  await expect(page).toHaveURL(CINEMATIC_URL);
});
