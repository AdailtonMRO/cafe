import test from 'node:test';
import assert from 'node:assert/strict';

function calculateTotal(quantityKg, pricePerKg) {
  return Number((quantityKg * pricePerKg).toFixed(2));
}

test('calculates total from quantity and price per kg', () => {
  assert.equal(calculateTotal(2.5, 18.9), 47.25);
});

test('rounds to two decimals', () => {
  assert.equal(calculateTotal(1.333, 10.005), 13.34);
});
