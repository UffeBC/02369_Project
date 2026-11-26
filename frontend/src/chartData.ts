export type ChartMetric = 'produced' | 'sold' | 'sell-outs' | 'sell-through' | 'production-and-sales'
export type ChartGrouping = 'day' | 'week' | 'weekday'

export type ChartDay = {
  productId: number
  categoryId?: number | null
  leftoverTargetPercent?: number | null
  date: string
  produced?: number
  sold?: number
  sellOuts: number
}

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function weekdayIndex(date: string): number {
  return (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7
}

function groupDate(date: string, grouping: ChartGrouping): string {
  if (grouping === 'day') return date
  const weekday = weekdayIndex(date)
  return grouping === 'week' ? shiftDate(date, -weekday) : String(weekday)
}

export type ChartSeries = {
  name: string
  productId?: number
  categoryId?: number | null
  metric: ChartMetric
}

export type ProductionBreakdown = {
  produced: number
  sold: number
  withinTarget: number
  aboveTarget: number
  untargeted: number
  unknown: number
  matchedDays: number
}

export type SellThrough = { rate: number; minimum: number }
export type ChartValue = number | ProductionBreakdown | SellThrough
export const defaultSellThroughMinimum = 90

function matches(row: ChartDay, series: ChartSeries): boolean {
  if (series.productId !== undefined) return series.productId === row.productId
  if (series.categoryId !== undefined) return series.categoryId === (row.categoryId ?? null)
  return true
}

function productionBreakdown(rows: ChartDay[]): ProductionBreakdown | null {
  const result: ProductionBreakdown = {
    produced: 0, sold: 0, withinTarget: 0, aboveTarget: 0, untargeted: 0, unknown: 0, matchedDays: 0,
  }
  let hasProduction = false
  for (const row of rows) {
    if (row.produced === undefined) continue
    hasProduction = true
    result.produced += row.produced
    if (row.sold === undefined) {
      result.unknown += row.produced
      continue
    }
    const sold = Math.min(row.sold, row.produced)
    const leftover = row.produced - sold
    result.sold += sold
    if (row.leftoverTargetPercent == null) {
      result.untargeted += leftover
    } else {
      const allowance = Math.floor(row.produced * row.leftoverTargetPercent / 100)
      const within = Math.min(leftover, allowance)
      result.withinTarget += within
      result.aboveTarget += leftover - within
    }
    result.matchedDays++
  }
  return hasProduction ? result : null
}

export function weekdayPatterns(history: ChartDay[], productId?: number) {
  const buckets = weekdays.map((): ChartDay[] => [])
  for (const row of history) {
    if (productId === undefined || row.productId === productId) {
      buckets[weekdayIndex(row.date)].push(row)
    }
  }

  return buckets.flatMap((rows, index) => {
    if (rows.length === 0) return []
    const totals = productionBreakdown(rows)
    // Bakes without a closing sales count have no known leftover quantity.
    const baked = totals ? totals.produced - totals.unknown : 0
    const unsold = totals?.matchedDays ? baked - totals.sold : null
    return [{
      weekday: weekdays[index], baked, unsold,
      unsoldPercent: baked > 0 && unsold !== null ? 100 * unsold / baked : null,
      sellOuts: rows.reduce((sum, row) => sum + row.sellOuts, 0),
    }]
  })
}

function sellThrough(rows: ChartDay[]): SellThrough | null {
  let sold = 0
  let produced = 0
  let weightedMinimum = 0
  for (const row of rows) {
    if (!row.produced || row.sold === undefined) continue
    sold += row.sold
    produced += row.produced
    const minimum = row.leftoverTargetPercent == null
      ? defaultSellThroughMinimum
      : 100 - row.leftoverTargetPercent
    weightedMinimum += row.produced * minimum
  }
  return produced ? { rate: 100 * sold / produced, minimum: weightedMinimum / produced } : null
}

export function chartPoints(
  history: ChartDay[],
  series: ChartSeries[],
  grouping: ChartGrouping,
  from: string,
  to: string,
) {
  const buckets = new Map<string, ChartDay[]>()
  for (const row of history) {
    if (row.date < from || row.date > to || !series.some(item => matches(row, item))) continue
    const key = groupDate(row.date, grouping)
    const bucket = buckets.get(key) ?? []
    bucket.push(row)
    buckets.set(key, bucket)
  }

  return [...buckets].sort(([a], [b]) => a.localeCompare(b)).map(([key, rows]) => ({
    key,
    label: grouping === 'weekday' ? weekdays[Number(key)] : key,
    values: series.map((item): ChartValue | null => {
      const matchingRows = rows.filter(row => matches(row, item))
      if (item.metric === 'production-and-sales') return productionBreakdown(matchingRows)
      if (item.metric === 'sell-through') return sellThrough(matchingRows)
      let total = 0
      let count = 0
      for (const row of matchingRows) {
        const value = item.metric === 'sell-outs' ? row.sellOuts : row[item.metric]
        if (value === undefined) continue
        total += value
        count++
      }
      return count ? total : null
    }),
  }))
}
