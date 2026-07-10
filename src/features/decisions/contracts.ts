import type { DecisionAction, DecisionSourceSnapshot, DecisionStatus, EvidenceDriver, RiskPlan } from '@/types/decision'

export type UpsertInvestmentDecisionInput = Partial<{
  id: string
  slug: string
  ticker: string
  companyName: string
  status: DecisionStatus
  decision: DecisionAction
  marketBelief: string
  variantView: string
  evidence: EvidenceDriver[]
  risk: RiskPlan
  invalidation: string
  timeHorizon: string
  expectedReturn: number | null
  downside: number | null
  sourceSnapshot: DecisionSourceSnapshot | null
  outcomeReturn: number | null
  lesson: string
  isPublic: boolean
  featuredRank: number | null
}>
