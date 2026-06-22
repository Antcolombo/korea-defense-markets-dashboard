import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { parseCsvWithHeaders } from './csv'
import type {
  OptionChainSummary,
  OptionType,
  PrivateTrade,
  TagPerformance,
  TradeJournalOutput,
  TradeSide,
  TradeStatus
} from '../../src/types/privateTradeJournal'

export const tradeCsvColumns = [
  'trade_id',
  'opened_at',
  'closed_at',
  'status',
  'ticker',
  'underlying_price',
  'option_type',
  'strike',
  'expiry',
  'quantity',
  'entry_price',
  'exit_price',
  'fees',
  'side',
  'setup',
  'thesis',
  'invalidation',
  'flow_note',
  'flow_premium',
  'flow_type',
  'confidence',
  'tags',
  'notes'
] as const

const statuses = new Set<TradeStatus>(['planned', 'open', 'closed', 'scratch', 'invalidated'])
const optionTypes = new Set<OptionType>(['call', 'put'])
const sides = new Set<TradeSide>(['long', 'short'])
const requiredColumns = new Set(['trade_id', 'opened_at', 'status', 'ticker', 'option_type', 'strike', 'expiry', 'quantity', 'entry_price', 'side', 'setup', 'thesis', 'invalidation'])
const textColumns = new Set(['setup', 'thesis', 'invalidation', 'flow_note', 'flow_type', 'confidence', 'tags', 'notes'])
const forbiddenHeaderPattern = /(account|acct|token|secret|password|passwd|cookie|oauth|refresh|bearer|schwab|thinkorswim|think_or_swim|tos|tdameritrade|td_ameritrade|broker)/i
const forbiddenTextPatterns = [
  /bearer\s+[a-z0-9._-]+/i,
  /refresh[_ -]?token/i,
  /access[_ -]?token/i,
  /client[_ -]?secret/i,
  /api[_ -]?key/i,
  /password\s*[:=]/i,
  /account\s*(id|number|#|:|=)/i,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
  /\b[A-Za-z0-9_-]{48,}\b/,
  /\b\d{8,12}\b/
]

type RawTradeRow = Record<string, string>

export type ValidationResult = {
  rows: RawTradeRow[]
  failures: string[]
}

export function parseTradeCsv(text: string) {
  return parseCsvWithHeaders(text)
}

function parseNumber(value: string, label: string, rowIndex: number, failures: string[], options: { required?: boolean; integer?: boolean; positive?: boolean } = {}) {
  const trimmed = value.trim()
  if (!trimmed) {
    if (options.required) failures.push(`row ${rowIndex}: missing ${label}`)
    return null
  }
  const parsed = Number(trimmed.replace(/[$,]/g, ''))
  if (!Number.isFinite(parsed)) {
    failures.push(`row ${rowIndex}: ${label} must be numeric`)
    return null
  }
  if (options.integer && !Number.isInteger(parsed)) failures.push(`row ${rowIndex}: ${label} must be an integer`)
  if (options.positive && parsed <= 0) failures.push(`row ${rowIndex}: ${label} must be positive`)
  return parsed
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const time = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
}

function assertNoSecrets(row: RawTradeRow, rowIndex: number, failures: string[]) {
  for (const [column, value] of Object.entries(row)) {
    if (forbiddenHeaderPattern.test(column) && value.trim()) {
      failures.push(`row ${rowIndex}: forbidden broker/auth/account column ${column}`)
    }
    if (!textColumns.has(column)) continue
    for (const pattern of forbiddenTextPatterns) {
      if (pattern.test(value)) failures.push(`row ${rowIndex}: ${column} looks like broker/auth/account secret`)
    }
  }
}

function validateHeaders(headers: string[], failures: string[]) {
  for (const header of headers) {
    if (!tradeCsvColumns.includes(header as typeof tradeCsvColumns[number])) failures.push(`unsupported column: ${header}`)
    if (forbiddenHeaderPattern.test(header)) failures.push(`forbidden broker/auth/account column: ${header}`)
  }
  for (const column of requiredColumns) {
    if (!headers.includes(column)) failures.push(`missing required column: ${column}`)
  }
}

export async function validateTradeCsv(path: string): Promise<ValidationResult> {
  if (!existsSync(path)) return { rows: [], failures: [`${path}: file does not exist`] }
  const text = await readFile(path, 'utf8')
  const { headers, rows } = parseTradeCsv(text)
  const failures: string[] = []
  validateHeaders(headers, failures)
  rows.forEach((row, index) => validateTradeRow(row, index + 2, failures))
  return { rows, failures }
}

export function validateTradeRow(row: RawTradeRow, rowIndex: number, failures: string[]) {
  assertNoSecrets(row, rowIndex, failures)
  for (const column of requiredColumns) {
    if (!row[column]?.trim()) failures.push(`row ${rowIndex}: missing ${column}`)
  }

  const status = row.status?.trim() as TradeStatus
  if (row.status && !statuses.has(status)) failures.push(`row ${rowIndex}: status must be planned, open, closed, scratch, or invalidated`)
  const optionType = row.option_type?.trim().toLowerCase() as OptionType
  if (row.option_type && !optionTypes.has(optionType)) failures.push(`row ${rowIndex}: option_type must be call or put`)
  const side = row.side?.trim().toLowerCase() as TradeSide
  if (row.side && !sides.has(side)) failures.push(`row ${rowIndex}: side must be long or short`)
  if (row.opened_at && !validDate(row.opened_at)) failures.push(`row ${rowIndex}: opened_at must be YYYY-MM-DD`)
  if (row.closed_at && !validDate(row.closed_at)) failures.push(`row ${rowIndex}: closed_at must be YYYY-MM-DD`)
  if (row.expiry && !validDate(row.expiry)) failures.push(`row ${rowIndex}: expiry must be YYYY-MM-DD`)

  parseNumber(row.underlying_price ?? '', 'underlying_price', rowIndex, failures, { positive: true })
  parseNumber(row.strike ?? '', 'strike', rowIndex, failures, { required: true, positive: true })
  parseNumber(row.quantity ?? '', 'quantity', rowIndex, failures, { required: true, integer: true, positive: true })
  parseNumber(row.entry_price ?? '', 'entry_price', rowIndex, failures, { required: true, positive: true })
  parseNumber(row.exit_price ?? '', 'exit_price', rowIndex, failures, { positive: true })
  parseNumber(row.fees ?? '', 'fees', rowIndex, failures)
  parseNumber(row.flow_premium ?? '', 'flow_premium', rowIndex, failures, { positive: true })

  if (status === 'closed' && !row.closed_at?.trim()) failures.push(`row ${rowIndex}: closed trade requires closed_at`)
  if (status === 'closed' && !row.exit_price?.trim()) failures.push(`row ${rowIndex}: closed trade requires exit_price`)
}

function toTrade(row: RawTradeRow): PrivateTrade {
  const status = row.status.trim() as TradeStatus
  const side = row.side.trim().toLowerCase() as TradeSide
  const entryPrice = Number(row.entry_price)
  const exitPrice = row.exit_price ? Number(row.exit_price) : null
  const quantity = Number(row.quantity)
  const fees = row.fees ? Number(row.fees) : 0
  const multiplier = 100
  const grossPnl = exitPrice === null ? null : side === 'long'
    ? (exitPrice - entryPrice) * quantity * multiplier
    : (entryPrice - exitPrice) * quantity * multiplier
  const realizedPnl = grossPnl === null ? null : Number((grossPnl - fees).toFixed(2))
  const riskAmount = side === 'long' ? Number((entryPrice * quantity * multiplier + fees).toFixed(2)) : null

  return {
    tradeId: row.trade_id.trim(),
    openedAt: row.opened_at.trim(),
    closedAt: row.closed_at?.trim() || null,
    status,
    ticker: row.ticker.trim().toUpperCase(),
    underlyingPrice: row.underlying_price ? Number(row.underlying_price) : null,
    optionType: row.option_type.trim().toLowerCase() as OptionType,
    strike: Number(row.strike),
    expiry: row.expiry.trim(),
    quantity,
    entryPrice,
    exitPrice,
    fees,
    side,
    setup: row.setup.trim(),
    thesis: row.thesis.trim(),
    invalidation: row.invalidation.trim(),
    flowNote: row.flow_note?.trim() || null,
    flowPremium: row.flow_premium ? Number(row.flow_premium) : null,
    flowType: row.flow_type?.trim() || null,
    confidence: row.confidence?.trim() || null,
    tags: row.tags?.split('|').map(tag => tag.trim()).filter(Boolean) ?? [],
    notes: row.notes?.trim() || null,
    realizedPnl,
    riskAmount,
    rMultiple: realizedPnl === null || !riskAmount ? null : Number((realizedPnl / riskAmount).toFixed(2))
  }
}

function winRate(trades: PrivateTrade[]) {
  const closed = trades.filter(trade => trade.realizedPnl !== null)
  if (closed.length === 0) return null
  return Number((closed.filter(trade => (trade.realizedPnl ?? 0) > 0).length / closed.length).toFixed(2))
}

function average(values: number[]) {
  if (values.length === 0) return null
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))
}

function summarizeTags(trades: PrivateTrade[]): TagPerformance[] {
  const map = new Map<string, PrivateTrade[]>()
  for (const trade of trades) {
    for (const tag of trade.tags) {
      map.set(tag, [...(map.get(tag) ?? []), trade])
    }
  }
  return [...map.entries()].map(([tag, taggedTrades]) => {
    const closed = taggedTrades.filter(trade => trade.realizedPnl !== null)
    return {
      tag,
      count: taggedTrades.length,
      closedCount: closed.length,
      realizedPnl: Number(closed.reduce((sum, trade) => sum + (trade.realizedPnl ?? 0), 0).toFixed(2)),
      winRate: winRate(closed)
    }
  }).sort((a, b) => b.count - a.count || b.realizedPnl - a.realizedPnl)
}

function summarizeOptions(trades: PrivateTrade[]): OptionChainSummary[] {
  const map = new Map<string, PrivateTrade[]>()
  for (const trade of trades) {
    const key = `${trade.ticker}-${trade.expiry}-${trade.optionType}-${trade.strike}`
    map.set(key, [...(map.get(key) ?? []), trade])
  }
  return [...map.entries()].map(([key, group]) => {
    const first = group[0]
    return {
      key,
      ticker: first.ticker,
      expiry: first.expiry,
      optionType: first.optionType,
      strike: first.strike,
      openQuantity: group.filter(trade => trade.status === 'open').reduce((sum, trade) => sum + trade.quantity, 0),
      tradeCount: group.length,
      realizedPnl: Number(group.reduce((sum, trade) => sum + (trade.realizedPnl ?? 0), 0).toFixed(2))
    }
  }).sort((a, b) => a.ticker.localeCompare(b.ticker) || a.expiry.localeCompare(b.expiry) || a.strike - b.strike)
}

export function buildTradeJournal(rows: RawTradeRow[], sourcePath: string, generatedAt = new Date().toISOString()): TradeJournalOutput {
  const trades = rows.map(toTrade).sort((a, b) => b.openedAt.localeCompare(a.openedAt) || a.tradeId.localeCompare(b.tradeId))
  const closedTrades = trades.filter(trade => trade.status === 'closed')
  const openTrades = trades.filter(trade => trade.status === 'open')
  const realized = closedTrades.map(trade => trade.realizedPnl ?? 0)
  const wins = realized.filter(value => value > 0)
  const losses = realized.filter(value => value < 0)
  const flowTrades = trades.filter(trade => trade.flowNote || trade.flowPremium || trade.flowType)

  return {
    generatedAt,
    sourcePath,
    summary: {
      tradeCount: trades.length,
      openCount: openTrades.length,
      closedCount: closedTrades.length,
      plannedCount: trades.filter(trade => trade.status === 'planned').length,
      invalidatedCount: trades.filter(trade => trade.status === 'invalidated').length,
      scratchCount: trades.filter(trade => trade.status === 'scratch').length,
      realizedPnl: Number(realized.reduce((sum, value) => sum + value, 0).toFixed(2)),
      winRate: winRate(closedTrades),
      averageWin: average(wins),
      averageLoss: average(losses),
      maxLoss: losses.length ? Math.min(...losses) : null,
      flowTradeCount: flowTrades.length,
      flowWinRate: winRate(flowTrades.filter(trade => trade.status === 'closed'))
    },
    trades,
    openTrades,
    closedTrades,
    optionChain: summarizeOptions(trades),
    tagPerformance: summarizeTags(trades),
    lessons: closedTrades.filter(trade => trade.notes || trade.status === 'scratch' || trade.status === 'invalidated'),
    flowNotes: flowTrades
  }
}
