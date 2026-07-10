import type { DbDataStatus } from '../../src/contracts/research'

export type ProviderRunMetadata = {
  ticker: string
  dataset: string
  lifecycle: 'running' | 'succeeded' | 'partial' | 'failed'
  errorCategory: 'entitlement' | 'provider' | 'stale' | 'unavailable' | null
  freshnessDeadline: string
}

export function providerRunMetadata(input: {
  ticker: string
  dataset: string
  asOfDate: Date
  dataStatus?: DbDataStatus
  finished: boolean
  hasError?: boolean
}): ProviderRunMetadata {
  return {
    ticker: input.ticker,
    dataset: input.dataset,
    lifecycle: input.finished ? providerRunLifecycle(input.dataStatus ?? 'UNAVAILABLE') : 'running',
    errorCategory: input.finished && input.hasError ? providerErrorCategory(input.dataStatus ?? 'UNAVAILABLE') : null,
    freshnessDeadline: new Date(input.asOfDate.getTime() + 36 * 60 * 60 * 1000).toISOString()
  }
}

export function providerRunLifecycle(status: DbDataStatus): ProviderRunMetadata['lifecycle'] {
  if (status === 'AVAILABLE') return 'succeeded'
  if (status === 'PARTIAL') return 'partial'
  return 'failed'
}

export function providerErrorCategory(status: DbDataStatus): NonNullable<ProviderRunMetadata['errorCategory']> {
  if (status === 'ENTITLEMENT_MISSING') return 'entitlement'
  if (status === 'PROVIDER_ERROR') return 'provider'
  if (status === 'STALE') return 'stale'
  return 'unavailable'
}

export function shouldPublishProviderResult(status: DbDataStatus, rowsIngested: number) {
  return status === 'AVAILABLE' && Number.isInteger(rowsIngested) && rowsIngested > 0
}
