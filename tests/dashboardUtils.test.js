import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConsumerRanking } from '../dashboard-utils.js';

test('builds a ranked list by total coffee quantity and highlights the current user', () => {
  const ranking = buildConsumerRanking([
    { userId: 'u1', quantityKg: 3, valueTotal: 45 },
    { userId: 'u2', quantityKg: 3, valueTotal: 75 },
    { userId: 'u1', quantityKg: 2, valueTotal: 30 },
  ], 'u1', 'Ana');

  assert.equal(ranking[0].displayName, 'Ana');
  assert.equal(ranking[0].totalKg, 5);
  assert.equal(ranking[1].displayName, 'Consumidor 2');
  assert.equal(ranking[1].totalKg, 3);
});
