import type { ExperimentCommand } from "../runtime/types.js";

export type SyncState = "ONLINE" | "OFFLINE" | "SYNCING" | "CONFLICT";

export interface OfflineMutation {
  readonly mutationId: string;
  readonly experimentId: string;
  readonly command: ExperimentCommand;
  readonly baseRevision: number;
}

export interface ConflictEnvelope {
  readonly conflictId: string;
  readonly experimentId: string;
  readonly local: OfflineMutation;
  readonly remoteRevision: number;
  readonly reason: "REMOTE_REVISION_AHEAD" | "DUPLICATE_MUTATION";
}

export interface OfflineQueuePort {
  enqueue(mutation: OfflineMutation): void;
  pending(experimentId: string): OfflineMutation[];
  drain(experimentId: string): OfflineMutation[];
  clear?(experimentId: string): void;
}

export interface DurableKeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

const clone = <T>(value: T): T => structuredClone(value);

export class InMemoryKeyValueStore implements DurableKeyValueStore {
  private readonly values = new Map<string, string>();
  get(key: string): string | null { return this.values.get(key) ?? null; }
  set(key: string, value: string): void { this.values.set(key, value); }
  remove(key: string): void { this.values.delete(key); }
}

export class LocalStorageKeyValueStore implements DurableKeyValueStore {
  constructor(private readonly storage: Storage = window.localStorage) {}
  get(key: string): string | null { return this.storage.getItem(key); }
  set(key: string, value: string): void { this.storage.setItem(key, value); }
  remove(key: string): void { this.storage.removeItem(key); }
}

export class InMemoryOfflineQueue implements OfflineQueuePort {
  private readonly queue: OfflineMutation[] = [];
  enqueue(mutation: OfflineMutation): void {
    if (this.queue.some((item) => item.mutationId === mutation.mutationId)) return;
    this.queue.push(clone(mutation));
  }
  pending(experimentId: string): OfflineMutation[] {
    return this.queue.filter((item) => item.experimentId === experimentId).map((item) => clone(item));
  }
  drain(experimentId: string): OfflineMutation[] {
    const selected = this.pending(experimentId);
    const ids = new Set(selected.map((item) => item.mutationId));
    for (let index = this.queue.length - 1; index >= 0; index -= 1) if (ids.has(this.queue[index].mutationId)) this.queue.splice(index, 1);
    return selected;
  }
  clear(experimentId: string): void { this.drain(experimentId); }
}

export class DurableOfflineQueue implements OfflineQueuePort {
  constructor(private readonly store: DurableKeyValueStore, private readonly key = "kmrl:offline:mutations:v1") {}
  private read(): OfflineMutation[] {
    const raw = this.store.get(this.key); if (!raw) return [];
    try { const parsed = JSON.parse(raw) as unknown; return Array.isArray(parsed) ? parsed as OfflineMutation[] : []; } catch { return []; }
  }
  private write(queue: OfflineMutation[]): void { this.store.set(this.key, JSON.stringify(queue)); }
  enqueue(mutation: OfflineMutation): void {
    const queue = this.read();
    if (queue.some((item) => item.mutationId === mutation.mutationId)) return;
    queue.push(clone(mutation)); this.write(queue);
  }
  pending(experimentId: string): OfflineMutation[] { return this.read().filter((item) => item.experimentId === experimentId).map((item) => clone(item)); }
  drain(experimentId: string): OfflineMutation[] {
    const queue = this.read(); const selected = queue.filter((item) => item.experimentId === experimentId);
    this.write(queue.filter((item) => item.experimentId !== experimentId)); return selected.map((item) => clone(item));
  }
  clear(experimentId: string): void { this.drain(experimentId); }
}
