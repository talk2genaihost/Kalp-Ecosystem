import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryExperimentRepository } from "../contracts/data.js";
import { quantity } from "../simulation/v1-a/quantity.js";
import type { ExperimentSnapshot } from "../runtime/types.js";

const snapshot = (): ExperimentSnapshot => ({
  experimentId: "DATA-001", status: "CREATED", tick: 0, revision: 1,
  science: { timeS: quantity(0, "s"), physics: { positionM: quantity(0, "m"), velocityMps: quantity(0, "m/s"), accelerationMps2: quantity(0, "m/s2"), massKg: quantity(1, "kg") }, materials: [], temperature: quantity(25, "degC") },
  checkpoints: [], measurements: [],
});

test("ExperimentRepository persists a snapshot with its revision", () => {
  const repo = new InMemoryExperimentRepository();
  repo.save(snapshot());
  assert.equal(repo.load("DATA-001")?.revision, 1);
  assert.equal(repo.load("DATA-001")?.experimentId, "DATA-001");
});

test("ExperimentRepository isolates returned state", () => {
  const repo = new InMemoryExperimentRepository();
  repo.save(snapshot());
  const loaded = repo.load("DATA-001")!;
  const changed = { ...loaded, tick: 99 };
  assert.equal(changed.tick, 99);
  assert.equal(repo.load("DATA-001")?.tick, 0);
});
