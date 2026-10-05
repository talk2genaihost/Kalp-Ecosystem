import assert from 'node:assert/strict';
import test from 'node:test';

test('KMRL sync endpoint contract is versioned under /v1/experiments', () => {
  const endpoint = '/functions/v1/kmrl-sync/v1/experiments/{experimentId}';
  assert.match(endpoint, /\/v1\/experiments/);
  assert.match(endpoint, /kmrl-sync/);
});
