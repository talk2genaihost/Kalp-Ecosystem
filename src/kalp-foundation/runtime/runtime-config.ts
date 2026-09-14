export type KalpEnvironment = "development" | "test" | "staging" | "production";

export interface KalpRuntimeConfig {
  environment: KalpEnvironment;
  providerTimeoutMs: number;
  cacheTtlMs: number;
}

const DEFAULT_PROVIDER_TIMEOUT_MS = 5_000;
const DEFAULT_CACHE_TTL_MS = 60_000;
const MIN_PROVIDER_TIMEOUT_MS = 100;
const MAX_PROVIDER_TIMEOUT_MS = 120_000;
const MIN_CACHE_TTL_MS = 1_000;
const MAX_CACHE_TTL_MS = 86_400_000;

function parseBoundedInteger(name: string, raw: string | undefined, fallback: number, min: number, max: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  if (!/^\d+$/.test(raw.trim())) throw new Error(`Invalid ${name}: expected an integer.`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`Invalid ${name}: expected ${min}..${max}.`);
  }
  return value;
}

function parseEnvironment(raw: string | undefined): KalpEnvironment {
  const value = (raw ?? "development").trim();
  if (value === "development" || value === "test" || value === "staging" || value === "production") return value;
  throw new Error(`Invalid KALP_ENV: expected development, test, staging, or production.`);
}

export function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): KalpRuntimeConfig {
  return {
    environment: parseEnvironment(env.KALP_ENV),
    providerTimeoutMs: parseBoundedInteger(
      "KALP_PROVIDER_TIMEOUT_MS",
      env.KALP_PROVIDER_TIMEOUT_MS,
      DEFAULT_PROVIDER_TIMEOUT_MS,
      MIN_PROVIDER_TIMEOUT_MS,
      MAX_PROVIDER_TIMEOUT_MS,
    ),
    cacheTtlMs: parseBoundedInteger(
      "KALP_CACHE_TTL_MS",
      env.KALP_CACHE_TTL_MS,
      DEFAULT_CACHE_TTL_MS,
      MIN_CACHE_TTL_MS,
      MAX_CACHE_TTL_MS,
    ),
  };
}
