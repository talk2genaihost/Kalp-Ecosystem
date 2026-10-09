import type { KalpRequest, ProviderAdapter, KalpDataObject } from "../../../contracts/kalp-reference.js";

export class ReferenceProvider implements ProviderAdapter<Record<string, unknown>> {
  readonly provider_id = "reference-provider";
  calls = 0;

  async fetch(request: KalpRequest): Promise<Record<string, unknown>> {
    this.calls += 1;
    return { echo: request.parameters, generated_at: new Date().toISOString() };
  }

  normalize(raw: Record<string, unknown>, request: KalpRequest): KalpDataObject {
    const now = Date.now();
    return {
      id: `${request.capability}:${request.operation}`,
      capability: request.capability,
      data: raw,
      source: "reference",
      provider: this.provider_id,
      retrieved_at: new Date(now).toISOString(),
      expires_at: new Date(now + 60_000).toISOString(),
      validation_status: "pass",
      provenance: "reference-provider",
      schema_version: "1.0",
    };
  }

  validate(data: KalpDataObject): boolean {
    return data.validation_status === "pass" && Boolean(data.provenance);
  }

  async health(): Promise<{ available: boolean; latency_ms?: number }> {
    return { available: true, latency_ms: 0 };
  }

  async quota(): Promise<{ remaining?: number }> {
    return { remaining: Number.POSITIVE_INFINITY };
  }
}
