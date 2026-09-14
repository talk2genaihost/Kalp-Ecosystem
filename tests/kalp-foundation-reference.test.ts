import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryCache } from "../src/kalp-foundation/cache/in-memory-cache.js";
import { ReferenceMcpGateway } from "../src/kalp-foundation/mcp/reference-gateway.js";
import { ReferenceProvider } from "../src/kalp-foundation/provider/reference-provider.js";

const build = () => {
  const cache = new InMemoryCache();
  const provider = new ReferenceProvider();
  const gateway = new ReferenceMcpGateway(cache, new Map([[provider.provider_id, provider]]), 60_000);
  return { gateway, provider };
};

test("Gate 4A: first request is a cache miss and populates the cache", async () => {
  const { gateway, provider } = build();
  const request = ReferenceMcpGateway.request({
    vertical_id: "reference",
    capability: "context",
    operation: "get_context",
    parameters: { key: "demo" },
  });

  const response = await gateway.execute(request);
  assert.equal(response.status, "ok");
  assert.equal(response.execution.cache_status, "miss");
  assert.equal(provider.calls, 1);
});

test("Gate 4A: identical request is served from cache", async () => {
  const { gateway, provider } = build();
  const input = {
    vertical_id: "reference",
    capability: "context",
    operation: "get_context",
    parameters: { key: "demo" },
  } as const;

  await gateway.execute(ReferenceMcpGateway.request(input));
  const response = await gateway.execute(ReferenceMcpGateway.request(input));

  assert.equal(response.status, "ok");
  assert.equal(response.execution.cache_status, "hit");
  assert.equal(provider.calls, 1);
});

test("Gate 4A: concurrent identical requests are coalesced", async () => {
  const { gateway, provider } = build();
  const input = {
    vertical_id: "reference",
    capability: "context",
    operation: "get_context",
    parameters: { key: "concurrent" },
  } as const;

  const responses = await Promise.all(
    Array.from({ length: 100 }, () => gateway.execute(ReferenceMcpGateway.request(input))),
  );

  assert.equal(provider.calls, 1);
  assert.equal(responses.filter((r) => r.status === "ok").length, 100);
});
