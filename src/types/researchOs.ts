import type { Provenance } from './provenance'

export type ResearchState =
  | 'Unresearched'
  | 'Watching'
  | 'Screened'
  | 'Memo needed'
  | 'Trade candidate'
  | 'Rejected'
  | 'Active'
  | 'Closed'
  | 'Post-mortem complete'

export type IdeaStatus =
  | 'raw'
  | 'screened'
  | 'memo_written'
  | 'accepted'
  | 'rejected'
  | 'watchlist'
  | 'active'
  | 'closed'

export type ArtifactType =
  | 'market_note'
  | 'company_model'
  | 'macro_chart'
  | 'event_study'
  | 'research_memo'
  | 'post_mortem'
  | 'dashboard_module'

export type MarketTapeRecord = Provenance & {
  date: string
  SPX: number | null
  QQQ: number | null
  KOSPI: number | null
  USD_KRW: number | null
  USD_JPY: number | null
  DXY: number | null
  US_2Y: number | null
  US_10Y: number | null
  KR10Y: number | null
  oil: number | null
  gold: number | null
  SOX: number | null
  VIX: number | null
  top_movers: string[]
  market_summary: string
  todays_question: string
  sourceBacklog: SourceBacklogItem[]
}

export type CompanyCoverageRecord = Provenance & {
  ticker: string
  company: string
  country: string
  sector: string
  theme: string
  revenue_segments: string[]
  margin_trend: string
  backlog: string
  debt: string
  cash: string
  valuation_multiple: string
  next_earnings: string
  latest_filing: string
  key_risks: string[]
  current_thesis: string
  research_state: ResearchState
}

export type ResearchEventType =
  | 'earnings'
  | 'defense_contract'
  | 'missile_test'
  | 'central_bank'
  | 'fx_shock'
  | 'export_control'
  | 'chip_cycle'
  | 'oil_shock'
  | 'geopolitical_event'
  | 'policy_announcement'

export type EventTapeRecord = Provenance & {
  date: string
  event_type: ResearchEventType
  event_name: string
  country: string
  companies_affected: string[]
  asset_reaction_1d: number | null
  asset_reaction_5d: number | null
  asset_reaction_20d: number | null
  source: string
  notes: string
}

export type IdeaLedgerRecord = Provenance & {
  idea_id: string
  date: string
  theme: string
  asset: string
  thesis: string
  market_implies: string
  i_believe: string
  catalyst: string
  expression: string
  evidence: string[]
  status: IdeaStatus
  reason_accepted_or_rejected: string
  expected_payoff: string
  invalidation: string
  result_after_1w: string
  result_after_1m: string
  post_mortem: string
}

export type ResearchArtifactRecord = Provenance & {
  artifact_id: string
  type: ArtifactType
  title: string
  date: string
  linked_idea: string | null
  linked_company: string | null
  linked_event: string | null
  data_sources: string[]
  conclusion: string
  confidence: 'Low' | 'Medium' | 'High'
  what_i_learned: string
  public_url: string
}

export type MasteryPipelineStage = Provenance & {
  id: string
  title: string
  track: 'Markets' | 'Data' | 'Research' | 'Risk' | 'Proof'
  goal: string
  learn: string[]
  do: string[]
  artifact: string
  proofLinks: string[]
  status: 'Not started' | 'Building' | 'Active' | 'Proof-ready'
}

export type SourceBacklogItem = {
  name: string
  providerTarget: string
  reasonBlocked: string
  status: 'Not yet sourced'
}
