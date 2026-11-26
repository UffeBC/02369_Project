import { useRef, useState } from 'react'
import type { Product, ProductionRecord, SalesRecord, SellOutRecord } from './App'
import { buildBakeHistory, estimateBake, weekday } from './bakePlan'
import type { ProductDay } from './bakePlan'
import ProductPhoto from './ProductPhoto'

const units = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 4 })
const dayName = new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'UTC' })

function explainSellOut(
  row: ProductDay,
  date: string,
  estimate: NonNullable<ReturnType<typeof estimateBake>>,
): string {
  const input = estimate.inputs.find(input => input.date === row.date)
  if (input) {
    const adjustment = input.adjustment > 0 ? ` plus a 10% sell-out allowance, giving ${units.format(input.counted)}` : ''
    return `It counted as ${input.recorded} units ${estimate.useSales ? 'sold' : 'produced'}${adjustment}. It was one of ${estimate.inputs.length} days in the average.`
  }
  if (estimate.useSales && row.sold === undefined) return 'There was no sales count for that day, so it did not enter the sales average.'
  if (!estimate.useSales && row.produced === undefined) return 'There was no production count for that day, so it did not enter the production average.'
  if (estimate.sameWeekday && weekday(row.date) !== weekday(date)) {
    return `That was a ${dayName.format(new Date(row.date))}. This estimate uses ${dayName.format(new Date(date))}s.`
  }
  return 'It was older than the eight records used for this estimate.'
}

type Props = {
  products: Product[]
  production: ProductionRecord[]
  sales: SalesRecord[]
  sellOuts: SellOutRecord[]
  loading: boolean
  failed: boolean
  initialDate: string
  todayDate: string
  quickList: boolean
  onQuickListChange: (value: boolean) => void
}

export default function Planning({ products, production, sales, sellOuts, loading, failed, initialDate, todayDate, quickList, onQuickListChange }: Props) {
  const [planDate, setPlanDate] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<number>()
  const trendPanel = useRef<HTMLElement>(null)
  const date = planDate ?? initialDate
  const forecastLabel = date === todayDate
    ? 'Today’s forecast'
    : 'Plan-date forecast'
  const visibleProducts = products.filter(product =>
    product.name.toLocaleLowerCase('da').includes(query.trim().toLocaleLowerCase('da')),
  )
  const selected = visibleProducts.find(product => product.id === selectedId) ?? visibleProducts[0]

  const history = buildBakeHistory(production, sales, sellOuts)

  const estimates = new Map(visibleProducts.map(product => [
    product.id,
    date ? estimateBake([...(history.get(product.id)?.values() ?? [])], date) : null,
  ]))
  const estimate = selected ? estimates.get(selected.id) : null
  const forecastScale = estimate ? Math.max(1, ...estimate.inputs.map(row => row.counted)) : 1
  const averageAllowance = estimate
    ? estimate.inputs.reduce((sum, row) => sum + row.adjustment, 0) / estimate.inputs.length
    : 0
  const allowanceDays = estimate?.inputs.filter(row => row.adjustment > 0).length ?? 0
  const earlier = selected
    ? [...(history.get(selected.id)?.values() ?? [])].filter(row => row.date < date)
      .sort((a, b) => a.date.localeCompare(b.date))
    : []
  const trend = earlier.slice(-14)
  const highestSellOut = estimate
    ? earlier.filter(row => row.soldOut && (row.sold ?? row.produced ?? 0) > estimate.quantity)
      .sort((a, b) => (b.sold ?? b.produced ?? 0) - (a.sold ?? a.produced ?? 0) || b.date.localeCompare(a.date))[0]
    : undefined
  const max = Math.max(1, ...trend.flatMap(row => [row.produced ?? 0, row.sold ?? 0]))

  if (loading) return <p role="status">Loading product history…</p>
  if (failed) return <p role="alert">Could not load the data needed for planning.</p>

  return (
    <>
      <div className="bake-plan-views" role="group" aria-label="Bake plan view">
        <button type="button" aria-pressed={!quickList} onClick={() => onQuickListChange(false)}>Forecast details</button>
        <button type="button" aria-pressed={quickList} onClick={() => onQuickListChange(true)}>Quick bake list</button>
      </div>
      <div className="daily-card log-toolbar">
        <label>Plan for <input type="date" value={date} onChange={event => setPlanDate(event.target.value)} /></label>
        <label>Find a product
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by name" />
        </label>
      </div>
      {quickList ? (
        <section className="daily-card quick-bake-card" aria-labelledby="quick-bake-heading">
          <h2 id="quick-bake-heading">What to bake{date ? ` · ${date}` : ''}</h2>
          {!date ? <p>Choose a plan date.</p> : visibleProducts.length === 0 ? <p>No matching products.</p> : (
            <ul className="quick-bake-list">
              {visibleProducts.map(product => {
                const estimate = estimates.get(product.id)
                return (
                  <li key={product.id}>
                    <span className="product-name"><ProductPhoto name={product.name} />{product.name}</span>
                    {estimate ? <strong>{estimate.quantity} <small>units</small></strong> : <span>No estimate</span>}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ) : <>
      {selected && <section className="dashboard plan-trend" ref={trendPanel} tabIndex={-1}>
        <div className="plan-heading">
          <label className="product-name plan-product-picker">
            <ProductPhoto key={selected.id} name={selected.name} />
            <select
              aria-label="Choose a product to view its forecast"
              value={selected.id}
              onChange={event => setSelectedId(Number(event.target.value))}
            >
              {visibleProducts.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </label>
          <div className="plan-quantity">
            <span>Suggested bake</span>
            <strong>{estimate ? `${estimate.quantity} units` : 'More data needed'}</strong>
          </div>
        </div>
        {estimate && <section className="estimate-explanation" aria-labelledby="estimate-explanation-heading">
          <h3 id="estimate-explanation-heading">Why {estimate.quantity} units?</h3>
          <p><strong>{units.format(estimate.average)} units is the average across all {estimate.inputs.length} days{averageAllowance > 0 ? ', including allowances' : ''}.</strong> That rounds to {estimate.quantity} units to bake.</p>
          {averageAllowance > 0 && <p>{allowanceDays === 1 ? 'One historical day received' : `${allowanceDays} historical days received`} the sell-out allowance. Spread across all {estimate.inputs.length} days, it adds <strong>{units.format(averageAllowance)} units</strong> to the plan-date forecast.</p>}
          <ol className="forecast-steps">
            <li>
              <h4>Pick days to compare</h4>
              <p>
                Using {estimate.inputs.length} {estimate.sameWeekday ? `recent ${dayName.format(new Date(date))}s` : 'recent recorded days'} before {date}.
                {' '}{!estimate.sameWeekday && 'There were fewer than three records for this weekday, so the forecast uses recent days across the week. '}
                {estimate.useSales ? 'The starting point is units sold.' : 'There were fewer than three days with sales counts, so the starting point is units produced.'}
              </p>
            </li>
            <li>
              <h4>See what each day contributes</h4>
              <p>{estimate.useSales
                ? 'Historical bars show recorded sales. A historical bar gets a 10% allowance when that day has a recorded sell-out. The forecast row uses the average of those bars.'
                : 'Each day contributes the recorded production count. The sell-out allowance applies when the forecast uses sales.'}</p>
              <figure className="forecast-figure">
                <figcaption className="forecast-legend">
                  <span><i aria-hidden="true" />{estimate.useSales ? 'Recorded sales' : 'Recorded production'}</span>
                  {estimate.inputs.some(row => row.adjustment > 0) && <span><i className="forecast-allowance-key" aria-hidden="true" />Sell-out allowance</span>}
                  <span><i className="forecast-average-key" aria-hidden="true" />All-days average {units.format(estimate.average)}</span>
                </figcaption>
                <div className="forecast-bars">
                  <div className="forecast-plan-row">
                    <span><strong>{forecastLabel}</strong><br /><time dateTime={date}>{date}</time></span>
                    <div className="forecast-track" aria-hidden="true">
                      <span className="forecast-recorded" style={{ width: `${estimate.average / forecastScale * 100}%` }} />
                    </div>
                    <span className="forecast-contribution">
                      <strong>{estimate.quantity} units to bake</strong>
                      <small>{units.format(estimate.average)} units before rounding</small>
                    </span>
                  </div>
                </div>
                <p className="forecast-history-label">Historical days used</p>
                <ul className="forecast-bars">
                  {estimate.inputs.map(row => (
                    <li key={row.date}>
                      <time dateTime={row.date}>{row.date}</time>
                      <div className="forecast-track" aria-hidden="true">
                        <span className="forecast-recorded" style={{ width: `${row.recorded / forecastScale * 100}%` }} />
                        <span className="forecast-allowance" style={{ width: `${row.adjustment / forecastScale * 100}%` }} />
                        <span className="forecast-average" style={{ left: `${estimate.average / forecastScale * 100}%` }} />
                      </div>
                      <span className="forecast-contribution">
                        <strong>{units.format(row.counted)} counted</strong>
                        {row.adjustment > 0 && <small>{row.recorded} sold + {units.format(row.adjustment)} allowance</small>}
                      </span>
                    </li>
                  ))}
                </ul>
              </figure>
            </li>
            <li>
              <h4>Average the days and round</h4>
              <p><strong>{units.format(estimate.total)} total ÷ {estimate.inputs.length} days = {units.format(estimate.average)} per day</strong>, rounded to <strong>{estimate.quantity} units</strong>.</p>
            </li>
          </ol>
          {highestSellOut && <p className="estimate-sellout">
            <strong>Higher sell-out on {highestSellOut.date}.</strong>{' '}
            {highestSellOut.sold !== undefined
              ? `The bakery sold ${highestSellOut.sold} units and ran out.`
              : `The bakery made ${highestSellOut.produced} units and logged a sell-out.`}{' '}
            {explainSellOut(highestSellOut, date, estimate)} A sell-out shows stock ran out. It does not tell us how many extra customers would have bought one.
          </p>}
          <details>
            <summary>See the {estimate.inputs.length} days used</summary>
            <div className="dashboard-table">
              <table>
                <thead><tr>
                  <th scope="col">Date</th><th scope="col">{estimate.useSales ? 'Units sold' : 'Units produced'}</th>
                  <th scope="col">Sell-out</th>
                  {estimate.useSales && <th scope="col">Allowance</th>}
                  <th scope="col">Counted in estimate</th>
                </tr></thead>
                <tbody>{estimate.inputs.map(row => <tr key={row.date}>
                  <th scope="row">{row.date}</th><td>{row.recorded}</td><td>{row.soldOut ? 'Yes' : '—'}</td>
                  {estimate.useSales && <td>{row.adjustment ? `+${units.format(row.adjustment)}` : '—'}</td>}
                  <td>{units.format(row.counted)}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </details>
        </section>}
        {!estimate && <p>{date
          ? 'A forecast needs at least three earlier days with recorded sales or three with recorded production. Add records in the Daily log.'
          : 'Choose a plan date to see a forecast.'}</p>}
        <h3>Recent activity before the plan date</h3>
        {trend.length === 0 ? <p>No earlier records for this product.</p> : <>
          <div className="trend-legend"><span>Produced</span><span>Sold</span><span>◆ Sell-out recorded</span></div>
          <div className="trend-days">
            {trend.map(row => (
              <div className="trend-day" key={row.date}>
                <time dateTime={row.date}>{row.date.slice(5)}</time>
                <div className="trend-bars">
                  {row.produced !== undefined && <div><span style={{ width: `${row.produced / max * 100}%` }} /><small aria-label="Produced">{row.produced}</small></div>}
                  {row.sold !== undefined && <div className="trend-sold"><span style={{ width: `${row.sold / max * 100}%` }} /><small aria-label="Sold">{row.sold}</small></div>}
                </div>
                {row.soldOut && <span title="Sell-out recorded" aria-label="Sell-out recorded">◆</span>}
              </div>
            ))}
          </div>
        </>}
      </section>}
      <section className="daily-card">
        <div className="log-table">
          <table>
            <thead><tr><th scope="col">Product</th><th scope="col">Suggested units</th><th scope="col">Based on</th></tr></thead>
            <tbody>
              {visibleProducts.map(product => {
                const estimate = estimates.get(product.id)
                return <tr key={product.id}>
                  <th scope="row">
                    <button className="plan-product" type="button" aria-pressed={selected?.id === product.id} onClick={() => {
                      setSelectedId(product.id)
                      trendPanel.current?.focus()
                      trendPanel.current?.scrollIntoView({ block: 'nearest' })
                    }}>
                      <ProductPhoto name={product.name} />{product.name}
                    </button>
                  </th>
                  <td>{estimate?.quantity ?? '—'}</td>
                  <td>{estimate ? (estimate.useSales ? 'Recorded sales' : 'Production history') : 'More data needed'}</td>
                </tr>
              })}
              {visibleProducts.length === 0 && <tr><td colSpan={3}>No matching products.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="plan-note">Estimates require three recorded days. Sales estimates add 10% to sales on logged sell-out days to allow for some unmet demand.</p>
      </section>
      </>}
    </>
  )
}
