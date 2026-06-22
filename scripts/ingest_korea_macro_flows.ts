import { fetchJson, nowIso, readJson, writeJson } from './lib/io'

const outputPath = 'src/generated/raw/korea.macro-flows.json'
const ecosKey = (process.env.BOK_ECOS_API_KEY ?? '').trim()

type MacroFlowObservation = {
  date: string
  value: number
  unit: string
}

type MacroFlowSeries = {
  ticker: string
  name: string
  provider: string
  sourceUrl: string
  status: string
  unit: string
  observations: MacroFlowObservation[]
  error?: string
}

const privateSeriesPath = 'data/private/korea-macro-flows.json'

function parseNumber(value: unknown) {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return NaN
  return Number(value.replace(/[$,%]/g, '').trim())
}

function normalizeEcosDate(value: string) {
  if (value.length === 8) return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
  if (value.length === 6) return `${value.slice(0, 4)}-${value.slice(4, 6)}-01`
  if (value.length === 4) return `${value}-01-01`
  return value
}

async function fetchEcosSeries(config: {
  ticker: string
  name: string
  statCode: string
  frequency: string
  itemCode: string
  unit: string
  start: string
  end: string
}): Promise<MacroFlowSeries> {
  const url = `https://ecos.bok.or.kr/api/StatisticSearch/${ecosKey}/json/kr/1/1000/${config.statCode}/${config.frequency}/${config.start}/${config.end}/${config.itemCode}`
  const data = await fetchJson(url) as { StatisticSearch?: { row?: { TIME?: string; DATA_VALUE?: string; UNIT_NAME?: string }[] }; RESULT?: { MESSAGE?: string } }
  const rows = data.StatisticSearch?.row ?? []
  if (rows.length === 0) throw new Error(data.RESULT?.MESSAGE ?? `BOK ECOS returned zero rows for ${config.ticker}`)
  return {
    ticker: config.ticker,
    name: config.name,
    provider: 'Bank of Korea ECOS',
    sourceUrl: 'https://ecos.bok.or.kr/api/',
    status: 'source',
    unit: config.unit,
    observations: rows
      .map(row => ({ date: normalizeEcosDate(String(row.TIME ?? '')), value: parseNumber(row.DATA_VALUE), unit: row.UNIT_NAME ?? config.unit }))
      .filter(row => row.date && Number.isFinite(row.value))
      .sort((a, b) => a.date.localeCompare(b.date))
  }
}

function envSeriesConfig() {
  const today = new Date()
  const endMonth = today.toISOString().slice(0, 7).replace('-', '')
  const startMonth = `${today.getFullYear() - 3}01`
  const configs = []
  if (process.env.BOK_BASE_RATE_STAT_CODE && process.env.BOK_BASE_RATE_ITEM_CODE) {
    configs.push({
      ticker: 'BOK_BASE_RATE',
      name: 'Bank of Korea base rate',
      statCode: process.env.BOK_BASE_RATE_STAT_CODE,
      frequency: process.env.BOK_BASE_RATE_FREQUENCY ?? 'M',
      itemCode: process.env.BOK_BASE_RATE_ITEM_CODE,
      unit: '%',
      start: process.env.BOK_BASE_RATE_START ?? startMonth,
      end: process.env.BOK_BASE_RATE_END ?? endMonth
    })
  }
  if (process.env.BOK_CURRENT_ACCOUNT_STAT_CODE && process.env.BOK_CURRENT_ACCOUNT_ITEM_CODE) {
    configs.push({
      ticker: 'KR_CURRENT_ACCOUNT',
      name: 'Korea current account',
      statCode: process.env.BOK_CURRENT_ACCOUNT_STAT_CODE,
      frequency: process.env.BOK_CURRENT_ACCOUNT_FREQUENCY ?? 'M',
      itemCode: process.env.BOK_CURRENT_ACCOUNT_ITEM_CODE,
      unit: 'USD mn',
      start: process.env.BOK_CURRENT_ACCOUNT_START ?? startMonth,
      end: process.env.BOK_CURRENT_ACCOUNT_END ?? endMonth
    })
  }
  if (process.env.BOK_TRADE_BALANCE_STAT_CODE && process.env.BOK_TRADE_BALANCE_ITEM_CODE) {
    configs.push({
      ticker: 'KR_TRADE_BALANCE',
      name: 'Korea trade balance',
      statCode: process.env.BOK_TRADE_BALANCE_STAT_CODE,
      frequency: process.env.BOK_TRADE_BALANCE_FREQUENCY ?? 'M',
      itemCode: process.env.BOK_TRADE_BALANCE_ITEM_CODE,
      unit: 'USD mn',
      start: process.env.BOK_TRADE_BALANCE_START ?? startMonth,
      end: process.env.BOK_TRADE_BALANCE_END ?? endMonth
    })
  }
  return configs
}

async function main() {
  const retrievedAt = nowIso()
  const failures: string[] = []
  const series: MacroFlowSeries[] = []
  const privateSeries = await readJson<MacroFlowSeries[]>(privateSeriesPath, [])
  series.push(...privateSeries)

  if (ecosKey) {
    for (const config of envSeriesConfig()) {
      try {
        series.push(await fetchEcosSeries(config))
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        failures.push(message)
        series.push({
          ticker: config.ticker,
          name: config.name,
          provider: 'Bank of Korea ECOS',
          sourceUrl: 'https://ecos.bok.or.kr/api/',
          status: 'unavailable',
          unit: config.unit,
          observations: [],
          error: message
        })
      }
    }
    if (envSeriesConfig().length === 0) failures.push('BOK_ECOS_API_KEY is configured, but no BOK_* series mapping env vars are configured.')
  } else {
    failures.push('BOK_ECOS_API_KEY is not configured; BOK macro/rates inputs require ECOS series mappings or data/private/korea-macro-flows.json.')
  }

  if (!series.some(item => item.ticker === 'KR_FOREIGN_EQUITY_FLOW')) {
    failures.push('Foreign equity flow requires KRX investor-flow data in data/private/korea-macro-flows.json or a configured KRX API adapter.')
  }

  const sourceCount = series.filter(item => item.status === 'source' && item.observations.length > 0).length
  await writeJson(outputPath, {
    provider: 'Korea macro and flow inputs',
    sourceUrl: 'https://ecos.bok.or.kr/api/',
    retrievedAt,
    status: sourceCount > 0 ? 'source' : 'not_configured',
    failures,
    series
  })
  console.log(`Wrote ${outputPath} (${sourceCount} sourced Korea macro/flow series)`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
