import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InspectionStore } from './inspection-store.js';
import { MemoryPersistentStore } from '../storage/persistent-store.js';
import { InspectFlowSyncService, type SyncAdapter } from './sync-service.js';

/**
 * Contract-level E2E simulation of:
 * online create -> sync -> offline modify -> retry -> restore -> sync -> verify.
 * The transport is intentionally deterministic so CI can run without a real network.
 */
test('InspectFlow network interruption recovery workflow', async () => {
  const store = new InspectionStore(new MemoryPersistentStore());
  let online = true;
  const server = new Map<string, unknown>();

  const adapter: SyncAdapter = {
    async push(item) {
      if (!online) return { status: 'retry', id: item.id, reason: 'NETWORK_OFFLINE' };
      server.set(item.id, item.payload);
      return { status: 'synced', id: item.id };
    },
  };

  const sync = new InspectFlowSyncService(adapter);

  // Online: create and sync.
  const initial = {
    id: 'inspection-001',
    title: 'Site Inspection',
    status: 'draft' as const,
    updatedAt: '2026-09-27T12:00:00.000Z',
  };
  await store.save(initial);
  let item = store.nextSyncItem()!;
  let result = await sync.process(item);
  assert.equal(result.status, 'synced');
  store.acknowledgeSync(item.id);
  assert.equal(store.pendingSyncCount(), 0);
  assert.equal(server.size, 1);

  // Offline: modify and attempt sync.
  online = false;
  const modified = {
    ...initial,
    status: 'in-progress' as const,
    updatedAt: '2026-09-27T12:05:00.000Z',
  };
  await store.save(modified);
  item = store.nextSyncItem()!;
  result = await sync.process(item);
  assert.equal(result.status, 'retry');
  assert.equal(store.pendingSyncCount(), 1);
  assert.deepEqual(await store.get(modified.id), modified);

  // Restore network: retry and acknowledge.
  online = true;
  result = await sync.process(item);
  assert.equal(result.status, 'synced');
  store.acknowledgeSync(item.id);

  // Final local + server state.
  assert.equal(store.pendingSyncCount(), 0);
  assert.deepEqual(await store.get(modified.id), modified);
  assert.deepEqual(server.get(item.id), modified);
});
