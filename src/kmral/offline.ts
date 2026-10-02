export type KMRALOfflineStatus = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'CONFLICT';

export interface KMRALMutation<Payload = unknown> {
  readonly id: string;
  readonly payload: Payload;
}

export class InMemoryKMRALMutationQueue<Payload = unknown> {
  private readonly pending: KMRALMutation<Payload>[] = [];

  enqueue(mutation: KMRALMutation<Payload>): void {
    this.pending.push(mutation);
  }

  peek(): KMRALMutation<Payload> | undefined {
    return this.pending[0];
  }

  drain(): KMRALMutation<Payload>[] {
    return this.pending.splice(0);
  }

  size(): number {
    return this.pending.length;
  }
}
