import assert from "node:assert/strict";
import test from "node:test";
import { loadRuntimeConfig } from "../src/kalp-foundation/runtime/runtime-config.js";

test("runtime config applies safe defaults", () => {
  const config = loadRuntimeConfig({});
  assert.deepEqual(config, {
    environment: "development",
    providerTimeoutMs: 5_000,
    cacheTtlMs: 60_000,
  });
});

test("runtime config accepts bounded overrides", () => {
  const config = loadRuntimeConfig({
    KALP_ENV: "production",
    KALP_PROVIDER_TIMEOUT_MS: "10000",
    KALP_CACHE_TTL_MS: "120000",
  });
  assert.equal(config.environment, "production");
  assert.equal(config.providerTimeoutMs, 10_000);
  assert.equal(config.cacheTtlMs, 120_000);
});

test("runtime config rejects invalid environment", () => {
  assert.throws(() => loadRuntimeConfig({ KALP_ENV: "prod" }), /Invalid KALP_ENV/);
});

test("runtime config rejects timeout outside safe bounds", () => {
  assert.throws(() => loadRuntimeConfig({ KALP_PROVIDER_TIMEOUT_MS: "50" }), /Invalid KALP_PROVIDER_TIMEOUT_MS/);
});

test("runtime config rejects malformed numeric values", () => {
  assert.throws(() => loadRuntimeConfig({ KALP_CACHE_TTL_MS: "sixty" }), /Invalid KALP_CACHE_TTL_MS/);
});
