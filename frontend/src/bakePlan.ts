export type ProductDay = {
  date: string
  produced?: number
  sold?: number
  soldOut?: boolean
}

export function buildBakeHistory(production: ProductionRecord[], sales: SalesRecord[], sellOuts: SellOutRecord[]) {
  const history = new Map<number, Map<string, ProductDay>>()
  function day(productId: number, date: string): ProductDay {
    let days = history.get(productId)
    if (!days) {
      days = new Map()
      history.set(productId, days)
    }
    let row = days.get(date)
    if (!row) {
      row = { date }
      days.set(date, row)
    }
    return row
  }
  for (const row of production) day(row.product_id, row.date).produced = row.quantity
  for (const row of sales) day(row.product_id, row.date).sold = row.quantity
  for (const row of sellOuts) {
    const date = parseSellOutTime(row.sold_out_at).toLocaleDateString('en-CA', { timeZone: 'Europe/Copenhagen' })
    day(row.product_id, date).soldOut = true
  }
  return history
}

export function weekday(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay()
}

export function estimateBake(history: ProductDay[], date: string) {
  const previous = history.filter(row => row.date < date).sort((a, b) => b.date.localeCompare(a.date))
  const sales = previous.filter(row => row.sold !== undefined)
  const useSales = sales.length >= 3
  const observations = useSales ? sales : previous.filter(row => row.produced !== undefined)
  const matching = observations.filter(row => weekday(row.date) === weekday(date))
  const sameWeekday = matching.length >= 3
  const sample = (sameWeekday ? matching : observations).slice(0, 8)
  if (sample.length < 3) return null

  const inputs = sample.map(row => {
    const recorded = (useSales ? row.sold : row.produced) ?? 0
    const adjustment = useSales && row.soldOut ? recorded / 10 : 0
    return { ...row, recorded, adjustment, counted: recorded + adjustment }
  })
  const total = inputs.reduce((sum, row) => sum + row.counted, 0)
  const average = total / inputs.length
  return { quantity: Math.round(average), total, average, inputs, useSales, sameWeekday }
}
import type { ProductionRecord, SalesRecord, SellOutRecord } from './App'
import { parseSellOutTime } from './dashboardStats'

