import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  buildIntentDrivenRetroEpisode,
  buildRetroProgressionModel,
  validateRetroProductionJson,
  validateRetroRendererReadiness,
  validateRetroCharacterContinuity,
  resolveRetroSemanticWorld,
  type RetroGameReference,
} from "../src/development-studio/retro-64.ts";

const contra: RetroGameReference = {
  id: "G001",
  name: "Contra",
  worksheet: "G001_Contra",
  status: "ACTIVE",
  durationSeconds: 60,
  format: "9:16",
  character_dna: {
    character_id: "CONTRA_PROTAGONIST_001",
    identity: "Elite military commando",
    protagonist_name: "Contra Hero",
    silhouette: "Athletic military silhouette",
    head: "Canonical commando face and hair",
    costume: "Canonical tactical combat uniform",
    palette: "Military green and neutral tactical tones",
    equipment: "Assault rifle and tactical gear",
    movement: "Run, sprint, jump, slide, crouch, dodge",
    performance: "Fast arcade-action physicality",
    continuity_lock: "Keep face, anatomy, costume, equipment and silhouette continuous.",
  },
  world: "Dense tropical military-industrial jungle bordering a fortified compound",
  terrain: "Broken asphalt service road, muddy shoulders, bridges",
  obstacles: "Roadblocks, abandoned vehicles, sandbags, trenches",
  enemies: "Armed soldiers, patrol units, armored sentry, helicopter support",
  moves: "Run, sprint, jump, slide, crouch, dodge, climb",
  weapons: "Assault rifle, heavy machine gun, explosive launcher",
  powerUps: "Weapon upgrade crate, ammunition cache, temporary armor",
  abilities: "Rapid fire, tactical dodge, precision burst, explosive strike",
  props: "Military jeep, cargo truck, barricade, radio tower, fuel drums",
  camera: "Low tracking, over-shoulder combat, wide establishing, handheld chase",
  vfx: "Muzzle flashes, shell casings, sparks, smoke, rain spray, controlled explosions",
  sound: "Heavy percussion, engine rumble, gunfire, rain, radio chatter, impact hits",
  realistic: "Photorealistic cinematic military action while preserving fast arcade rhythm",
  frames: [
    { title: "The Road", action: "Hero enters deserted road as distant alarms activate." },
    { title: "The Blockade", action: "Patrol vehicle blocks route and enemies emerge." },
    { title: "Incoming Fire", action: "Hero takes cover as fire crosses road." },
    { title: "Weapon Upgrade", action: "Hero reaches supply crate and upgrades weapon." },
    { title: "Escalation", action: "Armored enemy arrives; road becomes moving battlefield." },
    { title: "Breakthrough", action: "Hero uses environment and explosives to break through." },
    { title: "The Gate", action: "Massive gate opens, revealing larger enemy force." },
    { title: "Cliffhanger", action: "Hero runs toward gate; screen cuts to black on new threat." },
  ],
};

test("RETRO-64 Gate v1.0: builds an 8-step progression model", () => {
  const model = buildRetroProgressionModel(contra);
  assert.equal(model.modelVersion, "1.1");
  assert.equal(model.progression.length, 8);
  assert.deepEqual(model.progression.map((x) => x.stage), [
    "ENTRY",
    "THREAT_INTRODUCTION",
    "FIRST_ENGAGEMENT",
    "CAPABILITY_ESCALATION",
    "MAJOR_ESCALATION",
    "BREAKTHROUGH",
    "GATE_OR_OBJECTIVE",
    "NEXT_THREAT",
  ]);
});

test("RETRO-64 Gate v1.0: generates and validates the requested night-rain-helicopter episode", () => {
  const episode = buildIntentDrivenRetroEpisode({
    game: contra,
    mode: "EXPANSION",
    intent: "Night jungle mission with heavy rain and helicopter pursuit.",
    episodeId: "CONTRA_GATE_TEST_001",
  });

  assert.equal(episode.contract, "KALP-RETRO-64-PRODUCTION-EPISODE-1.0");
  assert.equal(episode.intent, "Night jungle mission with heavy rain and helicopter pursuit.");
  assert.equal(episode.storyboard.length, 8);
  assert.equal(episode.validation.status, "PASS");
  assert.equal(validateRetroProductionJson(episode).status, "PASS");
  assert.equal(validateRetroCharacterContinuity(episode).status, "PASS");
  assert.equal(validateRetroRendererReadiness(episode).status, "PASS");
  assert.ok(Array.isArray(episode.flexible_elements));
  assert.ok(episode.storyboard.every((s) => typeof s.dialogue === "string" && s.dialogue.trim()));
  assert.ok(episode.storyboard.every((s) => Number.isInteger(s.frame) && Number.isInteger(s.reference_frame)));
  assert.ok(episode.storyboard.every((s) => s.audio_dna && typeof s.audio_dna.music === "string" && Array.isArray(s.audio_dna.sfx)));

  const stages = episode.storyboard.map((s) => s.stage);
  assert.deepEqual(stages, [
    "ENTRY",
    "THREAT_INTRODUCTION",
    "FIRST_ENGAGEMENT",
    "CAPABILITY_ESCALATION",
    "MAJOR_ESCALATION",
    "BREAKTHROUGH",
    "GATE_OR_OBJECTIVE",
    "NEXT_THREAT",
  ]);

  assert.match(episode.storyboard[0].description, /night-time/i);
  assert.match(episode.storyboard[0].description, /heavy rain/i);
  assert.match(episode.storyboard[1].description, /helicopter/i);
  assert.match(episode.storyboard[3].capability_gain, /upgrade/i);
  assert.match(episode.storyboard[4].threat_state, /helicopter/i);
  assert.match(episode.storyboard[6].objective_state, /gate/i);
  assert.match(episode.storyboard[7].threat_state, /larger|new|aerial/i);
});

test("RETRO-64 Gate v1.0: renderer receives direct scene packets without unresolved tokens", () => {
  const episode = buildIntentDrivenRetroEpisode({
    game: contra,
    mode: "VARIATION",
    intent: "Night jungle mission with heavy rain and helicopter pursuit.",
    episodeId: "CONTRA_RENDERER_TEST_001",
  });
  const result = validateRetroRendererReadiness(episode);
  assert.equal(result.status, "PASS");
  assert.equal(result.errors.length, 0);
});


test("RETRO-64 Gate v1.1: generated episode is wired directly into the dashboard Storyboard surface", () => {
  const dashboardPath = path.resolve(process.cwd(), "apps/cinematic-studio/index.html");
  const html = fs.readFileSync(dashboardPath, "utf8");

  assert.match(html, /id="retroStoryboard"/);
  assert.match(html, /retroEpisode\?\.storyboard\?\.length===8/);
  assert.match(html, /renderStoryboardView\(\);showView\("storyboard"\)/);
  assert.match(html, /Retro 64 storyboard generated directly on the Storyboard dashboard/);
  assert.match(html, /Renderer-facing string fields cannot be empty/);
  assert.match(html, /renderer_audio_dna/);
});


test("RETRO-64 semantic intent gate: underwater combat intent becomes scene content", () => {
  const mario: RetroGameReference = {
    ...contra,
    id: "G002",
    name: "Mario",
    worksheet: "G002_Mario",
    world: "Mushroom Kingdom with bright surface grasslands, underground passages, aquatic courses and fortified castles",
    terrain: "Grassland, underground stone passages, water courses, elevated platforms, castle interiors and flagpole approaches",
    enemies: "Goombas, Koopa Troopas, Buzzy Beetles, Piranha Plants, Cheep-Cheeps, Hammer Bros., Lakitu and Bowser",
    moves: "Run, sprint, jump, stomp, swim, duck, climb vines and change direction in midair",
    powerUps: "Mushroom, Fire Flower, Super Star and game-native power-ups",
    frames: contra.frames
  };
  const episode = buildIntentDrivenRetroEpisode({
    game: mario,
    mode: "EXPANSION",
    intent: "Mario goes underwater and fight with Snakes and sharks",
    episodeId: "MARIO_UNDERWATER_INTENT_001",
  });
  assert.equal(episode.validation.status, "PASS");
  assert.match(episode.storyboard[0].description, /submerged|underwater/i);
  assert.match(episode.storyboard[1].enemy_presence, /snakes/i);
  assert.match(episode.storyboard[1].enemy_presence, /sharks/i);
  assert.match(episode.storyboard[2].action, /fight/i);
  assert.match(episode.storyboard[4].description, /snakes|sharks/i);
  assert.match(episode.storyboard[5].description, /underwater|submerged/i);
});


test("RETRO-64 semantic world gate: underwater intent suppresses surface-only props and normalizes movement", () => {
  const resolution = resolveRetroSemanticWorld("Contra should run and fight underwater with a helicopter nearby.");
  assert.equal(resolution.world_id, "UNDERWATER");
  assert.match(resolution.normalized_intent, /swim/i);
  assert.ok(!/helicopter/i.test(resolution.normalized_intent));
  assert.ok(resolution.suppressed_reference_elements.some(x => /helicopter/i.test(x)));
  assert.ok(resolution.applied_rules.some(x => /sky|submerged|helicopter/i.test(x)));
});

test("RETRO-64 semantic world gate: generated underwater episode uses underwater prop vocabulary", () => {
  const episode = buildIntentDrivenRetroEpisode({
    game: contra,
    mode: "EXPANSION",
    intent: "Contra should run and fight underwater with a helicopter pursuit.",
    episodeId: "CONTRA_UNDERWATER_WORLD_PROP_001",
  });
  assert.equal(episode.validation.status, "PASS");
  assert.equal(episode.semantic_resolution.world_id, "UNDERWATER");
  assert.ok(episode.semantic_resolution.suppressed_reference_elements.some((x:string) => /helicopter/i.test(x)));
  assert.ok(episode.storyboard.every((s:any) => s.semantic_world_id === "UNDERWATER"));
  assert.ok(episode.storyboard.every((s:any) => !/helicopter|sky|clouds|radio tower|cargo truck|military jeep/i.test(
    [s.visual, s.environment, s.enemy_presence, s.action].join(" ")
  )));
  assert.ok(episode.storyboard.every((s:any) => /swim|underwater propulsion|dive|aquatic/i.test(
    [s.action, s.environment, s.world_state].join(" ")
  )));
});

test("mission arc planner supports user-selected reel counts and final conclusion",()=>{
  const plan2=buildRetroMissionArcPlan("Contra should rescue the U.S. President.",2);
  expect(plan2.reel_count).toBe(2);
  expect(plan2.total_shots).toBe(24);
  expect(plan2.reels).toHaveLength(2);
  expect(plan2.reels.every(r=>r.shots===12)).toBe(true);
  expect(plan2.reels[1].role).toBe("MISSION_RESOLUTION");
  expect(plan2.reels[1].concludes_mission).toBe(true);
  expect(plan2.reels[0].concludes_mission).toBe(false);

  const plan5=buildRetroMissionArcPlan("Contra should rescue the U.S. President.",5);
  expect(plan5.total_shots).toBe(60);
  expect(plan5.final_reel).toBe(5);
  expect(plan5.reels).toHaveLength(5);
  expect(plan5.reels[0].role).toBe("MISSION_SETUP");
  expect(plan5.reels[3].role).toBe("MISSION_CRISIS");
  expect(plan5.reels[4].role).toBe("MISSION_RESOLUTION");
  expect(plan5.completion_rule).toMatch(/final reel/i);
});

test("mission arc planner rejects fewer than two reels",()=>{
  expect(()=>buildRetroMissionArcPlan("Contra should rescue the U.S. President.",1)).toThrow();
  expect(()=>buildRetroMissionArcPlan("Contra should rescue the U.S. President.",0)).toThrow();
});
