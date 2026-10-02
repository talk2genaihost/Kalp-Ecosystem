import test from "node:test";
import assert from "node:assert/strict";
import {
  InMemoryKMRALKeyValueStore,
  LocalStorageKMRALRepository,
  LocalStorageKMRALStateStore,
} from "./data.js";

test("KMRAL durable state store survives a new store instance", () => {
  const storage = new InMemoryKMRALKeyValueStore();
  const first = new LocalStorageKMRALStateStore<{ id: string; value: number }, string>(
    storage,
    "test:state:",
  );

  first.save("experiment-1", { id: "experiment-1", value: 42 });

  const second = new LocalStorageKMRALStateStore<{ id: string; value: number }, string>(
    storage,
    "test:state:",
  );

  assert.deepEqual(second.load("experiment-1"), { id: "experiment-1", value: 42 });
});

test("KMRAL async repository persists and lists entities", async () => {
  const storage = new InMemoryKMRALKeyValueStore();
  const first = new LocalStorageKMRALRepository<{ id: string; value: number }, string>(
    storage,
    "test:repository:",
  );

  await first.save({ id: "one", value: 1 });
  await first.save({ id: "two", value: 2 });

  const second = new LocalStorageKMRALRepository<{ id: string; value: number }, string>(
    storage,
    "test:repository:",
  );

  assert.deepEqual(await second.get("one"), { id: "one", value: 1 });
  assert.deepEqual(await second.list(), [
    { id: "one", value: 1 },
    { id: "two", value: 2 },
  ]);

  await second.remove("one");
  assert.equal(await second.get("one"), undefined);
});
