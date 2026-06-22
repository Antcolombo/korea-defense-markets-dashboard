import type { DbDataStatus, RevisionFlag } from '@/lib/research/types'

export type ProviderRowMeta = {
  asOfDate: Date
  observedAt: Date
  providerTimestamp: Date | null
  ingestedAt: Date
  source: string
  provider: string
  revisionFlag: RevisionFlag
  dataStatus: DbDataStatus
}

export type ProviderFetchResult<T> = {
  rows: T[]
  status: DbDataStatus
  errorMessage?: string
  entitlementMissing?: boolean
}

export function nowMeta(input: {
  asOfDate: Date
  observedAt?: Date
  providerTimestamp?: Date | null
  source: string
  provider: string
  dataStatus?: DbDataStatus
}): ProviderRowMeta {
  return {
    asOfDate: input.asOfDate,
    observedAt: input.observedAt ?? input.asOfDate,
    providerTimestamp: input.providerTimestamp ?? null,
    ingestedAt: new Date(),
    source: input.source,
    provider: input.provider,
    revisionFlag: 'UNKNOWN',
    dataStatus: input.dataStatus ?? 'AVAILABLE'
  }
}

export function providerError<T>(message: string, status: DbDataStatus = 'PROVIDER_ERROR'): ProviderFetchResult<T> {
  return { rows: [], status, errorMessage: message, entitlementMissing: status === 'ENTITLEMENT_MISSING' }
}

export function demoModeAsOfDate() {
  const value = process.env.DEMO_AS_OF_DATE?.trim()
  if (!value) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) ? date : null
}
