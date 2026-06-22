import { readFile } from 'node:fs/promises'
import { parseCsv, parseNumeric } from './lib/csv'
import { writeJson } from './lib/io'
import { validateIndexRows } from './lib/koreaPrivateData'

async function main() {
  const input = process.argv[2] ?? 'data/manual/korea-index-prices.example.csv'
  const output = process.argv[3] ?? 'data/private/korea-index-prices.json'
  const records = parseCsv(await readFile(input, 'utf8')).map(row => ({
    ticker: String(row.ticker ?? '').trim().toUpperCase(),
    date: String(row.date ?? '').trim(),
    close: parseNumeric(String(row.close ?? ''), `${row.ticker} ${row.date} close`),
    volume: String(row.volume ?? '').trim() ? parseNumeric(String(row.volume), `${row.ticker} ${row.date} volume`) : null
  }))
  validateIndexRows(records)
  await writeJson(output, records.sort((a, b) => `${a.ticker}:${a.date}`.localeCompare(`${b.ticker}:${b.date}`)))
  console.log(`Wrote ${output} (${records.length} KRX index rows)`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
