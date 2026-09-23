import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseRetro64Workbook } from "../src/development-studio/retro-64";
import { getRetroKnowledgeBase, resolveRetroKnowledgeWorld } from "../src/development-studio/retro-knowledge-base";

test("Retro 64 v2 workbook is authoritative for games and world knowledge", async () => {
  const bytes = await readFile(new URL("../data/KALP_Retro_64_Master_Reference.xlsx", import.meta.url));
  const registry = await parseRetro64Workbook(bytes);
  assert.equal(registry.schemaVersion, "2.0");
  assert.equal(registry.games.length, 5);
  assert.equal(registry.games.find(x => x.id === "G001")?.name, "Contra");

  const kb = getRetroKnowledgeBase();
  assert.equal(kb.schemaVersion, "2.0");
  assert.equal(kb.worlds.length, 6);
  const desert = resolveRetroKnowledgeWorld("Contra mission in desert to rescue the president");
  assert.equal(desert.id, "DESERT");
  assert.ok(desert.allowedProps.includes("dunes"));
  assert.ok(desert.suppressedProps.includes("coral"));

  const underwater = resolveRetroKnowledgeWorld("underwater rescue");
  assert.equal(underwater.movement.run, "swim");
  assert.ok(underwater.suppressedProps.includes("helicopter"));
  assert.equal(kb.productionRules.shotsPerReel, 12);
});
