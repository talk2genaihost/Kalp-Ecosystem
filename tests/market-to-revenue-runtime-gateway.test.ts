import test from "node:test";
import assert from "node:assert/strict";
import { MemoryManthanFusionSink, createRuntimeGateway } from "../src/market-to-revenue/runtime-gateway-v01.js";

async function request(port: number, token?: string, body = "{}") {
  return fetch(`http://127.0.0.1:${port}/v1/evidence/ingest`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body
  });
}

test("runtime gateway rejects missing or invalid credentials", async () => {
  const sink = new MemoryManthanFusionSink();
  const server = createRuntimeGateway({ port: 0, gateway_token: "test-secret", max_body_bytes: 64000 }, sink);
  await new Promise<void>(resolve => server.listen(0, resolve));
  const port = (server.address() as { port: number }).port;
  try {
    assert.equal((await request(port)).status, 401);
    assert.equal((await request(port, "wrong")).status, 401);
  } finally { server.close(); }
});

test("runtime gateway sends only normalized live-provider evidence to Manthan/Fusion", async () => {
  const sink = new MemoryManthanFusionSink();
  const server = createRuntimeGateway({ port: 0, gateway_token: "test-secret", max_body_bytes: 64000 }, sink);
  await new Promise<void>(resolve => server.listen(0, resolve));
  const port = (server.address() as { port: number }).port;
  try {
    const response = await request(port, "test-secret", JSON.stringify({ query: "Delhi NCR convenience demand" }));
    assert.equal(response.status, 200);
    const payload = await response.json() as { status: string; rejected_fixture: boolean };
    assert.equal(payload.status, "accepted");
    assert.equal(payload.rejected_fixture, true);
    assert.equal(sink.envelopes.length, 1);
    assert.ok(!sink.envelopes[0].providers.some(p => p.provider_id === "MM-PAF-FIXTURE"));
  } finally { server.close(); }
});
