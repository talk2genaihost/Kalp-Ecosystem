import assert from "node:assert/strict";
import test from "node:test";
import { HEATING_WATER_CANONICAL_CONTRACT } from "./heating-water-canonical-contract.js";

test("heating-water canonical contract matches Excel v1.1 promotion", () => {
  const contract = HEATING_WATER_CANONICAL_CONTRACT;
  assert.equal(contract.modelId, "heating_water");
  assert.equal(contract.experimentId, "CHE-MIX-001");
  assert.equal(contract.domain, "CHEMISTRY");
  assert.equal(contract.authority, "CANONICAL");
  assert.deepEqual(contract.requiredInputs, ["mass", "energy", "dt"]);
  assert.deepEqual(contract.stateOutputs, ["temperature", "time"]);
  assert.equal(contract.specificHeatCapacityJPerKgK, 4186);
  assert.equal(contract.initialTemperatureC, 20);
});
