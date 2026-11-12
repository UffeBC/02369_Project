export type DailyRecord = {
  day: string
  product: string
  produced: number
  sold: number
  waste: number
}

export function getTotals(records: DailyRecord[]) {
  const produced = records.reduce((sum, record) => sum + record.produced, 0)
  const sold = records.reduce((sum, record) => sum + record.sold, 0)
  const waste = records.reduce((sum, record) => sum + record.waste, 0)

  // A day without production should not count as a sell-out day.
  const productionDays = records.filter(record => record.produced > 0).length
  const soldOutDays = records.filter(record =>
    record.produced > 0 && record.sold === record.produced
  ).length

  return {
    produced, sold, waste, productionDays, soldOutDays,
    // Calculate from the totals, rather than averaging daily percentages.
    wastePercentage: produced > 0 ? waste / produced * 100 : 0,
  }
}
