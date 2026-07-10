import type { DbDataStatus, PointInTime } from '@/contracts/research'

export type PmScenarioName = 'bear' | 'base' | 'bull'
export type PmReadinessStatus = 'available' | 'partial' | 'missing'
export type PmBacktestGrade = 'A' | 'B' | 'C' | 'D' | 'N/A'

export type PmDefaults = {
  nav: number
  riskBudgetPct: number
  maxSingleNamePct: number
  maxGrossPct: number
  maxNetPct: number
  maxSectorGrossPct: number
  maxBeta: number
  maxAdvParticipationPct: number
  targetLiquidationDays: number
  maxPairCorrelation: number
  maxAnnualizedPositionRiskContributionPct: number
}

export type PmScenario = {
  name: PmScenarioName
  probability: number
  returnPct: number
  contributionPct: number
}

export type PmSourceLight = {
  label: string
  status: PmReadinessStatus
  detail: string
}

export type PmWaterfallStep = {
  label: string
  valuePct: number
  reason: string
  active: boolean
}

export type PmFactorExposure = {
  factor: string
  exposure: number
}

export type PmStressScenario = {
  label: string
  lossPct: number
  detail: string
}

export type PmBacktestSummary = {
  grade: PmBacktestGrade
  hitRate: number | null
  informationCoefficient: number | null
  decay: number | null
  turnover: number | null
  capacity: number | null
  grossReturn: number | null
  netReturn: number | null
  maxDrawdown: number | null
}

export type PmDecisionOverlay = PointInTime & {
  decisionSlug: string
  ticker: string
  side: 'long' | 'short' | 'watch' | 'pass'
  status: string
  sector: string
  humanSizePct: number
  suggestedSizePct: number
  sizeDeltaPct: number
  rawStopSizePct: number
  finalSizePct: number
  expectedValuePct: number
  costAdjustedEvPct: number
  estimatedCostPct: number
  annualizedRiskPct: number
  riskContributionPct: number
  beta: number
  liquidityDays: number
  activeCapReason: string
  optimizerAction: 'accepted' | 'rejected' | 'watch'
  optimizerReason: string
  pmReady: boolean
  sourceLights: PmSourceLight[]
  scenarios: PmScenario[]
  sizingWaterfall: PmWaterfallStep[]
  factorExposures: PmFactorExposure[]
  stressScenarios: PmStressScenario[]
  backtest: PmBacktestSummary
  sourceGaps: string[]
  excludedUnavailableInputs: string[]
}

export type PmFactorHeatmapRow = {
  ticker: string
  exposures: Record<string, number>
}

export type PmSectorExposure = {
  sector: string
  grossPct: number
  netPct: number
  count: number
}

export type PmRiskContribution = {
  ticker: string
  riskPct: number
  sizePct: number
}

export type PmLiquidityExit = {
  ticker: string
  daysToExit: number
  advParticipationPct: number
  estimatedCostPct: number
}

export type PmPortfolioSummary = PointInTime & {
  pmReadyCount: number
  grossPct: number
  netPct: number
  portfolioBeta: number
  annualizedRiskPct: number
  valueAtRisk95Pct: number
  valueAtRisk99Pct: number
  expectedShortfallPct: number
  costAdjustedEvPct: number
  liquidityDays: number
  factorHeatmap: PmFactorHeatmapRow[]
  sectorExposure: PmSectorExposure[]
  riskContribution: PmRiskContribution[]
  liquidityExit: PmLiquidityExit[]
  optimizerLedger: {
    ticker: string
    action: 'accepted' | 'rejected' | 'watch'
    reason: string
    suggestedSizePct: number
  }[]
  backtest: PmBacktestSummary
}

export type PmEngineView = {
  defaults: PmDefaults
  portfolio: PmPortfolioSummary
  decisions: PmDecisionOverlay[]
  dataStatus: DbDataStatus
  gaps: string[]
}

export type FundamentalInputRow = {
  ticker: string
  periodEnd: string
  fiscalPeriod: string
  currency: string
  revenue: number | null
  grossProfit: number | null
  operatingIncome: number | null
  ebitda: number | null
  netIncome: number | null
  epsDiluted: number | null
  freeCashFlow: number | null
  cash: number | null
  debt: number | null
  sharesDiluted: number | null
}

export type EstimateInputRow = {
  ticker: string
  periodEnd: string
  fiscalPeriod: string
  estimateDate: string
  revenueEstimate: number | null
  epsEstimate: number | null
  ebitdaEstimate: number | null
  provider: string
}
