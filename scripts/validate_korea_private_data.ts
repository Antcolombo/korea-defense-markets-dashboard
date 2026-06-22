import { readJson } from './lib/io'
import { validateIndexRows, validateMacroFlowSeries, type IndexPriceRow, type MacroFlowSeries } from './lib/koreaPrivateData'

async function validateIndex(path = 'data/private/korea-index-prices.json') {
  const rows = await readJson<IndexPriceRow[]>(path, [])
  validateIndexRows(rows, {
    labelPrefix: path,
    emptyIndexRows: `${path}: no rows found`,
    missingIndexTicker: ticker => `${path}: missing ${ticker}`
  })
  return rows.length
}

async function validateMacro(path = 'data/private/korea-macro-flows.json') {
  const series = await readJson<MacroFlowSeries[]>(path, [])
  validateMacroFlowSeries(series, {
    labelPrefix: path,
    emptyMacroSeries: `${path}: no series found`,
    missingMacroSeries: ticker => `${path}: missing ${ticker}`,
    missingMacroMetadata: ticker => `${path}: ${ticker}: missing metadata`,
    emptyMacroObservations: ticker => `${path}: ${ticker}: no observations`
  })
  let observations = 0
  for (const item of series) {
    observations += item.observations.length
  }
  return observations
}

async function main() {
  const indexCount = await validateIndex(process.argv[2] ?? 'data/private/korea-index-prices.json')
  const macroCount = await validateMacro(process.argv[3] ?? 'data/private/korea-macro-flows.json')
  console.log(`Validated Korea private data: ${indexCount} index rows, ${macroCount} macro/flow observations`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
