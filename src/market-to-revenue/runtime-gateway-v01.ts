import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { initialFreeProviderMesh, type NormalizedProviderResult, type ProviderRequest } from "./provider-adapters-v01.js";

export interface RuntimeGatewayConfig {
  port: number;
  gateway_token: string;
  max_body_bytes: number;
}

export interface EvidenceEnvelope {
  envelope_id: string;
  observed_at: string;
  source: "KALP-MTR-RUNTIME-GATEWAY";
  adapter_version: "MM-PAF-v0.1";
  providers: NormalizedProviderResult[];
}

export interface ManthanFusionSink {
  ingest(envelope: EvidenceEnvelope): Promise<void>;
}

export class HttpManthanFusionSink implements ManthanFusionSink {
  constructor(private readonly endpoint: string, private readonly token?: string) {}

  async ingest(envelope: EvidenceEnvelope): Promise<void> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {})
      },
      body: JSON.stringify(envelope)
    });
    if (!response.ok) throw new Error(`MANthan/Fusion sink HTTP ${response.status}`);
  }
}

export class MemoryManthanFusionSink implements ManthanFusionSink {
  readonly envelopes: EvidenceEnvelope[] = [];
  async ingest(envelope: EvidenceEnvelope): Promise<void> {
    this.envelopes.push(envelope);
  }
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

function authorized(req: IncomingMessage, token: string): boolean {
  const header = req.headers.authorization;
  return typeof header === "string" && header === `Bearer ${token}`;
}

async function readBody(req: IncomingMessage, maxBytes: number): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBytes) throw new Error("REQUEST_BODY_TOO_LARGE");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function createRuntimeGateway(config: RuntimeGatewayConfig, sink: ManthanFusionSink) {
  return createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/health") {
        return json(res, 200, { status: "ok", service: "KALP-MTR-RUNTIME-GATEWAY", version: "v0.1" });
      }
      if (req.method !== "POST" || req.url !== "/v1/evidence/ingest") return json(res, 404, { error: "NOT_FOUND" });
      if (!authorized(req, config.gateway_token)) return json(res, 401, { error: "UNAUTHORIZED" });

      const body = await readBody(req, config.max_body_bytes);
      const request = (body ? JSON.parse(body) : {}) as ProviderRequest;
      const providers = await Promise.all(initialFreeProviderMesh.map(provider => provider.fetch(request)));
      const evidence = providers.filter(provider => provider.status === "ok" && provider.provider_id !== "MM-PAF-FIXTURE");
      const envelope: EvidenceEnvelope = {
        envelope_id: crypto.randomUUID(),
        observed_at: new Date().toISOString(),
        source: "KALP-MTR-RUNTIME-GATEWAY",
        adapter_version: "MM-PAF-v0.1",
        providers: evidence
      };
      await sink.ingest(envelope);
      return json(res, 200, {
        status: "accepted",
        envelope_id: envelope.envelope_id,
        configured: providers.filter(p => p.status !== "not_configured").length,
        healthy: evidence.length,
        rejected_fixture: providers.some(p => p.provider_id === "MM-PAF-FIXTURE")
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
      return json(res, message === "REQUEST_BODY_TOO_LARGE" ? 413 : 500, { error: message });
    }
  });
}

export function loadRuntimeGatewayConfig(env = process.env): RuntimeGatewayConfig {
  const gateway_token = env.KALP_MTR_GATEWAY_TOKEN;
  if (!gateway_token) throw new Error("KALP_MTR_GATEWAY_TOKEN is required");
  return {
    port: Number(env.KALP_MTR_GATEWAY_PORT ?? 8787),
    gateway_token,
    max_body_bytes: Number(env.KALP_MTR_MAX_BODY_BYTES ?? 64_000)
  };
}

export function startRuntimeGateway(sink: ManthanFusionSink): ReturnType<typeof createServer> {
  const config = loadRuntimeGatewayConfig();
  const server = createRuntimeGateway(config, sink);
  server.listen(config.port);
  return server;
}
