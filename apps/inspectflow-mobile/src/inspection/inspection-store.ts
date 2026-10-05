import { InMemoryRepository } from '../../../../src/kmral/data/index.js';
import { OfflineQueue } from '../../../../src/kmral/offline/index.js';
import type { PersistentStore } from '../storage/persistent-store.js';

export type InspectionRecord = {
  id: string;
  title: string;
  status: 'draft' | 'in-progress' | 'completed';
  updatedAt: string;
};

export class InspectionStore {
  private readonly repository = new InMemoryRepository<InspectionRecord>();
  private readonly queue = new OfflineQueue<InspectionRecord>();

  constructor(private readonly persistent: PersistentStore) {}

  async save(record: InspectionRecord): Promise<InspectionRecord> {
    const saved = await this.repository.save(record);
    await this.persistent.set(`inspection:${saved.id}`, saved);
    this.queue.enqueue({
      id: `inspection-${saved.id}-${saved.updatedAt}`,
      operation: 'update',
      resource: 'inspection',
      payload: saved,
      createdAt: saved.updatedAt,
    });
    return saved;
  }

  async get(id: string): Promise<InspectionRecord | null> {
    const local = await this.repository.get(id);
    if (local) return local;
    return this.persistent.get<InspectionRecord>(`inspection:${id}`);
  }

  pendingSyncCount(): number {
    return this.queue.size();
  }

  nextSyncItem() {
    return this.queue.peek();
  }

  acknowledgeSync(id: string): boolean {
    return this.queue.remove(id);
  }
}
