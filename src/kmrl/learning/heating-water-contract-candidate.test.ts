import assert from "node:assert/strict";
import test from "node:test";
import { getHeatingWaterContractCandidate } from "./heating-water-contract-candidate.js";

test("heating-water contract candidate preserves the finalized source-aligned boundary", () => {
  const contract = getHeatingWaterContractCandidate();

  assert.equal(contract.modelId, "heating_water");
  assert.equal(contract.experimentId, "CHE-MIX-001");
  assert.equal(contract.domain, "CHEMISTRY");
  assert.equal(contract.status, "FINALIZATION_CANDIDATE");
  assert.equal(contract.authority, "IMPLEMENTATION_ALIGNED");
  assert.deepEqual(contract.requiredInputs, ["mass", "energy", "dt"]);
  assert.deepEqual(contract.stateOutputs, ["temperature", "time"]);
  assert.equal(contract.constants.specificHeatCapacityJPerKgK, 4186);
  assert.equal(contract.constants.initialTemperatureC, 20);
  assert.equal(contract.ruleOrEquation, "Q=m*c*dT; dT=Q/(m*c); T_next=T_current+dT");
});

test("heating-water contract candidate is defensively copied", () => {
  const first = getHeatingWaterContractCandidate();
  const second = getHeatingWaterContractCandidate();

  assert.notEqual(first, second);
  assert.notEqual(first.requiredInputs, second.requiredInputs);
  assert.notEqual(first.constants, second.constants);
});
