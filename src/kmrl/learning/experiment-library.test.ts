import assert from "node:assert/strict";
import test from "node:test";
import { GuidedExperimentSession, getExperiment, listExperiments } from "./experiment-library.js";

test("KMRL v1.2 catalog exposes chemistry and physics experiments", () => {
  const experiments = listExperiments();
  assert.ok(experiments.some((item) => item.domain === "CHEMISTRY"));
  assert.ok(experiments.some((item) => item.domain === "PHYSICS"));
  assert.ok(experiments.every((item) => item.steps.length > 0));
  assert.ok(experiments.every((item) => item.safety.length > 0));
});

test("catalog lookup returns an isolated experiment definition", () => {
  const experiment = getExperiment("chemistry-heating-observation");
  assert.equal(experiment.domain, "CHEMISTRY");
  assert.ok(experiment.objective.length > 0);
  assert.ok(experiment.initialState);

  const copy = getExperiment(experiment.id);
  const mutableSteps = copy.steps.map((step) => ({ ...step }));
  mutableSteps[0] = { ...mutableSteps[0], title: "mutated" };
  assert.notEqual(getExperiment(experiment.id).steps[0].title, "mutated");
  assert.equal(copy.steps[0].title, experiment.steps[0].title);
});

test("guided session advances only through the declared steps", () => {
  const session = new GuidedExperimentSession(getExperiment("physics-constant-force"), "exp-v12-001");
  assert.equal(session.status(), "READY");
  assert.equal(session.currentStep().id, "observe");

  session.completeCurrentStep();
  assert.equal(session.currentStep().id, "apply-force");
  assert.equal(session.progress().completed, 1);

  session.completeCurrentStep();
  session.completeCurrentStep();
  session.completeCurrentStep();
  assert.equal(session.status(), "COMPLETED");
  assert.equal(session.progress().completed, 4);
});

test("guided session can reset without changing the experiment definition", () => {
  const experiment = getExperiment("chemistry-mixing-observation");
  const session = new GuidedExperimentSession(experiment, "exp-v12-002");
  session.completeCurrentStep();
  session.reset();
  assert.equal(session.status(), "READY");
  assert.equal(session.progress().completed, 0);
  assert.equal(session.currentStep().id, experiment.steps[0].id);
});

test("session produces a launch snapshot compatible with ExperimentRuntime", () => {
  const session = new GuidedExperimentSession(getExperiment("physics-constant-force"), "exp-v12-003");
  const snapshot = session.createLaunchSnapshot();
  assert.equal(snapshot.experimentId, "exp-v12-003");
  assert.equal(snapshot.status, "CREATED");
  assert.equal(snapshot.tick, 0);
  assert.equal(snapshot.revision, 0);
  assert.equal(snapshot.checkpoints.length, 0);
  assert.equal(snapshot.measurements.length, 0);
  assert.equal(snapshot.science.timeS.unit, "s");
});
