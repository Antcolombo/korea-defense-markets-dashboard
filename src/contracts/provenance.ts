import type { ResearchDataMode } from '@/contracts/data'

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
  deferredFields: number
}

export type UnavailableField = {
  field: string
  reason: string
  provider?: string
  visibility: 'active' | 'deferred'
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

export type ShellQualityStatus = 'fresh' | 'stale' | 'partial' | 'gaps' | 'no_data'
export type ShellSourceStatus = 'fresh' | 'available' | 'limited' | 'stale' | 'deferred' | 'unavailable'

export type ShellSourceState = {
  key: 'prices' | 'options' | 'short_sale' | 'catalyst' | 'validation'
  label: string
  status: ShellSourceStatus
  detail: string
}

export type ShellMeta = {
  dataMode: ResearchDataMode
  asOf: string
  generatedAt: string
  coveragePercent: number
  qualityStatus: ShellQualityStatus
  qualityLabel: string
  qualityDetail: string
  freshnessAgeHours: number | null
  providerFreshness: ProviderFreshness[]
  providerHealth: ProviderHealth[]
  deferredProviderHealth: ProviderHealth[]
  sourceStates: ShellSourceState[]
  sourceSummary: string
  hasRequiredSnapshots: boolean
  unavailableCount: number
  deferredUnavailableCount: number
  demoAsOfDate: string | null
}

export type ApiResponse<T> = {
  data: T
  dataMode: ResearchDataMode
  provenance: Provenance[]
  coverage: CoverageSummary
  unavailableFields: UnavailableField[]
  deferredUnavailableFields: UnavailableField[]
  generatedAt: string
}
