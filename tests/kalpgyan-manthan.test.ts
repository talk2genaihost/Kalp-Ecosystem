import test from "node:test";
import assert from "node:assert/strict";
import { SPEAKER_STYLES, createProduction, planDiscourse, validateVoiceForProduction } from "../src/kalpgyan-manthan/index.js";
import { splitForTts } from "../src/kalpgyan-manthan/providers/google-tts.js";
import { mcpCacheConfig } from "../src/kalpgyan-manthan/mcp-cache.js";

test("registers ten speaker styles", () => assert.equal(SPEAKER_STYLES.length, 10));
test("plans six balanced discourse sections", () => {
  const plan = planDiscourse("Freedom", 20);
  assert.equal(plan.sections.length, 6);
  assert.equal(plan.sections.reduce((n, s) => n + s.targetSeconds, 0), 1200);
});
test("blocks unauthorized clone", () => {
  const errors = validateVoiceForProduction({ voiceId:"v1", label:"Example", kind:"authorized-clone", language:"hi", rightsStatus:"internal" });
  assert.ok(errors.length > 0);
});
test("real production requires a book source", async () => {
  const result = await createProduction({
    book:{ bookId:"b1", title:"Demo", language:"hi" }, topic:"Wisdom", durationMinutes:15,
    speakerStyleId:"modern-spiritual", voiceId:"kalp-hi-01"
  }, { voiceId:"kalp-hi-01", label:"KALP Hindi 01", kind:"kalp-original", language:"hi", rightsStatus:"internal" });
  assert.equal(result.status, "blocked");
  assert.match(result.qa.reasons.join(" "), /sourceRef/);
});
test("splits long discourse into provider-safe TTS chunks", () => {
  const chunks = splitForTts(Array.from({length:1200}, (_, i) => `Sentence number ${i}.`).join(" "));
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(c => c.length <= 4500));
});
test("MCP cache defaults to the 1.5B-token capacity", () => {
  assert.equal(mcpCacheConfig().capacityTokens, 1_500_000_000);
});
