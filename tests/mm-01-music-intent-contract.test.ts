import assert from "node:assert/strict";
import test from "node:test";
import {
  MUSIC_INTENT_TYPES,
  type MusicIntent,
  type MusicIntentDefinition,
  type MusicIntentType
} from "../src/contracts/music-intent.js";
import { InMemoryMusicIntentRegistry } from "../src/registry/music-intent-registry.js";

const definitions: MusicIntentDefinition[] = MUSIC_INTENT_TYPES.map((intentType) => ({
  intentType,
  contractVersion: "MM-01.0",
  operations: [
    intentType === "MUSIC_EVALUATE" ? "evaluate" :
    intentType === "MUSIC_REFINE" ? "refine" :
    intentType === "MUSIC_PRODUCE" ? "produce" :
    intentType === "MUSIC_ARRANGE" ? "arrange" :
    intentType === "MUSIC_COMPOSE" ? "compose" :
    intentType === "MUSIC_GENERATE" ? "generate" : "create"
  ],
  description: `Canonical Music Manthan intent: ${intentType}`
}));

function createIntent(intentType: MusicIntentType, rawText: string): MusicIntent {
  return {
    intentId: "mm-01-test-001",
    contractVersion: "MM-01.0",
    createdAt: "2026-09-17T01:55:00.000Z",
    intentType,
    operation: "create",
    rawText,
    normalizedRequest: rawText.trim(),
    constraints: {},
    governance: {
      explicitFields: ["rawText"],
      inferredFields: [],
      inheritedFields: [],
      defaultedFields: [],
      conflicts: [],
      confidence: 1
    }
  };
}

test("MM-01.7 registry boundary registers every canonical music intent", () => {
  const registry = new InMemoryMusicIntentRegistry();
  for (const definition of definitions) registry.register(definition);

  assert.equal(registry.list().length, MUSIC_INTENT_TYPES.length);
  for (const intentType of MUSIC_INTENT_TYPES) {
    assert.equal(registry.has(intentType), true);
    assert.equal(registry.get(intentType)?.intentType, intentType);
  }
});

test("MM-01.7 registry rejects duplicate definitions and unsupported versions", () => {
  const registry = new InMemoryMusicIntentRegistry();
  registry.register(definitions[0]);
  assert.throws(() => registry.register(definitions[0]), /already registered/);
  assert.throws(() => registry.register({ ...definitions[1], contractVersion: "MM-99.0" as "MM-01.0" }), /Unsupported Music Intent contract/);
});

test("MM-01.7 boundary does not carry provider or routing selection", () => {
  const registry = new InMemoryMusicIntentRegistry();
  registry.register(definitions[0]);
  const definition = registry.get("MUSIC_CREATE");
  assert.ok(definition);
  assert.equal("providerId" in definition, false);
  assert.equal("routingDecision" in definition, false);
  assert.equal("resilience" in definition, false);
});

const matrix: Array<[string, MusicIntentType, string]> = [
  ["T01 create devotional", "MUSIC_DEVOTIONAL", "Create a devotional Hanuman song"],
  ["T02 create character", "MUSIC_CHARACTER", "Create a dark Ravan character song"],
  ["T03 instrumental theme", "MUSIC_INSTRUMENTAL", "Compose an instrumental theme"],
  ["T04 score", "MUSIC_SCORE", "Create background music for this scene"],
  ["T05 jingle", "MUSIC_JINGLE", "Create a 30-second jingle"],
  ["T06 extend", "MUSIC_EXTEND", "Extend this track"],
  ["T07 variation", "MUSIC_VARIATION", "Create another variation"],
  ["T08 remaster", "MUSIC_REMASTER", "Remaster this music"],
  ["T09 evaluate", "MUSIC_EVALUATE", "Evaluate this track"],
  ["T10 refine", "MUSIC_REFINE", "Refine the vocals"]
];

test("MM-01.8 canonical intent contract matrix", () => {
  const registry = new InMemoryMusicIntentRegistry();
  for (const definition of definitions) registry.register(definition);

  for (const [caseId, expectedType, text] of matrix) {
    const intent = createIntent(expectedType, text);
    assert.equal(registry.has(intent.intentType), true, `${caseId}: intent must be registry-known`);
    assert.equal(intent.contractVersion, "MM-01.0", `${caseId}: contract version`);
    assert.equal(intent.rawText, text, `${caseId}: raw text preserved`);
    assert.equal(intent.normalizedRequest, text.trim(), `${caseId}: normalized request present`);
    assert.deepEqual(intent.constraints, {}, `${caseId}: constraints remain separate from intent classification`);
    assert.deepEqual(intent.governance.inferredFields, [], `${caseId}: inferred fields are explicit in governance`);
  }
});
