import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAppShellSpec, createButtonSpec } from '../src/kmral/ui/index.js';
import { InMemoryRepository } from '../src/kmral/data/index.js';
import { OfflineQueue } from '../src/kmral/offline/index.js';

test('KMRAL UI creates reusable button defaults', () => {
  assert.deepEqual(createButtonSpec({ label: 'Save' }), {
    label: 'Save',
    variant: 'primary',
    disabled: false,
  });
});

test('KMRAL UI validates app shell identity', () => {
  const shell = createAppShellSpec({ appId: 'inspectflow', title: 'InspectFlow', navigation: ['Home'] });
  assert.equal(shell.appId, 'inspectflow');
  assert.deepEqual(shell.navigation, ['Home']);
  assert.throws(() => createAppShellSpec({ appId: '', title: 'X', navigation: [] }));
});

test('KMRAL DATA repository persists and clones entities', async () => {
  const repo = new InMemoryRepository<{ id: string; name: string }>();
  await repo.save({ id: '1', name: 'Inspection' });
  const entity = await repo.get('1');
  assert.deepEqual(entity, { id: '1', name: 'Inspection' });
  assert.notEqual(entity, await repo.get('1'));
});

test('KMRAL OFFLINE queue tracks operations and attempts', () => {
  const queue = new OfflineQueue<{ name: string }>();
  queue.enqueue({ id: 'q1', operation: 'create', resource: 'inspection', payload: { name: 'A' }, createdAt: new Date().toISOString() });
  assert.equal(queue.size(), 1);
  assert.equal(queue.peek()?.attempts, 0);
  queue.markAttempt('q1');
  assert.equal(queue.peek()?.attempts, 1);
  assert.equal(queue.remove('q1'), true);
  assert.equal(queue.size(), 0);
});
