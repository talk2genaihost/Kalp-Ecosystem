import test from "node:test";
import assert from "node:assert/strict";
import { KMRLExperimentDomainAdapter } from "./kmral-experiment-adapter.js";
import { ExperimentRuntime } from "../runtime/experiment-runtime.js";
import { InMemoryExperimentRepository } from "../contracts/data.js";
import { LocalMutationQueue } from "../offline/local-mutation-queue.js";
import { UnifiedScienceKernel } from "../contracts/science.js";
import { scienceTick } from "../simulation/v1-d/science/index.js";
import { getExperiment } from "../learning/experiment-library.js";

test("KMRL experiment adapter exposes runtime through the KMRAL domain boundary", () => {
  const experiment = getExperiment("physics-constant-force");
  const runtime = new ExperimentRuntime({
    experimentId: experiment.id,
    initialScience: experiment.initialState,
    science: new UnifiedScienceKernel(scienceTick),
    repository: new InMemoryExperimentRepository(),
    offline: new LocalMutationQueue(),
  });

  const domain = new KMRLExperimentDomainAdapter(runtime);

  assert.equal(domain.domainId, "KMRL-EXPERIMENT");
  assert.equal(domain.getState().status, "CREATED");

  const state = domain.dispatch({ type: "START" });

  assert.equal(state.status, "RUNNING");
  assert.equal(domain.getState().status, "RUNNING");
});
