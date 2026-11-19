import test from 'node:test'
import assert from 'node:assert/strict'
import { getTotals } from '../src/dashboardStats.ts'

const base = { day: 'Monday', product: 'Croissant' }

test('waste percentage uses quantities, not an average of percentages', () => {
  const result = getTotals([
    { ...base, produced: 10, sold: 5, waste: 5 },
    { ...base, day: 'Tuesday', produced: 90, sold: 90, waste: 0 },
  ])
  assert.equal(result.produced, 100)
  assert.equal(result.sold, 95)
  assert.equal(result.waste, 5)
  assert.equal(result.wastePercentage, 5)
})

test('zero production is excluded from sell-out days', () => {
  const result = getTotals([
    { ...base, produced: 0, sold: 0, waste: 0 },
    { ...base, day: 'Tuesday', produced: 10, sold: 10, waste: 0 },
    { ...base, day: 'Wednesday', produced: 10, sold: 6, waste: 4 },
  ])
  assert.equal(result.productionDays, 2)
  assert.equal(result.soldOutDays, 1)
})

test('no records gives zero totals without dividing by zero', () => {
  assert.deepEqual(getTotals([]), {
    produced: 0, sold: 0, waste: 0, productionDays: 0,
    soldOutDays: 0, wastePercentage: 0,
  })
})
