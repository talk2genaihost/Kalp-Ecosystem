import type { OfflineQueue } from '../../../../src/kmral/offline/index.js';
import type { OfflineQueueItem } from '../../../../src/kmral/offline/index.js';
import { InspectFlowSyncService } from './sync-service.js';

export class SyncRunner {
  constructor(
    private readonly queue: OfflineQueue,
    private readonly service: InspectFlowSyncService,
  ) {}

  async drain(): Promise<void> {
    while (true) {
      const item = this.queue.peek() as OfflineQueueItem | null;
      if (!item) return;

      const result = await this.service.process(item);
      if (result.status === 'synced') {
        this.queue.remove(item.id);
        continue;
      }

      // Retry and conflict remain queued. The caller can surface these states
      // to the UI and resolve/retry explicitly rather than losing local data.
      this.queue.markAttempt(item.id);
      return;
    }
  }
}
