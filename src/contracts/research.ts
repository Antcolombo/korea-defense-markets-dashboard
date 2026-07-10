export type DataAvailability =
  | 'Available'
  | 'Unavailable'
  | 'Stale'
  | 'Partial'
  | 'Entitlement Missing'
  | 'Provider Error'

export type DbDataStatus =
  | 'AVAILABLE'
  | 'UNAVAILABLE'
  | 'STALE'
  | 'PARTIAL'
  | 'ENTITLEMENT_MISSING'
  | 'PROVIDER_ERROR'

export type RevisionFlag = 'ORIGINAL' | 'REVISED' | 'CORRECTED' | 'RESTATED' | 'UNKNOWN'

export type PointInTime = {
  asOfDate: string | null
  observedAt: string | null
  providerTimestamp: string | null
  ingestedAt: string | null
  source: string
  provider: string
  revisionFlag: RevisionFlag
  dataStatus: DbDataStatus
  availability: DataAvailability
}

export type MetricValue = {
  value: number | null
  availability: DataAvailability
  dataStatus: DbDataStatus
  reason?: string
}
