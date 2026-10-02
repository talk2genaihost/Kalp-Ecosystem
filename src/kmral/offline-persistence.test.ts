import test from "node:test";
import assert from "node:assert/strict";
import {
  InMemoryKMRALKeyValueStore,
} from "./data.js";
import { LocalStorageKMRALMutationQueue } from "./offline.js";

test("KMRAL durable mutation queue survives a new queue instance and filters recovery", () => {
  const storage = new InMemoryKMRALKeyValueStore();
  const first = new LocalStorageKMRALMutationQueue<{ experimentId: string; value: number }>(
    storage,
    "test:offline:",
  );

  first.enqueue({ id: "a1", payload: { experimentId: "exp-a", value: 1 } });
  first.enqueue({ id: "b1", payload: { experimentId: "exp-b", value: 2 } });

  const second = new LocalStorageKMRALMutationQueue<{ experimentId: string; value: number }>(
    storage,
    "test:offline:",
  );

  assert.equal(second.size(), 2);
  assert.deepEqual(second.drainWhere((mutation) => mutation.payload.experimentId === "exp-a"), [
    { id: "a1", payload: { experimentId: "exp-a", value: 1 } },
  ]);
  assert.deepEqual(second.pending(), [
    { id: "b1", payload: { experimentId: "exp-b", value: 2 } },
  ]);
});
