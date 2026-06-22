import { assertNonEmpty, fetchJson, nowIso, requiredEnv, sleep, writeJson } from './lib/io'
import { getMarketDataInstruments, getMarketDataProvider } from './lib/priceProviders'

const outputPath = 'src/generated/raw/market.prices.json'
const provider = getMarketDataProvider()
const apiKey = provider === 'alpha_vantage' ? requiredEnv('ALPHA_VANTAGE_API_KEY') : ''
const instruments = getMarketDataInstruments()

type PriceRow = {
  date: string
  close: number
  volume: number | null
}

function parseNumber(value: unknown) {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return NaN
  return Number(value.replace(/[$,]/g, ''))
}

function normalizeUsDate(value: string) {
  const [month, day, year] = value.split('/')
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

async function fetchDaily(symbol: string) {
  const url = new URL('https://www.alphavantage.co/query')
  url.searchParams.set('function', 'TIME_SERIES_DAILY')
  url.searchParams.set('symbol', symbol)
  url.searchParams.set('outputsize', 'compact')
  url.searchParams.set('apikey', apiKey)
  const data = await fetchJson(url.toString())
  const timeSeries = data['Time Series (Daily)'] as Record<string, unknown> | undefined
  if (!timeSeries || Object.keys(timeSeries).length === 0) {
    const providerMessage = data.Note ?? data.Information ?? data['Error Message'] ?? 'missing Time Series (Daily)'
    throw new Error(`Alpha Vantage ${symbol}: ${providerMessage}`)
  }
  const rows = Object.entries(timeSeries)
    .map(([date, value]) => {
      const record = value as Record<string, string>
      return {
        date,
        close: parseNumber(record['4. close']),
        volume: parseNumber(record['5. volume'])
      }
    })
    .filter(row => Number.isFinite(row.close))
    .map(row => ({ ...row, volume: Number.isFinite(row.volume) ? row.volume : null }))
  return {
    symbol,
    provider: 'Alpha Vantage',
    sourceUrl: 'https://www.alphavantage.co/documentation/',
    status: 'source',
    rows
  }
}

async function fetchNasdaqDaily(symbol: string, assetClass: string): Promise<{ symbol: string; provider: string; sourceUrl: string; status: string; rows: PriceRow[] }> {
  const toDate = new Date()
  const fromDate = new Date(toDate)
  fromDate.setMonth(fromDate.getMonth() - 6)
  const formatDate = (date: Date) => date.toISOString().slice(0, 10)
  const url = new URL(`https://api.nasdaq.com/api/quote/${encodeURIComponent(symbol)}/historical`)
  url.searchParams.set('assetclass', assetClass)
  url.searchParams.set('fromdate', formatDate(fromDate))
  url.searchParams.set('todate', formatDate(toDate))
  url.searchParams.set('limit', '180')
  const data = await fetchJson(url.toString(), {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 KoreaMacroWorkbench/1.0'
  }) as { data?: { tradesTable?: { rows?: { date?: string; close?: string; volume?: string }[] } }; status?: { rCode?: number; developerMessage?: string } }
  const rows = (data.data?.tradesTable?.rows ?? [])
    .map(row => ({
      date: row.date ? normalizeUsDate(row.date) : '',
      close: parseNumber(row.close),
      volume: row.volume ? parseNumber(row.volume) : null
    }))
    .filter(row => row.date && Number.isFinite(row.close))
    .sort((a, b) => a.date.localeCompare(b.date))

  if (rows.length === 0) {
    throw new Error(`Nasdaq Historical ${symbol}: missing historical rows${data.status?.developerMessage ? ` (${data.status.developerMessage})` : ''}`)
  }

  return {
    symbol,
    provider: 'Nasdaq Historical',
    sourceUrl: 'https://api.nasdaq.com/api/quote/',
    status: 'source',
    rows
  }
}

async function main() {
  const retrievedAt = nowIso()
  const series = []
  const failures: string[] = []

  for (const instrument of instruments) {
    const symbol = instrument.providerSymbol ?? instrument.ticker
    try {
      series.push(provider === 'nasdaq' ? await fetchNasdaqDaily(symbol, instrument.assetClass ?? 'stocks') : await fetchDaily(symbol))
      if (provider === 'alpha_vantage') await sleep(13000)
      if (provider === 'nasdaq') await sleep(500)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(message)
      series.push({
        symbol,
        provider: provider === 'nasdaq' ? 'Nasdaq Historical' : 'Alpha Vantage',
        sourceUrl: provider === 'nasdaq' ? 'https://api.nasdaq.com/api/quote/' : 'https://www.alphavantage.co/documentation/',
        status: 'unavailable',
        error: message,
        rows: []
      })
    }
  }

  assertNonEmpty(series.filter(item => item.status === 'source'), `${provider === 'nasdaq' ? 'Nasdaq Historical' : 'Alpha Vantage'} market data`)
  await writeJson(outputPath, {
    provider: provider === 'nasdaq' ? 'Nasdaq Historical' : 'Alpha Vantage',
    sourceUrl: provider === 'nasdaq' ? 'https://api.nasdaq.com/api/quote/' : 'https://www.alphavantage.co/documentation/',
    retrievedAt,
    status: failures.length === 0 ? 'source' : 'failed',
    failures,
    series
  })
  if (failures.length > 0) {
    throw new Error(`${provider === 'nasdaq' ? 'Nasdaq Historical' : 'Alpha Vantage'} ingestion failed: ${failures.join('; ')}`)
  }
  console.log(`Wrote ${outputPath}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
