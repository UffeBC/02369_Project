import { useEffect, useMemo, useState } from 'react'
import Dashboard from './Dashboard'
import WeekdayPatterns from './WeekdayPatterns'
import CollectedDashboard from './CollectedDashboard'
import Planning from './Planning'
import ChartBuilder from './ChartBuilder'
import RecentProductionChart from './RecentProductionChart'
import ProductPhoto from './ProductPhoto'
import ProductManager from './ProductManager'
import { buildBakeHistory, estimateBake } from './bakePlan'
import { shiftDate } from './chartData'
import { demoSalesUrl, publicDemo } from './demoData'
import { parseSellOutTime } from './dashboardStats'

export type Product = {
  id: number
  name: string
  active: boolean
  category_id: number | null
}

export type ProductionRecord = {
  id: number
  product_id: number
  date: string
  quantity: number
}

export type SalesRecord = Omit<ProductionRecord, 'id'>
type View = 'overview' | 'daily' | 'planning' | 'charts' | 'products'

const viewInfo: Record<View, { title: string; description: string }> = {
  overview: { title: 'Bakery overview', description: 'Review production and see what sells out.' },
  planning: { title: 'Bake plan', description: 'Explore product trends and plan your next bake.' },
  charts: { title: 'Build a chart', description: 'Compare products, spot busy days, and see how much of each bake sold.' },
  daily: { title: 'Daily log', description: 'Record production, sales, and sell-outs.' },
  products: { title: 'Products', description: 'Add products and manage which items are available for daily entry.' },
}

export type SellOutRecord = {
  id: number
  product_id: number
  sold_out_at: string
}

type DemoRecord = {
  date: string
  product: string
  category_id: number
  produced: number
  sold: number
  sold_out_at: string | null
}

function today(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Copenhagen' })
}

function localDate(timestamp: string): string {
  return parseSellOutTime(timestamp).toLocaleDateString('en-CA', { timeZone: 'Europe/Copenhagen' })
}

function App() {
  const [demo, setDemo] = useState(publicDemo)
  const [view, setView] = useState<View>('overview')
  const [quickBakeList, setQuickBakeList] = useState(false)

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand"><span aria-hidden="true">M</span> Maria’s Bakery</span>
          <nav aria-label="Bakery workspace">
            <button aria-current={view === 'overview' ? 'page' : undefined} onClick={() => setView('overview')}>Overview</button>
            <button aria-current={view === 'planning' ? 'page' : undefined} onClick={() => {
              if (view !== 'planning') setQuickBakeList(false)
              setView('planning')
            }}>Bake plan</button>
            <button aria-current={view === 'daily' ? 'page' : undefined} onClick={() => setView('daily')}>Daily log</button>
            <button aria-current={view === 'charts' ? 'page' : undefined} onClick={() => setView('charts')}>Charts</button>
            <button aria-current={view === 'products' ? 'page' : undefined} onClick={() => setView('products')}>Products</button>
          </nav>
          {!publicDemo && <details className="settings">
            <summary>Settings</summary>
            <div className="settings-panel">
              <button type="button" role="switch" aria-checked={demo} onClick={() => setDemo(!demo)}>Demo</button>
              <p>{demo ? 'Showing simulated data.' : 'Showing collected data.'}</p>
            </div>
          </details>}
        </div>
      </header>
      <main>
        <BakeryData
          key={String(demo)}
          demo={demo}
          view={view}
          quickBakeList={quickBakeList}
          setQuickBakeList={setQuickBakeList}
          onOpenLog={() => setView('daily')}
          onOpenBakeList={() => {
            setQuickBakeList(true)
            setView('planning')
          }}
        />
      </main>
    </div>
  )
}

function BakeryData({ demo, view, quickBakeList, setQuickBakeList, onOpenLog, onOpenBakeList }: {
  demo: boolean
  view: View
  quickBakeList: boolean
  setQuickBakeList: (value: boolean) => void
  onOpenLog: () => void
  onOpenBakeList: () => void
}) {
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState(false)
  const [demoRecords, setDemoRecords] = useState<DemoRecord[]>([])
  const [records, setRecords] = useState<ProductionRecord[]>([])
  const [sales, setSales] = useState<SalesRecord[]>([])
  const [salesLoading, setSalesLoading] = useState(!demo)
  const [salesError, setSalesError] = useState(false)
  const [sellOuts, setSellOuts] = useState<SellOutRecord[]>([])
  const [date, setDate] = useState(today())
  const [quantities, setQuantities] = useState<Record<number, string>>({})
  const [soldQuantities, setSoldQuantities] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [recordsLoading, setRecordsLoading] = useState(true)
  const [recordsError, setRecordsError] = useState(false)
  const [sellOutsLoading, setSellOutsLoading] = useState(true)
  const [sellOutsError, setSellOutsError] = useState(false)
  const [markingProductId, setMarkingProductId] = useState<number | null>(null)
  const [sellOutMessage, setSellOutMessage] = useState('')
  const [query, setQuery] = useState('')
  const [copyDate, setCopyDate] = useState('')

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
      fetch(demoSalesUrl, { signal: controller.signal })
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch demo data')
          return response.json() as Promise<DemoRecord[]>
        })
        .then(rows => {
          const productIds = new Map<string, number>()
          const categoryIds = new Map<string, number>()
          const production: ProductionRecord[] = []
          const events: SellOutRecord[] = []
          rows.forEach((row, index) => {
            if (!productIds.has(row.product)) {
              productIds.set(row.product, productIds.size + 1)
              categoryIds.set(row.product, row.category_id)
            }
            const productId = productIds.get(row.product)!
            production.push({ id: index + 1, product_id: productId, date: row.date, quantity: row.produced })
            if (row.sold_out_at) {
              events.push({ id: index + 1, product_id: productId, sold_out_at: row.sold_out_at })
            }
          })
          setProducts(Array.from(productIds, ([name, id]) => ({ name, id, category_id: categoryIds.get(name) ?? null, active: true })))
          setDemoRecords(rows)
          setRecords(production)
          setSales(rows.map(row => ({
            product_id: productIds.get(row.product)!,
            date: row.date,
            quantity: row.sold,
          })))
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
    const controller = new AbortController()
    fetch('/api/sales', { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch sales')
        return response.json() as Promise<SalesRecord[]>
      })
      .then(setSales)
      .catch(error => {
        if (controller.signal.aborted) return
        console.error(error)
        setSalesError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setSalesLoading(false)
      })
    return () => controller.abort()
  }, [demo])

  const recordedForDate = new Map(
    records.filter(record => record.date === date).map(record => [record.product_id, record.quantity]),
  )
  const salesForDate = new Map(sales.filter(row => row.date === date).map(row => [row.product_id, row.quantity]))
  const soldOutForDate = new Set(
    sellOuts
      .filter(record => localDate(record.sold_out_at) === date)
      .map(record => record.product_id),
  )
  const todayDate = today()
  const selectedDateIsToday = date === todayDate
  const filteredProducts = products.filter(product =>
    (product.active || recordedForDate.has(product.id) || salesForDate.has(product.id) || soldOutForDate.has(product.id))
      && product.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  )
  const earlierDates = [...new Set(records.filter(row => row.date < date).map(row => row.date))].sort().reverse()
  const copySource = earlierDates.includes(copyDate) ? copyDate : earlierDates[0]
  const loading = recordsLoading || sellOutsLoading || (!demo && productsLoading)
  const failed = recordsError || sellOutsError || productsError
  const showSuggestions = view === 'daily' && !demo && !!date && !loading && !failed && !salesLoading && !salesError
  const suggestions = useMemo(() => {
    const results = new Map<number, number>()
    if (!showSuggestions) return results
    const history = buildBakeHistory(records, sales, sellOuts)
    for (const product of products) {
      if (!product.active) continue
      const estimate = estimateBake([...(history.get(product.id)?.values() ?? [])], date)
      if (estimate) results.set(product.id, estimate.quantity)
    }
    return results
  }, [showSuggestions, records, sales, sellOuts, products, date])
  const fillableSuggestions = filteredProducts.filter(product =>
    suggestions.has(product.id) && !recordedForDate.has(product.id) && !(product.id in quantities),
  )

  function fillFromBakePlan() {
    setQuantities(previous => {
      const draft = { ...previous }
      for (const product of fillableSuggestions) draft[product.id] = String(suggestions.get(product.id))
      return draft
    })
    setMessage(`Filled ${fillableSuggestions.length} production fields from the Bake plan. Review them against what you actually baked before saving.`)
  }

  function copyProduction() {
    const availableIds = new Set(filteredProducts.filter(product => product.active).map(product => product.id))
    const draft = { ...quantities }
    let copied = 0
    for (const row of records) {
      if (row.date !== copySource || !availableIds.has(row.product_id)
        || recordedForDate.has(row.product_id) || row.product_id in draft) continue
      draft[row.product_id] = String(row.quantity)
      copied++
    }
    setQuantities(draft)
    setMessage(copied ? `Filled ${copied} blank production fields. Review them before saving.` : 'No blank production fields could be filled from that date.')
  }

  function nextQuantity(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement)) return
    const column = event.target.dataset.quantityColumn
    if (!column) return
    event.preventDefault()
    const columnInputs = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement>(`[data-quantity-column="${column}"]:enabled`))
    const next = columnInputs[columnInputs.indexOf(event.target) + (event.shiftKey ? -1 : 1)]
    next?.focus()
    next?.select()
  }

  function updateProduct(product: Product) {
    setProducts(previous => {
      if (!previous.some(item => item.id === product.id)) return [...previous, product]
      return previous.map(item => item.id === product.id ? product : item)
    })
    if (!product.active) {
      for (const setDraft of [setQuantities, setSoldQuantities]) {
        setDraft(previous => {
          const remaining = { ...previous }
          delete remaining[product.id]
          return remaining
        })
      }
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (demo) return
    setMessage('')

    const entries = products.filter(product => product.active).flatMap(({ id }) => {
      const produced = quantities[id]?.trim()
      const sold = soldQuantities[id]?.trim()
      return produced || sold ? [{
        product_id: id,
        produced: produced ? Number(produced) : undefined,
        sold: sold ? Number(sold) : undefined,
      }] : []
    })

    if (entries.length === 0) {
      setMessage('Enter or change a quantity for at least one product.')
      return
    }

    if (entries.some(({ produced, sold }) => [produced, sold].some(value => value !== undefined && (!Number.isSafeInteger(value) || value < 0)))) {
      setMessage('Quantities must be whole numbers of zero or more.')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/production/daily-log', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, entries }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(typeof error.detail === 'string' ? error.detail : 'Check the quantities and try again.')
      }
      const saved: { production: ProductionRecord[]; sales: SalesRecord[] } = await response.json()
      const productionIds = new Set(saved.production.map(row => row.id))
      const salesIds = new Set(saved.sales.map(row => row.product_id))
      setRecords(previous => [...previous.filter(row => !productionIds.has(row.id)), ...saved.production])
      setSales(previous => [...previous.filter(row => row.date !== date || !salesIds.has(row.product_id)), ...saved.sales])
      setQuantities({})
      setSoldQuantities({})
      setMessage(`Saved the daily log for ${date}.`)
    } catch (error) {
      console.error(error)
      setMessage(`Could not confirm the save. Your entries are still here. ${error instanceof Error ? error.message : ''}`)
    } finally {
      setSaving(false)
    }
  }

  async function markSoldOut(product: Product) {
    if (demo || !product.active) return
    setMarkingProductId(product.id)
    setSellOutMessage('')

    try {
      const response = await fetch('/api/sellouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id }),
      })

      if (response.status === 409) {
        const error = await response.json()
        setSellOutMessage(error.detail)
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
          <h1>{viewInfo[view].title}</h1>
          <p>{viewInfo[view].description}</p>
        </div>
        {view === 'overview' && <div className="page-actions">
          <button type="button" className="quick-bake-action" onClick={onOpenBakeList}>Quick bake list <span aria-hidden="true">→</span></button>
          <button type="button" className="primary" onClick={onOpenLog}>Open daily log <span aria-hidden="true">→</span></button>
        </div>}
      </header>

      {view === 'overview' ? (
        <>
          <RecentProductionChart
            demo={demo}
            endDate={demo ? demoRecords.at(-1)?.date ?? todayDate : shiftDate(todayDate, -1)}
            products={products}
            production={records}
            sales={sales}
            loading={recordsLoading || salesLoading || (!demo && productsLoading)}
            failed={recordsError || productsError}
            salesFailed={salesError}
          />
          {!loading && !failed && !salesLoading && (salesError
            ? <p role="alert">Weekday patterns are unavailable because sales could not be loaded.</p>
            : <WeekdayPatterns products={products} production={records} sales={sales} sellOuts={sellOuts} />
          )}
          {demo && loading && <p role="status">Loading demo data…</p>}
          {demo && failed && <p role="alert">Could not load demo data. Reload the page to try again.</p>}
          {demo ? demoRecords.length > 0 && (
            <Dashboard records={demoRecords.map(row => ({
              day: row.date,
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
      ) : view === 'charts' ? (
        <ChartBuilder
          demo={demo}
          products={products}
          production={records}
          sales={sales}
          sellOuts={sellOuts}
          loading={loading || salesLoading}
          failed={failed || salesError}
          endDate={demo ? demoRecords.at(-1)?.date ?? today() : today()}
        />
      ) : view === 'products' ? (
        <ProductManager products={products} demo={demo} loading={demo ? recordsLoading : productsLoading}
          failed={demo ? recordsError : productsError} onChange={updateProduct} disabled={saving || markingProductId !== null} />
      ) : view === 'planning' ? (
        <Planning
          products={products.filter(product => product.active)}
          production={records}
          sales={sales}
          sellOuts={sellOuts}
          loading={loading || salesLoading}
          failed={failed || salesError}
          initialDate={date}
          todayDate={todayDate}
          quickList={quickBakeList}
          onQuickListChange={setQuickBakeList}
        />
      ) : (
        <form className="daily-card" onSubmit={save} onKeyDown={nextQuantity}>
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
                  setSoldQuantities({})
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
          {!demo && <p className="log-note">Enter total units sold at closing. Leave unknown counts blank and enter 0 for confirmed zero sales.</p>}
          {!demo && <div className="copy-production">
            <button type="button" disabled={saving || fillableSuggestions.length === 0} onClick={fillFromBakePlan}>
              Fill from Bake plan{fillableSuggestions.length > 0 ? ` (${fillableSuggestions.length})` : ''}
            </button>
            <p>Suggested quantities are drafts for visible products with blank production fields. Review them before saving.</p>
            {(salesError || sellOutsError) && <p>Suggestions are unavailable until sales and sell-out history can be loaded.</p>}
          </div>}
          {!demo && <div className="copy-production">
            <label>Copy production from
              <select value={copySource ?? ''} disabled={saving || recordsLoading || recordsError || !copySource} onChange={event => setCopyDate(event.target.value)}>
                {!copySource && <option value="">No earlier production</option>}
                {earlierDates.map(day => <option key={day} value={day}>{day}</option>)}
              </select>
            </label>
            <button type="button" disabled={saving || recordsLoading || recordsError || !copySource} onClick={copyProduction}>Copy to blank fields</button>
            <p>Fills visible products only. Press Enter to move to the next quantity in the same column.</p>
          </div>}
          {salesError && <p className="log-note" role="alert">Sales could not be loaded. Restart or check the backend.</p>}
          {!demo && !selectedDateIsToday && <p className="log-note">Sell-outs can only be recorded for today.</p>}
          {loading && <p className="log-note" role="status">Loading products and records…</p>}
          {failed && <p className="log-note" role="alert">Some data could not be loaded. Reload the page to try again.</p>}
          <div className="log-table">
            <table>
              <thead><tr><th scope="col">Product</th><th scope="col">Produced</th><th scope="col">Sold</th><th scope="col">Sell-out</th></tr></thead>
              <tbody>
                {filteredProducts.map(product => {
                  const recorded = recordedForDate.get(product.id)
                  const suggestion = suggestions.get(product.id)
                  const canUseSuggestion = suggestion !== undefined && recorded === undefined && !(product.id in quantities)
                  return (
                    <tr key={product.id}>
                      <th scope="row"><span className="product-name"><ProductPhoto name={product.name} />{product.name}{!product.active && <small>Disabled</small>}</span></th>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          aria-label={`Produced quantity for ${product.name}`}
                          disabled={demo || !product.active || saving || recordsLoading || recordsError || !date}
                          data-quantity-column="produced"
                          value={quantities[product.id] ?? (recorded === undefined ? '' : String(recorded))}
                          onChange={event => setQuantities({ ...quantities, [product.id]: event.target.value })}
                        />
                        {suggestion !== undefined && (canUseSuggestion ? (
                          <button className="use-bake-suggestion" type="button" disabled={saving}
                            aria-label={`Use suggested quantity of ${suggestion} for ${product.name}`}
                            onClick={() => setQuantities(previous => ({ ...previous, [product.id]: String(suggestion) }))}>
                            Use {suggestion}
                          </button>
                        ) : <small className="use-bake-suggestion">Plan {suggestion}</small>)}
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          aria-label={`Units sold for ${product.name}`}
                          disabled={demo || !product.active || saving || salesLoading || salesError || !date}
                          data-quantity-column="sold"
                          value={soldQuantities[product.id] ?? salesForDate.get(product.id) ?? ''}
                          onChange={event => setSoldQuantities({ ...soldQuantities, [product.id]: event.target.value })}
                        />
                      </td>
                      <td>
                        {soldOutForDate.has(product.id) ? <span className="sold-out-label">Sold out</span> :
                          demo || !product.active || !selectedDateIsToday ? <span aria-label="No sell-out recorded">—</span> :
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
                {!loading && !failed && filteredProducts.length === 0 && <tr><td colSpan={4}>{query.trim() ? 'No matching products.' : 'No products available.'}</td></tr>}
              </tbody>
            </table>
          </div>
          <footer className="log-footer">
            <div role="status">{message && <p>{message}</p>}{sellOutMessage && <p>{sellOutMessage}</p>}</div>
            {!demo && <button className="primary" type="submit" disabled={saving || !date || ![...Object.values(quantities), ...Object.values(soldQuantities)].some(value => value.trim())}>
              {saving ? 'Saving…' : 'Save daily log'}
            </button>}
          </footer>
        </form>
      )}
    </>
  )
}

export default App
