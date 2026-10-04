import assert from "node:assert/strict";
import test from "node:test";
import { createKMRLModelRegistry } from "./model-registry.js";
import type { StemLabCatalog } from "./excel-catalog-loader.js";

function catalog(): StemLabCatalog {
  return {
    experiments: [],
    modelContracts: [
      { modelId:"constant_force",domain:"PHYSICS",requiredInputs:["mass","force","dt"],stateOutputs:["position","velocity","acceleration"],ruleOrEquation:"F=m*a" },
      { modelId:"heating_water",domain:"CHEMISTRY",requiredInputs:["mass","specific_heat","energy"],stateOutputs:["temperature"],ruleOrEquation:"Q=m*c*dT" },
      { modelId:"future_model",domain:"PHYSICS",requiredInputs:["x"],stateOutputs:["y"],ruleOrEquation:"future" }
    ],
    parameters:[],procedureSteps:[],measurements:[],safety:[],materials:[],outcomes:[],curriculumMap:[],mediaAssets:[]
  };
}

test("registry marks known KMRL adapters executable", () => {
  const registry = createKMRLModelRegistry(catalog());
  assert.equal(registry.resolve("constant_force").status, "EXECUTABLE");
  assert.equal(registry.resolve("heating_water").status, "EXECUTABLE");
});

test("registry keeps unknown model contracts non-executable", () => {
  const registry = createKMRLModelRegistry(catalog());
  const result = registry.resolve("future_model");
  assert.equal(result.status, "NOT_EXECUTABLE");
  assert.equal(result.implementation, undefined);
});

test("registry rejects unknown model IDs", () => {
  const registry = createKMRLModelRegistry(catalog());
  assert.throws(() => registry.resolve("missing"), /Model is not registered: missing/);
});

test("registry lists every catalog model without changing catalog contracts", () => {
  const registry = createKMRLModelRegistry(catalog());
  assert.deepEqual(registry.list().map((entry) => entry.modelId), [
    "constant_force","heating_water","future_model"
  ]);
});
