import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMemberFreightShare } from '../dashboard-utils.js';

test('calculates freight share proportionally based on member weight in kg', () => {
  const order = { freightCost: 30, freightType: 'proportional' };
  const p1 = { userId: 'u1', quantityKg: 2 };
  const p2 = { userId: 'u2', quantityKg: 1 };
  const participations = [p1, p2];

  assert.equal(calculateMemberFreightShare(order, p1, participations), 20.00);
  assert.equal(calculateMemberFreightShare(order, p2, participations), 10.00);
});

test('calculates freight share equally among participating members', () => {
  const order = { freightCost: 30, freightType: 'equal' };
  const p1 = { userId: 'u1', quantityKg: 5 };
  const p2 = { userId: 'u2', quantityKg: 1 };
  const participations = [p1, p2];

  assert.equal(calculateMemberFreightShare(order, p1, participations), 15.00);
  assert.equal(calculateMemberFreightShare(order, p2, participations), 15.00);
});

test('returns zero freight share when freight is zero or free', () => {
  const orderFree = { freightCost: 0, freightType: 'free' };
  const p1 = { userId: 'u1', quantityKg: 2 };

  assert.equal(calculateMemberFreightShare(orderFree, p1, [p1]), 0);
});
