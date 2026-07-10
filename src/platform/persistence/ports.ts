import type { DecisionRepository } from '@/features/decisions/application/ports'
import type { PitchRepository } from '@/features/pitches/application/ports'
import type { PointInTime } from '@/contracts/research'

export type { DecisionRepository, PitchRepository }

export interface TickerMarketRepository {
  getPrices(tickers: readonly string[], limit?: number): Promise<readonly (PointInTime & { value: number })[]>
}

export interface ResearchSnapshotRepository {
  getLatest<T>(dataset: string, asOfDate?: Date | null): Promise<T | null>
}

export interface CatalystRepository {
  listForTicker(ticker: string, limit?: number): Promise<readonly unknown[]>
}

export interface FundamentalsRepository {
  latestForTickers(tickers: readonly string[]): Promise<ReadonlyMap<string, unknown>>
}

export interface EstimateRepository {
  latestForTickers(tickers: readonly string[]): Promise<ReadonlyMap<string, unknown>>
}

export interface OptionsRepository {
  getBattlefield(ticker: string, currentPrice?: number | null): Promise<unknown>
}

export interface PmRunRepository {
  save(input: unknown): Promise<void>
}

export type ProviderRunAudit = {
  latestAttemptAt: string | null
  lastSuccessfulAt: string | null
  latestStatus: 'running' | 'succeeded' | 'partial' | 'failed' | 'unavailable'
  provider: string | null
  dataset: string | null
  rowsIngested: number
  errorCategory: string | null
}

export interface ProviderRunRepository {
  getAudit(): Promise<ProviderRunAudit>
}
