import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryKMRALMutationQueue } from "./offline.js";

test("KMRAL offline queue preserves FIFO mutations", () => {
  const queue = new InMemoryKMRALMutationQueue<{ value: number }>();

  queue.enqueue({ id: "m1", payload: { value: 1 } });
  queue.enqueue({ id: "m2", payload: { value: 2 } });

  assert.equal(queue.size(), 2);
  assert.deepEqual(queue.peek(), { id: "m1", payload: { value: 1 } });
  assert.deepEqual(queue.drain(), [
    { id: "m1", payload: { value: 1 } },
    { id: "m2", payload: { value: 2 } },
  ]);
  assert.equal(queue.size(), 0);
});
