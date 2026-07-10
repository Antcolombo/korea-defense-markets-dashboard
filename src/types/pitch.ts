import type { PointInTime } from '@/contracts/research'

export type PitchRecommendation =
  | 'long'
  | 'short'
  | 'watchlist'
  | 'no-trade'

export type StockPitchStatus =
  | 'draft'
  | 'review'
  | 'published'
  | 'archived'

export type TradeExpression =
  | 'common-stock'
  | 'calls'
  | 'puts'
  | 'call-spread'
  | 'put-spread'
  | 'calendar'
  | 'pair-trade'
  | 'no-trade'

export type CatalystType =
  | 'earnings'
  | 'macro'
  | 'product'
  | 'regulatory'
  | 'sector'
  | 'technical'
  | 'positioning'
  | 'other'

export type PitchTabId =
  | 'setup'
  | 'variant-view'
  | 'positioning'
  | 'catalysts'
  | 'model'
  | 'valuation'
  | 'trade-structure'
  | 'red-team'
  | 'post-mortem'

export type PitchSetup = {
  ticker: string
  companyName: string
  date: string
  analyst: string
  recommendation: PitchRecommendation
  oneLineThesis: string
  currentPrice: number
  marketCap: number
  sector: string
  industry?: string
  primaryCatalyst: string
  timeHorizon: string
  expectedReturn?: number
  targetPrice?: number
  downsidePrice?: number
}

export type VariantView = {
  marketBelieves: string
  myView: string
  whyNow: string
  debate: string
  mispricing: string
}

export type PositioningSnapshot = {
  callVolume?: number
  putVolume?: number
  callPutRatio?: number
  impliedVolatility?: number
  ivRank?: number
  skew?: string
  keyCallWall?: number
  keyPutWall?: number
  gammaExposureSummary?: string
  openInterestSummary?: string
  shortInterestPercentFloat?: number
  daysToCover?: number
  borrowCost?: number
  relativeStrengthSummary: string
  positioningConclusion: string
}

export type Catalyst = {
  id: string
  type: CatalystType
  date: string
  title: string
  expectedImpact: string
  importance: 'low' | 'medium' | 'high'
}

export type PitchEvidenceDriver = {
  driver: string
  claim: string
  sourceStatus: PitchSourceQuality
  evidence: string
  sourceUrl?: string | null
  whyItMatters: string
}

export type PitchSourceEvidence = PointInTime & {
  label: string
  detail: string
  url?: string | null
  sourceStatus: PitchSourceQuality
}

export type PitchReadiness = {
  canPromote: boolean
  missing: string[]
  sourceScore: number
}

export type ModelLineItem = {
  label: string
  current: number | string
  baseCase: number | string
  bullCase: number | string
  bearCase: number | string
}

export type PitchModel = {
  revenueDrivers: string[]
  keyKpis: ModelLineItem[]
  marginAssumptions: ModelLineItem[]
  epsFcfAssumptions: ModelLineItem[]
  mostImportantDriver: string
  modelConclusion: string
}

export type ValuationScenario = {
  name: 'bear' | 'base' | 'bull'
  priceTarget: number
  impliedReturn: number
  method: string
  assumptions: string[]
}

export type PitchValuation = {
  primaryMethod: string
  peerSet: string[]
  scenarios: ValuationScenario[]
  valuationConclusion: string
}

export type TradeStructure = {
  preferredExpression: TradeExpression
  entryTrigger: string
  invalidation: string
  stopLevel?: number
  takeProfitLevel?: number
  sizing: 'small' | 'medium' | 'large'
  timeHorizon: string
  riskReward: string
  whyThisExpression: string
}

export type RedTeam = {
  bearCase: string
  strongestCounterargument: string
  whatWouldMakeMeWrong: string
  dataToMonitor: string[]
}

export type PostMortem = {
  status: 'not-started' | 'open' | 'closed'
  entryDate?: string
  exitDate?: string
  entryPrice?: number
  exitPrice?: number
  realizedReturn?: number
  thesisWorked?: boolean
  whatWasRight?: string
  whatWasWrong?: string
  processLesson?: string
}

export type PitchPriceProvenance = PointInTime & {
  ticker: string
  date: string
  price: number
  label: string
  fallback: boolean
}

export type PitchNewsTapeItem = PointInTime & {
  id: string
  date: string
  headline: string
  sourceName: string | null
  url: string | null
  tickers: string[]
  theme: string
  materiality: number | null
  priceConfirmationRequired: boolean
  whyMatters: string
  relevance: 'direct' | 'theme-context' | 'ai-confirmed'
}

export type OptionsBattlefieldMode = 'true-gex' | 'proxy' | 'plan-locked' | 'unavailable'

export type PitchSourceQuality = 'sourced' | 'derived' | 'proxy' | 'plan-locked' | 'unavailable'

export type OptionsStrikeSignalView = {
  expirationDate: string
  strikePrice: number
  callVolume: number | null
  putVolume: number | null
  totalVolume: number | null
  openInterest: number | null
  impliedVolatility: number | null
  gamma: number | null
  gammaExposure: number | null
  gammaProxy: number | null
  magnetScore: number | null
  sourceQuality: PitchSourceQuality
}

export type OptionsExpiryClusterView = {
  expirationDate: string
  totalVolume: number | null
  openInterest: number | null
  impliedVolatility: number | null
  expectedMove: number | null
  sourceQuality: PitchSourceQuality
}

export type OptionsBattlefieldView = {
  ticker: string
  asOfDate: string
  mode: OptionsBattlefieldMode
  sourceLabel: 'True GEX' | 'Options Proxy' | 'Plan Locked' | 'Unavailable'
  provider: string
  callWall: number | null
  putWall: number | null
  zeroGamma: number | null
  expectedMove: number | null
  pressureDirection: 'call-pressure' | 'put-pressure' | 'balanced' | 'unknown'
  confidence: number
  strikes: OptionsStrikeSignalView[]
  expiryClusters: OptionsExpiryClusterView[]
  gaps: string[]
}

export type DayMapLevelView = {
  label: string
  price: number | null
  type: 'prior' | 'atr' | 'gap' | 'volume-shelf' | 'current'
  description: string
}

export type DayMapView = {
  ticker: string
  asOfDate: string
  sourceLabel: 'Daily OHLCV day map' | 'Unavailable'
  priorHigh: number | null
  priorLow: number | null
  priorClose: number | null
  atr20: number | null
  gapLevel: number | null
  upperAtrBand: number | null
  lowerAtrBand: number | null
  volumeShelf: number | null
  levels: DayMapLevelView[]
  gaps: string[]
}

export type TargetConfidenceView = {
  score: number
  confidenceLabel: 'High' | 'Medium' | 'Low' | 'Blocked'
  drivers: string[]
  blockers: string[]
  nextDataNeeded: string[]
}

export type PitchSourceSnapshot = {
  ticker: string
  generatedAt: string
  reportAsOf: string
  price: PitchPriceProvenance | null
  newsTape: PitchNewsTapeItem[]
  providerNotes: string[]
  gaps: string[]
  optionsBattlefield?: OptionsBattlefieldView
  dayMap?: DayMapView
  targetConfidence?: TargetConfidenceView
  sourceQuality?: {
    price: PitchSourceQuality
    options: PitchSourceQuality
    dayMap: PitchSourceQuality
    catalysts: PitchSourceQuality
    ai: PitchSourceQuality
  }
}

export type AiScanStatus = 'completed' | 'unavailable' | 'error'

export type AiScanPayload = {
  variantThesis: string
  nonConsensusRead: string
  evidenceMap: string[]
  catalystMap: {
    headline: string
    relevance: string
    whyMatters: string
    materiality: number
  }[]
  bearCase: string
  invalidation: string
  missingData: string[]
  pmQuestions: string[]
  citations: { label: string; url?: string | null }[]
}

export type AiScanView = {
  id?: string
  ticker: string
  mode: string
  inputHash?: string
  model: string
  status: AiScanStatus
  createdAt: string
  errorMessage?: string
  payload?: AiScanPayload
}

export type StockPitch = {
  id: string
  thesis: string
  evidenceDrivers: PitchEvidenceDriver[]
  setup: PitchSetup
  variantView: VariantView
  positioning: PositioningSnapshot
  catalysts: Catalyst[]
  model: PitchModel
  valuation: PitchValuation
  tradeStructure: TradeStructure
  redTeam: RedTeam
  postMortem: PostMortem
  sourceEvidence: PitchSourceEvidence[]
  readiness: PitchReadiness
  sourceSnapshot?: PitchSourceSnapshot
  aiScanId?: string
  aiScan?: AiScanView
  newsTape?: PitchNewsTapeItem[]
  priceProvenance?: PitchPriceProvenance
}

export type StockPitchSummary = {
  id: string
  slug: string
  ticker: string
  companyName: string
  recommendation: PitchRecommendation
  status: StockPitchStatus
  shareEnabled: boolean
  date: string
  oneLineThesis: string
  targetPrice?: number
  downsidePrice?: number
  expectedReturn?: number
  createdAt: string
  updatedAt: string
}

export type StockPitchRecord = StockPitchSummary & {
  shareToken?: string
  pitch: StockPitch
}
