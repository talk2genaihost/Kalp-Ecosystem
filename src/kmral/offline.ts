export type KMRALOfflineStatus = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'CONFLICT';

export interface KMRALMutation<Payload = unknown> {
  readonly id: string;
  readonly payload: Payload;
}

export type KMRALMutationPredicate<Payload> = (mutation: KMRALMutation<Payload>) => boolean;

export class InMemoryKMRALMutationQueue<Payload = unknown> {
  private readonly pendingMutations: KMRALMutation<Payload>[] = [];

  enqueue(mutation: KMRALMutation<Payload>): void {
    if (this.pendingMutations.some((item) => item.id === mutation.id)) return;
    this.pendingMutations.push(structuredClone(mutation));
  }

  peek(): KMRALMutation<Payload> | undefined {
    return this.pendingMutations[0] ? structuredClone(this.pendingMutations[0]) : undefined;
  }

  pending(): KMRALMutation<Payload>[] {
    return this.pendingMutations.map((mutation) => structuredClone(mutation));
  }

  drain(): KMRALMutation<Payload>[] {
    return this.pendingMutations.splice(0).map((mutation) => structuredClone(mutation));
  }

  drainWhere(predicate: KMRALMutationPredicate<Payload>): KMRALMutation<Payload>[] {
    const selected: KMRALMutation<Payload>[] = [];
    for (let index = this.pendingMutations.length - 1; index >= 0; index -= 1) {
      if (predicate(this.pendingMutations[index])) {
        selected.unshift(this.pendingMutations[index]);
        this.pendingMutations.splice(index, 1);
      }
    }
    return selected.map((mutation) => structuredClone(mutation));
  }

  size(): number {
    return this.pendingMutations.length;
  }
}

export class LocalStorageKMRALMutationQueue<Payload = unknown> {
  constructor(
    private readonly store: {
      get(key: string): string | null;
      set(key: string, value: string): void;
      remove(key: string): void;
    },
    private readonly key = "kmral:offline:mutations:v1",
  ) {}

  private read(): KMRALMutation<Payload>[] {
    const raw = this.store.get(this.key);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed as KMRALMutation<Payload>[] : [];
    } catch {
      return [];
    }
  }

  private write(queue: KMRALMutation<Payload>[]): void {
    if (queue.length === 0) {
      this.store.remove(this.key);
      return;
    }

    this.store.set(this.key, JSON.stringify(queue));
  }

  enqueue(mutation: KMRALMutation<Payload>): void {
    const queue = this.read();
    if (queue.some((item) => item.id === mutation.id)) return;
    queue.push(structuredClone(mutation));
    this.write(queue);
  }

  peek(): KMRALMutation<Payload> | undefined {
    const mutation = this.read()[0];
    return mutation ? structuredClone(mutation) : undefined;
  }

  pending(): KMRALMutation<Payload>[] {
    return this.read().map((mutation) => structuredClone(mutation));
  }

  drain(): KMRALMutation<Payload>[] {
    const queue = this.read();
    this.write([]);
    return queue.map((mutation) => structuredClone(mutation));
  }

  drainWhere(predicate: KMRALMutationPredicate<Payload>): KMRALMutation<Payload>[] {
    const queue = this.read();
    const selected: KMRALMutation<Payload>[] = [];
    const remaining: KMRALMutation<Payload>[] = [];

    for (const mutation of queue) {
      if (predicate(mutation)) selected.push(mutation);
      else remaining.push(mutation);
    }

    this.write(remaining);
    return selected.map((mutation) => structuredClone(mutation));
  }

  size(): number {
    return this.read().length;
  }
}
