import test from "node:test";
import assert from "node:assert/strict";
import { outranks, resolveHighest } from "../src/governance/authority-engine.js";
import type { AuthorityLevel } from "../src/shared/types.js";

const precedence: AuthorityLevel[] = [
  "LOCKED",
  "APPROVED",
  "CANONICAL",
  "ACTIVE",
  "VERSIONED",
  "SUPPORTING",
  "CHAT_MEMORY",
  "INFERENCE",
];

test("authority precedence is ordered from strongest to weakest", () => {
  for (let i = 0; i < precedence.length; i++) {
    for (let j = 0; j < precedence.length; j++) {
      assert.equal(outranks(precedence[i], precedence[j]), i < j);
    }
  }
});

test("resolveHighest returns the strongest authority independent of input order", () => {
  assert.equal(resolveHighest(["INFERENCE", "ACTIVE", "LOCKED", "CANONICAL"]), "LOCKED");
  assert.equal(resolveHighest(["SUPPORTING", "VERSIONED", "APPROVED"]), "APPROVED");
});

test("resolveHighest returns undefined for an empty candidate list", () => {
  assert.equal(resolveHighest([]), undefined);
});

test("equal authority levels do not outrank one another", () => {
  for (const level of precedence) assert.equal(outranks(level, level), false);
});
