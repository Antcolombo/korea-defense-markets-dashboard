export type TradeStatus = 'planned' | 'open' | 'closed' | 'scratch' | 'invalidated'
export type OptionType = 'call' | 'put'
export type TradeSide = 'long' | 'short'

export type PrivateTrade = {
  tradeId: string
  openedAt: string
  closedAt: string | null
  status: TradeStatus
  ticker: string
  underlyingPrice: number | null
  optionType: OptionType
  strike: number
  expiry: string
  quantity: number
  entryPrice: number
  exitPrice: number | null
  fees: number
  side: TradeSide
  setup: string
  thesis: string
  invalidation: string
  flowNote: string | null
  flowPremium: number | null
  flowType: string | null
  confidence: string | null
  tags: string[]
  notes: string | null
  realizedPnl: number | null
  riskAmount: number | null
  rMultiple: number | null
}

export type TradeJournalSummary = {
  tradeCount: number
  openCount: number
  closedCount: number
  plannedCount: number
  invalidatedCount: number
  scratchCount: number
  realizedPnl: number
  winRate: number | null
  averageWin: number | null
  averageLoss: number | null
  maxLoss: number | null
  flowTradeCount: number
  flowWinRate: number | null
}

export type TagPerformance = {
  tag: string
  count: number
  closedCount: number
  realizedPnl: number
  winRate: number | null
}

export type OptionChainSummary = {
  key: string
  ticker: string
  expiry: string
  optionType: OptionType
  strike: number
  openQuantity: number
  tradeCount: number
  realizedPnl: number
}

export type TradeJournalOutput = {
  generatedAt: string
  sourcePath: string
  summary: TradeJournalSummary
  trades: PrivateTrade[]
  openTrades: PrivateTrade[]
  closedTrades: PrivateTrade[]
  optionChain: OptionChainSummary[]
  tagPerformance: TagPerformance[]
  lessons: PrivateTrade[]
  flowNotes: PrivateTrade[]
}
