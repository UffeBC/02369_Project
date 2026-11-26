import { useMemo, useState } from 'react'
import type { Product, ProductionRecord, SalesRecord, SellOutRecord } from './App'
import { weekdayPatterns } from './chartData'
import { buildChartHistory } from './chartHistory'

type Props = {
  products: Product[]
  production: ProductionRecord[]
  sales: SalesRecord[]
  sellOuts: SellOutRecord[]
}

function ValueBar({ percent, label, sellOut = false }: { percent: number; label: string; sellOut?: boolean }) {
  return (
    <div className="weekday-value">
      <div className="dashboard-track" aria-hidden="true">
        <div className={sellOut ? 'dashboard-bar sold-out' : 'dashboard-bar'} style={{ width: `${percent}%` }} />
      </div>
      <span>{label}</span>
    </div>
  )
}

export default function WeekdayPatterns({ products, production, sales, sellOuts }: Props) {
  const [selection, setSelection] = useState('all')
  const history = useMemo(
    () => buildChartHistory(products, [], production, sales, sellOuts),
    [products, production, sales, sellOuts],
  )
  const rows = weekdayPatterns(history, selection === 'all' ? undefined : Number(selection))

  const mostSellOuts = Math.max(1, ...rows.map(row => row.sellOuts))

  return (
    <section className="dashboard weekday-patterns" aria-labelledby="weekday-heading">
      <div className="weekday-heading">
        <h2 id="weekday-heading">Weekday patterns</h2>
        <label>Product
          <select value={selection} onChange={event => setSelection(event.target.value)}>
            <option value="all">All products</option>
            {[...products].sort((a, b) => a.name.localeCompare(b.name, 'da')).map(product =>
              <option key={product.id} value={product.id}>{product.name}</option>,
            )}
          </select>
        </label>
      </div>
      {rows.length === 0 ? <p>No records for this selection yet.</p> : <>
        <p>Across all logged dates. Unsold figures use bakes with a closing sales count. Sell-outs count each time a product was marked sold out.</p>
        <div className="dashboard-table" role="region" aria-label="Weekday totals" tabIndex={0}>
          <table aria-label="Weekday patterns for the selected products">
            <thead><tr>
              <th scope="col">Weekday</th><th scope="col">Unsold / baked</th>
              <th scope="col">Unsold share</th><th scope="col">Sell-outs</th>
            </tr></thead>
            <tbody>{rows.map(row => (
              <tr key={row.weekday}>
                <th scope="row">{row.weekday}</th>
                <td>{row.unsold === null ? 'Counts missing' : `${row.unsold.toLocaleString()} / ${row.baked.toLocaleString()}`}</td>
                <td>{row.unsoldPercent === null ? '—' :
                  <ValueBar percent={row.unsoldPercent} label={`${row.unsoldPercent.toFixed(1)}%`} />}</td>
                <td><ValueBar percent={100 * row.sellOuts / mostSellOuts} label={row.sellOuts.toLocaleString()} sellOut /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </>}
    </section>
  )
}
