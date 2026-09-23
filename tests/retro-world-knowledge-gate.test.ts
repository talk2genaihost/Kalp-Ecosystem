import assert from "node:assert/strict";
import test from "node:test";
import {
  getRetroKnowledgeBase,
  getRetroKnowledgeWorld,
  resolveRetroKnowledgeWorld,
  normalizeRetroMovement,
  resolveRetroConflict,
  validateRetroWorldElements
} from "../src/development-studio/retro-knowledge-base.ts";

test("Retro Knowledge Base gate: every supported world has physics, props, movement, VFX and audio", () => {
  const kb = getRetroKnowledgeBase();
  assert.equal(kb.schemaVersion, "2.0");
  assert.equal(kb.worlds.length, 6);
  for (const world of kb.worlds) {
    assert.ok(world.physics.length > 0);
    assert.ok(world.allowedProps.length > 0);
    assert.ok(Object.keys(world.movement).length > 0);
    assert.ok(world.vfx.length > 0);
    assert.ok(world.audio.length > 0);
  }
});

test("Retro Knowledge Base gate: intent resolves to world knowledge", () => {
  assert.equal(resolveRetroKnowledgeWorld("Contra mission in desert to rescue the president").id, "DESERT");
  assert.equal(resolveRetroKnowledgeWorld("fight underwater and rescue the president").id, "UNDERWATER");
  assert.equal(resolveRetroKnowledgeWorld("urban rooftop extraction").id, "URBAN");
});

test("Retro Knowledge Base gate: world physics normalizes incompatible movement", () => {
  const underwater = getRetroKnowledgeWorld("UNDERWATER");
  assert.equal(normalizeRetroMovement(underwater, "run"), "swim");
  assert.equal(resolveRetroConflict("UNDERWATER", "helicopter"), "PROHIBIT");
});

test("Retro Knowledge Base gate: incompatible props are suppressed before generation", () => {
  const desert = getRetroKnowledgeWorld("DESERT");
  const result = validateRetroWorldElements(desert, ["dunes", "coral", "submerged rocks", "desert vehicles"]);
  assert.equal(result.status, "FAIL");
  assert.ok(result.suppressed.includes("coral"));
  assert.ok(result.suppressed.includes("submerged rocks"));
});

test("Retro Knowledge Base gate: mission production constraints are explicit", () => {
  const kb = getRetroKnowledgeBase();
  assert.equal(kb.productionRules.minimumReels, 2);
  assert.equal(kb.productionRules.shotsPerReel, 12);
  assert.equal(kb.productionRules.finalReelConcludesMission, true);
  assert.equal(kb.productionRules.resumeFromPreviousReel, true);
});
