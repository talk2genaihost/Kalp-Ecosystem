import assert from "node:assert/strict";
import test from "node:test";
import type { NormalizedProviderResult, ProviderAdapter } from "../src/market-to-revenue/provider-adapters-v01.js";
import { CapabilityRegistryV01, MARKET_QUOTE_CAPABILITY, createCapabilityRegistry } from "../src/paf/registry/capability-registry-v01.js";
import { ProviderRegistryV01 } from "../src/paf/registry/provider-registry-v01.js";
import { KalpExecutionFabricV01 } from "../src/execution-fabric/kalp-execution-fabric-v01.js";

function provider(id: string, role: ProviderAdapter["role"] = "market-data"): ProviderAdapter {
  return {
    provider_id: id,
    provider_name: id,
    role,
    async fetch(): Promise<NormalizedProviderResult> {
      return { provider_id: id, provider_name: id, role, status: "ok", observed_at: "2026-09-16T12:00:00.000Z", data: { symbol: "RELIANCE", c: 1525 }, request_meta: { endpoint: "fixture", adapter_version: "MM-PAF-v0.1" } };
    }
  };
}

test("RE-06-7.2 provider registry exposes only enabled canonical providers for a capability", () => {
  const registry = new ProviderRegistryV01();
  registry.register(provider("MM-PROV-FINNHUB-001"));
  registry.register(provider("MM-PROV-GDELT-001", "news-intelligence"));
  assert.deepEqual(registry.findByCapability("market.quote").map(item => item.provider_id), ["MM-PROV-FINNHUB-001"]);
  assert.equal(registry.descriptor("MM-PROV-FINNHUB-001")?.capabilities[0]?.outputSchema, "MarketQuoteV1");
});

test("RE-06-7.2 capability registry resolves market.quote and its providers", () => {
  const capabilities = createCapabilityRegistry();
  const providers = new ProviderRegistryV01();
  providers.register(provider("MM-PROV-ALPHA-001"));
  assert.equal(capabilities.get("market.quote")?.outputSchema, "MarketQuoteV1");
  assert.deepEqual(capabilities.findProviders("market.quote", providers), ["MM-PROV-ALPHA-001"]);
  assert.equal(capabilities.findProviders("market.news", providers).length, 0);
});

test("RE-06-7.2 fabric uses injected registries instead of scanning the provider array", async () => {
  const providers = new ProviderRegistryV01();
  providers.register(provider("MM-PROV-FINNHUB-001"));
  const capabilities = new CapabilityRegistryV01();
  capabilities.register(MARKET_QUOTE_CAPABILITY);
  const fabric = new KalpExecutionFabricV01({ providers: [provider("MM-PROV-IGNORED-001")], providerRegistry: providers, capabilityRegistry: capabilities, now: () => new Date("2026-09-16T12:00:00.000Z"), id: (() => { let n = 0; return () => `id-${++n}`; })() });
  assert.deepEqual(fabric.discoverCandidates().map(candidate => candidate.target.providerId), ["MM-PROV-FINNHUB-001"]);
  const result = await fabric.executeMarketQuote({ symbol: "RELIANCE" });
  assert.equal(result.result?.result.data.source.providerId, "MM-PROV-FINNHUB-001");
});

test("RE-06-7.2 missing capability prevents execution", async () => {
  const providers = new ProviderRegistryV01();
  providers.register(provider("MM-PROV-FINNHUB-001"));
  const capabilities = new CapabilityRegistryV01();
  const fabric = new KalpExecutionFabricV01({ providerRegistry: providers, capabilityRegistry: capabilities });
  assert.deepEqual(fabric.discoverCandidates(), []);
  assert.equal((await fabric.executeMarketQuote({ symbol: "RELIANCE" })).status, "REJECTED");
});
