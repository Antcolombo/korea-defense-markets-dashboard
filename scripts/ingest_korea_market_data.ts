import { fetchJson, nowIso, readJson, sleep, writeJson } from './lib/io'

const outputPath = 'src/generated/raw/korea.market.json'
const dataGoKrKey = (process.env.DATA_GO_KR_SERVICE_KEY ?? process.env.KOREA_STOCK_API_KEY ?? '').trim()

const localEquities = [
  { ticker: '005930.KS', code: '005930', name: 'Samsung Electronics' },
  { ticker: '000660.KS', code: '000660', name: 'SK Hynix' },
  { ticker: '012450.KS', code: '012450', name: 'Hanwha Aerospace' },
  { ticker: '079550.KS', code: '079550', name: 'LIG Nex1' },
  { ticker: '047810.KS', code: '047810', name: 'Korea Aerospace Industries' },
  { ticker: '064350.KS', code: '064350', name: 'Hyundai Rotem' },
  { ticker: '042660.KS', code: '042660', name: 'Hanwha Ocean' }
]

type PriceRow = {
  date: string
  close: number
  volume: number | null
}

function yyyymmdd(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}

function dashedDate(value: string) {
  return value.length === 8 ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value
}

function parseNumber(value: unknown) {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return NaN
  return Number(value.replace(/[$,]/g, '').trim())
}

async function fetchDataGoKrDaily(code: string): Promise<PriceRow[]> {
  const end = new Date()
  const start = new Date(end)
  start.setMonth(start.getMonth() - 9)
  const url = new URL('https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo')
  url.searchParams.set('serviceKey', dataGoKrKey)
  url.searchParams.set('resultType', 'json')
  url.searchParams.set('numOfRows', '240')
  url.searchParams.set('pageNo', '1')
  url.searchParams.set('beginBasDt', yyyymmdd(start))
  url.searchParams.set('endBasDt', yyyymmdd(end))
  url.searchParams.set('likeSrtnCd', code)

  const data = await fetchJson(url.toString()) as {
    response?: {
      header?: { resultCode?: string; resultMsg?: string }
      body?: { items?: { item?: Record<string, unknown>[] | Record<string, unknown> } }
    }
  }
  const header = data.response?.header
  if (header?.resultCode && header.resultCode !== '00') {
    throw new Error(`data.go.kr ${code}: ${header.resultMsg ?? header.resultCode}`)
  }

  const item = data.response?.body?.items?.item
  const rows = (Array.isArray(item) ? item : item ? [item] : [])
    .map(row => ({
      date: dashedDate(String(row.basDt ?? '')),
      close: parseNumber(row.clpr),
      volume: Number.isFinite(parseNumber(row.trqu)) ? parseNumber(row.trqu) : null
    }))
    .filter(row => row.date && Number.isFinite(row.close))
    .sort((a, b) => a.date.localeCompare(b.date))

  if (rows.length === 0) throw new Error(`data.go.kr ${code}: missing stock price rows`)
  return rows
}

async function readKrxIndexExport(): Promise<{ symbol: string; provider: string; sourceUrl: string; status: string; rows: PriceRow[] }[]> {
  const records = await readJson<{ ticker: string; date: string; close: number; volume?: number | null }[]>('data/private/korea-index-prices.json', [])
  const grouped = new Map<string, PriceRow[]>()
  for (const record of records) {
    if (!['KOSPI', 'KOSDAQ'].includes(record.ticker)) continue
    if (!record.date || !Number.isFinite(Number(record.close))) continue
    const rows = grouped.get(record.ticker) ?? []
    rows.push({ date: record.date, close: Number(record.close), volume: record.volume ?? null })
    grouped.set(record.ticker, rows)
  }
  return Array.from(grouped.entries()).map(([symbol, rows]) => ({
    symbol,
    provider: 'KRX Data Marketplace export',
    sourceUrl: 'https://data.krx.co.kr/contents/MDC/MAIN/main/index.cmd?locale=en',
    status: rows.length > 0 ? 'source' : 'unavailable',
    rows: rows.sort((a, b) => a.date.localeCompare(b.date))
  }))
}

async function main() {
  const retrievedAt = nowIso()
  const failures: string[] = []
  const series: { symbol: string; provider: string; sourceUrl: string; status: string; rows: PriceRow[]; error?: string }[] = []

  if (dataGoKrKey) {
    for (const item of localEquities) {
      try {
        series.push({
          symbol: item.ticker,
          provider: 'data.go.kr FSC stock price information',
          sourceUrl: 'https://www.data.go.kr/en/data/15094808/openapi.do',
          status: 'source',
          rows: await fetchDataGoKrDaily(item.code)
        })
        await sleep(250)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        failures.push(message)
        series.push({
          symbol: item.ticker,
          provider: 'data.go.kr FSC stock price information',
          sourceUrl: 'https://www.data.go.kr/en/data/15094808/openapi.do',
          status: 'unavailable',
          error: message,
          rows: []
        })
      }
    }
  } else {
    failures.push('DATA_GO_KR_SERVICE_KEY is not configured; Korean local equities remain evidence-only until official KRX-backed prices are available.')
  }

  const indexSeries = await readKrxIndexExport()
  if (indexSeries.length > 0) series.push(...indexSeries)
  if (!indexSeries.some(item => item.symbol === 'KOSPI')) failures.push('KOSPI index prices require data/private/korea-index-prices.json exported from KRX Data Marketplace.')
  if (!indexSeries.some(item => item.symbol === 'KOSDAQ')) failures.push('KOSDAQ index prices require data/private/korea-index-prices.json exported from KRX Data Marketplace.')

  const sourceCount = series.filter(item => item.status === 'source').length
  await writeJson(outputPath, {
    provider: 'Korea official market data',
    sourceUrl: 'https://www.data.go.kr/en/data/15094808/openapi.do',
    retrievedAt,
    status: sourceCount > 0 ? 'source' : 'not_configured',
    failures,
    series
  })
  console.log(`Wrote ${outputPath} (${sourceCount} sourced Korea series)`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
