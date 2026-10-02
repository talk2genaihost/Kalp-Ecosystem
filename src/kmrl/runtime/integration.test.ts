import test from "node:test";
import assert from "node:assert/strict";
import { ExperimentRuntime } from "./experiment-runtime.js";
import { InMemoryExperimentRepository } from "../contracts/data.js";
import { InMemoryOfflineQueue } from "../contracts/offline.js";
import { UnifiedScienceKernel } from "../contracts/science.js";
import { scienceTick } from "../simulation/v1-d/science/index.js";
import { quantity } from "../simulation/v1-a/quantity.js";
import { MainSandboxController } from "../ui/main-sandbox-controller.js";

const initialScience = () => ({ timeS: quantity(0, "s"), physics: { positionM: quantity(0, "m"), velocityMps: quantity(0, "m/s"), accelerationMps2: quantity(0, "m/s2"), massKg: quantity(1, "kg") }, materials: [], temperature: quantity(25, "degC") });
function makeRuntime(repo = new InMemoryExperimentRepository(), offline = new InMemoryOfflineQueue()) {
  return new ExperimentRuntime({ experimentId: "KMRL-EXP-001", initialScience: initialScience(), science: new UnifiedScienceKernel(scienceTick), repository: repo, offline });
}

test("ExperimentRuntime consumes the recovered v1.0-D unified science tick", () => { const r = makeRuntime(); r.dispatch({ type: "START" }); r.dispatch({ type: "STEP", input: { dtS: 1, netForce: quantity(1, "N") } }); assert.equal(r.getState().science.timeS.value, 1); assert.equal(r.getState().science.physics.velocityMps.value, 1); });
test("checkpoint and restore operate on deterministic science state", () => { const r = makeRuntime(); r.dispatch({ type: "START" }); r.dispatch({ type: "STEP", input: { dtS: 1, netForce: quantity(1, "N") } }); r.dispatch({ type: "CHECKPOINT" }); r.dispatch({ type: "STEP", input: { dtS: 1, netForce: quantity(1, "N") } }); r.dispatch({ type: "RESTORE", checkpointId: "KMRL-EXP-001:cp:1" }); assert.equal(r.getState().tick, 1); assert.equal(r.getState().science.physics.positionM.value, .5); });
test("DATA persistence and OFFLINE mutation queue receive runtime transitions", () => { const repo = new InMemoryExperimentRepository(); const offline = new InMemoryOfflineQueue(); const r = makeRuntime(repo, offline); r.dispatch({ type: "START" }); assert.equal(repo.load("KMRL-EXP-001")?.status, "RUNNING"); assert.equal(offline.pending("KMRL-EXP-001").length, 1); });
test("MainSandbox remains command/state only", () => { const repo = new InMemoryExperimentRepository(); const offline = new InMemoryOfflineQueue(); const controller = new MainSandboxController(makeRuntime(repo, offline), offline); controller.command({ type: "START" }); controller.command({ type: "STEP", input: { dtS: 1, netForce: quantity(1, "N") } }); const view = controller.view(); assert.equal(view.status, "RUNNING"); assert.equal(view.tick, 1); assert.equal(view.science.physics.velocityMps.value, 1); assert.equal(view.pendingMutations, 2); });
