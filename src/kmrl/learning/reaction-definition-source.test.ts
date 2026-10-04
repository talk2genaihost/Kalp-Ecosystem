import test from "node:test";
import assert from "node:assert/strict";
import { REACTION_DEFINITION_SOURCE_SCHEMA } from "./reaction-definition-source.js";

test("reaction definition source schema matches the governed chemistry boundary", () => {
  assert.equal(REACTION_DEFINITION_SOURCE_SCHEMA.sheetName, "REACTION_DEFINITIONS");
  assert.deepEqual([...REACTION_DEFINITION_SOURCE_SCHEMA.columns], [
    "Reaction_ID", "Experiment_ID", "Reaction_Name", "Reactants",
    "Products", "Conditions", "Status",
  ]);
});