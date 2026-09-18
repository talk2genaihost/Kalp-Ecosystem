import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: string;
  expiresAt: string;
  estimatedTokens: number;
  provenance: string;
}

const CAPACITY_TOKENS = Number(process.env.KALP_MCP_CACHE_TOKEN_CAPACITY ?? 1_500_000_000);
const TTL_MS = Number(process.env.KALP_MCP_CACHE_TTL_MS ?? 30 * 24 * 60 * 60 * 1000);
const CACHE_DIR = process.env.KALP_MCP_CACHE_DIR ?? "artifacts/kalp-mcp-cache";
const inFlight = new Map<string, Promise<string>>();

export function cacheKey(namespace: string, sourceRef: string): string {
  return createHash("sha256").update(namespace + "\n" + sourceRef).digest("hex");
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

async function pathFor(key: string): Promise<string> {
  await mkdir(CACHE_DIR, { recursive: true });
  return join(CACHE_DIR, key + ".json");
}

export async function getCachedText(key: string): Promise<string | undefined> {
  try {
    const raw = await readFile(await pathFor(key), "utf8");
    const entry = JSON.parse(raw) as CacheEntry<string>;
    if (Date.parse(entry.expiresAt) <= Date.now()) return undefined;
    return entry.value;
  } catch {
    return undefined;
  }
}

export async function putCachedText(key: string, value: string, provenance: string): Promise<void> {
  const estimatedTokens = estimateTokens(value);
  if (estimatedTokens > CAPACITY_TOKENS) throw new Error("MCP cache entry exceeds configured token capacity.");
  const entry: CacheEntry<string> = {
    key,
    value,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + TTL_MS).toISOString(),
    estimatedTokens,
    provenance,
  };
  await writeFile(await pathFor(key), JSON.stringify(entry), "utf8");
  await enforceCapacity();
}

async function enforceCapacity(): Promise<void> {
  const names = await readdir(CACHE_DIR).catch(() => []);
  const entries: Array<{ path: string; createdAt: number; tokens: number }> = [];
  for (const name of names.filter(n => n.endsWith(".json"))) {
    try {
      const path = join(CACHE_DIR, name);
      const entry = JSON.parse(await readFile(path, "utf8")) as CacheEntry<string>;
      entries.push({ path, createdAt: Date.parse(entry.createdAt), tokens: entry.estimatedTokens });
    } catch {}
  }
  let total = entries.reduce((n, e) => n + e.tokens, 0);
  for (const entry of entries.sort((a, b) => a.createdAt - b.createdAt)) {
    if (total <= CAPACITY_TOKENS) break;
    await unlink(entry.path).catch(() => {});
    total -= entry.tokens;
  }
}

export async function getOrLoadText(key: string, loader: () => Promise<string>, provenance: string): Promise<{ text: string; cacheHit: boolean }> {
  const hit = await getCachedText(key);
  if (hit !== undefined) return { text: hit, cacheHit: true };

  const existing = inFlight.get(key);
  if (existing) return { text: await existing, cacheHit: false };

  const promise = loader().then(async text => {
    await putCachedText(key, text, provenance);
    return text;
  }).finally(() => inFlight.delete(key));

  inFlight.set(key, promise);
  return { text: await promise, cacheHit: false };
}

export function mcpCacheConfig() {
  return { capacityTokens: CAPACITY_TOKENS, ttlMs: TTL_MS, cacheDir: CACHE_DIR };
}
