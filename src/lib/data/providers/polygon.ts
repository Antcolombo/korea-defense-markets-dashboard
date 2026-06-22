import { demoModeAsOfDate, nowMeta, providerError, type ProviderFetchResult, type ProviderRowMeta } from './common'

export type PolygonDailyBar = ProviderRowMeta & {
  ticker: string
  date: Date
  open: number | null
  high: number | null
  low: number | null
  close: number
  adjustedClose: number | null
  volume: bigint | null
}

export type PolygonOptionSnapshot = ProviderRowMeta & {
  ticker: string
  optionsVolume: number | null
  openInterest: number | null
  putCallRatio: number | null
  impliedVolatility: number | null
  raw: unknown
  excludedUnavailableInputs: string[]
}

type PolygonAggResponse = {
  status?: string
  results?: {
    t?: number
    o?: number
    h?: number
    l?: number
    c?: number
    v?: number
    vw?: number
  }[]
  error?: string
  message?: string
}

type PolygonOptionResponse = {
  status?: string
  results?: {
    details?: { contract_type?: string }
    day?: { volume?: number }
    greeks?: unknown
    implied_volatility?: number
    open_interest?: number
  }[]
  error?: string
  message?: string
}

export async function fetchPolygonDailyBars(ticker: string, from: string, to: string): Promise<ProviderFetchResult<PolygonDailyBar>> {
  const demoAsOf = demoModeAsOfDate()
  if (demoAsOf) return providerError(`DEMO_AS_OF_DATE=${process.env.DEMO_AS_OF_DATE} blocks live Polygon fetches`, 'UNAVAILABLE')
  const apiKey = process.env.POLYGON_API_KEY?.trim()
  if (!apiKey) return providerError('POLYGON_API_KEY is not configured', 'UNAVAILABLE')

  const url = new URL(`https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${from}/${to}`)
  url.searchParams.set('adjusted', 'true')
  url.searchParams.set('sort', 'asc')
  url.searchParams.set('limit', '50000')
  url.searchParams.set('apiKey', apiKey)

  const response = await fetch(url)
  if (response.status === 401 || response.status === 403) return providerError(`Polygon entitlement/auth failed for ${ticker}`, 'ENTITLEMENT_MISSING')
  if (!response.ok) return providerError(`${response.status} ${response.statusText} for Polygon daily bars ${ticker}`)
  const json = await response.json() as PolygonAggResponse
  if (json.error || json.status === 'ERROR') return providerError(json.error ?? json.message ?? `Polygon daily bars error for ${ticker}`)

  const rows = (json.results ?? []).flatMap(result => {
    if (!result.t || typeof result.c !== 'number') return []
    const date = new Date(result.t)
    const meta = nowMeta({
      asOfDate: date,
      observedAt: date,
      providerTimestamp: date,
      source: 'https://polygon.io/docs/rest/stocks/aggregates/custom-bars',
      provider: 'Polygon/Massive'
    })
    return [{
      ...meta,
      ticker,
      date,
      open: result.o ?? null,
      high: result.h ?? null,
      low: result.l ?? null,
      close: result.c,
      adjustedClose: result.c,
      volume: typeof result.v === 'number' ? BigInt(Math.round(result.v)) : null
    }]
  })

  return { rows, status: rows.length > 0 ? 'AVAILABLE' : 'UNAVAILABLE' }
}

export async function fetchPolygonOptionSnapshot(ticker: string): Promise<ProviderFetchResult<PolygonOptionSnapshot>> {
  const demoAsOf = demoModeAsOfDate()
  if (demoAsOf) return providerError(`DEMO_AS_OF_DATE=${process.env.DEMO_AS_OF_DATE} blocks live Polygon options fetches`, 'UNAVAILABLE')
  if (process.env.ENABLE_POLYGON_OPTIONS !== 'true') return providerError('Polygon/Massive options snapshot disabled; set ENABLE_POLYGON_OPTIONS=true for paid options plans', 'UNAVAILABLE')
  const apiKey = process.env.POLYGON_API_KEY?.trim()
  if (!apiKey) return providerError('POLYGON_API_KEY is not configured', 'UNAVAILABLE')

  const url = new URL(`https://api.polygon.io/v3/snapshot/options/${encodeURIComponent(ticker)}`)
  url.searchParams.set('limit', '250')
  url.searchParams.set('apiKey', apiKey)

  const response = await fetch(url)
  if (response.status === 401 || response.status === 403) return providerError(`Polygon options entitlement/auth failed for ${ticker}`, 'ENTITLEMENT_MISSING')
  if (!response.ok) return providerError(`${response.status} ${response.statusText} for Polygon options ${ticker}`)
  const json = await response.json() as PolygonOptionResponse
  if (json.error || json.status === 'ERROR') return providerError(json.error ?? json.message ?? `Polygon options error for ${ticker}`)

  const contracts = json.results ?? []
  const callVolume = sum(contracts.filter(item => item.details?.contract_type === 'call').map(item => item.day?.volume))
  const putVolume = sum(contracts.filter(item => item.details?.contract_type === 'put').map(item => item.day?.volume))
  const optionsVolume = sum(contracts.map(item => item.day?.volume))
  const openInterest = sum(contracts.map(item => item.open_interest))
  const ivValues = contracts.map(item => item.implied_volatility).filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  const impliedVolatility = ivValues.length > 0 ? ivValues.reduce((total, value) => total + value, 0) / ivValues.length : null
  const callVolumeValue = callVolume ?? 0
  const putVolumeValue = putVolume ?? 0
  const putCallRatio = callVolumeValue > 0 ? putVolumeValue / callVolumeValue : null
  const excludedUnavailableInputs = [
    optionsVolume === null ? 'options volume' : null,
    openInterest === null ? 'open interest' : null,
    impliedVolatility === null ? 'implied volatility' : null,
    putCallRatio === null ? 'put/call ratio' : null
  ].filter((item): item is string => Boolean(item))
  const status = excludedUnavailableInputs.length === 0 ? 'AVAILABLE' : contracts.length > 0 ? 'PARTIAL' : 'UNAVAILABLE'
  const asOfDate = new Date()
  const row = {
    ...nowMeta({
      asOfDate,
      observedAt: asOfDate,
      providerTimestamp: asOfDate,
      source: 'https://polygon.io/docs/rest/options/snapshots/option-chain-snapshot',
      provider: 'Polygon/Massive',
      dataStatus: status
    }),
    ticker,
    optionsVolume,
    openInterest,
    putCallRatio,
    impliedVolatility,
    raw: json,
    excludedUnavailableInputs
  }
  return { rows: [row], status }
}

function sum(values: (number | undefined)[]) {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (valid.length === 0) return null
  return valid.reduce((total, value) => total + value, 0)
}
