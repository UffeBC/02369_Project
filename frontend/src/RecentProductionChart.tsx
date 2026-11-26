import { useMemo, useState } from 'react'
import type { Product, ProductionRecord, SalesRecord } from './App'
import { chartPoints, shiftDate } from './chartData'
import type { ProductionBreakdown } from './chartData'
import { buildChartHistory, useChartCategories } from './chartHistory'
import { ProductionLegend, ProductionStack } from './productionChart'

type Props = {
  demo: boolean
  endDate: string
  products: Product[]
  production: ProductionRecord[]
  sales: SalesRecord[]
  loading: boolean
  failed: boolean
  salesFailed: boolean
}

const dateLabel = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const weekdayLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' })
const count = new Intl.NumberFormat()

function daySummary(value: ProductionBreakdown) {
  return [
    `${count.format(value.produced)} baked`,
    ...(value.matchedDays ? [
      `${count.format(value.sold)} sold`,
      `${count.format(value.withinTarget)} left over within target`,
      `${count.format(value.aboveTarget)} left over above target`,
    ] : []),
    ...(value.untargeted ? [`${count.format(value.untargeted)} left over without a target`] : []),
    ...(value.unknown ? [`sales unrecorded for ${count.format(value.unknown)} units`] : []),
  ].join(' · ')
}

export default function RecentProductionChart({ demo, endDate, products, production, sales, loading, failed, salesFailed }: Props) {
  const [selection, setSelection] = useState('all')
  const { categories, categoriesLoading, categoriesFailed } = useChartCategories(demo)
  const from = shiftDate(endDate, -6)
  const categoryId = selection === 'all' ? undefined : selection === 'uncategorized' ? null : Number(selection)
  const history = useMemo(
    () => buildChartHistory(products, categories, production, sales),
    [products, categories, production, sales],
  )
  const points = chartPoints(history, [{ name: 'Daily production', categoryId, metric: 'production-and-sales' }], 'day', from, endDate)
  const totals = new Map(points.flatMap(point => {
    const value = point.values[0]
    return value && typeof value === 'object' && 'produced' in value ? [[point.key, value] as const] : []
  }))
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDate(from, index)
    return { date, label: dateLabel.format(new Date(date)), weekday: weekdayLabel.format(new Date(date)), value: totals.get(date) }
  })
  const max = Math.max(1, ...days.map(day => day.value?.produced ?? 0))
  const step = Math.ceil(max / 4)
  const scale = step * 4
  const hasUntargeted = days.some(day => !!day.value?.untargeted)

  return (
    <section className="dashboard recent-production" aria-labelledby="recent-production-heading">
      <div className="recent-production-heading">
        <div>
          <h2 id="recent-production-heading">Last 7 days</h2>
          <p>{days[0].label} – {days[6].label} · Units baked per day</p>
        </div>
        <label>Category
          <select value={selection} disabled={categoriesLoading || categoriesFailed} onChange={event => setSelection(event.target.value)}>
            <option value="all">Whole bakery</option>
            {[...categories].sort((a, b) => a.name.localeCompare(b.name, 'da')).map(category =>
              <option key={category.id} value={category.id}>{category.name}</option>,
            )}
            {products.some(product => product.category_id === null) && <option value="uncategorized">Uncategorized</option>}
          </select>
        </label>
      </div>
      {failed ? <p role="alert">Could not load recent production. Reload the page to try again.</p> :
        loading || categoriesLoading ? <p role="status">Loading recent production…</p> :
        totals.size === 0 ? <p>No production recorded in this date range for this selection.</p> : <>
          {categoriesFailed && <p role="status">Category targets could not be loaded.</p>}
          {salesFailed && <p role="status">Sales could not be loaded. The chart shows the recorded production.</p>}
          <ProductionLegend hasUntargeted={hasUntargeted} />
          <div className="chart-visual recent-production-visual" aria-hidden="true">
            <div className="chart-axis">
              {[4, 3, 2, 1, 0].map(tick => <span key={tick}>{count.format(step * tick)}</span>)}
            </div>
            <div className="recent-production-columns">
              {days.map(day => (
                <div className="recent-production-day" key={day.date}>
                  <div className="chart-bars" title={day.value ? daySummary(day.value) : 'No production recorded'}>
                    {day.value && <div className="chart-bar chart-bar-stacked recent-production-bar"
                      style={{ height: day.value.produced ? `${day.value.produced / scale * 100}%` : '2px' }}>
                      {day.value.produced > 0 && <ProductionStack value={day.value} />}
                    </div>}
                  </div>
                  <span>{day.weekday}</span>
                  <time dateTime={day.date}>{day.label}</time>
                </div>
              ))}
            </div>
          </div>
          <details className="chart-values">
            <summary>View daily totals</summary>
            <div className="dashboard-table">
              <table>
                <thead><tr><th scope="col">Date</th><th scope="col">Production breakdown</th></tr></thead>
                <tbody>{days.map(day => <tr key={day.date}>
                  <th scope="row">{day.weekday} {day.label}</th>
                  <td>{day.value ? daySummary(day.value) : 'No production recorded'}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </details>
        </>}
    </section>
  )
}
