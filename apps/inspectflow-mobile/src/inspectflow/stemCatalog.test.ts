import assert from 'node:assert/strict';
import test from 'node:test';
import { COLLISION_MOMENTUM_MAPPING, STEM_CATALOG_SOURCE, STEM_EXPERIMENTS } from './stemCatalog';

test('STEM catalog contains the 45 seed experiments from the approved workbook', () => {
  assert.equal(STEM_EXPERIMENTS.length, 45);
  assert.equal(STEM_EXPERIMENTS.filter((x) => x.Domain === 'PHYSICS').length, 15);
  assert.equal(STEM_EXPERIMENTS.filter((x) => x.Domain === 'CHEMISTRY').length, 15);
  assert.equal(STEM_EXPERIMENTS.filter((x) => x.Domain === 'MATHEMATICS').length, 15);
});

test('approved collision catalog maps PHY-MEC-007 to the runtime model inputs', () => {
  assert.equal(STEM_EXPERIMENTS.find((x) => x.Experiment_ID === 'PHY-MEC-007')?.Model_ID, 'collision_momentum');
  assert.equal(COLLISION_MOMENTUM_MAPPING['PHY-MEC-007-P01'].modelInput, 'm1');
  assert.equal(COLLISION_MOMENTUM_MAPPING['PHY-MEC-007-P02'].modelInput, 'm2');
  assert.equal(COLLISION_MOMENTUM_MAPPING['PHY-MEC-007-P03'].modelInput, 'v1');
  assert.equal(COLLISION_MOMENTUM_MAPPING['PHY-MEC-007-P04'].modelInput, 'v2');
  assert.equal(COLLISION_MOMENTUM_MAPPING['PHY-MEC-007-P05'].modelInput, 'dt');
});

test('catalog manifest retains exact source hashes', () => {
  assert.equal(STEM_CATALOG_SOURCE.approvedSha256, 'd20c89ea77d8eaf8a5c59ea0fd91d169138a9f5de9d07e135b561aa9d79f54d8');
  assert.equal(STEM_CATALOG_SOURCE.legacySha256, 'edea26e4a05a3b9db6510c7100c07f2941b14b14cbf713a8f361a11a0700af61');
});
