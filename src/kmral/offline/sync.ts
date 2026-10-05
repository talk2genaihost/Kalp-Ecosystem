import type { OfflineQueueItem } from './index.js';

export type SyncResult =
  | { status: 'synced'; id: string }
  | { status: 'retry'; id: string; reason: string }
  | { status: 'conflict'; id: string; reason: string };

export type SyncAdapter<T = unknown> = {
  apply(item: OfflineQueueItem<T>): Promise<SyncResult>;
};

export async function syncOne<T>(
  item: OfflineQueueItem<T>,
  adapter: SyncAdapter<T>,
): Promise<SyncResult> {
  try {
    return await adapter.apply(item);
  } catch (error) {
    return {
      status: 'retry',
      id: item.id,
      reason: error instanceof Error ? error.message : 'unknown sync error',
    };
  }
}
