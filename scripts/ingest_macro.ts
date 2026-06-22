import { assertNonEmpty, fetchJson, nowIso, readJson, requiredEnv, writeJson } from './lib/io'

const outputPath = 'src/generated/raw/macro.fred.json'
const apiKey = requiredEnv('FRED_API_KEY')

type FredSeriesResult = {
  id: string
  ticker: string
  name: string
  limit?: number
  status: string
  observations: unknown[]
  error?: string
  cacheFallback?: boolean
}

const series = [
  { id: 'SP500', ticker: 'SPX', name: 'S&P 500 Index' },
  { id: 'NASDAQCOM', ticker: 'QQQ', name: 'Nasdaq Composite Index' },
  { id: 'DTWEXBGS', ticker: 'DXY', name: 'Trade Weighted U.S. Dollar Index: Broad, Goods and Services' },
  { id: 'DGS2', ticker: 'US2Y', name: 'U.S. 2-year Treasury yield' },
  { id: 'DGS10', ticker: 'US10Y', name: 'U.S. 10-year Treasury yield' },
  { id: 'VIXCLS', ticker: 'VIX', name: 'CBOE Volatility Index' },
  { id: 'DEXKOUS', ticker: 'USDKRW', name: 'South Korean won per U.S. dollar' },
  { id: 'DEXJPUS', ticker: 'USDJPY', name: 'Japanese yen to U.S. dollar exchange rate' },
  { id: 'DCOILWTICO', ticker: 'OIL', name: 'WTI crude oil price' },
  { id: 'DCOILBRENTEU', ticker: 'BRENT', name: 'Brent crude oil price' },
  { id: 'IRLTLT01KRM156N', ticker: 'KR10Y', name: 'Korea long-term government bond yield' },
  { id: 'GASREGW', ticker: 'GASOLINE', name: 'US Regular All Formulations Gas Price', limit: 420 }
]

async function fetchFredSeries(id: string, limit = 180) {
  const url = new URL('https://api.stlouisfed.org/fred/series/observations')
  url.searchParams.set('series_id', id)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('file_type', 'json')
  url.searchParams.set('sort_order', 'desc')
  url.searchParams.set('limit', String(limit))
  const data = await fetchJson(url.toString())
  const observations = assertNonEmpty(data.observations ?? [], `FRED series ${id}`)
  return {
    id,
    status: 'source',
    observations
  }
}

async function main() {
  const retrievedAt = nowIso()
  const cached = await readJson<{ series?: FredSeriesResult[] }>(outputPath, {})
  const cachedById = new Map((cached.series ?? []).map(item => [item.id, item]))
  const results: FredSeriesResult[] = []
  const failures: string[] = []

  for (const item of series) {
    try {
      results.push({
        ...item,
        ...(await fetchFredSeries(item.id, item.limit))
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(`${item.id}: ${message}`)
      const cachedSeries = cachedById.get(item.id)
      if (cachedSeries && cachedSeries.observations.length > 0) {
        results.push({
          ...item,
          status: 'source',
          observations: cachedSeries.observations,
          error: message,
          cacheFallback: true
        })
        continue
      }
      results.push({
        ...item,
        status: 'unavailable',
        error: message,
        observations: []
      })
    }
  }

  assertNonEmpty(results.filter(item => item.status === 'source'), 'FRED macro data')
  await writeJson(outputPath, {
    provider: 'FRED',
    sourceUrl: 'https://fred.stlouisfed.org/docs/api/fred/',
    retrievedAt,
    status: results.some(item => item.status === 'unavailable') ? 'failed' : 'source',
    failures,
    series: results
  })
  if (results.some(item => item.status === 'unavailable')) {
    throw new Error(`FRED ingestion failed: ${failures.join('; ')}`)
  }
  console.log(`Wrote ${outputPath}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
