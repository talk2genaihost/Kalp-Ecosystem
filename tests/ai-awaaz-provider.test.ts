import test from "node:test";
import assert from "node:assert/strict";
import { AI_AWAAZ_PROVIDER_ID, createAiAwaazAdapter } from "../src/kalpgyan-manthan/providers/ai-awaaz.js";

test("registers AI Awaaz behind the canonical voice provider boundary", () => {
  const adapter = createAiAwaazAdapter({});
  const descriptor = adapter.descriptor();

  assert.equal(descriptor.providerId, AI_AWAAZ_PROVIDER_ID);
  assert.equal(descriptor.integrationStatus, "discovered");
  assert.ok(adapter.supports("CAP-VOICE-TTS"));
  assert.ok(adapter.supports("CAP-VOICE-EMOTION"));
  assert.ok(adapter.supports("CAP-VOICE-CLONE"));
});

test("does not claim live API readiness before endpoint and key validation", () => {
  const adapter = createAiAwaazAdapter({});
  const config = adapter.validateConfiguration();

  assert.equal(config.ready, false);
  assert.deepEqual(config.missing, ["AI_AWAAZ_API_KEY", "AI_AWAAZ_API_BASE_URL"]);
});

test("blocks live execution until the AI Awaaz API contract is validated", async () => {
  const adapter = createAiAwaazAdapter({
    AI_AWAAZ_API_KEY: "test-key",
    AI_AWAAZ_API_BASE_URL: "https://example.invalid",
  });

  const result = await adapter.synthesize({
    text: "नमस्ते, यह KALP voice integration test है।",
    language: "hi-IN",
    format: "mp3",
  });

  assert.equal(result.status, "blocked");
  assert.match(result.error ?? "", /API contract is not yet validated/);
  assert.equal(result.provenance.provider, AI_AWAAZ_PROVIDER_ID);
});
