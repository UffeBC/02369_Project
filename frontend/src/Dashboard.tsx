import { getTotals } from './dashboardStats'
import type { DailyRecord } from './dashboardStats'
import './Dashboard.css'

// Temporary sample data for 2–4 November. The API does not store sales or waste yet.
// Here, all items left at closing are counted as waste.
const records: DailyRecord[] = [
  { day: 'Monday', product: 'Croissant', produced: 40, sold: 34, waste: 6 },
  { day: 'Monday', product: 'Rye bread', produced: 20, sold: 20, waste: 0 },
  { day: 'Tuesday', product: 'Croissant', produced: 40, sold: 40, waste: 0 },
  { day: 'Tuesday', product: 'Rye bread', produced: 20, sold: 17, waste: 3 },
  { day: 'Wednesday', product: 'Croissant', produced: 40, sold: 40, waste: 0 },
  { day: 'Wednesday', product: 'Rye bread', produced: 20, sold: 18, waste: 2 },
]

export default function Dashboard() {
  // Keep the calculations together so the table and graphs use the same figures.
  const products = [...new Set(records.map(record => record.product))]
  const days = [...new Set(records.map(record => record.day))]
  const productRows = products.map(name => ({
    name, ...getTotals(records.filter(record => record.product === name)),
  }))
  const dayRows = days.map(name => ({
    name, ...getTotals(records.filter(record => record.day === name)),
  }))
  const totals = getTotals(records)
  const largestWaste = Math.max(1, ...dayRows.map(row => row.waste))

  return (
    <section className="dashboard">
      <h2>Production overview</h2>
      <p>Sample data: 2–4 November 2026. These are not real bakery figures.</p>

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

      <div className="dashboard-graphs">
        <div>
          <h3>Waste by weekday</h3>
          {dayRows.map(row => (
            <div className="dashboard-row" key={row.name}>
              <span>{row.name}</span>
              <div className="dashboard-track" aria-hidden="true">
                <div className="dashboard-bar" style={{ width: `${row.waste / largestWaste * 100}%` }} />
              </div>
              <span>{row.waste} items</span>
            </div>
          ))}
        </div>
        <div>
          <h3>Sell-out frequency</h3>
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
        </div>
      </div>
      <p>Waste % = waste ÷ production × 100. Sold out means everything produced that day was sold.</p>
      <p>The total sell-out count is across product-days, not calendar days.</p>
    </section>
  )
}
