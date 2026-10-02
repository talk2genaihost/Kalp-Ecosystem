import test from "node:test";
import assert from "node:assert/strict";
import { KMRALUIController } from "./ui.js";
import type { KMRALDomainPort } from "./application.js";

test("KMRAL UI controller delegates state and actions to the injected domain", () => {
  let value = 0;
  const domain: KMRALDomainPort<number, "increment"> = {
    domainId: "generic-domain",
    getState: () => value,
    dispatch: () => ++value,
  };

  const controller = new KMRALUIController(domain);

  assert.equal(controller.getState(), 0);
  assert.equal(controller.dispatch("increment"), 1);
  assert.equal(controller.getState(), 1);
});
