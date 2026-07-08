export type DecisionStatus = 'watch' | 'accepted' | 'rejected' | 'closed'
export type DecisionAction = 'long' | 'short' | 'pass' | 'watch'
export type SourceStatus = 'sourced' | 'partial' | 'stale' | 'missing'
export type VariantStrength = 'weak' | 'medium' | 'strong'
export type EvidenceQuality = 'sourced' | 'partial' | 'stale'
export type RiskClarity = 'clear' | 'missing'

export type EvidenceDriver = {
  driver: string
  claim: string
  sourcedEvidence: string
  sourceStatus: SourceStatus
  whyItMatters: string
}

export type RiskPlan = {
  thesis: string
  decidedAt: string
  entry: string
  entryPrice: number | null
  targetPrice: number | null
  sizing: 'small' | 'medium' | 'large'
  positionSizePct: number | null
  stop: string
  stopPrice: number | null
  upside: string
  downside: string
  timeHorizon: string
  catalystDate: string
  confidence: number | null
  whatWouldChangeMind: string
}

export type PmRead = {
  variantStrength: VariantStrength
  evidenceQuality: EvidenceQuality
  riskClarity: RiskClarity
  whatWouldChangeMind: string
  nextCatalystDate: string
}

export type DecisionSourceSnapshot = {
  summary: string
  reportAsOf?: string
  sourceStates?: { label: string; status: string; detail: string }[]
  reportUrl?: string
}

export type InvestmentDecisionRecord = {
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
  pmRead: PmRead
  readiness: {
    canAccept: boolean
    canClose: boolean
    missingForAccept: string[]
    missingForClose: string[]
  }
  createdAt: string
  updatedAt: string
}

export type InvestmentDecisionSummary = Pick<
  InvestmentDecisionRecord,
  | 'id'
  | 'slug'
  | 'ticker'
  | 'companyName'
  | 'status'
  | 'decision'
  | 'variantView'
  | 'expectedReturn'
  | 'downside'
  | 'outcomeReturn'
  | 'lesson'
  | 'isPublic'
  | 'pmRead'
  | 'createdAt'
  | 'updatedAt'
>
