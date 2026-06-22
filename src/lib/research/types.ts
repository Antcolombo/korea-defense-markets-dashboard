export type DataAvailability =
  | 'Available'
  | 'Unavailable'
  | 'Stale'
  | 'Partial'
  | 'Entitlement Missing'
  | 'Provider Error'

export type DbDataStatus =
  | 'AVAILABLE'
  | 'UNAVAILABLE'
  | 'STALE'
  | 'PARTIAL'
  | 'ENTITLEMENT_MISSING'
  | 'PROVIDER_ERROR'

export type RevisionFlag = 'ORIGINAL' | 'REVISED' | 'CORRECTED' | 'RESTATED' | 'UNKNOWN'

export type PointInTime = {
  asOfDate: string | null
  observedAt: string | null
  providerTimestamp: string | null
  ingestedAt: string | null
  source: string
  provider: string
  revisionFlag: RevisionFlag
  dataStatus: DbDataStatus
  availability: DataAvailability
}

export type MetricValue = {
  value: number | null
  availability: DataAvailability
  dataStatus: DbDataStatus
  reason?: string
}

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
  momentumScore: MetricValue
  volumeScore: MetricValue
  optionsScore: MetricValue
  volatilityScore: MetricValue
  shortInterestScore: MetricValue
  explanation: string
  excludedUnavailableInputs: string[]
}

export type DailyNoteDto = PointInTime & {
  id: string
  date: string
  title: string
  marketRegime: string
  topRotations: string[]
  crowdedLongs: string[]
  earlyAccumulation: string[]
  reversalRisks: string[]
  pmQuestions: string[]
  body: string
  inputSnapshotIds: string[]
  excludedUnavailableInputs: string[]
  generatedAt: string
  humanEditedAt: string | null
  noteStatus: 'GENERATED' | 'HUMAN_EDITED' | 'PUBLISHED' | 'ARCHIVED'
  sourceCoveragePercent: number
}

export type ValidationRow = PointInTime & {
  testName: string
  hitRate: MetricValue
  averageForwardReturn: MetricValue
  sampleSize: number
  coveragePercent: number
  caveats: string
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
