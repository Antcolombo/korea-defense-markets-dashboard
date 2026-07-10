import {
  SortableMetricStrip,
  type TerminalMetric
} from '@/components/workbench/research-charts'
import { qualityTone } from '@/components/workbench/terminal-quality'
import type { ShellMeta } from '@/lib/research/api'
import type { MetricValue, StockReport } from '@/lib/research/types'
import type { ModuleMeta, WorkspaceData } from '@/contracts/workspace'

export function TerminalMetrics({ data, shell, active }: { data: WorkspaceData; shell: ShellMeta; active: ModuleMeta }) {
  const topRotation = maxBy(data.rotations ?? data.basketSignals ?? [], row => row.return20d.value)
  const topCrowding = maxBy(data.crowding ?? data.basketCrowding ?? [], row => row.crowdingScore.value)
  const topBasket = maxBy(data.baskets ?? [], row => row.relativeStrengthVsSpy20d.value)
  const positioned = (data.positioning ?? []).filter(row => row.optionsVolume.value !== null).length
  const report = data.report
  const reportRs = reportMetric(report, '20D RS vs SPY')
  const reportCrowding = reportMetric(report, 'Crowding score')
  const reportSetup = report ? setupFromReport(report) : null
  const reportOptionsVolume = reportMetric(report, 'Options volume')
  const reportPutCall = reportMetric(report, 'Put/call ratio')
  const reportOptionsComponent = reportMetric(report, 'Options component')
  const optionsState = shell.sourceStates.find(state => state.key === 'options')
  const catalystState = shell.sourceStates.find(state => state.key === 'catalyst')
  const pitch = data.pitch?.pitch
  const decision = data.decision
  const pitchSetup = pitch?.setup
  const metrics: TerminalMetric[] = [
    { id: 'module', label: 'Module', value: active.short, sub: active.label },
    { id: 'coverage', label: 'Sources', value: shell.qualityLabel, sub: shell.sourceSummary || shell.qualityDetail, tone: qualityTone(shell) },
    {
      id: 'top-rs',
      label: decision ? 'Decision' : pitch ? 'Pitch Ticker' : report ? 'Report RS' : 'Top RS',
      value: decision?.ticker ?? pitchSetup?.ticker ?? report?.ticker ?? topRotation?.ticker ?? topBasket?.name ?? 'N/A',
      sub: decision
        ? `${decision.decision} / ${decision.status}`
        : pitchSetup
        ? `${pitchSetup.recommendation} / ${formatPitchReturn(pitchSetup.expectedReturn)}`
        : reportRs?.displayValue ?? (topRotation ? metricText(topRotation.relativeStrengthVsSpy20d) : topBasket ? metricText(topBasket.relativeStrengthVsSpy20d) : 'No row')
    },
    {
      id: 'setup',
      label: 'Setup',
      value: decision?.pmRead.variantStrength ?? pitchSetup?.industry ?? reportSetup ?? topCrowding?.ticker ?? 'N/A',
      sub: decision
        ? `Evidence ${decision.pmRead.evidenceQuality} / risk ${decision.pmRead.riskClarity}`
        : pitchSetup
        ? `Target ${formatPitchPrice(pitchSetup.targetPrice)} / downside ${formatPitchPrice(pitchSetup.downsidePrice)}`
        : report ? `Crowding ${reportCrowding?.displayValue ?? 'N/A'}` : topCrowding ? `${metricText(topCrowding.crowdingScore, { suffix: '' })} ${topCrowding.setupLabel}` : 'No score'
    },
    {
      id: 'options',
      label: decision ? 'Decision Gate' : pitch ? 'Pitch Source' : report ? 'Options Proxy' : 'Options Rows',
      value: decision
        ? (decision.readiness.canAccept ? 'Ready' : 'Incomplete')
        : pitch
        ? sourceValue(optionsState?.status)
        : reportOptionsVolume?.displayValue ?? positioned.toString(),
      sub: decision
        ? decision.readiness.canAccept ? 'Variant, evidence, risk written.' : `${decision.readiness.missingForAccept.length} fields missing`
        : pitch
        ? `Options ${sourceWord(optionsState?.status)}. Catalyst ${sourceWord(catalystState?.status)}.`
        : report ? `PCR ${reportPutCall?.displayValue ?? 'N/A'} / score ${reportOptionsComponent?.displayValue ?? 'N/A'}` : data.positioning?.length ? `${data.positioning.length} proxy rows` : 'Module scoped',
      tone: decision ? (decision.readiness.canAccept ? 'good' : 'warn') : pitch ? sourceTone(optionsState?.status) : undefined
    }
  ]

  return <SortableMetricStrip metrics={metrics} />
}

function sourceValue(status: string | undefined) {
  if (status === 'fresh' || status === 'available') return 'Ready'
  if (status === 'limited') return 'Limited'
  if (status === 'stale') return 'Stale'
  if (status === 'deferred') return 'Deferred'
  return 'Unavailable'
}

function sourceWord(status: string | undefined) {
  if (status === 'fresh') return 'fresh'
  if (status === 'available') return 'ready'
  if (status === 'limited') return 'limited'
  if (status === 'stale') return 'stale'
  if (status === 'deferred') return 'deferred'
  return 'unavailable'
}

function sourceTone(status: string | undefined): TerminalMetric['tone'] {
  if (status === 'fresh' || status === 'available') return 'good'
  if (status === 'limited' || status === 'deferred' || status === 'stale') return 'warn'
  return 'danger'
}

function metricText(metric: MetricValue | undefined, options: { suffix?: string; decimals?: number; multiplier?: number } = {}) {
  if (!metric || metric.value === null) return 'N/A'
  const multiplier = options.multiplier ?? 1
  const value = metric.value * multiplier
  const suffix = options.suffix ?? '%'
  const prefix = value > 0 && suffix === '%' ? '+' : ''
  return `${prefix}${value.toFixed(options.decimals ?? 1)}${suffix}`
}

function formatPitchReturn(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'N/A'
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

function formatPitchPrice(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'N/A'
  return `$${value.toFixed(2)}`
}

function reportMetric(report: StockReport | undefined, label: string) {
  if (!report) return undefined
  const sections = [...report.evidence, report.positioning, report.catalysts]
  return sections.flatMap(section => section.metrics).find(metric => metric.label === label)
}

function setupFromReport(report: StockReport) {
  const setupMetric = reportMetric(report, 'Setup')
  if (setupMetric?.displayValue && setupMetric.displayValue !== 'Unavailable') return setupMetric.displayValue
  const setupMatch = report.summary.match(/setup label is ([^.]+)\./i)
  return setupMatch?.[1]?.trim() ?? null
}

function maxBy<T>(rows: T[], value: (row: T) => number | null) {
  return rows.reduce<T | undefined>((best, row) => {
    if (!best) return row
    return (value(row) ?? -Infinity) > (value(best) ?? -Infinity) ? row : best
  }, undefined)
}
