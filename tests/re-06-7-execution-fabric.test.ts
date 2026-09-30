import assert from "node:assert/strict";
import test from "node:test";
import type { NormalizedProviderResult, ProviderAdapter } from "../src/market-to-revenue/provider-adapters-v01.js";
import { KalpExecutionFabricV01 } from "../src/execution-fabric/kalp-execution-fabric-v01.js";

const now = new Date("2026-09-16T12:00:00.000Z");

function provider(id: string, price: number, status: NormalizedProviderResult["status"] = "ok"): ProviderAdapter {
  return {
    provider_id: id,
    provider_name: id,
    role: "market-data",
    async fetch(): Promise<NormalizedProviderResult> {
      return {
        provider_id: id,
        provider_name: id,
        role: "market-data",
        status,
        observed_at: now.toISOString(),
        data: { symbol: "RELIANCE", c: price },
        request_meta: { endpoint: "fixture", adapter_version: "MM-PAF-v0.1" },
        ...(status !== "ok" ? { error: status } : {})
      };
    }
  };
}

test("RE-06-7 single-provider vertical slice produces canonical quote evidence", async () => {
  const fabric = new KalpExecutionFabricV01({
    providers: [provider("MM-PROV-FINNHUB-001", 1525.4)],
    now: () => now,
    id: (() => { let n = 0; return () => `id-${++n}`; })()
  });
  const result = await fabric.executeMarketQuote({ symbol: "RELIANCE" });
  assert.equal(result.status, "SUCCESS");
  assert.ok(result.result);
  assert.equal(result.result.result.price, 1525.4);
  assert.equal(result.result.result.source.providerId, "MM-PROV-FINNHUB-001");
  assert.equal(result.result.fusion.mode, "single_source");
  assert.equal(result.result.evidence.length, 1);
  assert.ok(result.result.provenance.some(node => node.type === "transformation"));
  assert.equal(result.telemetry.length, 1);
  assert.equal(result.telemetry[0].status, "success");
});

test("RE-06-7 parallel provider slice fuses compatible quotes and preserves evidence", async () => {
  const fabric = new KalpExecutionFabricV01({
    providers: [provider("MM-PROV-FINNHUB-001", 1525), provider("MM-PROV-ALPHA-001", 1527), provider("MM-PROV-THIRD-001", 1524)],
    now: () => now,
    id: (() => { let n = 0; return () => `id-${++n}`; })()
  });
  const result = await fabric.executeMarketQuote({ symbol: "RELIANCE", parallel: true });
  assert.equal(result.status, "SUCCESS");
  assert.ok(result.result);
  assert.equal(result.result.result.price, 1525);
  assert.equal(result.result.fusion.mode, "median");
  assert.equal(result.result.fusion.evidenceCount, 3);
  assert.equal(result.result.fusion.acceptedCount, 3);
  assert.equal(result.result.confidence > 0, true);
  assert.equal(result.telemetry.length, 3);
});

test("RE-06-7 provider failure falls through to a usable provider", async () => {
  const fabric = new KalpExecutionFabricV01({
    providers: [provider("MM-PROV-FINNHUB-001", 0, "rate_limited"), provider("MM-PROV-ALPHA-001", 1526)],
    now: () => now,
    id: (() => { let n = 0; return () => `id-${++n}`; })()
  });
  const result = await fabric.executeMarketQuote({ symbol: "RELIANCE" });
  assert.equal(result.status, "SUCCESS");
  assert.ok(result.result);
  assert.equal(result.result.result.price, 1526);
  assert.equal(result.result.evidence[0].providerId, "MM-PROV-ALPHA-001");
  assert.equal(result.telemetry.length, 2);
  assert.equal(result.telemetry[0].httpStatus, 429);
  assert.equal(result.telemetry[1].fallbackTriggered, true);
});

test("RE-06-7 rejects an invalid request without invoking providers", async () => {
  let calls = 0;
  const base = provider("MM-PROV-FINNHUB-001", 1525);
  const counting: ProviderAdapter = { ...base, async fetch(request) { calls++; return base.fetch(request); } };
  const fabric = new KalpExecutionFabricV01({ providers: [counting], now: () => now });
  const result = await fabric.executeMarketQuote({ symbol: "   " });
  assert.equal(result.status, "REJECTED");
  assert.equal(calls, 0);
});
