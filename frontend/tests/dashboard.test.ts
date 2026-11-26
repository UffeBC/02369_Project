import test from 'node:test'
import assert from 'node:assert/strict'
import { weekdayPatterns } from '../src/chartData.ts'
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

test('Monday totals use both bakes, even when the larger batch sold out', () => {
  const history = [
    { productId: 1, date: '2026-11-09', produced: 10, sold: 5, sellOuts: 0 },
    { productId: 1, date: '2026-11-16', produced: 90, sold: 90, sellOuts: 1 },
    { productId: 1, date: '2026-11-23', produced: 40, sellOuts: 0 },
    { productId: 2, date: '2026-11-16', produced: 20, sold: 0, sellOuts: 0 },
  ]
  assert.deepEqual(weekdayPatterns(history, 1), [
    { weekday: 'Mon', baked: 100, unsold: 5, unsoldPercent: 5, sellOuts: 1 },
  ])
  const [all] = weekdayPatterns(history)
  assert.equal(all.unsold, 25)
  assert.equal(all.baked, 120)
  assert.equal(all.unsoldPercent?.toFixed(1), '20.8')
})

test('a sell-out can be recorded without a closing count, or all units sold without a sell-out mark', () => {
  const rows = weekdayPatterns([
    { productId: 1, date: '2026-11-22', sold: 8, sellOuts: 1 },
    { productId: 1, date: '2026-11-21', produced: 8, sold: 8, sellOuts: 0 },
  ])
  assert.deepEqual(rows, [
    { weekday: 'Sat', baked: 8, unsold: 0, unsoldPercent: 0, sellOuts: 0 },
    { weekday: 'Sun', baked: 0, unsold: null, unsoldPercent: null, sellOuts: 1 },
  ])
})

test('a zero bake has no percentage and a product with no history has no rows', () => {
  const history = [{ productId: 1, date: '2026-11-17', produced: 0, sold: 0, sellOuts: 0 }]
  assert.deepEqual(weekdayPatterns(history), [
    { weekday: 'Tue', baked: 0, unsold: 0, unsoldPercent: null, sellOuts: 0 },
  ])
  assert.deepEqual(weekdayPatterns(history, 2), [])
})

test('sales above production cannot cancel out leftovers from another bake', () => {
  const [row] = weekdayPatterns([
    { productId: 1, date: '2026-11-16', produced: 10, sold: 12, sellOuts: 0 },
    { productId: 2, date: '2026-11-16', produced: 10, sold: 7, sellOuts: 0 },
  ])
  assert.equal(row.unsold, 3)
  assert.equal(row.unsoldPercent, 15)
})
