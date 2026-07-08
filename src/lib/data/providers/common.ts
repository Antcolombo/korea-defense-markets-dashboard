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

export function providerFetchTimeoutMs() {
  const value = Number(process.env.PROVIDER_FETCH_TIMEOUT_MS ?? 8_000)
  return Number.isFinite(value) && value > 0 ? value : 8_000
}

export async function fetchWithProviderTimeout(input: Parameters<typeof fetch>[0], init: RequestInit = {}) {
  const timeoutMs = providerFetchTimeoutMs()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Provider request timed out after ${timeoutMs}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export function demoModeAsOfDate() {
  const value = process.env.DEMO_AS_OF_DATE?.trim()
  if (!value) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) ? date : null
}
