import type { MetricValue, PointInTime } from '@/contracts/research'

export type { DataAvailability, DbDataStatus, MetricValue, PointInTime, RevisionFlag } from '@/contracts/research'

export type TickerSeed = {
  ticker: string
  name: string
  sector: string
  industry?: string
  country: string
  assetType: string
  isEtf: boolean
  description: string
}

export type BasketSeed = {
  slug: string
  name: string
  description: string
  category: string
  members: { ticker: string; weight?: number; rationale: string }[]
}

export type RotationRow = PointInTime & {
  ticker: string
  name: string
  sector: string
  return1d: MetricValue
  return5d: MetricValue
  return20d: MetricValue
  return60d: MetricValue
  relativeStrengthVsSpy20d: MetricValue
  relativeStrengthVsSpy60d: MetricValue
  volumeVs20dAvg: MetricValue
  realizedVol20d: MetricValue
  distanceFrom20dMa: MetricValue
  distanceFrom50dMa: MetricValue
  trendLabel: string
}

export type BasketSummary = PointInTime & {
  slug: string
  name: string
  description: string
  category: string
  memberCount: number
  return5d: MetricValue
  return20d: MetricValue
  return60d: MetricValue
  relativeStrengthVsSpy20d: MetricValue
  averageCrowdingScore: MetricValue
  basketLabel: string
  topContributors: string[]
  laggards: string[]
}

export type PositioningRow = PointInTime & {
  ticker: string
  name: string
  optionsVolume: MetricValue
  openInterest: MetricValue
  putCallRatio: MetricValue
  impliedVolatility: MetricValue
  impliedVolPercentile: MetricValue
  shortInterest: MetricValue
  shortInterestChange: MetricValue
  shortVolumeRatio: MetricValue
  positioningNotes: string
  excludedUnavailableInputs: string[]
}

export type CrowdingRow = PointInTime & {
  ticker: string
  name: string
  basket: string
  crowdingScore: MetricValue
  crowdingLabel: string
  extensionRiskScore: MetricValue
  catalystSupportScore: MetricValue
  setupLabel: string
  momentumScore: MetricValue
  volumeScore: MetricValue
  optionsScore: MetricValue
  volatilityScore: MetricValue
  shortInterestScore: MetricValue
  explanation: string
  excludedUnavailableInputs: string[]
}

export type ValidationRow = PointInTime & {
  testName: string
  hitRate: MetricValue
  averageForwardReturn: MetricValue
  sampleSize: number
  coveragePercent: number
  caveats: string
  resultRows?: ValidationSampleRow[]
}

export type ValidationSampleRow = {
  ticker?: string
  signalDate?: string
  signalValue?: number | null
  hit: boolean
  forwardReturn: number
  trailingVol?: number | null
  forwardVol?: number | null
}

export type CatalystReportRow = PointInTime & {
  id: string
  title: string
  date: string
  summary: string
  sourceName: string | null
  url: string | null
  materialityScore: MetricValue
}

export type ReportSource = PointInTime & {
  label: string
  url?: string | null
  detail?: string
}

export type ReportMetric = MetricValue & {
  label: string
  unit: '%' | 'x' | 'score' | 'ratio' | 'shares' | 'count'
  displayValue: string
  provider: string
  source: string
  asOfDate: string | null
  ingestedAt: string | null
}

export type ReportSection = PointInTime & {
  title: string
  summary: string
  bullets: string[]
  metrics: ReportMetric[]
  sources: ReportSource[]
  excludedUnavailableInputs: string[]
}

export type StockReport = {
  ticker: string
  companyName: string
  asOfDate: string
  summary: string
  variantView: string
  evidence: ReportSection[]
  positioning: ReportSection
  catalysts: ReportSection
  risks: string[]
  invalidation: string[]
  pmQuestions: string[]
  markdown: string
}
