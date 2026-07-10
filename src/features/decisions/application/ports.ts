import type { InvestmentDecisionRecord } from '@/types/decision'

export type DecisionRow = {
  id: string
  slug: string
  ticker: string
  companyName: string
  status: string
  decision: string
  marketBelief: string
  variantView: string
  evidenceJson: unknown
  riskJson: unknown
  invalidation: string
  timeHorizon: string | null
  expectedReturn: number | null
  downside: number | null
  sourceSnapshotJson: unknown | null
  outcomeReturn: number | null
  lesson: string | null
  isPublic: boolean
  featuredRank: number | null
  createdAt: Date | string
  updatedAt: Date | string
}

export interface DecisionRepository {
  isAvailable(): boolean
  list(limit?: number): Promise<DecisionRow[]>
  listPublic(limit?: number): Promise<DecisionRow[]>
  findBySlug(slug: string): Promise<DecisionRow | null>
  create(id: string, record: InvestmentDecisionRecord): Promise<DecisionRow>
  update(slug: string, record: InvestmentDecisionRecord): Promise<DecisionRow>
  delete(slug: string): Promise<void>
  slugExists(slug: string): Promise<boolean>
}
