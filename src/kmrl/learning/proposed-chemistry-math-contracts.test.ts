import assert from "node:assert/strict";
import test from "node:test";
import {
  getProposedModelContract,
  listProposedModelContracts,
  PROPOSED_CHEMISTRY_MATH_CONTRACTS,
} from "./proposed-chemistry-math-contracts.js";

test("proposed chemistry and mathematics contracts remain explicitly non-canonical", () => {
  assert.equal(PROPOSED_CHEMISTRY_MATH_CONTRACTS.length, 27);
  assert.ok(PROPOSED_CHEMISTRY_MATH_CONTRACTS.every((contract) =>
    contract.status === "PROPOSED" &&
    contract.authority === "INFERRED" &&
    contract.sourceBasis === "EXPERIMENT_CATALOG + MODEL_CONTRACTS_PLACEHOLDER"
  ));
});

test("proposed contract lookup is deterministic", () => {
  const linear = getProposedModelContract("linear_equation");
  assert.equal(linear?.domain, "MATHEMATICS");
  assert.equal(linear?.proposedRuleOrEquation, "ax+b=0");

  const neutralization = getProposedModelContract("acid_base_neutralization");
  assert.equal(neutralization?.domain, "CHEMISTRY");
});

test("proposed contract listing returns defensive arrays", () => {
  const listed = listProposedModelContracts();
  assert.equal(listed.length, 27);
  const original = listed[0].proposedInputs.length;
  (listed[0].proposedInputs as string[]).push("MUTATION");
  assert.equal(listProposedModelContracts()[0].proposedInputs.length, original);
});
