import test from "node:test";
import assert from "node:assert/strict";
import { generateRetroScene } from "../src/development-studio/retro-scene-generation-engine-v1";

test("RETRO-64 generates a two-reel 24-shot production package", () => {
  const pkg = generateRetroScene({
    world: "DESERT",
    mission: "RESCUE",
    progression: "FIRST_ENGAGEMENT",
    protagonist: "RAM_001",
    threat: "DRAGON_001",
    objective: "Locate and extract the protected target",
  });

  assert.equal(pkg.contract, "KALP-RETRO64-PRODUCTION-PACKAGE-1.0");
  assert.equal(pkg.continuity.reelCount, 2);
  assert.equal(pkg.continuity.shotsPerReel, 12);
  assert.equal(pkg.shots.length, 24);
  assert.equal(pkg.shots[0].reel, 1);
  assert.equal(pkg.shots[11].reel, 1);
  assert.equal(pkg.shots[12].reel, 2);
  assert.equal(pkg.shots[23].reel, 2);
  assert.equal(pkg.shots[0].characters[0], "RAM_001");
  assert.equal(pkg.shots[0].characters[1], "DRAGON_001");
  assert.equal(pkg.validation.status, "PASS");
});

test("RETRO-64 applies desert world knowledge", () => {
  const pkg = generateRetroScene({
    world: "DESERT",
    mission: "RESCUE",
    protagonist: "RAM_001",
    threat: "DRAGON_001",
  });

  assert.equal(pkg.knowledge.world.world.id, "DESERT");
  assert.ok(pkg.knowledge.world.physics.some(x => x.includes("loose sand")));
  assert.ok(pkg.knowledge.world.vfx.includes("dust plumes"));
});
