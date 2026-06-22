import { existsSync } from 'node:fs'
import { readJson, writeJson } from './lib/io'
import { buildTradeJournal } from './lib/tradeJournal'
import type { PrivateTrade } from '../src/types/privateTradeJournal'

const input = process.argv[2] ?? 'data/private/trades/trades.json'
const output = process.argv[3] ?? 'src/generated/privateTradeJournal.json'

function tradeToRow(trade: PrivateTrade) {
  return {
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
  }
}

async function main() {
  const trades = existsSync(input) ? await readJson<PrivateTrade[]>(input, []) : []
  const journal = buildTradeJournal(trades.map(tradeToRow), input)
  await writeJson(output, journal)
  console.log(`Wrote ${output} (${journal.summary.tradeCount} trades)`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
