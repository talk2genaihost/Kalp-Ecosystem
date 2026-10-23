import type { KalpRequest, KalpDataObject, ProviderAdapter } from "../../../contracts/kalp-reference.js";

export type ProviderExecutionFailure = "PROVIDER_UNAVAILABLE" | "PROVIDER_TIMEOUT" | "PROVIDER_ERROR" | "VALIDATION_FAILED";

export interface ProviderAttempt {
  provider: string;
  failure?: ProviderExecutionFailure;
  latency_ms: number;
}

export interface ProviderExecutionResult {
  provider: ProviderAdapter;
  data: KalpDataObject;
  attempts: ProviderAttempt[];
}

export async function executeWithResilience(
  providers: Iterable<ProviderAdapter>,
  request: KalpRequest,
  timeoutMs: number,
): Promise<ProviderExecutionResult> {
  const attempts: ProviderAttempt[] = [];

  for (const provider of providers) {
    const started = Date.now();
    try {
      const health = await withTimeout(provider.health(), timeoutMs);
      if (!health.available) {
        attempts.push({ provider: provider.provider_id, failure: "PROVIDER_UNAVAILABLE", latency_ms: Date.now() - started });
        continue;
      }

      const raw = await withTimeout(provider.fetch(request), timeoutMs);
      const normalized = provider.normalize(raw, request);
      if (!provider.validate(normalized)) {
        attempts.push({ provider: provider.provider_id, failure: "VALIDATION_FAILED", latency_ms: Date.now() - started });
        continue;
      }

      attempts.push({ provider: provider.provider_id, latency_ms: Date.now() - started });
      return { provider, data: normalized, attempts };
    } catch (error) {
      const failure: ProviderExecutionFailure = error instanceof ProviderTimeoutError ? "PROVIDER_TIMEOUT" : "PROVIDER_ERROR";
      attempts.push({ provider: provider.provider_id, failure, latency_ms: Date.now() - started });
    }
  }

  const last = attempts.at(-1);
  const failure = last?.failure ?? "PROVIDER_ERROR";
  throw new ProviderResilienceError(failure, attempts);
}

class ProviderTimeoutError extends Error {}

export class ProviderResilienceError extends Error {
  constructor(public readonly code: ProviderExecutionFailure, public readonly attempts: ProviderAttempt[]) {
    super(`All provider attempts failed: ${code}.`);
    this.name = "ProviderResilienceError";
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ProviderTimeoutError("Provider operation timed out.")), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
