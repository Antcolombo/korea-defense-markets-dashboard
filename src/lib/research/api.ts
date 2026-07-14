import type { DataAvailability, DbDataStatus, MetricValue, PointInTime } from './types'
import type {
  ApiDataStatus,
  ApiResponse,
  ProviderFreshness,
  ProviderHealth,
  Provenance,
  ShellMeta,
  ShellQualityStatus,
  ShellSourceState,
  ShellSourceStatus,
  UnavailableField
} from '@/contracts/provenance'
import { resolveResearchDataMode, type ResearchDataMode } from '@/platform/data/data-mode'
import {
  matchesProviderHealthDefinition,
  providerHealthDefinitionHasField,
  providerHealthDefinitions,
  unavailableFieldVisibility
} from './datasetRegistry'

export type {
  ApiDataStatus,
  ApiResponse,
  CoverageSummary,
  ProviderFreshness,
  ProviderHealth,
  Provenance,
  ShellMeta,
  ShellQualityStatus,
  ShellSourceState,
  ShellSourceStatus,
  UnavailableField
} from '@/contracts/provenance'

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
  const dataMode = resolveResearchDataMode().mode
  const metrics = collectMetricEntries(data)
  const visibleMetrics = metrics.filter(isActiveMetric)
  const unavailableFields = buildUnavailableFields(data)
  const points = collectPointInTime(data)
  const hasVisibleMetrics = visibleMetrics.length > 0
  const hasActiveGaps = unavailableFields.active.length > 0
  const totalFields = metrics.length > 0 ? visibleMetrics.length : hasActiveGaps ? points.length : 0
  const availableFields = metrics.length > 0
    ? visibleMetrics.filter(entry => entry.metric.value !== null).length
    : totalFields > 0 ? points.filter(point => point.dataStatus === 'AVAILABLE').length : 0
  const coveragePercent = totalFields === 0 ? 0 : Math.round((availableFields / totalFields) * 100)
  return {
    data,
    dataMode,
    provenance: buildProvenance(points),
    coverage: {
      totalFields,
      availableFields,
      coveragePercent: !hasVisibleMetrics && !hasActiveGaps ? 100 : coveragePercent,
      deferredFields: unavailableFields.deferred.length
    },
    unavailableFields: unavailableFields.active,
    deferredUnavailableFields: unavailableFields.deferred,
    generatedAt
  }
}

export function createShellMeta(response: Pick<ApiResponse<unknown>, 'dataMode' | 'provenance' | 'coverage' | 'unavailableFields' | 'deferredUnavailableFields' | 'generatedAt'>): ShellMeta {
  const sorted = response.provenance
    .filter(item => item.asOf)
    .sort((a, b) => Date.parse(b.asOf) - Date.parse(a.asOf))
  const providerHealth = buildProviderHealth(response, 'active')
  const freshnessAgeHours = latestFreshnessAgeHours(response.provenance)
  const demoAsOfDate = process.env.DEMO_AS_OF_DATE ?? process.env.NEXT_PUBLIC_DEMO_AS_OF_DATE ?? null
  const hasRequired = hasRequiredSnapshots(providerHealth, response.coverage.coveragePercent)
  const sourceStates = buildSourceStates(response, freshnessAgeHours, response.dataMode === 'generated')
  const quality = summarizeShellQuality({
    dataMode: response.dataMode,
    coveragePercent: response.coverage.coveragePercent,
    unavailableCount: response.unavailableFields.length,
    deferredUnavailableCount: response.deferredUnavailableFields.length,
    freshnessAgeHours,
    hasRequiredSnapshots: hasRequired,
    demoAsOfDate
  })
  return {
    dataMode: response.dataMode,
    asOf: sorted[0]?.asOf ?? response.generatedAt,
    generatedAt: response.generatedAt,
    coveragePercent: response.coverage.coveragePercent,
    qualityStatus: quality.status,
    qualityLabel: quality.label,
    qualityDetail: quality.detail,
    freshnessAgeHours,
    providerFreshness: summarizeProviderFreshness(response.provenance),
    providerHealth,
    deferredProviderHealth: buildProviderHealth(response, 'deferred'),
    sourceStates,
    sourceSummary: summarizeSourceStates(sourceStates),
    hasRequiredSnapshots: hasRequired,
    unavailableCount: response.unavailableFields.length,
    deferredUnavailableCount: response.deferredUnavailableFields.length,
    demoAsOfDate
  }
}

function latestFreshnessAgeHours(provenance: Provenance[]) {
  let latest = 0
  for (const item of provenance) {
    for (const value of [item.ingestedAt, item.asOf]) {
      const time = Date.parse(value)
      if (Number.isFinite(time) && time > latest) latest = time
    }
  }
  if (!latest) return null
  return Math.max(0, Math.round(((Date.now() - latest) / 36e5) * 10) / 10)
}

function summarizeShellQuality(input: {
  dataMode: ResearchDataMode
  coveragePercent: number
  unavailableCount: number
  deferredUnavailableCount: number
  freshnessAgeHours: number | null
  hasRequiredSnapshots: boolean
  demoAsOfDate: string | null
}): { status: ShellQualityStatus; label: string; detail: string } {
  const coverageDetail = `${input.coveragePercent}% active / ${input.deferredUnavailableCount} deferred`
  if (input.coveragePercent <= 0) return { status: 'no_data', label: 'No Data', detail: coverageDetail }
  if (input.dataMode === 'generated') {
    return {
      status: input.unavailableCount > 0 || input.coveragePercent < 100 ? 'partial' : 'fresh',
      label: 'Frozen',
      detail: `${input.coveragePercent}% sourced snapshot / ${input.deferredUnavailableCount} deferred`
    }
  }
  if (!input.demoAsOfDate && input.freshnessAgeHours !== null && input.freshnessAgeHours > 36) {
    return { status: 'stale', label: 'Stale', detail: `${input.freshnessAgeHours.toFixed(1)}h old / ${input.deferredUnavailableCount} deferred` }
  }
  if (input.unavailableCount > 0) {
    return { status: 'gaps', label: 'Gaps', detail: `${input.unavailableCount} active / ${input.deferredUnavailableCount} deferred` }
  }
  if (input.coveragePercent < 100 || !input.hasRequiredSnapshots) {
    return { status: 'partial', label: 'Partial', detail: coverageDetail }
  }
  return { status: 'fresh', label: 'Fresh', detail: coverageDetail }
}

function buildSourceStates(
  response: Pick<ApiResponse<unknown>, 'provenance' | 'unavailableFields' | 'deferredUnavailableFields'>,
  freshnessAgeHours: number | null,
  frozen = false
): ShellSourceState[] {
  const active = response.unavailableFields.map(fieldText)
  const deferred = response.deferredUnavailableFields.map(fieldText)
  const provenance = response.provenance.map(item => `${item.provider} ${item.dataset} ${item.source} ${item.status}`.toLowerCase())
  const hasActive = (patterns: RegExp[]) => active.some(text => patterns.some(pattern => pattern.test(text)))
  const hasDeferred = (patterns: RegExp[]) => deferred.some(text => patterns.some(pattern => pattern.test(text)))
  const hasProvider = (patterns: RegExp[]) => provenance.some(text => patterns.some(pattern => pattern.test(text)))

  const pricePatterns = [/price/, /ohlcv/, /close/, /relative-strength/, /\brs\b/, /signal snapshot/]
  const optionPatterns = [/option/, /put\/call/, /open interest/, /implied vol/, /\biv\b/, /greek/, /gamma/]
  const shortPatterns = [/finra/, /short-sale/, /short sale/, /short-volume/, /short volume/, /short-interest/, /short interest/]
  const catalystPatterns = [/catalyst/, /materiality/, /news/]
  const validationPatterns = [/validation/, /historical/, /forward-return/, /forward return/, /sample/]

  const prices: ShellSourceState = frozen && !hasActive(pricePatterns)
    ? { key: 'prices', label: 'Prices', status: 'available', detail: 'Frozen sourced close and RS' }
    : freshnessAgeHours !== null && freshnessAgeHours > 36
    ? { key: 'prices', label: 'Prices', status: 'stale', detail: `${freshnessAgeHours.toFixed(1)}h old` }
    : hasActive(pricePatterns)
      ? { key: 'prices', label: 'Prices', status: 'unavailable', detail: 'Price rows missing' }
      : { key: 'prices', label: 'Prices', status: hasProvider(pricePatterns) ? 'fresh' : 'available', detail: 'Close and RS ready' }

  const options = sourceState({
    key: 'options',
    label: 'Options',
    active: hasActive(optionPatterns),
    deferred: hasDeferred(optionPatterns),
    provider: hasProvider(optionPatterns),
    readyDetail: 'Sampled proxy ready',
    limitedDetail: 'Proxy ready; live OI/IV deferred',
    missingDetail: 'Options unavailable'
  })

  const shortSale = sourceState({
    key: 'short_sale',
    label: 'Short-sale',
    active: hasActive(shortPatterns),
    deferred: hasDeferred(shortPatterns),
    provider: hasProvider(shortPatterns),
    readyDetail: 'FINRA proxy ready',
    limitedDetail: 'FINRA proxy limited',
    missingDetail: 'Short-sale unavailable'
  })

  const catalyst = sourceState({
    key: 'catalyst',
    label: 'Catalyst',
    active: hasActive(catalystPatterns),
    deferred: hasDeferred(catalystPatterns),
    provider: hasProvider(catalystPatterns),
    readyDetail: 'Catalyst rows ready',
    limitedDetail: 'Some catalyst inputs deferred',
    missingDetail: 'Catalyst deferred'
  })

  const validation: ShellSourceState = hasActive(validationPatterns)
    ? { key: 'validation', label: 'Validation', status: 'unavailable', detail: 'Historical sample missing' }
    : hasProvider(validationPatterns) && !hasDeferred(validationPatterns)
      ? { key: 'validation', label: 'Validation', status: 'available', detail: 'Historical sample ready' }
      : { key: 'validation', label: 'Validation', status: 'deferred', detail: 'Historical lab deferred' }

  return [prices, options, shortSale, catalyst, validation]
}

function sourceState({
  key,
  label,
  active,
  deferred,
  provider,
  readyDetail,
  limitedDetail,
  missingDetail
}: {
  key: ShellSourceState['key']
  label: string
  active: boolean
  deferred: boolean
  provider: boolean
  readyDetail: string
  limitedDetail: string
  missingDetail: string
}): ShellSourceState {
  if (active) return { key, label, status: 'unavailable', detail: missingDetail }
  if (deferred && provider) return { key, label, status: 'limited', detail: limitedDetail }
  if (deferred) return { key, label, status: 'deferred', detail: missingDetail }
  if (provider) return { key, label, status: 'available', detail: readyDetail }
  return { key, label, status: 'unavailable', detail: missingDetail }
}

function summarizeSourceStates(states: ShellSourceState[]) {
  return states.map(state => `${state.label} ${sourceStatusWord(state.status)}.`).join(' ')
}

function sourceStatusWord(status: ShellSourceStatus) {
  if (status === 'available') return 'ready'
  return status
}

function fieldText(field: UnavailableField) {
  return `${field.field} ${field.reason} ${field.provider ?? ''}`.toLowerCase()
}

export function hasRequiredSnapshots(providerHealth: ProviderHealth[], coveragePercent: number) {
  if (coveragePercent <= 0) return false
  const required = providerHealth.filter(item => item.requirement === 'required')
  return required.length > 0 && required.every(item => item.status === 'available' || item.status === 'partial')
}

export function summarizeProviderFreshness(provenance: Provenance[]): ProviderFreshness[] {
  const preferred = ['Polygon', 'Polygon OHLCV', 'Massive Options', 'FINRA', 'FRED']
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
  if (text.includes('option')) return 'Massive Options'
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

function buildProviderHealth(
  response: Pick<ApiResponse<unknown>, 'provenance' | 'coverage' | 'unavailableFields' | 'deferredUnavailableFields'>,
  visibility: 'active' | 'deferred'
): ProviderHealth[] {
  const provenance = response.provenance
  const coverage = response.coverage.coveragePercent
  const scopedFields = visibility === 'active' ? response.unavailableFields : response.deferredUnavailableFields
  const hasActiveGaps = response.unavailableFields.length > 0
  if (visibility === 'active' && response.coverage.totalFields === 0 && response.unavailableFields.length === 0) return []

  return providerHealthDefinitions(visibility).map(definition => {
    const matches = provenance.filter(item => matchesProviderHealthDefinition(item, definition))
    const fieldRelevant = scopedFields.some(field => providerHealthDefinitionHasField(definition, field))
    const status = providerStatus(matches, definition.requirement, coverage, visibility, hasActiveGaps, fieldRelevant, definition.id)
    return { id: definition.id, label: definition.label, requirement: definition.requirement, detail: definition.detail, status }
  }).filter(item => {
    if (visibility === 'deferred') {
      return item.status !== 'unavailable' || response.deferredUnavailableFields.some(field => providerHealthDefinitionHasField({ ...item, visibility, fields: [] }, field))
    }
    if (item.status === 'unavailable' && !hasActiveGaps) return false
    return item.requirement === 'required' || item.status === 'available' || item.status === 'partial'
  })
}

function providerStatus(
  matches: Provenance[],
  requirement: 'required' | 'optional',
  coverage: number,
  visibility: 'active' | 'deferred',
  hasActiveGaps: boolean,
  fieldRelevant: boolean,
  definitionId: string
): ApiDataStatus {
  if (visibility === 'active' && coverage > 0 && !hasActiveGaps && (matches.length > 0 || requirement === 'required' || definitionId === 'postgres')) return 'available'
  if (visibility === 'deferred' && fieldRelevant && matches.length === 0) return 'unavailable'
  if (matches.length === 0) return 'unavailable'
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
    if (isMetricValue(node) && node.value === null) {
      fields.push(unavailableField(metricFieldName(node, path), node.reason || node.availability, pointProvider(parent)))
    }
    if (path[path.length - 1] === 'excludedUnavailableInputs' && Array.isArray(node)) {
      for (const item of node) {
        if (typeof item === 'string') fields.push(unavailableField(item, 'Excluded unavailable input', pointProvider(parent)))
      }
    }
  })
  const seen = new Set<string>()
  const unique = fields.filter(item => {
    const key = `${item.field}|${item.reason}|${item.provider ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return {
    active: unique.filter(item => item.visibility === 'active'),
    deferred: unique.filter(item => item.visibility === 'deferred')
  }
}

function unavailableField(field: string, reason: string, provider?: string): UnavailableField {
  const visibility = unavailableFieldVisibility({ field, reason, provider })
  return provider ? { field, reason, provider, visibility } : { field, reason, visibility }
}

type MetricEntry = {
  metric: MetricValue
  field: string
  provider?: string
}

function collectMetricEntries(value: unknown) {
  const metrics: MetricEntry[] = []
  walk(value, [], (node, path, parent) => {
    if (isMetricValue(node)) {
      metrics.push({
        metric: node,
        field: metricFieldName(node, path),
        provider: pointProvider(parent)
      })
    }
  })
  return metrics
}

function isActiveMetric(entry: MetricEntry) {
  if (entry.metric.value !== null) return true
  return unavailableFieldVisibility({ field: entry.field, reason: entry.metric.reason ?? entry.metric.availability, provider: entry.provider }) === 'active'
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

function metricFieldName(value: MetricValue, path: string[]) {
  const label = (value as MetricValue & { label?: unknown }).label
  return typeof label === 'string' && label.trim() ? label : formatPath(path)
}
