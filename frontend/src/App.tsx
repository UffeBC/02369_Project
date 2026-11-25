import { useEffect, useState } from 'react'
import Dashboard from './Dashboard'
import CollectedDashboard from './CollectedDashboard'
import { parseSellOutTime } from './dashboardStats'

export type Product = {
  id: number
  name: string
}

export type ProductionRecord = {
  id: number
  product_id: number
  date: string
  quantity: number
}

export type SellOutRecord = {
  id: number
  product_id: number
  sold_out_at: string
}

type DemoRecord = {
  date: string
  product: string
  produced: number
  sold: number
  sold_out_at: string | null
}

function today(): string {
  return new Date().toLocaleDateString('en-CA')
}

function localDate(timestamp: string): string {
  return parseSellOutTime(timestamp).toLocaleDateString('en-CA')
}

function App() {
  const [demo, setDemo] = useState(false)
  const [view, setView] = useState<'overview' | 'daily'>('overview')

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand"><span aria-hidden="true">M</span> Maria’s Bakery</span>
          <nav aria-label="Bakery workspace">
            <button aria-current={view === 'overview' ? 'page' : undefined} onClick={() => setView('overview')}>Overview</button>
            <button aria-current={view === 'daily' ? 'page' : undefined} onClick={() => setView('daily')}>Daily log</button>
          </nav>
          <details className="settings">
            <summary>Settings</summary>
            <div className="settings-panel">
              <button type="button" role="switch" aria-checked={demo} onClick={() => setDemo(!demo)}>Demo</button>
              <p>{demo ? 'Showing simulated data.' : 'Showing collected data.'}</p>
            </div>
          </details>
        </div>
      </header>
      <main>
        <BakeryData key={String(demo)} demo={demo} view={view} onOpenLog={() => setView('daily')} />
      </main>
    </div>
  )
}

function BakeryData({ demo, view, onOpenLog }: {
  demo: boolean
  view: 'overview' | 'daily'
  onOpenLog: () => void
}) {
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState(false)
  const [demoRecords, setDemoRecords] = useState<DemoRecord[]>([])
  const [records, setRecords] = useState<ProductionRecord[]>([])
  const [sellOuts, setSellOuts] = useState<SellOutRecord[]>([])
  const [date, setDate] = useState(today())
  const [quantities, setQuantities] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [recordsLoading, setRecordsLoading] = useState(true)
  const [recordsError, setRecordsError] = useState(false)
  const [sellOutsLoading, setSellOutsLoading] = useState(true)
  const [sellOutsError, setSellOutsError] = useState(false)
  const [markingProductId, setMarkingProductId] = useState<number | null>(null)
  const [sellOutMessage, setSellOutMessage] = useState('')
  const [query, setQuery] = useState('')

  function loadProducts() {
    fetch('/api/products')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch products')
        }

        return response.json()
      })
      .then(data => setProducts(data))
      .catch(error => {
        console.error(error)
        setProductsError(true)
      })
      .finally(() => setProductsLoading(false))
  }

  function loadRecords() {
    fetch('/api/production')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch production records')
        }

        return response.json()
      })
      .then(data => setRecords(data))
      .catch(error => {
        console.error(error)
        setRecordsError(true)
      })
      .finally(() => setRecordsLoading(false))
  }

  function loadSellOuts() {
    fetch('/api/sellouts')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch sell-outs')
        }

        return response.json()
      })
      .then(data => setSellOuts(data))
      .catch(error => {
        console.error(error)
        setSellOutsError(true)
      })
      .finally(() => setSellOutsLoading(false))
  }

  useEffect(() => {
    if (demo) {
      const controller = new AbortController()
      fetch('/api/demo', { signal: controller.signal })
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch demo data')
          return response.json() as Promise<DemoRecord[]>
        })
        .then(rows => {
          const productIds = new Map<string, number>()
          const production: ProductionRecord[] = []
          const events: SellOutRecord[] = []
          rows.forEach((row, index) => {
            if (!productIds.has(row.product)) productIds.set(row.product, productIds.size + 1)
            const productId = productIds.get(row.product)!
            production.push({ id: index + 1, product_id: productId, date: row.date, quantity: row.produced })
            if (row.sold_out_at) {
              events.push({ id: index + 1, product_id: productId, sold_out_at: row.sold_out_at })
            }
          })
          setProducts(Array.from(productIds, ([name, id]) => ({ name, id })))
          setDemoRecords(rows)
          setRecords(production)
          setSellOuts(events)
          setDate(rows.reduce((latest, row) => row.date > latest ? row.date : latest, ''))
        })
        .catch(error => {
          if (controller.signal.aborted) return
          console.error(error)
          setRecordsError(true)
          setSellOutsError(true)
        })
        .finally(() => {
          if (controller.signal.aborted) return
          setRecordsLoading(false)
          setSellOutsLoading(false)
        })
      return () => controller.abort()
    }
    loadProducts()
    loadRecords()
    loadSellOuts()
  }, [demo])

  const recordedForDate = new Map(
    records.filter(record => record.date === date).map(record => [record.product_id, record.quantity]),
  )
  const soldOutForDate = new Set(
    sellOuts
      .filter(record => localDate(record.sold_out_at) === date)
      .map(record => record.product_id),
  )
  const selectedDateIsToday = date === today()
  const filteredProducts = products.filter(product => product.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  const loading = recordsLoading || sellOutsLoading || (!demo && productsLoading)
  const failed = recordsError || sellOutsError || productsError

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (demo) return
    setMessage('')

    const entries = Object.entries(quantities).filter(([, value]) => value.trim() !== '')

    if (entries.length === 0) {
      setMessage('Enter or change a quantity for at least one product.')
      return
    }

    for (const [, value] of entries) {
      const quantity = Number(value)

      if (!Number.isInteger(quantity) || quantity < 0) {
        setMessage('Quantities must be whole numbers of zero or more.')
        return
      }
    }

    setSaving(true)

    try {
      for (const [productId, value] of entries) {
        const response = await fetch('/api/production', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: Number(productId),
            date,
            quantity: Number(value),
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to save production record')
        }

        const saved: ProductionRecord = await response.json()
        setRecords(previous => [
          ...previous.filter(record => record.id !== saved.id),
          saved,
        ])
        setQuantities(previous => {
          const remaining = { ...previous }
          delete remaining[Number(productId)]
          return remaining
        })
      }

      setMessage(`Saved ${entries.length} ${entries.length === 1 ? 'record' : 'records'} for ${date}.`)
    } catch (error) {
      console.error(error)
      setMessage('Some records could not be saved. Check the connection and try the remaining entries again.')
    } finally {
      setSaving(false)
    }
  }

  async function markSoldOut(product: Product) {
    if (demo) return
    setMarkingProductId(product.id)
    setSellOutMessage('')

    try {
      const response = await fetch('/api/sellouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id }),
      })

      if (response.status === 409) {
        setSellOutMessage(`${product.name} is already marked as sold out today.`)
        return
      }

      if (!response.ok) {
        throw new Error('Failed to save sell-out')
      }

      const saved: SellOutRecord = await response.json()
      setSellOuts(previous => [...previous, saved])
      setSellOutMessage(`${product.name} marked as sold out.`)
    } catch (error) {
      console.error(error)
      setSellOutMessage('Could not save the sell-out. Check that the backend is running.')
    } finally {
      setMarkingProductId(null)
    }
  }

  return (
    <>
      <header className="page-heading">
        <div>
          <p className={demo ? 'mode demo' : 'mode'} role="status">{demo ? 'Demo mode' : 'Collected data'}</p>
          <h1>{view === 'overview' ? 'Bakery overview' : 'Daily log'}</h1>
          <p>{view === 'overview' ? 'Review production and see what sells out.' : 'Record what you baked and which products sold out.'}</p>
        </div>
        {view === 'overview' && <button className="primary" onClick={onOpenLog}>Open daily log <span aria-hidden="true">→</span></button>}
      </header>

      {view === 'overview' ? (
        <>
          {demo && loading && <p role="status">Loading demo data…</p>}
          {demo && failed && <p role="alert">Could not load demo data. Switch Demo off and on to try again.</p>}
          {demo ? demoRecords.length > 0 && (
            <Dashboard records={demoRecords.map(row => ({
              day: new Date(`${row.date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long' }),
              product: row.product,
              produced: row.produced,
              sold: row.sold,
              waste: row.produced - row.sold,
            }))} />
          ) : (
            <>
              {!loading && !failed && <div className="metrics">
                <div><span>Units produced</span><strong>{records.reduce((sum, row) => sum + row.quantity, 0).toLocaleString()}</strong></div>
                <div><span>Days logged</span><strong>{new Set(records.map(row => row.date)).size}</strong></div>
                <div><span>Sell-outs recorded</span><strong>{sellOuts.length}</strong></div>
              </div>}
              <CollectedDashboard products={products} production={records} sellOuts={sellOuts} loading={loading} failed={failed} />
            </>
          )}
        </>
      ) : (
        <form className="daily-card" onSubmit={save}>
          <div className="log-toolbar">
            <label>Date
              <input
                type="date"
                value={date}
                required
                disabled={saving || markingProductId !== null}
                onChange={event => {
                  setDate(event.target.value)
                  setQuantities({})
                  setMessage('')
                  setSellOutMessage('')
                }}
              />
            </label>
            <label>Find a product
              <input type="search" placeholder="Search by name" value={query} onChange={event => setQuery(event.target.value)} />
            </label>
          </div>
          {demo && <p className="log-note">Demo data is read-only.</p>}
          {!demo && !selectedDateIsToday && <p className="log-note">Sell-outs can only be recorded for today.</p>}
          {loading && <p className="log-note" role="status">Loading products and records…</p>}
          {failed && <p className="log-note" role="alert">Some data could not be loaded. Reload the page to try again.</p>}
          <div className="log-table">
            <table>
              <thead><tr><th scope="col">Product</th><th scope="col">Produced</th><th scope="col">Sell-out</th></tr></thead>
              <tbody>
                {filteredProducts.map(product => {
                  const recorded = recordedForDate.get(product.id)
                  return (
                    <tr key={product.id}>
                      <th scope="row">{product.name}</th>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          aria-label={`Produced quantity for ${product.name}`}
                          disabled={demo || saving || recordsLoading || recordsError || !date}
                          value={quantities[product.id] ?? (recorded === undefined ? '' : String(recorded))}
                          onChange={event => setQuantities({ ...quantities, [product.id]: event.target.value })}
                        />
                      </td>
                      <td>
                        {soldOutForDate.has(product.id) ? <span className="sold-out-label">Sold out</span> :
                          demo || !selectedDateIsToday ? <span aria-label="No sell-out recorded">—</span> :
                            <button
                              type="button"
                              aria-label={`Mark ${product.name} sold out`}
                              disabled={sellOutsLoading || sellOutsError || markingProductId !== null}
                              onClick={() => markSoldOut(product)}
                            >
                              {markingProductId === product.id ? 'Saving…' : 'Mark sold out'}
                            </button>}
                      </td>
                    </tr>
                  )
                })}
                {!loading && !failed && filteredProducts.length === 0 && <tr><td colSpan={3}>{query.trim() ? 'No matching products.' : 'No products available.'}</td></tr>}
              </tbody>
            </table>
          </div>
          <footer className="log-footer">
            <div role="status">{message && <p>{message}</p>}{sellOutMessage && <p>{sellOutMessage}</p>}</div>
            {!demo && <button className="primary" type="submit" disabled={saving || recordsLoading || recordsError || !date || !Object.values(quantities).some(value => value.trim())}>
              {saving ? 'Saving…' : 'Save production'}
            </button>}
          </footer>
        </form>
      )}
    </>
  )
}

export default App
