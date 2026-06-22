import { metric, pointInTime } from '@/lib/data/availability'
import type { CatalystReportRow, DbDataStatus, MetricValue, PointInTime, ReportMetric, ReportSection, ReportSource } from '@/lib/research/types'

export type ReportPoint = Pick<PointInTime, 'asOfDate' | 'observedAt' | 'providerTimestamp' | 'ingestedAt' | 'source' | 'provider' | 'revisionFlag' | 'dataStatus' | 'availability'>

export function reportMetric(point: ReportPoint, value: MetricValue, label: string, unit: ReportMetric['unit']): ReportMetric {
  return {
    ...value,
    label,
    unit,
    displayValue: formatReportMetric(value, unit),
    provider: point.provider,
    source: point.source,
    asOfDate: point.asOfDate,
    ingestedAt: point.ingestedAt
  }
}

export function reportSource(point: ReportPoint, label: string, detail?: string, url?: string | null): ReportSource {
  return {
    ...point,
    label,
    detail,
    url: url ?? null
  }
}

export function sectionPoint(input: {
  provider?: string | null
  source?: string | null
  asOfDate?: string | Date | null
  observedAt?: string | Date | null
  providerTimestamp?: string | Date | null
  ingestedAt?: string | Date | null
  dataStatus?: DbDataStatus
}): PointInTime {
  return pointInTime({
    provider: input.provider ?? 'not configured',
    source: input.source ?? 'report engine',
    asOfDate: input.asOfDate ?? null,
    observedAt: input.observedAt ?? input.asOfDate ?? null,
    providerTimestamp: input.providerTimestamp ?? null,
    ingestedAt: input.ingestedAt ?? null,
    dataStatus: input.dataStatus ?? 'UNAVAILABLE'
  })
}

export function unavailableSection(title: string, summary: string, reason: string, asOfDate: string, dataStatus: DbDataStatus = 'UNAVAILABLE'): ReportSection {
  const point = sectionPoint({
    provider: 'not configured',
    source: 'report engine unavailable shell',
    asOfDate,
    dataStatus
  })
  return {
    ...point,
    title,
    summary,
    bullets: [reason],
    metrics: [],
    sources: [reportSource(point, title, reason)],
    excludedUnavailableInputs: [reason]
  }
}

export function catalystSource(row: CatalystReportRow): ReportSource {
  return reportSource(row, row.sourceName ?? row.provider, row.title, row.url)
}

export function unavailableMetric(label: string, unit: ReportMetric['unit'], point: ReportPoint, reason: string) {
  return reportMetric(point, metric(null, point.dataStatus, reason), label, unit)
}

export function formatReportMetric(metricValue: MetricValue, unit: ReportMetric['unit']) {
  if (metricValue.value === null) return 'Unavailable'
  if (unit === '%') return `${metricValue.value > 0 ? '+' : ''}${metricValue.value.toFixed(1)}%`
  if (unit === 'x') return `${metricValue.value.toFixed(2)}x`
  if (unit === 'score') return metricValue.value.toFixed(1)
  if (unit === 'ratio') return metricValue.value.toFixed(2)
  if (unit === 'shares') return compactNumber(metricValue.value)
  return metricValue.value.toFixed(0)
}

export function latestReportDate(points: Pick<PointInTime, 'asOfDate' | 'observedAt' | 'providerTimestamp'>[], fallback: string) {
  const dates = points
    .flatMap(point => [point.asOfDate, point.observedAt, point.providerTimestamp])
    .filter((value): value is string => Boolean(value))
    .map(value => new Date(value))
    .filter(date => Number.isFinite(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())
  return dates[0]?.toISOString().slice(0, 10) ?? fallback
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}
