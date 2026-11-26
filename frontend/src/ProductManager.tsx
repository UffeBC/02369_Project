import { useEffect, useState } from 'react'
import type { Product } from './App'
import ProductPhoto from './ProductPhoto'
import { publicDemo } from './demoData'

type Category = { id: number; name: string }

type Props = {
  products: Product[]
  demo: boolean
  loading: boolean
  failed: boolean
  disabled: boolean
  onChange: (product: Product) => void
}

export default function ProductManager({ products, demo, loading, failed, disabled, onChange }: Props) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [query, setQuery] = useState('')
  const [availability, setAvailability] = useState('all')
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (demo) return
    const controller = new AbortController()
    fetch('/api/categories', { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error()
        return response.json() as Promise<Category[]>
      })
      .then(setCategories)
      .catch(() => {
        if (!controller.signal.aborted) setError('Categories could not be loaded. You can still add a product without a category.')
      })
    return () => controller.abort()
  }, [demo])

  async function saveProduct(url: string, method: 'POST' | 'PATCH', body: object) {
    setPending(true)
    setNotice('')
    setError('')
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Check the product details and try again.')
      const product: Product = data
      onChange(product)
      if (method === 'POST') {
        setName('')
        setNotice(`Added ${product.name}.`)
      } else {
        setNotice(`${product.name} ${product.active ? 're-enabled' : 'disabled'}.`)
      }
    } catch (error) {
      setError(`Could not save the product. ${error instanceof Error ? error.message : ''}`)
    } finally {
      setPending(false)
    }
  }

  const visible = products.filter(product => (
    (availability === 'all' || product.active === (availability === 'active'))
    && product.name.toLocaleLowerCase('da').includes(query.trim().toLocaleLowerCase('da'))
  )).sort((a, b) => a.name.localeCompare(b.name, 'da'))
  const categoryNames = new Map(categories.map(item => [item.id, item.name]))
  const locked = disabled || pending || loading || failed

  return (
    <section className="daily-card">
      {demo ? <p className="catalog-note">{publicDemo ? 'This demo catalog is read-only.' : 'Switch off Demo to manage your collected product catalog.'}</p> : (
        <form className="catalog-form" onSubmit={event => {
          event.preventDefault()
          if (locked || !name.trim()) return
          void saveProduct('/api/products', 'POST', { name: name.trim(), category_id: category ? Number(category) : null })
        }}>
          <h2>Add product</h2>
          <div className="log-toolbar">
            <label>Product name <input required value={name} onChange={event => setName(event.target.value)} disabled={locked} /></label>
            <label>Category
              <select value={category} onChange={event => setCategory(event.target.value)} disabled={locked}>
                <option value="">No category</option>
                {categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <button className="primary" disabled={locked || !name.trim()}>Add product</button>
          </div>
        </form>
      )}
      {notice && <p className="catalog-note" role="status">{notice}</p>}
      {error && <p className="catalog-note" role="alert">{error}</p>}
      <div className="log-toolbar catalog-filters">
        <label>Find a product <input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
        {!demo && <label>Show
          <select value={availability} onChange={event => setAvailability(event.target.value)}>
            <option value="all">All products</option><option value="active">Active</option><option value="disabled">Disabled</option>
          </select>
        </label>}
      </div>
      {loading ? <p className="catalog-note" role="status">Loading products…</p> :
        failed ? <p className="catalog-note" role="alert">Could not load products. Reload the page to try again.</p> :
        <div className="log-table">
          <table>
            <thead><tr><th scope="col">Product</th>{!demo && <>
              <th scope="col">Category</th><th scope="col">Status</th><th scope="col">Availability</th>
            </>}</tr></thead>
            <tbody>
              {visible.map(product => (
                <tr key={product.id}>
                  <th scope="row"><span className="product-name"><ProductPhoto name={product.name} />{product.name}</span></th>
                  {!demo && <>
                    <td>{product.category_id === null ? '—' : categoryNames.get(product.category_id) ?? '—'}</td>
                    <td>{product.active ? <span className="sold-out-label">Active</span> : 'Disabled'}</td>
                    <td>
                      <button type="button" disabled={locked}
                        aria-label={`${product.active ? 'Disable' : 'Re-enable'} ${product.name}`}
                        onClick={() => void saveProduct(`/api/products/${product.id}/availability`, 'PATCH', { active: !product.active })}>
                        {product.active ? 'Disable' : 'Re-enable'}
                      </button>
                    </td>
                  </>}
                </tr>
              ))}
              {visible.length === 0 && <tr><td colSpan={demo ? 1 : 4}>No matching products.</td></tr>}
            </tbody>
          </table>
        </div>}
      {!demo && <p className="catalog-note">Disabled products are removed from new daily entry and bake plans. Their past records stay in Charts and Overview.</p>}
    </section>
  )
}
