import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveRetroKnowledge,
  resolveRetroProps,
  resolveRetroProgressionDNA
} from "../src/development-studio/retro-knowledge-engine-v2.ts";

test("RETRO-64 Knowledge Engine v2: resolves desert physics and props from the knowledge base", () => {
  const result = resolveRetroKnowledge("Contra mission in desert to rescue the president", [
    "dunes",
    "sandbags",
    "coral",
    "jungle",
    "dry rocks"
  ]);

  assert.equal(result.world.world.id, "DESERT");
  assert.ok(result.world.physics.some(x => /terrestrial gravity/i.test(x)));
  assert.ok(result.world.physics.some(x => /loose sand/i.test(x)));
  assert.ok(result.world.allowedProps.includes("dunes"));
  assert.ok(result.world.allowedProps.includes("dry rocks"));
  assert.ok(result.world.suppressedProps.includes("coral"));
  assert.ok(result.world.conflicts.some(x => /coral/i.test(x)));
  assert.equal(result.progression.productionRules.shotsPerReel, 12);
});

test("RETRO-64 Knowledge Engine v2: underwater physics normalizes movement and rejects surface props", () => {
  const result = resolveRetroKnowledge(
    "Contra should run and fight underwater with a helicopter nearby",
    ["helicopter", "run", "sky", "coral"]
  );

  assert.equal(result.world.world.id, "UNDERWATER");
  assert.ok(result.world.normalizedMovements.some(x => /run.*swim/i.test(x)));
  assert.ok(result.world.suppressedProps.includes("helicopter"));
  assert.ok(result.world.suppressedProps.includes("sky"));
  assert.ok(result.world.conflicts.some(x => /helicopter/i.test(x)));
  assert.ok(result.world.world.physics.some(x => /buoyancy/i.test(x)));
});

test("RETRO-64 Knowledge Engine v2: prop resolver never returns suppressed world elements as allowed", () => {
  const result = resolveRetroProps(
    "desert rescue mission",
    ["dunes", "dry rocks", "coral", "submerged rocks", "dust"]
  );

  assert.ok(result.allowed.includes("dunes"));
  assert.ok(result.allowed.includes("dry rocks"));
  assert.ok(result.allowed.includes("dust"));
  assert.ok(result.suppressed.includes("coral"));
  assert.ok(result.suppressed.includes("submerged rocks"));
  assert.equal(result.conflicts.length, 2);
});

test("RETRO-64 Knowledge Engine v2: progression DNA is world-independent", () => {
  const progression = resolveRetroProgressionDNA();
  assert.deepEqual(progression.stages, [
    "ENTRY",
    "THREAT_INTRODUCTION",
    "FIRST_ENGAGEMENT",
    "CAPABILITY_ESCALATION",
    "MAJOR_ESCALATION",
    "BREAKTHROUGH",
    "GATE_OR_OBJECTIVE",
    "NEXT_THREAT"
  ]);
  assert.equal(progression.productionRules.minimumReels, 2);
  assert.equal(progression.productionRules.shotsPerReel, 12);
  assert.equal(progression.productionRules.finalReelConcludesMission, true);
  assert.equal(progression.productionRules.resumeFromPreviousReel, true);
});
