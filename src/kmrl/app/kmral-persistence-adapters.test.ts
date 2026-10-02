import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryKMRALStateStore } from "../../kmral/data.js";
import { InMemoryKMRALMutationQueue } from "../../kmral/offline.js";
import type { ExperimentSnapshot } from "../runtime/types.js";
import type { OfflineMutation } from "../contracts/offline.js";
import {
  KMRALExperimentOfflineQueueAdapter,
  KMRALExperimentRepositoryAdapter,
} from "./kmral-persistence-adapters.js";

const snapshot: ExperimentSnapshot = {
  experimentId: "physics-constant-force",
  status: "RUNNING",
  tick: 1,
  revision: 2,
  science: {
    timeS: { value: 0.1, unit: "s" },
    temperature: { value: 20, unit: "degC" },
    physics: {
      massKg: { value: 1, unit: "kg" },
      velocityMps: { value: 0.2, unit: "m/s" },
      accelerationMps2: { value: 2, unit: "m/s2" },
      positionM: { value: 0.01, unit: "m" },
    },
    materials: [],
  },
  checkpoints: [],
  measurements: [],
};

test("KMRL repository remains authoritative while KMRAL supplies persistence", () => {
  const store = new InMemoryKMRALStateStore<ExperimentSnapshot, string>();
  const repository = new KMRALExperimentRepositoryAdapter(store);

  repository.save(snapshot);

  assert.deepEqual(repository.load(snapshot.experimentId), snapshot);
});

test("KMRL offline queue is persisted through generic KMRAL mutation primitives", () => {
  const queue = new InMemoryKMRALMutationQueue<OfflineMutation>();
  const offline = new KMRALExperimentOfflineQueueAdapter(queue);
  const mutation: OfflineMutation = {
    mutationId: "mutation-1",
    experimentId: snapshot.experimentId,
    command: { type: "START" },
    baseRevision: 1,
  };

  offline.enqueue(mutation);

  assert.deepEqual(offline.pending(snapshot.experimentId), [mutation]);
  assert.deepEqual(offline.drain(snapshot.experimentId), [mutation]);
  assert.deepEqual(offline.pending(snapshot.experimentId), []);
});
