import type { Product, ProductionRecord, SellOutRecord } from './App'
import { parseSellOutTime } from './dashboardStats'

const bakeryClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Copenhagen',
  hour: '2-digit',
  minute: '2-digit',
})

function medianSellOutTime(times: number[]): string {
  const sorted = [...times].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  const minutes = sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2)
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0')
  return `${hours}:${String(minutes % 60).padStart(2, '0')}`
}

type Props = {
  products: Product[]
  production: ProductionRecord[]
  sellOuts: SellOutRecord[]
  loading: boolean
  failed: boolean
}

export default function CollectedDashboard({ products, production, sellOuts, loading, failed }: Props) {
  const dailyTotals = new Map<string, number>()
  for (const record of production) {
    dailyTotals.set(record.date, (dailyTotals.get(record.date) ?? 0) + record.quantity)
  }
  const days = [...dailyTotals].sort(([a], [b]) => b.localeCompare(a))

  const productNames = new Map(products.map(product => [product.id, product.name]))
  const timesByProduct = new Map<number, number[]>()
  for (const record of sellOuts) {
    const [hours, minutes] = bakeryClock.format(parseSellOutTime(record.sold_out_at)).split(':').map(Number)
    const times = timesByProduct.get(record.product_id) ?? []
    times.push(hours * 60 + minutes)
    timesByProduct.set(record.product_id, times)
  }
  const productsWithSellOuts = [...timesByProduct].map(([id, times]) => ({
    id,
    name: productNames.get(id) ?? `Product #${id}`,
    count: times.length,
    typicalTime: medianSellOutTime(times),
  })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'da'))

  return (
    <section className="dashboard">
      <h2>Production overview</h2>
      {failed ? (
        <p role="alert">Could not load the collected data. Reload the page to try again.</p>
      ) : loading ? (
        <p role="status">Loading collected data…</p>
      ) : (
        <div className="dashboard-graphs">
          <div className="dashboard-table" tabIndex={0} aria-label="Daily production history">
            <table>
              <caption>Daily production</caption>
              <thead><tr><th scope="col">Date</th><th scope="col">Units produced</th></tr></thead>
              <tbody>
                {days.map(([date, quantity]) => (
                  <tr key={date}><th scope="row">{date}</th><td>{quantity}</td></tr>
                ))}
                {days.length === 0 && <tr><td colSpan={2}>No production recorded yet.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="dashboard-table" tabIndex={0} aria-label="Sell-out history by product">
            <table>
              <caption>Sell-outs by product</caption>
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Sell-outs</th>
                  <th scope="col">Typical time</th>
                </tr>
              </thead>
              <tbody>
                {productsWithSellOuts.map(product => (
                  <tr key={product.id}>
                    <th scope="row">{product.name}</th><td>{product.count}</td><td>{product.typicalTime}</td>
                  </tr>
                ))}
                {productsWithSellOuts.length === 0 && <tr><td colSpan={3}>No sell-outs recorded yet.</td></tr>}
              </tbody>
            </table>
            {productsWithSellOuts.length > 0 && <p>Typical time is the median in Denmark local time.</p>}
          </div>
        </div>
      )}
    </section>
  )
}
