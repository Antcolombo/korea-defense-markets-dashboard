import type { MetricValue } from '@/contracts/research'

export function metricText(metric: MetricValue | undefined, options: { suffix?: string; decimals?: number; multiplier?: number } = {}) {
  if (!metric || metric.value === null) return 'N/A'
  const multiplier = options.multiplier ?? 1
  const value = metric.value * multiplier
  const suffix = options.suffix ?? '%'
  const prefix = value > 0 && suffix === '%' ? '+' : ''
  return `${prefix}${value.toFixed(options.decimals ?? 1)}${suffix}`
}

export function metricValue(metric: MetricValue | undefined) {
  return metric?.value ?? -Infinity
}

export function formatSigned(value: number) {
  if (!Number.isFinite(value)) return 'N/A'
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

export function maxBy<T>(rows: T[], value: (row: T) => number | null) {
  return rows.reduce<T | undefined>((best, row) => {
    if (!best) return row
    return (value(row) ?? -Infinity) > (value(best) ?? -Infinity) ? row : best
  }, undefined)
}
