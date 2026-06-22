import { readFile } from 'node:fs/promises'
import { parseCsv, parseNumeric } from './lib/csv'
import { writeJson } from './lib/io'
import { validateMacroFlowSeries, type MacroFlowSeries } from './lib/koreaPrivateData'

async function main() {
  const input = process.argv[2] ?? 'data/manual/korea-macro-flows.example.csv'
  const output = process.argv[3] ?? 'data/private/korea-macro-flows.json'
  const grouped = new Map<string, MacroFlowSeries>()

  for (const row of parseCsv(await readFile(input, 'utf8'))) {
    const ticker = String(row.series ?? '').trim().toUpperCase()
    const date = String(row.date ?? '').trim()
    const label = `${ticker} ${date}`
    const current = grouped.get(ticker) ?? {
      ticker,
      name: String(row.sourceName ?? '').trim(),
      provider: String(row.provider ?? '').trim(),
      sourceUrl: String(row.sourceUrl ?? '').trim(),
      status: 'source' as const,
      unit: String(row.unit ?? '').trim(),
      observations: []
    }
    current.observations.push({
      date,
      value: parseNumeric(String(row.value ?? ''), `${label} value`),
      unit: String(row.unit ?? '').trim()
    })
    grouped.set(ticker, current)
  }

  const series = Array.from(grouped.values()).map(item => ({
    ...item,
    observations: item.observations.sort((a, b) => a.date.localeCompare(b.date))
  }))
  validateMacroFlowSeries(series)
  await writeJson(output, series.sort((a, b) => a.ticker.localeCompare(b.ticker)))
  console.log(`Wrote ${output} (${series.length} Korea macro/flow series)`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
