export type SyncOperation = 'create' | 'update' | 'delete';

export type OfflineQueueItem<T = unknown> = {
  id: string;
  operation: SyncOperation;
  resource: string;
  payload: T;
  createdAt: string;
  attempts: number;
};

export class OfflineQueue<T = unknown> {
  private readonly items: OfflineQueueItem<T>[] = [];

  enqueue(item: Omit<OfflineQueueItem<T>, 'attempts'>): OfflineQueueItem<T> {
    const queued = { ...item, attempts: 0 };
    this.items.push(queued);
    return { ...queued };
  }

  peek(): OfflineQueueItem<T> | null {
    return this.items.length ? { ...this.items[0] } : null;
  }

  markAttempt(id: string): void {
    const item = this.items.find((entry) => entry.id === id);
    if (item) item.attempts += 1;
  }

  remove(id: string): boolean {
    const index = this.items.findIndex((entry) => entry.id === id);
    if (index < 0) return false;
    this.items.splice(index, 1);
    return true;
  }

  size(): number {
    return this.items.length;
  }
}
