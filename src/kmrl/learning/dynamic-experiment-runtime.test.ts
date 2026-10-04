import assert from "node:assert/strict";
import test from "node:test";
import { createDynamicExperimentRuntime } from "./dynamic-experiment-runtime.js";
import { loadStemLabCatalog } from "./excel-catalog-loader.js";
import { validateStemLabCatalog } from "./excel-catalog-validator.js";
import { createKMRLModelRegistry } from "./model-registry.js";
import { readFileSync } from "node:fs";

test("catalog experiment launches through generic runtime without experiment-specific UI code", () => {
  const workbook = readFileSync("/mnt/data/KALP_STEM_LAB_MASTER_CATALOG_v1_0.xlsx");
  const catalog = loadStemLabCatalog(workbook);
  const validation = validateStemLabCatalog(catalog);
  assert.equal(validation.valid, true);

  const registry = createKMRLModelRegistry(catalog);
  const runtime = createDynamicExperimentRuntime(
    catalog,
    registry,
    validation,
    "PHY-MEC-001",
  );

  let snapshot = runtime.getSnapshot();
  assert.equal(snapshot.experimentId, "PHY-MEC-001");
  assert.equal(snapshot.modelId, "constant_force");
  assert.equal(snapshot.status, "CREATED");

  const mass = snapshot.parameters.find((parameter) => parameter.parameterName === "primary_parameter");
  const force = snapshot.parameters.find((parameter) => parameter.parameterName === "secondary_parameter");
  assert.ok(mass);
  assert.ok(force);

  snapshot = runtime.dispatch({ type: "START" });
  snapshot = runtime.dispatch({ type: "SET_PARAMETER", parameterId: force!.parameterId, value: 10 });
  snapshot = runtime.dispatch({ type: "STEP" });
  assert.equal(snapshot.tick, 1);

  snapshot = runtime.dispatch({ type: "MEASURE" });
  assert.ok(snapshot.measurements.length >= 1);
  assert.equal(snapshot.measurements[0].id, "position");
});

test("a second Excel-defined experiment using the same registered model needs no new runtime implementation", () => {
  const workbook = readFileSync("/mnt/data/KALP_STEM_LAB_MASTER_CATALOG_v1_0.xlsx");
  const catalog = loadStemLabCatalog(workbook);
  const validation = validateStemLabCatalog(catalog);
  assert.equal(validation.valid, true);

  const clone = structuredClone(catalog);
  clone.experiments.push({
    ...clone.experiments[0],
    experimentId: "PHY-MEC-001-CLONE",
    experimentName: "Constant Force Motion — Catalog Clone",
    safetyRef: "PHY-MEC-001-SAFE",
  });
  clone.parameters = clone.parameters
    .filter((parameter) => parameter.experimentId === "PHY-MEC-001")
    .map((parameter) => ({ ...parameter, experimentId: "PHY-MEC-001-CLONE" }))
    .concat(clone.parameters.filter((parameter) => parameter.experimentId !== "PHY-MEC-001"));
  clone.procedureSteps = clone.procedureSteps
    .filter((step) => step.experimentId === "PHY-MEC-001")
    .map((step) => ({ ...step, experimentId: "PHY-MEC-001-CLONE" }))
    .concat(clone.procedureSteps.filter((step) => step.experimentId !== "PHY-MEC-001"));
  clone.measurements = clone.measurements
    .filter((measurement) => measurement.experimentId === "PHY-MEC-001")
    .map((measurement) => ({ ...measurement, experimentId: "PHY-MEC-001-CLONE", measurementId: measurement.measurementId.replace("PHY-MEC-001", "PHY-MEC-001-CLONE") }))
    .concat(clone.measurements.filter((measurement) => measurement.experimentId !== "PHY-MEC-001"));
  clone.safety = clone.safety
    .filter((safety) => safety.experimentId === "PHY-MEC-001")
    .map((safety) => ({ ...safety, experimentId: "PHY-MEC-001-CLONE", safetyId: "PHY-MEC-001-CLONE-SAFE" }))
    .concat(clone.safety.filter((safety) => safety.experimentId !== "PHY-MEC-001"));
  clone.outcomes = clone.outcomes
    .filter((outcome) => outcome.experimentId === "PHY-MEC-001")
    .map((outcome) => ({ ...outcome, experimentId: "PHY-MEC-001-CLONE", outcomeId: outcome.outcomeId.replace("PHY-MEC-001", "PHY-MEC-001-CLONE") }))
    .concat(clone.outcomes.filter((outcome) => outcome.experimentId !== "PHY-MEC-001"));

  const clonedValidation = validateStemLabCatalog(clone);
  assert.equal(clonedValidation.valid, true);

  const registry = createKMRLModelRegistry(clone);
  const runtime = createDynamicExperimentRuntime(
    clone,
    registry,
    clonedValidation,
    "PHY-MEC-001-CLONE",
  );
  runtime.dispatch({ type: "START" });
  const result = runtime.dispatch({ type: "STEP" });
  assert.equal(result.tick, 1);
  assert.equal(result.modelId, "constant_force");
});