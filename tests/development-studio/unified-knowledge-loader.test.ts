import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import XLSX from "xlsx";
import { loadUnifiedKnowledgeSource } from "../../src/development-studio/unified-knowledge-loader";

test("unified workbook loader normalizes world, progression, effects and styles", () => {
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
