import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import XLSX from "xlsx";
import { loadUnifiedKnowledgeSource } from "../../src/development-studio/unified-knowledge-loader";

test("unified workbook loader normalizes a synthetic workbook", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kalp-unified-"));
  const file = path.join(dir, "fixture.xlsx");
  const wb = XLSX.utils.book_new();

  const add = (name: string, data: unknown[][]) =>
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), name);

  add("WORLD_REGISTRY", [["world_id","label"],["DESERT","Desert"]]);
  add("WORLD_PHYSICS", [["world_id","rule_id","physics_rule"],["DESERT","P1","Loose sand"]]);
  add("WORLD_PROPS", [["world_id","allowed_props","suppressed_props"],["DESERT","dunes;dust","coral"]]);
  add("MOVEMENT_DYNAMICS", [["world_id","input_movement","normalized_movement"],["DESERT","run","run"]]);
  add("VFX_AUDIO", [["world_id","vfx","audio"],["DESERT","dust plumes","dry wind"]]);
  add("CONFLICT_RULES", [["world_id","combination","resolution"],["DESERT","coral","PROHIBIT"]]);
  add("PROGRESSION_DNA", [["stage_order","stage_id"],[1,"ENTRY"]]);
  add("MISSION_ARCHETYPES", [["archetype","progression_focus"],["ESCAPE","entry → breakthrough"]]);
  add("EPISODE_RULES", [["rule_id","rule"],["EP-005","3"],["EP-006","10"],["EP-007","true"],["EP-008","false"]]);
  add("01_Camera_Movement", [["Shortcut","Capability"],["/dolly_in","push camera forward"]]);
  add("Style Entry Registry", [["ID","Style Name"],[1,"Neo-Noir"]]);
  add("Classification Summary", [["Family","Count"],["Cinematic",1]]);

  XLSX.writeFile(wb, file);
  const loaded = loadUnifiedKnowledgeSource(file);

  assert.equal(loaded.retro.schemaVersion, "3.0");
  assert.equal(loaded.retro.worlds[0].id, "DESERT");
  assert.deepEqual(loaded.retro.worlds[0].allowedProps, ["dunes", "dust"]);
  assert.equal(loaded.retro.conflictRules[0][2], "PROHIBIT");
  assert.deepEqual(loaded.retro.progressionStages, ["ENTRY"]);
  assert.equal(loaded.retro.productionRules.minimumReels, 3);
  assert.equal(loaded.retro.productionRules.shotsPerReel, 10);
  assert.equal(loaded.retro.productionRules.resumeFromPreviousReel, false);
  assert.equal(loaded.effects.domains["01_Camera_Movement"][0].Shortcut, "/dolly_in");
  assert.equal(loaded.visualStyles.entries[0]["Style Name"], "Neo-Noir");

  fs.rmSync(dir, { recursive: true, force: true });
});


test("canonical unified workbook loads as the runtime authority", () => {
  const loaded = loadUnifiedKnowledgeSource(path.resolve(process.cwd(), "data", "KALP_Master_Reference_UNIFIED_v3.xlsx"));

  assert.equal(loaded.retro.schemaVersion, "3.0");
  assert.equal(loaded.retro.sourceArtifact, "KALP_Master_Reference_UNIFIED_v3.xlsx");
  assert.deepEqual(loaded.retro.worlds.map(x => x.id), [
    "SURFACE", "UNDERWATER", "DESERT", "SNOW", "URBAN", "SPACE"
  ]);
  assert.equal(loaded.retro.worlds.find(x => x.id === "UNDERWATER")?.movement.run, "swim");
  assert.equal(loaded.retro.worlds.find(x => x.id === "SPACE")?.physics[0], "Microgravity/zero-g");
  assert.deepEqual(loaded.retro.conflictRules.find(x => x[0] === "UNDERWATER" && x[1] === "helicopter"), [
    "UNDERWATER", "helicopter", "PROHIBIT"
  ]);
  assert.deepEqual(loaded.retro.progressionStages, [
    "ENTRY", "THREAT_INTRODUCTION", "FIRST_ENGAGEMENT", "CAPABILITY_ESCALATION",
    "MAJOR_ESCALATION", "BREAKTHROUGH", "GATE_OR_OBJECTIVE", "NEXT_THREAT"
  ]);
  assert.equal(loaded.retro.productionRules.minimumReels, 2);
  assert.equal(loaded.retro.productionRules.shotsPerReel, 12);
  assert.equal(loaded.retro.productionRules.finalReelConcludesMission, true);
  assert.equal(loaded.retro.productionRules.resumeFromPreviousReel, true);
  assert.equal(Object.keys(loaded.effects.domains).length, 12);
  assert.equal(loaded.effects.domains["01_Camera_Movement"][0].Shortcut, "/dolly_in");
  assert.equal(loaded.effects.domains["12_Sound_Music_VO_SFX"][0].Shortcut, "/whoosh_soft");
  assert.equal(loaded.visualStyles.entries.length, 54);
  assert.equal(loaded.visualStyles.entries[12]["Style Name"], "Mythic Cinematic Realism");
});


test("shared cinematic resolver resolves world, physics, progression, effects, style and conflicts", async () => {
  const { resolveCinematicScene } = await import("../../src/development-studio/cinematic-knowledge-resolver");
  const resolved = resolveCinematicScene({
    intent: "An underwater rescue mission with a diver approaching a submerged ruin under pressure",
    mission: "RESCUE", movement: "run",
    elements: ["coral", "submerged rocks", "helicopter", "sea floor"],
    visualStyle: "Mythic Cinematic Realism"
  });
  assert.equal(resolved.source, "KALP_Master_Reference_UNIFIED_v3.xlsx");
  assert.equal(resolved.world.id, "UNDERWATER");
  assert.equal(resolved.movement, "swim");
  assert.ok(resolved.physics.some(x => x.toLowerCase().includes("buoyancy")));
  assert.equal(resolved.progression.stage, "ENTRY");
  assert.match(resolved.progression.focus ?? "", /locate.*survive.*breach.*reach target.*extract/);
  assert.equal(resolved.validation.status, "FAIL");
  assert.ok(resolved.validation.suppressed.includes("helicopter"));
  assert.ok(resolved.validation.conflicts.some(x => x.includes("helicopter")));
  assert.ok(resolved.effects["01_Camera_Movement"]);
  assert.ok(resolved.effects["03_Lens_Optical"]);
  assert.ok(resolved.effects["07_Lighting_Light_Effects"]);
  assert.ok(resolved.effects["08_VFX_Particles_Atmospherics"]);
  assert.ok(resolved.effects["12_Sound_Music_VO_SFX"]);
  assert.equal(resolved.visualStyle?.["Style Name"], "Mythic Cinematic Realism");
});
