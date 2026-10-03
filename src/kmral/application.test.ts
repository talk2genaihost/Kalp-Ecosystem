import test from "node:test";
import assert from "node:assert/strict";
import { createKMRALApplication, type KMRALDomainPort } from "./application.js";

test("KMRAL application hosts a provider-neutral domain port", () => {
  let state = { value: 0 };

  const domain: KMRALDomainPort<typeof state, { type: "increment" }> = {
    domainId: "test-domain",
    getState: () => state,
    dispatch: () => {
      state = { value: state.value + 1 };
      return state;
    },
  };

  const app = createKMRALApplication("test-app", domain);

  assert.equal(app.appId, "test-app");
  assert.equal(app.domain.domainId, "test-domain");
  assert.deepEqual(app.domain.dispatch({ type: "increment" }), { value: 1 });
});
