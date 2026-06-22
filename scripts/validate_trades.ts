import { existsSync } from 'node:fs'
import { readJson } from './lib/io'
import { buildTradeJournal, validateTradeCsv, validateTradeRow } from './lib/tradeJournal'
import type { PrivateTrade } from '../src/types/privateTradeJournal'

const input = process.argv[2] ?? 'data/private/trades/trades.json'

async function main() {
  if (!existsSync(input)) {
    console.log(`${input} does not exist; no private trades to validate`)
    return
  }

  if (input.endsWith('.csv')) {
    const result = await validateTradeCsv(input)
    if (result.failures.length > 0) {
      console.error(result.failures.join('\n'))
      process.exit(1)
    }
    console.log(`Validated ${result.rows.length} trade CSV rows`)
    return
  }

  const trades = await readJson<PrivateTrade[]>(input, [])
  const failures: string[] = []
  for (const [index, trade] of trades.entries()) {
    validateTradeRow({
      trade_id: trade.tradeId,
      opened_at: trade.openedAt,
      closed_at: trade.closedAt ?? '',
      status: trade.status,
      ticker: trade.ticker,
      underlying_price: trade.underlyingPrice?.toString() ?? '',
      option_type: trade.optionType,
      strike: trade.strike.toString(),
      expiry: trade.expiry,
      quantity: trade.quantity.toString(),
      entry_price: trade.entryPrice.toString(),
      exit_price: trade.exitPrice?.toString() ?? '',
      fees: trade.fees.toString(),
      side: trade.side,
      setup: trade.setup,
      thesis: trade.thesis,
      invalidation: trade.invalidation,
      flow_note: trade.flowNote ?? '',
      flow_premium: trade.flowPremium?.toString() ?? '',
      flow_type: trade.flowType ?? '',
      confidence: trade.confidence ?? '',
      tags: trade.tags.join('|'),
      notes: trade.notes ?? ''
    }, index + 1, failures)
  }
  buildTradeJournal(trades.map(trade => ({
    trade_id: trade.tradeId,
    opened_at: trade.openedAt,
    closed_at: trade.closedAt ?? '',
    status: trade.status,
    ticker: trade.ticker,
    underlying_price: trade.underlyingPrice?.toString() ?? '',
    option_type: trade.optionType,
    strike: trade.strike.toString(),
    expiry: trade.expiry,
    quantity: trade.quantity.toString(),
    entry_price: trade.entryPrice.toString(),
    exit_price: trade.exitPrice?.toString() ?? '',
    fees: trade.fees.toString(),
    side: trade.side,
    setup: trade.setup,
    thesis: trade.thesis,
    invalidation: trade.invalidation,
    flow_note: trade.flowNote ?? '',
    flow_premium: trade.flowPremium?.toString() ?? '',
    flow_type: trade.flowType ?? '',
    confidence: trade.confidence ?? '',
    tags: trade.tags.join('|'),
    notes: trade.notes ?? ''
  })), input)

  if (failures.length > 0) {
    console.error(failures.join('\n'))
    process.exit(1)
  }
  console.log(`Validated ${trades.length} private trades`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
