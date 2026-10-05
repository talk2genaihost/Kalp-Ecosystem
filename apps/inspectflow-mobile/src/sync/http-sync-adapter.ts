import type { OfflineQueueItem } from '../../../../src/kmral/offline/index.js';
import type { SyncAdapter, SyncResult } from './sync-service.js';

export class HttpSyncAdapter implements SyncAdapter {
  constructor(private readonly endpoint: string) {}

  async push<T>(item: OfflineQueueItem<T>): Promise<SyncResult> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(item),
      });

      if (response.status === 409) {
        return { status: 'conflict', id: item.id, reason: 'Remote version conflict' };
      }

      if (!response.ok) {
        return { status: 'retry', id: item.id, reason: `HTTP ${response.status}` };
      }

      return { status: 'synced', id: item.id };
    } catch (error) {
      return {
        status: 'retry',
        id: item.id,
        reason: error instanceof Error ? error.message : 'Network failure',
      };
    }
  }
}
