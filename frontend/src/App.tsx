import { useEffect, useState } from 'react'

type Product = {
  id: number
  name: string
}

function App() {
  const [products, setProducts] = useState<Product[]>([])

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
    </div>
  )
}

export default App