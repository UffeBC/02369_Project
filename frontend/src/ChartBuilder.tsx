import { useMemo, useState } from 'react'
import type { Product, ProductionRecord, SalesRecord, SellOutRecord } from './App'
import { chartPoints, defaultSellThroughMinimum, shiftDate } from './chartData'
import type { ChartGrouping, ChartMetric, ChartSeries, ChartValue, SellThrough } from './chartData'
import { buildChartHistory, useChartCategories } from './chartHistory'
import { ProductionLegend, ProductionStack } from './productionChart'
import './ChartBuilder.css'

const metrics: Record<ChartMetric, string> = {
  'production-and-sales': 'Production and leftovers',
  produced: 'Units produced',
  sold: 'Units sold',
  'sell-outs': 'Sell-out events',
  'sell-through': 'Sell-through rate',
}

const colors = ['#245443', '#a35427', '#375a94', '#884b77', '#807027', '#287676']
type SubjectKind = 'products' | 'categories'
type CompareBy = SubjectKind | 'mixed'
type ChartOption = { id: number | null; name: string; kind: SubjectKind }
const optionKey = ({ kind, id }: ChartOption) => `${kind}/${id}`
const seriesColor = (number: number) => colors[(number - 1) % colors.length]

function isSellThrough(value: ChartValue | null): value is SellThrough {
  return value !== null && typeof value === 'object' && 'rate' in value
}

function barTotal(value: ChartValue | null): number {
  if (isSellThrough(value)) return value.rate
  return typeof value === 'number' ? value : value?.produced ?? 0
}

type Props = {
  demo: boolean
  products: Product[]
  production: ProductionRecord[]
  sales: SalesRecord[]
  sellOuts: SellOutRecord[]
  loading: boolean
  failed: boolean
  endDate: string
}

export default function ChartBuilder({ demo, products, production, sales, sellOuts, loading, failed, endDate }: Props) {
  const [metric, setMetric] = useState<ChartMetric>('production-and-sales')
  const [grouping, setGrouping] = useState<ChartGrouping>('week')
  const [compareBy, setCompareBy] = useState<CompareBy>('products')
  const [selected, setSelected] = useState<Record<SubjectKind, (number | null)[] | null>>({ products: null, categories: null })
  const [query, setQuery] = useState('')
  const { categories, setCategories, categoriesLoading, categoriesFailed } = useChartCategories(demo)
  const [targetCategoryId, setTargetCategoryId] = useState<number>()
  const [savingTarget, setSavingTarget] = useState(false)
  const [targetNotice, setTargetNotice] = useState('')
  const [targetError, setTargetError] = useState('')
  const [fromDate, setFromDate] = useState<string | null>(null)
  const [toDate, setToDate] = useState<string | null>(null)
  const from = fromDate ?? shiftDate(endDate, -29)
  const to = toDate ?? endDate
  const rangeValid = Boolean(from && to && from <= to)

  const history = useMemo(
    () => buildChartHistory(products, categories, production, sales, sellOuts),
    [categories, products, production, sales, sellOuts],
  )

  const byCategory = compareBy === 'categories'
  const mixed = compareBy === 'mixed'
  const categoryNames = new Map(categories.map(category => [category.id, category.name]))
  const categoryIds = new Set([...products.map(product => product.category_id), ...history.map(row => row.categoryId ?? null)])
  const categoryOptions: ChartOption[] = [...categoryIds].map(id => ({
    id, name: id === null ? 'Uncategorized' : categoryNames.get(id) ?? `Category #${id}`, kind: 'categories' as const,
  })).sort((a, b) => a.name.localeCompare(b.name, 'da'))
  const productOptions: ChartOption[] = products.map(({ id, name }) => ({ id, name, kind: 'products' }))
  const options = byCategory ? categoryOptions : mixed ? [...categoryOptions, ...productOptions] : productOptions
  const optionNumbers = new Map(options.map((option, index) => [optionKey(option), index + 1]))
  const numberFor = (option: ChartOption) => optionNumbers.get(optionKey(option))!
  const chosen = options.filter(option => selected[option.kind]?.includes(option.id))
  const allSelected = options.length > 0 && chosen.length === options.length
  const automatic = mixed ? false : selected[byCategory ? 'categories' : 'products'] === null
  const subjects = chosen.length ? chosen : byCategory && automatic ? categoryOptions : []
  const labelFor = (option: ChartOption) => mixed && option.kind === 'categories' ? `Category: ${option.name}` : option.name
  const series: (ChartSeries & { number: number })[] = subjects.map(option => ({
    name: labelFor(option),
    number: numberFor(option),
    ...(option.kind === 'categories' ? { categoryId: option.id } : { productId: option.id ?? undefined }),
    metric,
  }))
  if (compareBy === 'products' && automatic) series.push({ name: 'All products', metric, number: 1 })
  const setSelection = ({ id, kind }: ChartOption, checked: boolean) => {
    setSelected(previous => ({
      ...previous,
      [kind]: checked ? [...(previous[kind] ?? []), id] : (previous[kind] ?? []).filter(item => item !== id),
    }))
  }
  const points = rangeValid && series.length > 0
    ? chartPoints(history, series, grouping, from, to).filter(point => point.values.some(value => value !== null))
    : []
  const percent = metric === 'sell-through'
  const highest = points.reduce((max, point) => Math.max(max, ...point.values.map(barTotal)), percent ? 100 : 0)
  const tick = Math.max(1, Math.ceil(highest / 4))
  const scale = tick * 4
  const format = (value: number) => percent ? `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%` : value.toLocaleString()
  const period = grouping === 'week' ? 'Week starting' : grouping === 'weekday' ? 'Weekday' : 'Date'
  const search = query.trim().toLocaleLowerCase('da')
  const filtered = options.filter(option =>
    option.name.toLocaleLowerCase('da').includes(search) || String(numberFor(option)) === search.replace(/^#/, ''),
  )
  const stacked = metric === 'production-and-sales'
  const subjectKind = byCategory ? 'categories' : mixed ? 'products and categories' : 'products'
  const hasOverlap = mixed && products.some(product =>
    selected.products?.includes(product.id) && selected.categories?.includes(product.category_id),
  )
  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name, 'da'))
  const targetCategory = sortedCategories.find(category => category.id === targetCategoryId)
    ?? sortedCategories.find(category => byCategory && chosen.length === 1 && category.id === chosen[0].id)
    ?? sortedCategories[0]
  const hasUntargeted = points.some(point => point.values.some(value => value && typeof value !== 'number' && 'untargeted' in value && value.untargeted > 0))

  async function saveTarget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!targetCategory || savingTarget) return
    const value = String(new FormData(event.currentTarget).get('target') ?? '').trim()
    const percent = value === '' ? null : Number(value)
    setTargetNotice('')
    setTargetError('')
    if (percent !== null && (!Number.isInteger(percent) || percent < 0 || percent > 100)) {
      setTargetError('Enter a whole percentage from 0 to 100, or leave it blank.')
      return
    }
    setSavingTarget(true)
    try {
      let updated = { ...targetCategory, leftover_target_percent: percent }
      if (!demo) {
        const response = await fetch(`/api/categories/${targetCategory.id}/leftover-target`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leftover_target_percent: percent }),
        })
        if (!response.ok) throw new Error('Could not save the target. Try again.')
        updated = await response.json() as typeof updated
      }
      setCategories(previous => previous.map(category => category.id === updated.id ? updated : category))
      setTargetNotice(demo ? `Updated the demo target for ${updated.name}.` : `Saved the target for ${updated.name}.`)
    } catch (error) {
      setTargetError(error instanceof Error ? error.message : 'Could not save the target.')
    } finally {
      setSavingTarget(false)
    }
  }

  function describe(value: ChartValue) {
    if (typeof value === 'number') return format(value)
    if (isSellThrough(value)) {
      const gap = value.minimum - value.rate
      const points = (difference: number) => difference.toLocaleString(undefined, { maximumFractionDigits: 2 })
      const status = gap > 0
        ? `${gap < 0.01 ? '<0.01' : points(gap)} percentage points below target`
        : value.rate > 100
          ? `${points(value.rate - 100)} percentage points above 100% · reported sales exceed production`
          : 'Within target'
      return `${format(value.rate)} · Target ${format(value.minimum)}–100% · ${status}`
    }
    const sold = value.matchedDays ? format(value.sold) : 'unknown'
    const leftover = value.matchedDays ? format(value.withinTarget + value.aboveTarget + value.untargeted) : 'unknown'
    const split = value.matchedDays && (value.withinTarget || value.aboveTarget)
      ? ` · Within target ${format(value.withinTarget)} · Above target ${format(value.aboveTarget)}` : ''
    const untargeted = value.untargeted ? ` · No target ${format(value.untargeted)}` : ''
    return `Produced ${format(value.produced)} · Sold from production ${sold} · Left over ${leftover}${split}${untargeted}${value.unknown ? ` · Sales unrecorded for ${format(value.unknown)} units` : ''}`
  }

  return (
    <>
      <section className="daily-card chart-settings" aria-label="Chart settings">
        <div className="chart-fields">
          <label>Measure
            <select value={metric} onChange={event => setMetric(event.target.value as ChartMetric)}>
              {Object.entries(metrics).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>Compare by
            <select value={compareBy} onChange={event => {
              setCompareBy(event.target.value as CompareBy)
              setQuery('')
            }}>
              <option value="products">Product</option><option value="categories">Category</option><option value="mixed">Product and category</option>
            </select>
          </label>
          <label>Group by
            <select value={grouping} onChange={event => setGrouping(event.target.value as ChartGrouping)}>
              <option value="day">Day</option><option value="week">Week</option><option value="weekday">Day of week</option>
            </select>
          </label>
          <label>From <input type="date" value={from} onChange={event => setFromDate(event.target.value)} /></label>
          <label>To <input type="date" value={to} onChange={event => setToDate(event.target.value)} /></label>
        </div>
        <div className="chart-products">
          <details>
            <summary>Select {subjectKind}</summary>
            <label className="chart-search">Find {subjectKind}
              <input type="search" placeholder="Name or chart number" value={query} onChange={event => setQuery(event.target.value)} />
            </label>
            <button className="chart-select-all" type="button" disabled={options.length === 0} onClick={() => {
              setSelected(previous => ({
                products: byCategory ? previous.products : allSelected ? [] : productOptions.map(option => option.id),
                categories: compareBy === 'products' ? previous.categories : allSelected ? [] : categoryOptions.map(option => option.id),
              }))
            }}>
              {allSelected ? 'Deselect all' : 'Select all'} {subjectKind}
            </button>
            <div className="chart-product-options">
              {filtered.map(option => (
                <label key={optionKey(option)}>
                  <input type="checkbox" checked={selected[option.kind]?.includes(option.id) ?? false} onChange={event => setSelection(option, event.target.checked)} />
                  <span className="chart-series-number" style={{ backgroundColor: seriesColor(numberFor(option)) }}>{numberFor(option)}</span>
                  {labelFor(option)}
                </label>
              ))}
              {filtered.length === 0 && <p>No matching {subjectKind}.</p>}
            </div>
          </details>
          {chosen.length === 0 && automatic && <p>{byCategory ? 'Showing all categories separately.' : 'Showing all products together.'}</p>}
          {chosen.length > 0 && <>
            {allSelected ? <p>All {chosen.length} {subjectKind} selected.</p> : <ul aria-label={`Selected ${subjectKind}`}>
              {chosen.map(option => (
                <li key={optionKey(option)}>
                  <button type="button" aria-label={`Remove ${numberFor(option)}, ${labelFor(option)}`} onClick={() => setSelection(option, false)}>
                    {numberFor(option)} · {labelFor(option)} <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>}
          </>}
          {!automatic && !mixed && <button type="button" onClick={() => setSelected(previous => ({
            ...previous,
            [compareBy]: null,
          }))}>{byCategory ? 'Show all categories' : 'Show all together'}</button>}
        </div>
        {hasOverlap && <p role="status">The category total includes any selected products that belong to it.</p>}
        {(stacked || percent) && <details className="chart-targets">
          <summary>Leftover targets by category</summary>
          <p>Set the share of each day’s production you’re willing to have left over. For example, 10% of 40 units allows 4 leftovers. The current target is used for every date shown.</p>
          {demo && <p>Demo starts at 10% per category. Changes here are temporary.</p>}
          {categoriesLoading ? <p role="status">Loading categories…</p> :
            categoriesFailed ? <p role="alert">Category targets could not be loaded.</p> :
            targetCategory ? (
              <form className="chart-target-form" onSubmit={saveTarget}>
                <label>Category
                  <select value={targetCategory.id} disabled={savingTarget} onChange={event => {
                    setTargetCategoryId(Number(event.target.value))
                    setTargetNotice('')
                    setTargetError('')
                  }}>
                    {sortedCategories.map(category => <option key={category.id} value={category.id}>
                      {category.name} ({category.leftover_target_percent == null ? 'no target' : `${category.leftover_target_percent}%`})
                    </option>)}
                  </select>
                </label>
                <label>Target (%)
                  <input key={`${targetCategory.id}/${targetCategory.leftover_target_percent}`} type="number" name="target" min="0" max="100" step="1"
                    defaultValue={targetCategory.leftover_target_percent ?? ''} placeholder="No target" disabled={savingTarget} />
                </label>
                <button type="submit" disabled={savingTarget}>{savingTarget ? 'Saving…' : demo ? 'Apply demo target' : 'Save target'}</button>
              </form>
            ) : <p>No categories available.</p>}
          {targetNotice && <p role="status">{targetNotice}</p>}
          {targetError && <p role="alert">{targetError}</p>}
        </details>}
      </section>

      <section className="dashboard chart-result">
        <h2>{metrics[metric]} by {grouping === 'weekday' ? 'day of week' : grouping}</h2>
        {failed || (compareBy !== 'products' && categoriesFailed) ? <p role="alert">Some chart data could not be loaded. Reload the page to try again.</p> :
          loading || (compareBy !== 'products' && categoriesLoading) ? <p role="status">Loading chart data…</p> :
          !rangeValid ? <p role="alert">Choose a start date on or before the end date.</p> :
          !automatic && chosen.length === 0 ? <p>Select {subjectKind} above to build the chart.</p> :
          points.length === 0 ? <p>No records for this measure, selection, and date range.</p> : <>
            <ul className="chart-legend" aria-label="Chart legend">
              {series.map(item => <li key={`${item.productId}/${item.categoryId}`}>
                <span className="chart-series-number" style={{ backgroundColor: seriesColor(item.number) }}>{item.number}</span>{item.name}
              </li>)}
            </ul>
            {stacked && <ProductionLegend hasUntargeted={hasUntargeted} />}
            {percent && <p className="chart-segment-key">
              <span><i className="chart-rate-range" aria-hidden="true" />Target range</span>
              <span><i className="chart-rate-gap" aria-hidden="true" />Gap below target</span>
            </p>}
            <div className="chart-visual">
              <div className="chart-axis" aria-hidden="true">
                {[4, 3, 2, 1, 0].map(step => <span key={step}>{format(tick * step)}</span>)}
              </div>
              <div className="chart-scroll" tabIndex={0} role="region" aria-label="Scrollable bar chart. Exact values are in the table below.">
                <div className="chart-columns" aria-hidden="true">
                  {points.map(point => <div className="chart-group" key={point.key}>
                    <div className="chart-bars">
                      {point.values.map((value, index) => <div className="chart-bar-slot" key={index}>
                        {isSellThrough(value) && <>
                          <div className="chart-rate-range" style={{ bottom: `${value.minimum / scale * 100}%`, height: `${(100 - value.minimum) / scale * 100}%` }} />
                          {value.rate < value.minimum && <div className="chart-rate-gap" title={describe(value)}
                            style={{ bottom: `${value.rate / scale * 100}%`, height: `${(value.minimum - value.rate) / scale * 100}%` }} />}
                          <div className="chart-rate-marker" style={{ bottom: `${value.minimum / scale * 100}%` }} title={`Minimum target ${format(value.minimum)}`} />
                        </>}
                        {value !== null && <div
                          className={stacked ? 'chart-bar chart-bar-stacked' : 'chart-bar'}
                          style={{ height: barTotal(value) ? `${barTotal(value) / scale * 100}%` : '2px', backgroundColor: seriesColor(series[index].number) }}
                          title={`${point.label} · ${series[index].number} · ${series[index].name} · ${describe(value)}`}
                        >
                          {typeof value !== 'number' && 'produced' in value && value.produced > 0 && <ProductionStack value={value} />}
                          {series.length > colors.length && <small>{series[index].number}</small>}
                        </div>}
                      </div>)}
                    </div>
                    <span>{grouping === 'weekday' ? point.label : point.label.slice(5)}</span>
                  </div>)}
                </div>
              </div>
            </div>
            <p>{percent
              ? `The target range ends at 100%. Its lower edge is 100% minus the category’s leftover target, or ${defaultSellThroughMinimum}% if no target is set. Combined targets are weighted by production on days with sales counts. Open exact values for the gap in percentage points.`
              : stacked
                ? 'Each bar is total production. Targets apply to each product and date before totals are combined. The allowed leftovers are rounded down to whole units. Sales above that day’s production appear in Units sold.'
              : 'Bars total recorded values in each period. Blank values mean no matching records.'}</p>
            <details className="chart-values">
              <summary>View exact values</summary>
              <div className="dashboard-table" tabIndex={0} role="region" aria-label="Chart values">
                <table>
                  <thead><tr><th scope="col">{period}</th>{series.map(item => <th scope="col" key={`${item.productId}/${item.categoryId}`}>{item.name}</th>)}</tr></thead>
                  <tbody>{points.map(point => <tr key={point.key}>
                    <th scope="row">{point.label}</th>
                    {point.values.map((value, index) => <td key={index}>{value === null ? '—' : describe(value)}</td>)}
                  </tr>)}</tbody>
                </table>
              </div>
            </details>
          </>}
      </section>
    </>
  )
}
