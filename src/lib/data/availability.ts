import type { DataAvailability, DbDataStatus, MetricValue, PointInTime, RevisionFlag } from '@/lib/research/types'

const statusLabels: Record<DbDataStatus, DataAvailability> = {
  AVAILABLE: 'Available',
  UNAVAILABLE: 'Unavailable',
  STALE: 'Stale',
  PARTIAL: 'Partial',
  ENTITLEMENT_MISSING: 'Entitlement Missing',
  PROVIDER_ERROR: 'Provider Error'
}

export function availabilityFromStatus(status: DbDataStatus | string | null | undefined): DataAvailability {
  if (!status) return 'Unavailable'
  return statusLabels[status as DbDataStatus] ?? 'Unavailable'
}

export function metric(value: number | bigint | null | undefined, dataStatus: DbDataStatus = 'AVAILABLE', reason?: string): MetricValue {
  if (value === null || value === undefined) {
    return { value: null, dataStatus: dataStatus === 'AVAILABLE' ? 'UNAVAILABLE' : dataStatus, availability: availabilityFromStatus(dataStatus === 'AVAILABLE' ? 'UNAVAILABLE' : dataStatus), reason }
  }
  return { value: typeof value === 'bigint' ? Number(value) : value, dataStatus, availability: availabilityFromStatus(dataStatus), reason }
}

export function pointInTime(input: {
  asOfDate?: Date | string | null
  observedAt?: Date | string | null
  providerTimestamp?: Date | string | null
  ingestedAt?: Date | string | null
  source?: string | null
  provider?: string | null
  revisionFlag?: RevisionFlag | string | null
  dataStatus?: DbDataStatus | string | null
}): PointInTime {
  const dataStatus = (input.dataStatus ?? 'UNAVAILABLE') as DbDataStatus
  return {
    asOfDate: iso(input.asOfDate),
    observedAt: iso(input.observedAt),
    providerTimestamp: iso(input.providerTimestamp),
    ingestedAt: iso(input.ingestedAt),
    source: input.source ?? 'not configured',
    provider: input.provider ?? 'not configured',
    revisionFlag: (input.revisionFlag ?? 'UNKNOWN') as RevisionFlag,
    dataStatus,
    availability: availabilityFromStatus(dataStatus)
  }
}

export function combineStatuses(statuses: DbDataStatus[]): DbDataStatus {
  if (statuses.includes('PROVIDER_ERROR')) return 'PROVIDER_ERROR'
  if (statuses.includes('ENTITLEMENT_MISSING')) return 'ENTITLEMENT_MISSING'
  if (statuses.includes('STALE')) return 'STALE'
  if (statuses.includes('PARTIAL')) return 'PARTIAL'
  if (statuses.includes('UNAVAILABLE')) return statuses.every(status => status === 'UNAVAILABLE') ? 'UNAVAILABLE' : 'PARTIAL'
  return 'AVAILABLE'
}

export function sourceCoverage(metrics: MetricValue[]) {
  if (metrics.length === 0) return 0
  return Math.round((metrics.filter(item => item.availability === 'Available').length / metrics.length) * 100)
}

function iso(value: Date | string | null | undefined) {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : value
}
