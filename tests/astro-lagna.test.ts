import test from "node:test";
import assert from "node:assert/strict";
import { calculateKalpLagna } from "../src/development-studio/astro-rashi/kalp-lagna.js";

test("Karnal reference birth resolves to Makara Lagna under Lahiri", () => {
  const result = calculateKalpLagna("1976-11-28T11:15:00", "29.6920,76.9845", 330);
  assert.equal(result.value, "मकर");
  assert.equal(result.source, "KALP_CALCULATED");
  assert.equal(result.calculationSystem, "SIDEREAL_LAHIRI");
  assert.equal(result.evidenceStatus, "CALCULATED");
  assert.ok(result.degree > 13.4 && result.degree < 13.7);
});
