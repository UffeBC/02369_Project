import { useEffect, useState } from 'react'

type Product = {
  id: number
  name: string
}

function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [productId, setProductId] = useState('')
  const [date, setDate] = useState('')
  const [quantity, setQuantity] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/products')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch products')
        }

        return response.json()
      })
      .then(data => setProducts(data))
      .catch(error => console.error(error))
  }, [])

  return (
    <div>
      <h1>Maria's Bakery</h1>

      <h2>Products</h2>

      <ul>
        {products.map(product => (
          <li key={product.id}>
            {product.name}
          </li>
        ))}
      </ul>
            <h2>Record Leftovers</h2>

      <form>
        <label>Product</label>
        <select
          value={productId}
          onChange={e => setProductId(e.target.value)}
          required
        >
          <option value="">Select a product</option>
          {products.map(product => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>

        <label>Date</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
        />

        <label>Quantity left</label>
        <input
          type="number"
          min="0"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          required
        />

        <button type="submit">Save Leftover</button>
        <p>{message}</p>
      </form>
    </div>
  )
}

export default App