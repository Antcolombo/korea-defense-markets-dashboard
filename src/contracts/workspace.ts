import type { ComponentType } from 'react'
import type { ShellMeta, UnavailableField } from '@/contracts/provenance'
import type { BasketSummary, CrowdingRow, PositioningRow, RotationRow, StockReport, ValidationRow } from '@/types/research'
import type { Asset } from '@/types/asset'
import type { InvestmentDecisionRecord, InvestmentDecisionSummary } from '@/types/decision'
import type { Event } from '@/types/event'
import type { EventReturn, PricePoint } from '@/types/market'
import type { PmEngineView } from '@/types/pm'
import type { PitchSourceSnapshot, StockPitchRecord, StockPitchSummary } from '@/types/pitch'
import type { RiskLensRow } from '@/types/riskLens'
import type { SourceAudit } from '@/types/sourceAudit'

export type ChartPricePoint = Pick<PricePoint, 'date' | 'ticker' | 'price'> & {
  returnValue?: number | null
  open?: number | null
  high?: number | null
  low?: number | null
  volume?: number | null
}

export type WorkspaceModule =
  | 'overview'
  | 'rotation'
  | 'baskets'
  | 'basket-detail'
  | 'positioning'
  | 'crowding'
  | 'validation'
  | 'methodology'
  | 'korea-defense'
  | 'stock-report'
  | 'decision-log'
  | 'stock-pitch'
  | 'event-study'
  | 'paper-book'
  | 'risk-lens'
  | 'source-audit'

export type WorkspaceData = {
  rotations?: RotationRow[]
  baskets?: BasketSummary[]
  basketSummary?: BasketSummary | null
  basketSignals?: RotationRow[]
  basketCrowding?: CrowdingRow[]
  positioning?: PositioningRow[]
  crowding?: CrowdingRow[]
  validation?: ValidationRow[]
  report?: StockReport
  decision?: InvestmentDecisionRecord
  decisions?: InvestmentDecisionSummary[]
  pitch?: StockPitchRecord
  pitches?: StockPitchSummary[]
  pitchSource?: PitchSourceSnapshot
  pitchCreateTicker?: string
  events?: Event[]
  eventReturns?: EventReturn[]
  assets?: Asset[]
  portfolioDecisions?: InvestmentDecisionRecord[]
  pmEngine?: PmEngineView
  riskLens?: RiskLensRow[]
  sourceAudit?: SourceAudit
  prices?: ChartPricePoint[]
}

export type TerminalWorkspaceProps = {
  module: WorkspaceModule
  data: WorkspaceData
  shell: ShellMeta
  unavailableFields: UnavailableField[]
  deferredUnavailableFields?: UnavailableField[]
  selectedTicker?: string
  selectedSlug?: string
}

export type ModuleMeta = {
  id: WorkspaceModule
  label: string
  short: string
  href: string
  icon: ComponentType<{ className?: string }>
}
