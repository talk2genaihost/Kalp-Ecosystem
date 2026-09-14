import { randomUUID } from "node:crypto";
import type { Cache, KalpRequest, KalpResponse, ProviderAdapter } from "../../../contracts/kalp-reference.js";
import { ProviderResilienceError, executeWithResilience } from "../provider/provider-resilience.js";

export class ReferenceMcpGateway {
  private readonly inFlight = new Map<string, Promise<KalpResponse>>();

  constructor(
    private readonly cache: Cache,
    private readonly providers: Map<string, ProviderAdapter>,
    private readonly defaultTtlMs = 60_000,
    private readonly providerTimeoutMs = 5_000,
  ) {}

  async execute(request: KalpRequest): Promise<KalpResponse> {
    const started = Date.now();
    const cacheKey = this.cacheKey(request);
    const cached = await this.cache.get(cacheKey);
    if (cached.status === "hit" && cached.value) {
      return { request_id: request.request_id, status: "ok", result: cached.value, provenance: cached.value.provenance,
        freshness: { retrieved_at: cached.value.retrieved_at, expires_at: cached.value.expires_at },
        execution: { cache_status: "hit", provider: cached.value.provider, latency_ms: Date.now() - started } };
    }

    const existing = this.inFlight.get(cacheKey);
    if (existing) {
      const result = await existing;
      return { ...result, request_id: request.request_id,
        execution: { ...result.execution, cache_status: cached.status, latency_ms: Date.now() - started } };
    }

    const cacheStatus: "miss" | "expired" = cached.status === "expired" ? "expired" : "miss";
    const execution = this.fetchAndCache(request, cacheKey, cacheStatus, started);
    this.inFlight.set(cacheKey, execution);
    try { return await execution; } finally { this.inFlight.delete(cacheKey); }
  }

  private async fetchAndCache(request: KalpRequest, cacheKey: string, cacheStatus: "miss" | "expired", started: number): Promise<KalpResponse> {
    if (this.providers.size === 0) {
      return { request_id: request.request_id, status: "error", execution: { cache_status: cacheStatus, latency_ms: Date.now() - started },
        error: { code: "NO_PROVIDER", message: "No provider adapter is registered." } };
    }

    try {
      const execution = await executeWithResilience(this.providers.values(), request, this.providerTimeoutMs);
      await this.cache.set(cacheKey, execution.data, this.defaultTtlMs);
      return { request_id: request.request_id, status: "ok", result: execution.data, provenance: execution.data.provenance,
        freshness: { retrieved_at: execution.data.retrieved_at, expires_at: execution.data.expires_at },
        execution: { cache_status: cacheStatus, provider: execution.provider.provider_id, latency_ms: Date.now() - started } };
    } catch (error) {
      if (error instanceof ProviderResilienceError) {
        return { request_id: request.request_id, status: "error", execution: { cache_status: cacheStatus, provider: error.attempts.at(-1)?.provider, latency_ms: Date.now() - started },
          error: { code: error.code, message: error.message } };
      }
      return { request_id: request.request_id, status: "error", execution: { cache_status: cacheStatus, latency_ms: Date.now() - started },
        error: { code: "PROVIDER_ERROR", message: "Provider adapter execution failed." } };
    }
  }

  static request(input: Omit<KalpRequest, "request_id">): KalpRequest { return { ...input, request_id: randomUUID() }; }

  private cacheKey(request: KalpRequest): string {
    return [request.vertical_id, request.capability, request.operation, JSON.stringify(request.parameters)].join(":");
  }
}
