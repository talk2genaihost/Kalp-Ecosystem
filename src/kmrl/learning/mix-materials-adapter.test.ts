import test from "node:test";
import assert from "node:assert/strict";
import { quantity } from "../simulation/v1-a/quantity.js";
import { scienceTick } from "../simulation/v1-d/science/engine.js";
import type { ReactionDefinition } from "../simulation/v1-d/chemistry/types.js";
import { MixMaterialsExperimentAdapter } from "./mix-materials-adapter.js";

const waterPlusSalt: ReactionDefinition = {
  id: "mix-water-salt",
  name: "Mix water and salt",
  reactants: [
    { materialId: "water", coefficient: 1 },
    { materialId: "salt", coefficient: 1 },
  ],
  products: [{ materialId: "salt-water-mixture", coefficient: 1 }],
};

test("mix-materials adapter executes a registered reaction through the science runtime", () => {
  const adapter = new MixMaterialsExperimentAdapter({
    initialMaterials: [
      { materialId: "water", amount: quantity(2, "mol") },
      { materialId: "salt", amount: quantity(1, "mol") },
    ],
    reaction: waterPlusSalt,
  }, scienceTick);

  const result = adapter.step(quantity(1, "s"));

  assert.equal(result.chemistry.status, "COMPLETED");
  assert.deepEqual(adapter.materialSnapshot(), [
    { materialId: "water", amount: quantity(1, "mol") },
    { materialId: "salt", amount: quantity(0, "mol") },
    { materialId: "salt-water-mixture", amount: quantity(1, "mol") },
  ]);
  assert.ok(result.events.some((event) => event.type === "REACTION_COMPLETED"));
});

test("mix-materials adapter is deterministic across repeated identical runs", () => {
  const run = () => {
    const adapter = new MixMaterialsExperimentAdapter({
      initialMaterials: [
        { materialId: "water", amount: quantity(3, "mol") },
        { materialId: "salt", amount: quantity(2, "mol") },
      ],
      reaction: waterPlusSalt,
    }, scienceTick);
    adapter.step(quantity(1, "s"));
    return adapter.stateSnapshot();
  };

  assert.deepEqual(run(), run());
});

test("mix-materials adapter reports no match when a reactant is absent", () => {
  const adapter = new MixMaterialsExperimentAdapter({
    initialMaterials: [{ materialId: "water", amount: quantity(1, "mol") }],
    reaction: waterPlusSalt,
  }, scienceTick);

  const result = adapter.step(quantity(1, "s"));

  assert.equal(result.chemistry.status, "NO_MATCH");
  assert.deepEqual(adapter.materialSnapshot(), [
    { materialId: "water", amount: quantity(1, "mol") },
  ]);
});

test("mix-materials adapter respects reaction temperature conditions", () => {
  const reaction: ReactionDefinition = {
    ...waterPlusSalt,
    id: "warm-water-salt",
    conditions: [{ type: "MIN_TEMPERATURE", temperature: quantity(50, "degC") }],
  };

  const adapter = new MixMaterialsExperimentAdapter({
    initialMaterials: [
      { materialId: "water", amount: quantity(1, "mol") },
      { materialId: "salt", amount: quantity(1, "mol") },
    ],
    initialTemperatureC: quantity(20, "degC"),
    reaction,
  }, scienceTick);

  const result = adapter.step(quantity(1, "s"));

  assert.equal(result.chemistry.status, "CONDITION_NOT_MET");
  assert.deepEqual(adapter.materialSnapshot(), [
    { materialId: "water", amount: quantity(1, "mol") },
    { materialId: "salt", amount: quantity(1, "mol") },
  ]);
});

test("mix-materials adapter rejects invalid material amounts and timestep", () => {
  assert.throws(() => new MixMaterialsExperimentAdapter({
    initialMaterials: [{ materialId: "water", amount: quantity(-1, "mol") }],
    reaction: waterPlusSalt,
  }, scienceTick), /material amount cannot be negative/);

  const adapter = new MixMaterialsExperimentAdapter({
    initialMaterials: [
      { materialId: "water", amount: quantity(1, "mol") },
      { materialId: "salt", amount: quantity(1, "mol") },
    ],
    reaction: waterPlusSalt,
  }, scienceTick);

  assert.throws(() => adapter.step(quantity(0, "s")), /dtS must be positive/);
});

test("mix-materials adapter resets materials and time", () => {
  const adapter = new MixMaterialsExperimentAdapter({
    initialMaterials: [
      { materialId: "water", amount: quantity(1, "mol") },
      { materialId: "salt", amount: quantity(1, "mol") },
    ],
    reaction: waterPlusSalt,
  }, scienceTick);

  adapter.step(quantity(1, "s"));
  adapter.reset();

  assert.deepEqual(adapter.materialSnapshot(), [
    { materialId: "water", amount: quantity(1, "mol") },
    { materialId: "salt", amount: quantity(1, "mol") },
  ]);
  assert.equal(adapter.stateSnapshot().timeS.value, 0);
});
