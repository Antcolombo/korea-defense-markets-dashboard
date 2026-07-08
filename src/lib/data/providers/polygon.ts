import { demoModeAsOfDate, fetchWithProviderTimeout, nowMeta, providerError, type ProviderFetchResult, type ProviderRowMeta } from './common'

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
  optionScoreProxy: number | null
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

type MassiveOptionContract = {
  ticker?: string
  contract_type?: 'call' | 'put' | string
  expiration_date?: string
  strike_price?: number
  exercise_style?: string
}

type MassiveOptionContractResponse = {
  status?: string
  results?: MassiveOptionContract[]
  error?: string
  message?: string
}

type MassiveOptionAggResponse = {
  status?: string
  results?: { v?: number; t?: number; o?: number; h?: number; l?: number; c?: number; vw?: number; n?: number }[]
  error?: string
  message?: string
}

let lastMassiveOptionsCallAt = 0

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

  try {
    const response = await fetchWithProviderTimeout(url)
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
  } catch (error) {
    return providerError(error instanceof Error ? error.message : `Polygon daily bars request failed for ${ticker}`)
  }
}

export async function fetchPolygonOptionSnapshot(ticker: string, input: { underlyingPrice?: number | null } = {}): Promise<ProviderFetchResult<PolygonOptionSnapshot>> {
  const demoAsOf = demoModeAsOfDate()
  if (demoAsOf && process.env.ALLOW_LIVE_POSITIONING_WITH_DEMO_ASOF !== 'true') return providerError(`DEMO_AS_OF_DATE=${process.env.DEMO_AS_OF_DATE} blocks live Polygon/Massive options fetches`, 'UNAVAILABLE')
  if (!massiveOptionsEnabled()) return providerError('Polygon/Massive options snapshot disabled; set ENABLE_MASSIVE_OPTIONS=true or ENABLE_POLYGON_OPTIONS=true. Free plans must throttle to 5 calls/min.', 'UNAVAILABLE')
  const apiKey = massiveApiKey()
  if (!apiKey) return providerError('MASSIVE_API_KEY or POLYGON_API_KEY is not configured', 'UNAVAILABLE')
  if (process.env.MASSIVE_OPTIONS_USE_SNAPSHOT !== 'true' && process.env.POLYGON_OPTIONS_USE_SNAPSHOT !== 'true') {
    return fetchMassiveOptionsBasicProxy(ticker, apiKey, input.underlyingPrice ?? null)
  }

  const baseUrl = process.env.MASSIVE_API_BASE_URL?.trim() || process.env.POLYGON_API_BASE_URL?.trim() || 'https://api.polygon.io'
  const url = new URL(`/v3/snapshot/options/${encodeURIComponent(ticker)}`, baseUrl)
  url.searchParams.set('limit', process.env.MASSIVE_OPTIONS_CHAIN_LIMIT?.trim() || '250')
  url.searchParams.set('apiKey', apiKey)

  try {
    const response = await fetchWithProviderTimeout(url)
    if (response.status === 401 || response.status === 403) return providerError(`Polygon/Massive options entitlement/auth failed for ${ticker}`, 'ENTITLEMENT_MISSING')
    if (response.status === 429) return providerError(`Polygon/Massive options rate limit hit for ${ticker}; free tier is 5 calls/min, set MASSIVE_OPTIONS_THROTTLE_MS=13000`, 'PROVIDER_ERROR')
    if (!response.ok) return providerError(`${response.status} ${response.statusText} for Polygon/Massive options ${ticker}`)
    const json = await response.json() as PolygonOptionResponse
    if (json.error || json.status === 'ERROR') return providerError(json.error ?? json.message ?? `Polygon/Massive options error for ${ticker}`)

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
      optionScoreProxy: null,
      raw: json,
      excludedUnavailableInputs
    }
    return { rows: [row], status }
  } catch (error) {
    return providerError(error instanceof Error ? error.message : `Polygon/Massive options request failed for ${ticker}`)
  }
}

async function fetchMassiveOptionsBasicProxy(ticker: string, apiKey: string, underlyingPrice: number | null): Promise<ProviderFetchResult<PolygonOptionSnapshot>> {
  const baseUrl = process.env.MASSIVE_API_BASE_URL?.trim() || process.env.POLYGON_API_BASE_URL?.trim() || 'https://api.massive.com'
  const limit = process.env.MASSIVE_OPTIONS_CHAIN_LIMIT?.trim() || '250'
  const calls = await fetchMassiveContracts(baseUrl, apiKey, ticker, 'call', limit)
  const puts = await fetchMassiveContracts(baseUrl, apiKey, ticker, 'put', limit)
  if (calls.status === 'PROVIDER_ERROR' || puts.status === 'PROVIDER_ERROR') {
    return providerError(calls.errorMessage ?? puts.errorMessage ?? `Massive Options Basic contract request failed for ${ticker}`)
  }
  if (calls.status === 'ENTITLEMENT_MISSING' || puts.status === 'ENTITLEMENT_MISSING') {
    return providerError(calls.errorMessage ?? puts.errorMessage ?? `Massive Options Basic entitlement missing for ${ticker}`, 'ENTITLEMENT_MISSING')
  }

  const callContracts = calls.rows
  const putContracts = puts.rows
  const selected = selectContractsForAggregateSample([...callContracts, ...putContracts], underlyingPrice)
  const aggregateSamples = []
  for (const contract of selected) {
    const sample = await fetchMassiveOptionAggregate(baseUrl, apiKey, contract)
    aggregateSamples.push(sample)
  }
  const sampledVolume = sum(aggregateSamples.map(sample => sample.volume ?? undefined))
  const callCount = callContracts.length
  const putCount = putContracts.length
  const listedPutCallRatio = callCount > 0 ? putCount / callCount : null
  const optionScoreProxy = optionScoreFromBasicProxy({
    callCount,
    putCount,
    sampledVolume
  })
  const excludedUnavailableInputs = [
    sampledVolume === null ? 'delayed options aggregate sample volume' : null,
    'open interest',
    'implied volatility',
    'live option chain snapshot'
  ].filter((item): item is string => Boolean(item))
  const status = callCount > 0 || putCount > 0 ? 'PARTIAL' : 'UNAVAILABLE'
  const asOfDate = new Date()
  return {
    status,
    rows: [{
      ...nowMeta({
        asOfDate,
        observedAt: asOfDate,
        providerTimestamp: asOfDate,
        source: 'https://massive.com/docs/rest/options/contracts; https://massive.com/docs/rest/options/aggregates',
        provider: 'Massive Options Basic',
        dataStatus: status
      }),
      ticker,
      optionsVolume: sampledVolume,
      openInterest: null,
      putCallRatio: listedPutCallRatio,
      impliedVolatility: null,
      optionScoreProxy,
      raw: {
        mode: 'options-basic-proxy',
        calls: callContracts,
        puts: putContracts,
        sampledContracts: selected,
        aggregateSamples,
        sampledVolume,
        listedPutCallRatio,
        optionScoreProxy,
        note: 'Options Basic does not entitle live snapshot, OI, IV, or trades. This uses contract reference plus delayed aggregate samples.'
      },
      excludedUnavailableInputs
    }]
  }
}

async function fetchMassiveContracts(baseUrl: string, apiKey: string, ticker: string, contractType: 'call' | 'put', limit: string): Promise<ProviderFetchResult<MassiveOptionContract>> {
  const url = new URL('/v3/reference/options/contracts', baseUrl)
  url.searchParams.set('underlying_ticker', ticker)
  url.searchParams.set('contract_type', contractType)
  url.searchParams.set('limit', limit)
  url.searchParams.set('apiKey', apiKey)
  await throttleMassiveOptionsBasic()
  const response = await fetchWithProviderTimeout(url)
  if (response.status === 401 || response.status === 403) return providerError(`Massive Options Basic entitlement/auth failed for ${ticker} ${contractType} contracts`, 'ENTITLEMENT_MISSING')
  if (response.status === 429) return providerError(`Massive Options Basic rate limit hit for ${ticker}; free tier is 5 calls/min, set MASSIVE_OPTIONS_THROTTLE_MS=13000`)
  if (!response.ok) return providerError(`${response.status} ${response.statusText} for Massive options contracts ${ticker}`)
  const json = await response.json() as MassiveOptionContractResponse
  if (json.error || json.status === 'ERROR') return providerError(json.error ?? json.message ?? `Massive options contracts error for ${ticker}`)
  return { rows: json.results ?? [], status: json.results?.length ? 'AVAILABLE' : 'UNAVAILABLE' }
}

async function fetchMassiveOptionAggregate(baseUrl: string, apiKey: string, contract: MassiveOptionContract) {
  if (!contract.ticker) return { contract, volume: null, status: 'UNAVAILABLE' }
  const to = new Date()
  const from = new Date(to)
  from.setUTCDate(to.getUTCDate() - Number(process.env.MASSIVE_OPTIONS_AGG_LOOKBACK_DAYS ?? 10))
  const url = new URL(`/v2/aggs/ticker/${encodeURIComponent(contract.ticker)}/range/1/day/${from.toISOString().slice(0, 10)}/${to.toISOString().slice(0, 10)}`, baseUrl)
  url.searchParams.set('adjusted', 'true')
  url.searchParams.set('sort', 'desc')
  url.searchParams.set('limit', '1')
  url.searchParams.set('apiKey', apiKey)
  await throttleMassiveOptionsBasic()
  const response = await fetchWithProviderTimeout(url)
  if (!response.ok) return { contract, volume: null, status: response.status === 403 ? 'ENTITLEMENT_MISSING' : 'UNAVAILABLE' }
  const json = await response.json() as MassiveOptionAggResponse
  const latest = json.results?.find(row => typeof row.v === 'number')
  return {
    contract,
    date: latest?.t ? new Date(latest.t).toISOString().slice(0, 10) : null,
    open: latest?.o ?? null,
    high: latest?.h ?? null,
    low: latest?.l ?? null,
    close: latest?.c ?? null,
    volume: latest?.v ?? null,
    vwap: latest?.vw ?? null,
    transactions: latest?.n ?? null,
    status: json.status ?? 'UNKNOWN'
  }
}

async function throttleMassiveOptionsBasic() {
  const throttleMs = Math.max(12_000, Number(process.env.MASSIVE_OPTIONS_THROTTLE_MS ?? process.env.POLYGON_OPTIONS_THROTTLE_MS ?? process.env.POLYGON_THROTTLE_MS ?? 13_000))
  const elapsed = Date.now() - lastMassiveOptionsCallAt
  if (lastMassiveOptionsCallAt > 0 && elapsed < throttleMs) {
    await new Promise(resolve => setTimeout(resolve, throttleMs - elapsed))
  }
  lastMassiveOptionsCallAt = Date.now()
}

function selectContractsForAggregateSample(contracts: MassiveOptionContract[], underlyingPrice: number | null) {
  const limit = Math.max(0, Math.min(50, Number(process.env.MASSIVE_OPTIONS_AGG_SAMPLE_LIMIT ?? 12)))
  if (limit === 0) return []
  const expiryLimit = Math.max(1, Math.min(12, Number(process.env.MASSIVE_OPTIONS_EXPIRY_LIMIT ?? 6)))
  const strikeWindowPct = Math.max(0, Math.min(100, Number(process.env.MASSIVE_OPTIONS_STRIKE_WINDOW_PCT ?? 20)))
  const allowedExpiries = new Set(
    [...new Set(contracts.map(contract => contract.expiration_date).filter((value): value is string => Boolean(value)))]
      .sort((a, b) => a.localeCompare(b))
      .slice(0, expiryLimit)
  )
  return contracts
    .filter(contract => contract.ticker && typeof contract.strike_price === 'number')
    .filter(contract => !allowedExpiries.size || allowedExpiries.has(String(contract.expiration_date ?? '')))
    .filter(contract => {
      if (!underlyingPrice || !strikeWindowPct) return true
      return Math.abs(((contract.strike_price ?? 0) / underlyingPrice) - 1) * 100 <= strikeWindowPct
    })
    .sort((a, b) => {
      const expiryCompare = String(a.expiration_date ?? '').localeCompare(String(b.expiration_date ?? ''))
      if (expiryCompare !== 0) return expiryCompare
      if (underlyingPrice !== null) return Math.abs((a.strike_price ?? 0) - underlyingPrice) - Math.abs((b.strike_price ?? 0) - underlyingPrice)
      return (a.strike_price ?? 0) - (b.strike_price ?? 0)
    })
    .slice(0, limit)
}

function optionScoreFromBasicProxy(input: { callCount: number; putCount: number; sampledVolume: number | null }) {
  const breadthScore = Math.min(70, Math.log10(Math.max(1, input.callCount + input.putCount)) * 28)
  const volumeScore = input.sampledVolume === null ? null : Math.min(100, Math.log10(Math.max(1, input.sampledVolume)) * 25)
  return Math.round((volumeScore === null ? breadthScore : (breadthScore * 0.45) + (volumeScore * 0.55)) * 10) / 10
}

function massiveOptionsEnabled() {
  return process.env.ENABLE_MASSIVE_OPTIONS === 'true' || process.env.ENABLE_POLYGON_OPTIONS === 'true'
}

function massiveApiKey() {
  return process.env.MASSIVE_API_KEY?.trim() || process.env.POLYGON_API_KEY?.trim() || ''
}

function sum(values: (number | undefined)[]) {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (valid.length === 0) return null
  return valid.reduce((total, value) => total + value, 0)
}
