import test from "node:test";
import assert from "node:assert/strict";
import { buildCinematicKnowledgePackage } from "../../src/development-studio/cinematic-scene-package";

test("Cinematic Studio integration gate resolves canonical knowledge before production", () => {
  const pkg = buildCinematicKnowledgePackage({
    intent: "A mythic underwater rescue mission where a diver approaches submerged ruins",
    mission: "RESCUE",
    movement: "run",
    elements: ["coral", "submerged rocks", "underwater ruins", "helicopter"],
    visualStyle: "Mythic Cinematic Realism"
  });

  assert.equal(pkg.contract, "KALP-CINEMATIC-KNOWLEDGE-PACKAGE-1.0");
  assert.equal(pkg.source, "KALP_Master_Reference_UNIFIED_v3.xlsx");
  assert.equal(pkg.resolution.world.id, "UNDERWATER");
  assert.equal(pkg.resolution.movement, "swim");
  assert.ok(pkg.resolution.physics.some(x => /buoyancy/i.test(x)));
  assert.equal(pkg.resolution.progression.mission, "rescue");
  assert.equal(pkg.resolution.visualStyle?.["Style Name"], "Mythic Cinematic Realism");
  assert.equal(pkg.gate.worldLocked, true);
  assert.equal(pkg.gate.physicsResolved, true);
  assert.equal(pkg.gate.progressionResolved, true);
  assert.equal(pkg.gate.movementResolved, true);
  assert.equal(pkg.gate.visualStyleResolved, true);
  assert.equal(pkg.gate.effectsResolved, true);
  assert.equal(pkg.gate.status, "FAIL");
  assert.ok(pkg.gate.conflicts.some(x => /helicopter/i.test(x)));
});
