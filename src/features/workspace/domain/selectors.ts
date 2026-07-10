import type { WorkspaceData, WorkspaceModule } from '@/contracts/workspace'
import type { StockReport } from '@/types/research'

export type WatchRow = { ticker: string; label: string; value: number }
export type WorkspacePanelLayoutMode = 'balanced' | 'memo-heavy' | 'data-heavy'

export function buildWatchlist(data: WorkspaceData): WatchRow[] {
  const fromReport = data.report ? [{
    ticker: data.report.ticker,
    label: setupFromReport(data.report) ?? data.report.companyName,
    value: reportMetric(data.report, '20D return')?.value ?? 0
  }] : []
  const fromRotations = (data.rotations ?? data.basketSignals ?? []).map(row => ({
    ticker: row.ticker,
    label: row.trendLabel || row.name,
    value: row.return20d.value ?? 0
  }))
  const fromCrowding = (data.crowding ?? data.basketCrowding ?? []).map(row => ({
    ticker: row.ticker,
    label: row.setupLabel,
    value: row.crowdingScore.value ?? 0
  }))
  const fromPositioning = (data.positioning ?? []).map(row => ({
    ticker: row.ticker,
    label: row.positioningNotes,
    value: row.impliedVolPercentile.value ?? 0
  }))
  const fromPitches = (data.pitches ?? []).map(row => ({
    ticker: row.ticker,
    label: row.recommendation,
    value: row.expectedReturn ?? 0
  }))
  const fromDecisions = (data.decisions ?? []).map(row => ({
    ticker: row.ticker,
    label: row.status,
    value: row.outcomeReturn ?? row.expectedReturn ?? 0
  }))
  const seen = new Set<string>()
  return [...fromReport, ...fromRotations, ...fromCrowding, ...fromPositioning, ...fromDecisions, ...fromPitches]
    .filter(row => {
      if (seen.has(row.ticker)) return false
      seen.add(row.ticker)
      return true
    })
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
}

export function isModuleActive(item: WorkspaceModule, active: WorkspaceModule) {
  return active === item || (active === 'basket-detail' && item === 'baskets')
}

export function watchlistHref(active: WorkspaceModule, ticker: string) {
  const symbol = encodeURIComponent(ticker)
  if (active === 'decision-log') return `/?module=decision-log&ticker=${symbol}`
  if (active === 'stock-pitch') return `/?module=stock-pitch&ticker=${symbol}`
  if (active === 'risk-lens') return `/?module=risk-lens&ticker=${symbol}`
  if (active === 'stock-report') return `/?module=stock-report&ticker=${symbol}`
  return `/?module=stock-report&ticker=${symbol}`
}

export function basketDetailHref(slug: string) {
  return `/?module=baskets&slug=${slug}`
}

export function defaultQuestions(module: WorkspaceModule) {
  const map: Record<WorkspaceModule, string[]> = {
    overview: ['What moved, why, and does source coverage support action?'],
    rotation: ['Is leadership broadening beyond one ETF?', 'Does volume confirm relative strength?'],
    baskets: ['Which baskets show confirmed sponsorship?', 'Which themes have coverage gaps?'],
    'basket-detail': ['Is performance broad across members?', 'Does positioning confirm sponsorship?'],
    positioning: ['Are options rows available or entitlement-blocked?', 'Does short-sale volume differ from short interest?'],
    crowding: ['Which high-crowding longs also have high extension risk?', 'Which deferred components would change setup label?'],
    validation: ['Is sample history sufficient for confidence?'],
    methodology: ['Are proxy limits explicit enough for downstream readers?'],
    'korea-defense': ['Is Korea exposure confirming through EWY or only U.S. suppliers?', 'Do deferred fields weaken the read?'],
    'stock-report': ['Does evidence support variant view?', 'What invalidates setup?'],
    'decision-log': ['Is market belief separated from variant view?', 'Are three drivers, invalidation, and post-mortem written?'],
    'stock-pitch': ['Is variant view sharp enough for a fund reader?', 'Can the print memo and live tool tell the same story?'],
    'event-study': ['Is sample size enough to trust catalyst read?', 'Do pre/post returns contradict narrative?'],
    'paper-book': ['Which cap sets final engine size?', 'Is cost-adjusted EV positive after risk, liquidity, and factor constraints?'],
    'risk-lens': ['Is RV rising faster than thesis confidence?', 'Are ATR/gap fields sourced or unavailable?'],
    'source-audit': ['Which missing fields are active blockers?', 'Which gaps are entitlement/deferred, not hallucination targets?']
  }
  return map[module]
}

export function panelLayoutSizes(mode: WorkspacePanelLayoutMode) {
  if (mode === 'memo-heavy') return { left: 14, center: 64, right: 22 }
  if (mode === 'data-heavy') return { left: 20, center: 48, right: 32 }
  return { left: 18, center: 58, right: 24 }
}

function reportMetric(report: StockReport | undefined, label: string) {
  if (!report) return undefined
  return [...report.evidence, report.positioning, report.catalysts]
    .flatMap(section => section.metrics)
    .find(metric => metric.label === label)
}

function setupFromReport(report: StockReport) {
  const setupMetric = reportMetric(report, 'Setup')
  if (setupMetric?.displayValue && setupMetric.displayValue !== 'Unavailable') return setupMetric.displayValue
  const setupMatch = report.summary.match(/setup label is ([^.]+)\./i)
  return setupMatch?.[1]?.trim() ?? null
}
