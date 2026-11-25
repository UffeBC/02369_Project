import { useEffect, useState } from 'react'
import Dashboard from './Dashboard'

type Product = {
  id: number
  name: string
}

type ProductionRecord = {
  id: number
  product_id: number
  date: string
  quantity: number
}

type SellOutRecord = {
  id: number
  product_id: number
  sold_out_at: string
}

function today(): string {
  return new Date().toLocaleDateString('en-CA')
}

function localDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('en-CA')
}

function App() {
  const [products, setProducts] = useState<Product[]>([])
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

  function loadProducts() {
    fetch('/api/products')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch products')
        }

        return response.json()
      })
      .then(data => setProducts(data))
      .catch(error => console.error(error))
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
    loadProducts()
    loadRecords()
    loadSellOuts()
  }, [])

  const recordedForDate = new Map(
    records.filter(record => record.date === date).map(record => [record.product_id, record.quantity]),
  )
  const soldOutForDate = new Set(
    sellOuts
      .filter(record => localDate(record.sold_out_at) === date)
      .map(record => record.product_id),
  )
  const selectedDateIsToday = date === today()

  async function save(event: React.FormEvent) {
    event.preventDefault()
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
    <div>
      <h1>Maria's Bakery</h1>
      <Dashboard />

      <h2>Products</h2>

      <ul>
        {products.map(product => (
          <li key={product.id}>
            {product.name}
          </li>
        ))}
      </ul>

      <section className="sell-outs" aria-labelledby="sell-outs-heading">
        <h2 id="sell-outs-heading">Sell-outs</h2>
        <p>Mark a product when it sells out today. The time is recorded automatically.</p>

        {!selectedDateIsToday && (
          <p className="status">Sell-outs can only be recorded for today.</p>
        )}
        {sellOutsLoading && <p>Loading sell-outs…</p>}
        {sellOutsError && (
          <p className="status" role="alert">
            Could not load sell-outs. Reload the page to try again.
          </p>
        )}

        <ul className="sell-out-list">
          {products.map(product => {
            const soldOut = soldOutForDate.has(product.id)
            const marking = markingProductId === product.id

            return (
              <li className="sell-out-row" key={product.id}>
                <span>{product.name}</span>
                {soldOut ? (
                  <span className="sell-out-status">Sold out</span>
                ) : (
                  <button
                    type="button"
                    disabled={!selectedDateIsToday || sellOutsLoading || sellOutsError || markingProductId !== null}
                    onClick={() => markSoldOut(product)}
                  >
                    {marking ? 'Saving…' : 'Mark sold out'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>

        {sellOutMessage && <p className="status" role="status">{sellOutMessage}</p>}
      </section>

      <h2>Daily production</h2>

      <form className="production" onSubmit={save}>
        <label className="production-date">
          Date
          <input
            type="date"
            value={date}
            required
            disabled={saving}
            onChange={event => {
              setDate(event.target.value)
              setQuantities({})
              setMessage('')
            }}
          />
        </label>

        <table className="production-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Produced</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => {
              const recorded = recordedForDate.get(product.id)

              return (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      aria-label={`Produced quantity for ${product.name}`}
                      disabled={saving || recordsLoading || recordsError}
                      value={quantities[product.id] ?? (recorded === undefined ? '' : String(recorded))}
                      onChange={event => setQuantities({
                        ...quantities,
                        [product.id]: event.target.value,
                      })}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {recordsLoading && <p>Loading production records…</p>}
        {recordsError && <p role="alert">Could not load production records. Reload the page to try again.</p>}

        <button type="submit" disabled={saving || recordsLoading || recordsError}>
          {saving ? 'Saving…' : 'Save production'}
        </button>

        {message && <p className="status">{message}</p>}
      </form>
    </div>
  )
}

export default App
