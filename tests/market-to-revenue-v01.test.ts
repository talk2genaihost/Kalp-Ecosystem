import { strict as assert } from "node:assert";
import test from "node:test";
import { assertLineage } from "../contracts/market-to-revenue-v01.js";
import { DeterministicMarketManthanFixture, runMTR001, runMTR001Live } from "../src/market-to-revenue/mm-mtr-v01.js";

test("MTR-001 completes MM signal to attributable revenue lineage", () => {
  const slice = runMTR001(new DeterministicMarketManthanFixture());
  assertLineage(slice);
  assert.equal(slice.signal.signal_id, "MM-SIG-001");
  assert.equal(slice.attribution.attributed_amount, 10000);
  assert.equal(slice.attribution.attribution_model, "deterministic_origin_100");
  assert.equal(slice.learning.memory_id, "MEM-001");
});

test("MTR-001 preserves the originating MM provider boundary", () => {
  const slice = runMTR001(new DeterministicMarketManthanFixture());
  assert.equal(slice.signal.provider, "MM-PAF-FIXTURE");
  assert.equal(slice.signal.source, "market-manthan-fixture");
});

test("MTR-001 live path accepts an asynchronous Market Manthan provider", async () => {
  const source = {
    async getSignal(now?: string) {
      return {
        ...new DeterministicMarketManthanFixture().getSignal(),
        signal_id: "MM-SIG-LIVE-TEST",
        provider: "MM-PAF-TEST",
        source: "market-manthan-test",
        observed_at: now ?? "2026-09-12T14:00:00Z"
      };
    }
  };

  const slice = await runMTR001Live(source, "2026-09-12T14:05:00Z");
  assertLineage(slice);
  assert.equal(slice.signal.signal_id, "MM-SIG-LIVE-TEST");
  assert.equal(slice.signal.provider, "MM-PAF-TEST");
  assert.equal(slice.revenue.amount, 10000);
});
