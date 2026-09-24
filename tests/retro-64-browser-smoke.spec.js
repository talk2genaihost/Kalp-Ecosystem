import { test, expect } from "@playwright/test";

const CINEMATIC_URL = process.env.KALP_CINEMATIC_URL || "http://127.0.0.1:4173/cinematic-studio/";

async function openRetro(page) {
  await page.goto(CINEMATIC_URL, { waitUntil: "networkidle" });
  await page.locator('[data-nav="retro"]').click();
  await page.waitForFunction(
    () => window.__retroReady && typeof window.__retroReady.then === "function",
    null,
    { timeout: 15000 }
  );
  await page.evaluate(() => window.__retroReady);
  await expect(page.locator("#retro64ProductionV2")).toBeVisible({ timeout: 15000 });
  await expect(page.locator("#r64Reference")).toBeVisible({ timeout: 15000 });
  await expect(page.locator("#r64Intent")).toBeVisible({ timeout: 15000 });
}

async function selectReference(page, value) {
  await page.locator("#r64Reference").selectOption(value);
  await expect(page.locator("#r64Reference")).toHaveValue(value);
  await expect(page.locator(".r64-status")).toContainText("REFERENCE LOADED", { timeout: 15000 });
}

async function generateMission(page, intent) {
  await page.locator("#r64Intent").fill(intent);
  await expect(page.locator("#r64Generate")).toBeEnabled();
  await page.locator("#r64Generate").click();
  await expect(page.locator("#r64Generate")).toBeEnabled({ timeout: 15000 });
  await expect(page.locator(".r64-foot")).toContainText("3 × 8 = 24 unique shots");
}

async function retroState(page) {
  return page.evaluate(() => {
    const ui = window.KALP_RETRO64_UI_V2;
    if (!ui) throw new Error("KALP_RETRO64_UI_V2 is not exposed");
    return {
      totalReels: ui.TOTAL_REELS,
      shotsPerReel: ui.SHOTS_PER_REEL,
      state: ui.state
    };
  });
}

test("Retro 64 browser smoke: bootstrap, selector, and all 13 canonical references", async ({ page }) => {
  await openRetro(page);

  await expect(page.locator('#r64Reference option')).toHaveCount(14);

  const references = [
    "CONTRA",
    "MARIO",
    "KUNG_FU",
    "ROAD_FIGHTER",
    "NINJA_GAIDEN",
    "NINJA_TURTLES",
    "DOUBLE_DRAGON",
    "EXCITEBIKE",
    "ADVENTURE_ISLAND",
    "STREET_FIGHTER",
    "STREET_FIGHTER_ALPHA_2_NES",
    "MORTAL_KOMBAT",
    "TEKKEN"
  ];

  for (const reference of references) {
    await selectReference(page, reference);
  }

  const state = await retroState(page);
  expect(state.totalReels).toBe(3);
  expect(state.shotsPerReel).toBe(8);
});


test("Retro 64 browser smoke: Generate mission from reference + intent", async ({ page }) => {
  await openRetro(page);
  await selectReference(page, "CONTRA");

  await generateMission(
    page,
    "Night jungle mission with heavy rain and helicopter pursuit."
  );

  const state = await retroState(page);
  expect(state.state.gen).toBe(true);
  expect(state.state.reels).toHaveLength(3);
  expect(state.state.reels.every(r => r.shots.length === 8)).toBe(true);
  expect(state.state.reels[0].status).toBe("CURRENT");
  expect(state.state.reels[1].status).toBe("LOCKED");
  expect(state.state.reels[2].status).toBe("LOCKED");

  const allShots = state.state.reels.flatMap(r => r.shots);
  expect(allShots).toHaveLength(24);
  expect(new Set(allShots.map(s => `${s.stage}:${s.n}:${s.d}`)).size).toBe(24);
  expect(allShots.every(s => s.genre_core)).toBe(true);
  expect(allShots.every(s => s.current_state)).toBe(true);
});


test("Retro 64 browser smoke: intent controls environment and suppresses conflicting props", async ({ page }) => {
  await openRetro(page);
  await selectReference(page, "CONTRA");

  await generateMission(
    page,
    "Contra should run and fight underwater with a helicopter pursuit."
  );

  const state = await retroState(page);
  const sceneText = state.state.reels
    .flatMap(r => r.shots)
    .map(s => `${s.d} ${s.reference?.world_visual || ""} ${s.reference?.props || ""}`)
    .join("\n");

  expect(sceneText).toMatch(/underwater|aquatic|submerged|ocean/i);
  expect(sceneText).not.toMatch(/helicopter|sky|clouds|military jeep|cargo truck|radio tower/i);
});


test("Retro 64 browser smoke: 3 × 8 reel generation and continuity", async ({ page }) => {
  await openRetro(page);
  await selectReference(page, "CONTRA");
  await generateMission(
    page,
    "Night jungle mission with heavy rain and helicopter pursuit."
  );

  const reelButtons = page.locator('[data-reel]');
  await expect(reelButtons).toHaveCount(3);

  await page.locator('[data-reel="1"]').click();
  let state = await retroState(page);
  expect(state.state.reels[0].status).toBe("GENERATED");
  expect(state.state.reels[1].status).toBe("CURRENT");
  expect(state.state.reels[0].shots).toHaveLength(8);

  const reel1Last = state.state.reels[0].shots[7];
  const reel2First = state.state.reels[1].shots[0];
  expect(reel2First.continuity_from_previous).toEqual(expect.objectContaining({
    reel: 1,
    shot: 8,
    location: reel1Last.current_state.location,
    protagonist: reel1Last.current_state.protagonist,
    threat: reel1Last.current_state.threat,
    objective: reel1Last.current_state.objective,
    escalation: reel1Last.current_state.escalation
  }));

  await page.locator('[data-reel="2"]').click();
  state = await retroState(page);
  expect(state.state.reels[1].status).toBe("GENERATED");
  expect(state.state.reels[2].status).toBe("CURRENT");
  expect(state.state.reels[1].shots).toHaveLength(8);

  await page.locator('[data-reel="3"]').click();
  state = await retroState(page);
  expect(state.state.reels).toHaveLength(3);
  expect(state.state.reels.every(r => r.status === "GENERATED")).toBe(true);
  expect(state.state.reels.every(r => r.shots.length === 8)).toBe(true);

  const finalShots = state.state.reels.flatMap(r => r.shots);
  expect(finalShots).toHaveLength(24);
  expect(finalShots[23].stage).toBe("NEXT THREAT");
});


test("Retro 64 browser smoke: desert intent overrides reference jungle props", async ({ page }) => {
  await openRetro(page);
  await selectReference(page, "CONTRA");
  await generateMission(page, "Contra mission in desert to rescue the president");

  const state = await retroState(page);
  const sceneText = state.state.reels
    .flatMap(r => r.shots)
    .map(s => `${s.d} ${s.reference?.world_visual || ""} ${s.reference?.props || ""}`)
    .join("\n");

  expect(sceneText).toMatch(/desert/i);
  expect(sceneText).toMatch(/dunes|dry rocks|dust|tents/i);
  expect(sceneText).not.toMatch(/dense tropical jungle|rainforest|muddy shoulders|heavy rain|helicopter rotor/i);
});
