export type SourceAudit = {
  generatedAt: string
  lastSuccessfulRefreshAt?: string | null
  nextScheduledRefreshAt?: string | null
  freshnessWarnings?: string[]
  koreaUnlockChecklist?: {
    label: string
    status: 'ready' | 'missing'
    detail: string
  }[]
  status: string
  recordsChecked: number
  datasetCounts?: Record<string, number>
  providers?: {
    provider: string
    status: string
    retrievedAt?: string
    records: number
    failures: string[]
    optional?: boolean
    staleAfterHours?: number
    ageHours?: number | null
    freshnessStatus?: 'fresh' | 'stale' | 'unknown'
  }[]
  missingProvenance: string[]
  readinessFailures?: string[]
  notes: string[]
}
