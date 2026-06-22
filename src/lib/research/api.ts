import type { DataAvailability, DbDataStatus, MetricValue, PointInTime } from './types'

export type ApiDataStatus =
  | 'available'
  | 'unavailable'
  | 'partial'
  | 'stale'
  | 'entitlement_missing'
  | 'provider_error'

export type Provenance = {
  provider: string
  dataset: string
  source: string
  asOf: string
  ingestedAt: string
  status: ApiDataStatus
}

export type CoverageSummary = {
  totalFields: number
  availableFields: number
  coveragePercent: number
}

export type UnavailableField = {
  field: string
  reason: string
  provider?: string
}

export type ProviderFreshness = {
  provider: string
  dataset: string
  status: ApiDataStatus
  asOf: string
}

export type ProviderHealth = {
  id: string
  label: string
  status: ApiDataStatus
  requirement: 'required' | 'optional'
  detail: string
}

export type ShellMeta = {
  asOf: string
  generatedAt: string
  coveragePercent: number
  providerFreshness: ProviderFreshness[]
  providerHealth: ProviderHealth[]
  hasRequiredSnapshots: boolean
  unavailableCount: number
  demoAsOfDate: string | null
}

export type ApiResponse<T> = {
  data: T
  provenance: Provenance[]
  coverage: CoverageSummary
  unavailableFields: UnavailableField[]
  generatedAt: string
}

const statusMap: Record<DbDataStatus, ApiDataStatus> = {
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
  PARTIAL: 'partial',
  STALE: 'stale',
  ENTITLEMENT_MISSING: 'entitlement_missing',
  PROVIDER_ERROR: 'provider_error'
}

export function toApiStatus(status: DbDataStatus | DataAvailability | string | null | undefined): ApiDataStatus {
  if (!status) return 'unavailable'
  const normalized = status.toString().trim().toUpperCase().replace(/ /g, '_') as DbDataStatus
  return statusMap[normalized] ?? 'unavailable'
}

export function createApiResponse<T>(data: T): ApiResponse<T> {
  const generatedAt = new Date().toISOString()
  const metrics = collectMetricValues(data)
  const points = collectPointInTime(data)
  const totalFields = metrics.length > 0 ? metrics.length : points.length
  const availableFields = metrics.length > 0
    ? metrics.filter(metric => metric.availability === 'Available').length
    : points.filter(point => point.dataStatus === 'AVAILABLE').length
  const coveragePercent = totalFields === 0 ? 0 : Math.round((availableFields / totalFields) * 100)
  return {
    data,
    provenance: buildProvenance(points),
    coverage: { totalFields, availableFields, coveragePercent },
    unavailableFields: buildUnavailableFields(data),
    generatedAt
  }
}

export function createShellMeta(response: Pick<ApiResponse<unknown>, 'provenance' | 'coverage' | 'unavailableFields' | 'generatedAt'>): ShellMeta {
  const sorted = response.provenance
    .filter(item => item.asOf)
    .sort((a, b) => Date.parse(b.asOf) - Date.parse(a.asOf))
  const providerHealth = buildProviderHealth(response)
  return {
    asOf: sorted[0]?.asOf ?? response.generatedAt,
    generatedAt: response.generatedAt,
    coveragePercent: response.coverage.coveragePercent,
    providerFreshness: summarizeProviderFreshness(response.provenance),
    providerHealth,
    hasRequiredSnapshots: hasRequiredSnapshots(providerHealth, response.coverage.coveragePercent),
    unavailableCount: response.unavailableFields.length,
    demoAsOfDate: process.env.DEMO_AS_OF_DATE ?? process.env.NEXT_PUBLIC_DEMO_AS_OF_DATE ?? null
  }
}

export function hasRequiredSnapshots(providerHealth: ProviderHealth[], coveragePercent: number) {
  if (coveragePercent <= 0) return false
  const required = providerHealth.filter(item => item.requirement === 'required')
  return required.length > 0 && required.every(item => item.status === 'available' || item.status === 'partial')
}

export function summarizeProviderFreshness(provenance: Provenance[]): ProviderFreshness[] {
  const preferred = ['Polygon', 'Polygon OHLCV', 'Polygon Options', 'FINRA', 'FRED']
  const map = new Map<string, ProviderFreshness>()
  for (const item of provenance) {
    const provider = normalizeProviderLabel(item)
    const key = provider
    const existing = map.get(key)
    if (!existing || statusRank(item.status) > statusRank(existing.status) || Date.parse(item.asOf) > Date.parse(existing.asOf)) {
      map.set(key, { provider, dataset: item.dataset, status: item.status, asOf: item.asOf })
    }
  }
  const values = [...map.values()]
  const ordered = [
    ...preferred.flatMap(label => values.filter(item => item.provider === label)),
    ...values.filter(item => !preferred.includes(item.provider))
  ]
  return ordered.slice(0, 5)
}

function normalizeProviderLabel(item: Provenance) {
  const text = `${item.provider} ${item.dataset} ${item.source}`.toLowerCase()
  if (text.includes('option')) return 'Polygon Options'
  if (text.includes('ohlcv') || text.includes('aggregate') || text.includes('price') || text.includes('signal snapshot')) return 'Polygon OHLCV'
  if (text.includes('finra') || text.includes('short')) return 'FINRA'
  if (text.includes('fred')) return 'FRED'
  if (item.provider && item.provider !== 'not configured') return item.provider
  return item.dataset || item.source || 'Provider'
}

function statusRank(status: ApiDataStatus) {
  const ranks: Record<ApiDataStatus, number> = {
    provider_error: 6,
    entitlement_missing: 5,
    stale: 4,
    partial: 3,
    unavailable: 2,
    available: 1
  }
  return ranks[status]
}

function buildProviderHealth(response: Pick<ApiResponse<unknown>, 'provenance' | 'coverage'>): ProviderHealth[] {
  const provenance = response.provenance
  const coverage = response.coverage.coveragePercent
  const definitions = [
    {
      id: 'postgres',
      label: 'Postgres',
      requirement: 'required' as const,
      matches: ['postgres', 'database'],
      detail: 'Provider rows and point-in-time snapshots'
    },
    {
      id: 'polygon-ohlcv',
      label: 'Polygon OHLCV',
      requirement: 'required' as const,
      matches: ['polygon ohlcv', 'signal snapshot', 'price', 'aggregate', 'ohlcv'],
      detail: 'Daily OHLCV, returns, relative strength'
    },
    {
      id: 'polygon-options',
      label: 'Polygon Options',
      requirement: 'optional' as const,
      matches: ['polygon options', 'option'],
      detail: 'Options volume, open interest, IV proxies'
    },
    {
      id: 'finra-short-sale',
      label: 'FINRA Short Sale Volume',
      requirement: 'optional' as const,
      matches: ['finra', 'short-sale', 'short sale', 'short volume'],
      detail: 'Daily short-sale volume flow proxy'
    },
    {
      id: 'finra-short-interest',
      label: 'FINRA Short Interest',
      requirement: 'optional' as const,
      matches: ['short interest'],
      detail: 'Settlement-date short interest proxy'
    },
    {
      id: 'fred-sec',
      label: 'FRED / SEC',
      requirement: 'optional' as const,
      matches: ['fred', 'sec', 'macro', 'filing'],
      detail: 'Macro and catalyst context'
    }
  ]

  return definitions.map(definition => {
    const matches = provenance.filter(item => {
      const text = `${item.provider} ${item.dataset} ${item.source}`.toLowerCase()
      return definition.matches.some(match => text.includes(match))
    })
    const status = providerStatus(matches, definition.requirement, coverage)
    return { id: definition.id, label: definition.label, requirement: definition.requirement, detail: definition.detail, status }
  })
}

function providerStatus(matches: Provenance[], requirement: 'required' | 'optional', coverage: number): ApiDataStatus {
  if (matches.length === 0) return coverage > 0 && requirement === 'required' ? 'partial' : 'unavailable'
  if (matches.some(item => item.status === 'provider_error')) return 'provider_error'
  if (matches.some(item => item.status === 'entitlement_missing')) return 'entitlement_missing'
  if (matches.some(item => item.status === 'stale')) return 'stale'
  if (matches.some(item => item.status === 'partial')) return 'partial'
  if (matches.some(item => item.status === 'available')) return 'available'
  return 'unavailable'
}

function buildProvenance(points: PointInTime[]) {
  const seen = new Set<string>()
  const provenance: Provenance[] = []
  for (const point of points) {
    const item = {
      provider: point.provider || 'not configured',
      dataset: point.source || 'provider row',
      source: point.source || point.provider || 'not configured',
      asOf: point.asOfDate || point.observedAt || point.providerTimestamp || '',
      ingestedAt: point.ingestedAt || '',
      status: toApiStatus(point.dataStatus)
    }
    const key = `${item.provider}|${item.dataset}|${item.asOf}|${item.ingestedAt}|${item.status}`
    if (!seen.has(key)) {
      seen.add(key)
      provenance.push(item)
    }
  }
  return provenance
}

function buildUnavailableFields(value: unknown) {
  const fields: UnavailableField[] = []
  walk(value, [], (node, path, parent) => {
    if (isMetricValue(node) && node.availability !== 'Available') {
      fields.push(unavailableField(formatPath(path), node.reason || node.availability, pointProvider(parent)))
    }
    if (path[path.length - 1] === 'excludedUnavailableInputs' && Array.isArray(node)) {
      for (const item of node) {
        if (typeof item === 'string') fields.push(unavailableField(item, 'Excluded unavailable input', pointProvider(parent)))
      }
    }
  })
  const seen = new Set<string>()
  return fields.filter(item => {
    const key = `${item.field}|${item.reason}|${item.provider ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function unavailableField(field: string, reason: string, provider?: string): UnavailableField {
  return provider ? { field, reason, provider } : { field, reason }
}

function collectMetricValues(value: unknown) {
  const metrics: MetricValue[] = []
  walk(value, [], node => {
    if (isMetricValue(node)) metrics.push(node)
  })
  return metrics
}

function collectPointInTime(value: unknown) {
  const points: PointInTime[] = []
  walk(value, [], node => {
    if (isPointInTime(node)) points.push(node)
  })
  return points
}

function walk(value: unknown, path: string[], visit: (node: unknown, path: string[], parent: unknown) => void, parent?: unknown, seen = new WeakSet<object>()) {
  visit(value, path, parent)
  if (!value || typeof value !== 'object') return
  if (seen.has(value)) return
  seen.add(value)
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, [...path, String(index)], visit, value, seen))
    return
  }
  for (const [key, child] of Object.entries(value)) {
    walk(child, [...path, key], visit, value, seen)
  }
}

function isMetricValue(value: unknown): value is MetricValue {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return 'value' in record && 'availability' in record && 'dataStatus' in record
}

function isPointInTime(value: unknown): value is PointInTime {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return typeof record.source === 'string' && typeof record.provider === 'string' && typeof record.dataStatus === 'string' && 'asOfDate' in record
}

function pointProvider(value: unknown) {
  if (!value || typeof value !== 'object') return undefined
  const provider = (value as Record<string, unknown>).provider
  return typeof provider === 'string' ? provider : undefined
}

function formatPath(path: string[]) {
  const named = path.filter(part => Number.isNaN(Number(part)))
  return named.slice(-2).join('.') || 'field'
}
