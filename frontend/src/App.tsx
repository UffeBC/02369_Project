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

function today(): string {
  return new Date().toLocaleDateString('en-CA')
}

function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [records, setRecords] = useState<ProductionRecord[]>([])
  const [date, setDate] = useState(today())
  const [quantities, setQuantities] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

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
      .catch(error => console.error(error))
  }

  useEffect(() => {
    loadProducts()
    loadRecords()
  }, [])

  const recordedForDate = new Map(
    records.filter(record => record.date === date).map(record => [record.product_id, record.quantity]),
  )

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setMessage('')

    const entries = Object.entries(quantities).filter(([productId, value]) => {
      return value.trim() !== '' && !recordedForDate.has(Number(productId))
    })

    if (entries.length === 0) {
      setMessage('Enter a quantity for at least one product.')
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
      }

      setQuantities({})
      loadRecords()
      setMessage(`Saved ${entries.length} ${entries.length === 1 ? 'record' : 'records'} for ${date}.`)
    } catch (error) {
      console.error(error)
      setMessage('Could not save the production records. Check that the backend is running.')
    } finally {
      setSaving(false)
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

      <h2>Daily production</h2>

      <form className="production" onSubmit={save}>
        <label className="production-date">
          Date
          <input
            type="date"
            value={date}
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
                    {recorded !== undefined ? (
                      <span className="recorded">{recorded} recorded</span>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={quantities[product.id] ?? ''}
                        onChange={event => setQuantities({
                          ...quantities,
                          [product.id]: event.target.value,
                        })}
                      />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save production'}
        </button>

        {message && <p className="status">{message}</p>}
      </form>
    </div>
  )
}

export default App
