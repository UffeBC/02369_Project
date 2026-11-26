export const publicDemo = import.meta.env.MODE === 'pages'

export const demoSalesUrl = publicDemo
  ? new URL('../../backend/bakery_demo_sales.json', import.meta.url).href
  : '/api/demo'

export type ChartCategory = { id: number; name: string; leftover_target_percent: number | null }

export async function loadDemoCategories(signal: AbortSignal): Promise<ChartCategory[]> {
  if (publicDemo) {
    const catalogUrl = new URL('../../backend/bakery_seed.json', import.meta.url)
    const response = await fetch(catalogUrl, { signal })
    if (!response.ok) throw new Error('Could not load the demo catalog')
    const catalog: { categories: Pick<ChartCategory, 'id' | 'name'>[] } = await response.json()
    return catalog.categories.map(category => ({ ...category, leftover_target_percent: 10 }))
  }

  const response = await fetch('/api/demo/categories', { signal })
  if (!response.ok) throw new Error('Could not load demo categories')
  return response.json()
}
