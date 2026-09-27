import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InspectionStore } from './inspection-store.js';
import { MemoryPersistentStore } from '../storage/persistent-store.js';
import { InspectFlowSyncService, type SyncAdapter } from '../sync/sync-service.js';

test('InspectFlow complete offline-to-online workflow', async () => {
  const store = new InspectionStore(new MemoryPersistentStore());

  // 1. Create inspection locally.
  const created = {
    id: 'inspection-001',
    title: 'Site Inspection',
    status: 'draft' as const,
    updatedAt: '2026-09-27T12:00:00.000Z',
  };
  await store.save(created);
  assert.deepEqual(await store.get(created.id), created);

  // 2. Simulate going offline and modifying locally.
  const modified = {
    ...created,
    status: 'in-progress' as const,
    updatedAt: '2026-09-27T12:05:00.000Z',
  };
  await store.save(modified);
  assert.deepEqual(await store.get(modified.id), modified);
  assert.equal(store.pendingSyncCount(), 2);

  // 3. Restore connectivity and sync queued operations.
  const syncedIds: string[] = [];
  const adapter: SyncAdapter = {
    async push(item) {
      syncedIds.push(item.id);
      return { status: 'synced', id: item.id };
    },
  };
  const sync = new InspectFlowSyncService(adapter);

  // 4. Sync + acknowledge every queued operation.
  while (store.nextSyncItem()) {
    const item = store.nextSyncItem()!;
    const result = await sync.process(item);
    assert.equal(result.status, 'synced');
    assert.equal(store.acknowledgeSync(item.id), true);
  }

  // 5. Verify final local state and empty sync queue.
  assert.deepEqual(await store.get(modified.id), modified);
  assert.equal(store.pendingSyncCount(), 0);
  assert.equal(syncedIds.length, 2);
});
