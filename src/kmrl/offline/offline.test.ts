import test from "node:test";
import assert from "node:assert/strict";
import { LocalMutationQueue } from "./local-mutation-queue.js";

test("LocalMutationQueue de-duplicates mutations and drains by experiment", () => { const queue = new LocalMutationQueue(); const mutation = queue.append("OFF-001", { type: "START" }); queue.enqueue(mutation); assert.equal(queue.pending("OFF-001").length, 1); assert.equal(queue.drain("OFF-001").length, 1); assert.equal(queue.pending("OFF-001").length, 0); });
test("LocalMutationQueue keeps experiments isolated", () => { const queue = new LocalMutationQueue(); queue.append("OFF-A", { type: "START" }); queue.append("OFF-B", { type: "START" }); assert.equal(queue.pending("OFF-A").length, 1); assert.equal(queue.pending("OFF-B").length, 1); });
