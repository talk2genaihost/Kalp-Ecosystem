import { randomUUID } from "node:crypto";
import type { Cache, KalpRequest, KalpResponse, ProviderAdapter } from "../../../contracts/kalp-reference.js";

export class ReferenceMcpGateway {
  constructor(
    private readonly cache: Cache,
    private readonly providers: Map<string, ProviderAdapter>,
    private readonly defaultTtlMs = 60_000,
  ) {}

  async execute(request: KalpRequest): Promise<KalpResponse> {
    const started = Date.now();
    const cacheKey = this.cacheKey(request);
    const cached = await this.cache.get(cacheKey);
    if (cached.status === "hit" && cached.value) {
      return {
        request_id: request.request_id,
        status: "ok",
        result: cached.value,
        provenance: cached.value.provenance,
        freshness: { retrieved_at: cached.value.retrieved_at, expires_at: cached.value.expires_at },
        execution: { cache_status: "hit", provider: cached.value.provider, latency_ms: Date.now() - started },
      };
    }

    const provider = this.providers.values().next().value as ProviderAdapter | undefined;
    if (!provider) {
      return {
        request_id: request.request_id,
        status: "error",
        execution: { cache_status: cached.status, latency_ms: Date.now() - started },
        error: { code: "NO_PROVIDER", message: "No provider adapter is registered." },
      };
    }

    try {
      const raw = await provider.fetch(request);
      const normalized = provider.normalize(raw, request);
      if (!provider.validate(normalized)) {
        return {
          request_id: request.request_id,
          status: "error",
          execution: { cache_status: cached.status, provider: provider.provider_id, latency_ms: Date.now() - started },
          error: { code: "VALIDATION_FAILED", message: "Provider response failed KALP validation." },
        };
      }
      await this.cache.set(cacheKey, normalized, this.defaultTtlMs);
      return {
        request_id: request.request_id,
        status: "ok",
        result: normalized,
        provenance: normalized.provenance,
        freshness: { retrieved_at: normalized.retrieved_at, expires_at: normalized.expires_at },
        execution: { cache_status: cached.status, provider: provider.provider_id, latency_ms: Date.now() - started },
      };
    } catch {
      return {
        request_id: request.request_id,
        status: "error",
        execution: { cache_status: cached.status, provider: provider.provider_id, latency_ms: Date.now() - started },
        error: { code: "PROVIDER_ERROR", message: "Provider adapter execution failed." },
      };
    }
  }

  static request(input: Omit<KalpRequest, "request_id">): KalpRequest {
    return { ...input, request_id: randomUUID() };
  }

  private cacheKey(request: KalpRequest): string {
    return [request.vertical_id, request.capability, request.operation, JSON.stringify(request.parameters)].join(":");
  }
}
