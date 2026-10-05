import type { OfflineQueueItem } from '../../../../src/kmral/offline/index.js';

export type SyncResult =
  | { status: 'synced'; id: string }
  | { status: 'retry'; id: string; reason: string }
  | { status: 'conflict'; id: string; reason: string };

export type SyncAdapter = {
  push<T>(item: OfflineQueueItem<T>): Promise<SyncResult>;
};

export class InspectFlowSyncService {
  constructor(private readonly adapter: SyncAdapter) {}

  async process<T>(item: OfflineQueueItem<T>): Promise<SyncResult> {
    try {
      return await this.adapter.push(item);
    } catch (error) {
      return {
        status: 'retry',
        id: item.id,
        reason: error instanceof Error ? error.message : 'Unknown sync failure',
      };
    }
  }
}
