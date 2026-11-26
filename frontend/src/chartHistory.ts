import { useEffect, useState } from 'react'
import type { Product, ProductionRecord, SalesRecord, SellOutRecord } from './App'
import type { ChartDay } from './chartData'
import { parseSellOutTime } from './dashboardStats'
import { loadDemoCategories } from './demoData'
import type { ChartCategory } from './demoData'

export function useChartCategories(demo: boolean) {
  const [categories, setCategories] = useState<ChartCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesFailed, setCategoriesFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const request = demo
      ? loadDemoCategories(controller.signal)
      : fetch('/api/categories', { signal: controller.signal }).then(response => {
        if (!response.ok) throw new Error('Could not load categories')
        return response.json() as Promise<ChartCategory[]>
      })
    request
      .then(setCategories)
      .catch(() => {
        if (!controller.signal.aborted) setCategoriesFailed(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setCategoriesLoading(false)
      })
    return () => controller.abort()
  }, [demo])

  return { categories, setCategories, categoriesLoading, categoriesFailed }
}

const bakeryDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Copenhagen' })

export function buildChartHistory(
  products: Product[],
  categories: ChartCategory[],
  production: ProductionRecord[],
  sales: SalesRecord[],
  sellOuts: SellOutRecord[] = [],
) {
  const days = new Map<string, ChartDay>()
  const categoryByProduct = new Map(products.map(product => [product.id, product.category_id]))
  const targets = new Map(categories.map(category => [category.id, category.leftover_target_percent]))
  function getDay(productId: number, date: string): ChartDay {
    const key = `${productId}/${date}`
    const existing = days.get(key)
    if (existing) return existing
    const categoryId = categoryByProduct.get(productId) ?? null
    const leftoverTargetPercent = categoryId === null ? null : targets.get(categoryId) ?? null
    const row = { productId, date, categoryId, leftoverTargetPercent, sellOuts: 0 }
    days.set(key, row)
    return row
  }
  for (const row of production) getDay(row.product_id, row.date).produced = row.quantity
  for (const row of sales) getDay(row.product_id, row.date).sold = row.quantity
  for (const row of sellOuts) {
    const date = bakeryDate.format(parseSellOutTime(row.sold_out_at))
    getDay(row.product_id, date).sellOuts++
  }
  return [...days.values()]
}
