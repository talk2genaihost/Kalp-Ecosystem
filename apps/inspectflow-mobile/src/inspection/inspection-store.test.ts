import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InspectionStore } from './inspection-store.js';
import { MemoryPersistentStore } from '../storage/persistent-store.js';

test('InspectFlow persists an inspection and creates an offline sync item', async () => {
  const store = new InspectionStore(new MemoryPersistentStore());
  const record = {
    id: 'inspection-001',
    title: 'Site Inspection',
    status: 'in-progress' as const,
    updatedAt: '2026-09-27T12:00:00.000Z',
  };

  await store.save(record);

  assert.deepEqual(await store.get(record.id), record);
  assert.equal(store.pendingSyncCount(), 1);
  assert.equal(store.nextSyncItem()?.payload.id, record.id);
});
