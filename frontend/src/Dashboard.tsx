import { getTotals } from './dashboardStats'
import type { DailyRecord } from './dashboardStats'
import './Dashboard.css'

export default function Dashboard({ records }: { records: DailyRecord[] }) {
  // Keep the calculations together so the table and graphs use the same figures.
  const products = [...new Set(records.map(record => record.product))]
  const productRows = products.map(name => ({
    name, ...getTotals(records.filter(record => record.product === name)),
  }))
  const totals = getTotals(records)

  return (
    <section className="dashboard">
      <h2>Production overview</h2>

      <div className="dashboard-table">
        <table>
          <caption>Totals by product</caption>
          <thead>
            <tr>
              <th scope="col">Product</th><th scope="col">Produced</th>
              <th scope="col">Sold</th><th scope="col">Waste</th>
              <th scope="col">Waste %</th><th scope="col">Sold-out days</th>
            </tr>
          </thead>
          <tbody>
            {productRows.map(row => (
              <tr key={row.name}>
                <th scope="row">{row.name}</th>
                <td>{row.produced}</td><td>{row.sold}</td><td>{row.waste}</td>
                <td>{row.wastePercentage.toFixed(1)}%</td>
                <td>{row.soldOutDays} / {row.productionDays}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td>{totals.produced}</td><td>{totals.sold}</td><td>{totals.waste}</td>
              <td>{totals.wastePercentage.toFixed(1)}%</td>
              <td>{totals.soldOutDays} / {totals.productionDays}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <details className="chart-values">
        <summary>Sell-out frequency by product</summary>
        {productRows.map(row => (
          <div className="dashboard-row" key={row.name}>
            <span>{row.name}</span>
            <div className="dashboard-track" aria-hidden="true">
              <div className="dashboard-bar sold-out" style={{
                width: `${row.productionDays ? row.soldOutDays / row.productionDays * 100 : 0}%`,
              }} />
            </div>
            <span>{row.soldOutDays}/{row.productionDays} days</span>
          </div>
        ))}
      </details>
      <p>These demo totals count unsold units as waste. A sold-out day here means all units baked for that product were sold.</p>
      <p>The total sell-out count is across product-days, not calendar days.</p>
    </section>
  )
}
