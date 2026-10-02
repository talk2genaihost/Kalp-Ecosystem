import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryExperimentRepository } from "../contracts/data.js";
import { InMemoryOfflineQueue } from "../contracts/offline.js";
import { UnifiedScienceKernel } from "../contracts/science.js";
import { scienceTick } from "../simulation/v1-d/science/index.js";
import { ExperimentRuntime } from "../runtime/experiment-runtime.js";
import { getExperiment } from "../learning/experiment-library.js";
import { createScienceSandboxApp } from "./science-sandbox-app.js";

test("Science Sandbox is the first KMRAL reference application for KMRL", () => {
  const experiment = getExperiment("physics-constant-force");
  const runtime = new ExperimentRuntime({
    experimentId: experiment.id,
    initialScience: experiment.initialState,
    science: new UnifiedScienceKernel(scienceTick),
    repository: new InMemoryExperimentRepository(),
    offline: new InMemoryOfflineQueue(),
  });

  const sandbox = createScienceSandboxApp(runtime);

  assert.equal(sandbox.application.appId, "science-sandbox");
  assert.equal(sandbox.application.domain.domainId, "KMRL-EXPERIMENT");
  assert.equal(sandbox.application.domain.getState().status, "CREATED");

  const started = sandbox.application.domain.dispatch({ type: "START" });
  const stepped = sandbox.application.domain.dispatch({
    type: "STEP",
    input: { dtS: 0.1, netForce: { value: 2, unit: "N" } },
  });

  assert.equal(started.status, "RUNNING");
  assert.equal(stepped.status, "RUNNING");
  assert.equal(stepped.tick, 1);
  assert.equal(stepped.science.physics.velocityMps.value, 0.2);
});
