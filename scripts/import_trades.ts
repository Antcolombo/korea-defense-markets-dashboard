import { writeJson } from './lib/io'
import { buildTradeJournal, validateTradeCsv } from './lib/tradeJournal'

const input = process.argv[2] ?? 'data/manual/trades.example.csv'
const output = process.argv[3] ?? 'data/private/trades/trades.json'

async function main() {
  const result = await validateTradeCsv(input)
  if (result.failures.length > 0) {
    console.error(result.failures.join('\n'))
    process.exit(1)
  }
  const journal = buildTradeJournal(result.rows, input)
  await writeJson(output, journal.trades)
  console.log(`Wrote ${output} (${journal.trades.length} trades)`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
