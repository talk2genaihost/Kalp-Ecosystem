import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryKMRALRepository } from "./data.js";

test("KMRAL data repository provides generic CRUD", async () => {
  const repository = new InMemoryKMRALRepository<{ id: string; value: number }, string>();

  await repository.save({ id: "one", value: 1 });
  assert.deepEqual(await repository.get("one"), { id: "one", value: 1 });
  assert.deepEqual(await repository.list(), [{ id: "one", value: 1 }]);

  await repository.remove("one");
  assert.equal(await repository.get("one"), undefined);
});
