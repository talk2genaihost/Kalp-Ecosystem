import type { Cache, CacheStatus, KalpDataObject } from "../../../contracts/kalp-reference.js";

type Entry<T> = { value: T; expires_at: number };

export class InMemoryCache implements Cache {
  private readonly entries = new Map<string, Entry<KalpDataObject>>();

  async get(key: string): Promise<{ status: CacheStatus; value?: KalpDataObject }> {
    const entry = this.entries.get(key);
    if (!entry) return { status: "miss" };
    if (Date.now() >= entry.expires_at) {
      this.entries.delete(key);
      return { status: "expired" };
    }
    return { status: "hit", value: entry.value };
  }

  async set(key: string, value: KalpDataObject, ttl_ms: number): Promise<void> {
    this.entries.set(key, { value, expires_at: Date.now() + ttl_ms });
  }

  async invalidate(key: string): Promise<void> {
    this.entries.delete(key);
  }
}
