export type CacheStatus = "hit" | "miss" | "expired";

export interface KalpDataObject<T = unknown> {
  id: string;
  capability: string;
  data: T;
  source: string;
  provider: string;
  retrieved_at: string;
  expires_at: string;
  validation_status: "pass" | "fail";
  provenance: string;
  schema_version: string;
}

export interface KalpRequest<T = Record<string, unknown>> {
  request_id: string;
  vertical_id: string;
  capability: string;
  operation: string;
  parameters: T;
  context?: Record<string, unknown>;
}

export interface KalpResponse<T = unknown> {
  request_id: string;
  status: "ok" | "error";
  result?: T;
  provenance?: string;
  freshness?: { retrieved_at: string; expires_at: string };
  execution: { cache_status: CacheStatus | "none"; provider?: string; latency_ms: number };
  error?: { code: string; message: string };
}

export interface ProviderAdapter<T = unknown> {
  readonly provider_id: string;
  fetch(request: KalpRequest): Promise<T>;
  normalize(raw: T, request: KalpRequest): KalpDataObject;
  validate(data: KalpDataObject): boolean;
  health(): Promise<{ available: boolean; latency_ms?: number }>;
  quota(): Promise<{ remaining?: number }>;
}

export interface Cache<T = KalpDataObject> {
  get(key: string): Promise<{ status: CacheStatus; value?: T }>;
  set(key: string, value: T, ttl_ms: number): Promise<void>;
  invalidate(key: string): Promise<void>;
}
