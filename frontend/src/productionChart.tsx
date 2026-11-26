import type { ProductionBreakdown } from './chartData'

export function ProductionStack({ value }: { value: ProductionBreakdown }) {
  return <>
    <div className="chart-unknown" style={{ flexGrow: value.unknown }} />
    <div className="chart-untargeted" style={{ flexGrow: value.untargeted }} />
    <div className="chart-excess" style={{ flexGrow: value.aboveTarget }} />
    <div className="chart-leftover" style={{ flexGrow: value.withinTarget }} />
    <div style={{ flexGrow: value.sold }} />
  </>
}

export function ProductionLegend({ hasUntargeted }: { hasUntargeted: boolean }) {
  return (
    <p className="chart-segment-key">
      <span>Solid · Sold</span>
      <span><i className="chart-leftover" aria-hidden="true" />Left over within target</span>
      <span><i className="chart-excess" aria-hidden="true" />Left over above target</span>
      {hasUntargeted && <span><i className="chart-untargeted" aria-hidden="true" />Left over without a target</span>}
      <span><i className="chart-unknown" aria-hidden="true" />Dotted · Sales unrecorded</span>
    </p>
  )
}
