import { demoModeAsOfDate, fetchWithProviderTimeout, nowMeta, providerError, type ProviderFetchResult, type ProviderRowMeta } from './common'

export type FinraShortRow = ProviderRowMeta & {
  ticker: string
  date: Date
  shortInterest: number | null
  shortVolume: number | null
  shortVolumeRatio: number | null
  raw: unknown
}

type FinraTokenResponse = {
  access_token?: string
  expires_in?: number | string
  error?: string
  error_description?: string
}

type FinraDatasetConfig = {
  group: string
  dataset: string
  symbolField: string
  sortField: string
}

const consolidatedShortInterestDataset: FinraDatasetConfig = {
  group: 'otcMarket',
  dataset: 'consolidatedShortInterest',
  symbolField: 'symbolCode',
  sortField: 'settlementDate'
}

const regShoDailyDataset: FinraDatasetConfig = {
  group: 'otcMarket',
  dataset: 'regShoDaily',
  symbolField: 'securitiesInformationProcessorSymbolIdentifier',
  sortField: 'tradeReportDate'
}

let tokenCache: { accessToken: string; expiresAt: number } | null = null

export async function fetchFinraShortData(ticker: string): Promise<ProviderFetchResult<FinraShortRow>> {
  const demoAsOf = demoModeAsOfDate()
  if (demoAsOf) return providerError(`DEMO_AS_OF_DATE=${process.env.DEMO_AS_OF_DATE} blocks live FINRA fetches`, 'UNAVAILABLE')
  const tokenResult = await getFinraToken()
  let shortInterest: ProviderFetchResult<Record<string, unknown>>
  let shortVolumeFromApi: ProviderFetchResult<Record<string, unknown>>
  if (tokenResult.accessToken) {
    [shortInterest, shortVolumeFromApi] = await Promise.all([
      queryFinraDataset(tokenResult.accessToken, consolidatedShortInterestDataset, ticker),
      queryFinraDataset(tokenResult.accessToken, regShoDailyDataset, ticker)
    ])
  } else {
    shortInterest = providerError(tokenResult.error ?? 'FINRA credentials are not configured', tokenResult.entitlement ? 'ENTITLEMENT_MISSING' : 'UNAVAILABLE')
    shortVolumeFromApi = { rows: [], status: 'UNAVAILABLE' }
  }
  const publicShortVolume = shortVolumeFromApi.rows.length > 0 ? null : await queryPublicRegShoDaily(ticker)
  const shortVolume = shortVolumeFromApi.rows.length > 0 || !publicShortVolume ? shortVolumeFromApi : publicShortVolume

  if (shortInterest.status === 'PROVIDER_ERROR' && shortVolume.status === 'PROVIDER_ERROR') {
    return providerError(shortInterest.errorMessage ?? shortVolume.errorMessage ?? `FINRA provider error for ${ticker}`)
  }
  if (shortInterest.status === 'ENTITLEMENT_MISSING' && shortVolume.status === 'ENTITLEMENT_MISSING') {
    return providerError(shortInterest.errorMessage ?? shortVolume.errorMessage ?? `FINRA entitlement missing for ${ticker}`, 'ENTITLEMENT_MISSING')
  }

  const latestShortInterest = newestRecord(shortInterest.rows)
  const latestShortVolume = newestRecord(shortVolume.rows)
  const asOfDate = dateFromRecord(latestShortInterest ?? latestShortVolume) ?? new Date()
  const shortVolumeValue = numberFromRecord(latestShortVolume, ['shortVolume', 'ShortVolume', 'shortSaleVolume', 'shortParQuantity'])
  const totalVolume = numberFromRecord(latestShortVolume, ['totalVolume', 'TotalVolume', 'volume', 'totalParQuantity'])
  const status = latestShortInterest || latestShortVolume ? latestShortInterest && latestShortVolume ? 'AVAILABLE' : 'PARTIAL' : 'UNAVAILABLE'
  const source = publicShortVolume?.rows.length
    ? 'https://cdn.finra.org/equity/regsho/daily/; https://developer.finra.org/docs'
    : 'https://developer.finra.org/docs'
  const provider = publicShortVolume?.rows.length ? 'FINRA public Reg SHO + FINRA API' : 'FINRA'

  return {
    status,
    rows: [{
      ...nowMeta({
        asOfDate,
        observedAt: asOfDate,
        providerTimestamp: asOfDate,
        source,
        provider,
        dataStatus: status
      }),
      ticker,
      date: asOfDate,
      shortInterest: numberFromRecord(latestShortInterest, ['shortInterest', 'currentShortPositionQuantity']),
      shortVolume: shortVolumeValue,
      shortVolumeRatio: shortVolumeValue !== null && totalVolume && totalVolume > 0 ? shortVolumeValue / totalVolume : null,
      raw: { shortInterest: latestShortInterest, shortVolume: latestShortVolume }
    }]
  }
}

async function getFinraToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return { accessToken: tokenCache.accessToken, error: null, entitlement: false }
  const clientId = process.env.FINRA_CLIENT_ID?.trim() || process.env.FINRA_API_CLIENT_ID?.trim()
  const clientSecret = process.env.FINRA_CLIENT_SECRET?.trim() || process.env.FINRA_API_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return { accessToken: null, error: 'FINRA_CLIENT_ID or FINRA_CLIENT_SECRET is not configured', entitlement: false }
  try {
    const response = await fetchWithProviderTimeout('https://ews.fip.finra.org/fip/rest/ews/oauth2/access_token?grant_type=client_credentials', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        Accept: 'application/json'
      }
    })
    if (response.status === 401 || response.status === 403) return { accessToken: null, error: 'FINRA auth or entitlement failed', entitlement: true }
    if (!response.ok) return { accessToken: null, error: `${response.status} ${response.statusText} from FINRA token endpoint`, entitlement: false }
    const json = await response.json() as FinraTokenResponse
    if (json.access_token) {
      const expiresSeconds = Number(json.expires_in ?? 1800)
      tokenCache = {
        accessToken: json.access_token,
        expiresAt: Date.now() + Math.max(60, Math.min(expiresSeconds, 1800)) * 1000
      }
    }
    return { accessToken: json.access_token ?? null, error: json.error_description ?? json.error, entitlement: Boolean(json.error) }
  } catch (error) {
    return { accessToken: null, error: error instanceof Error ? error.message : 'FINRA token request failed', entitlement: false }
  }
}

async function queryFinraDataset(accessToken: string, config: FinraDatasetConfig, ticker: string): Promise<ProviderFetchResult<Record<string, unknown>>> {
  try {
    const response = await fetchWithProviderTimeout(`https://api.finra.org/data/group/${config.group}/name/${config.dataset}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        limit: 30,
        compareFilters: [{ compareType: 'equal', fieldName: config.symbolField, fieldValue: ticker }],
        sortFields: [config.sortField],
        descending: true
      })
    })
    if (response.status === 401 || response.status === 403) return providerError(`FINRA entitlement/auth failed for ${config.dataset}`, 'ENTITLEMENT_MISSING')
    if (!response.ok) return providerError(`${response.status} ${response.statusText} for FINRA ${config.dataset}`)
    const json = await response.json()
    return { rows: Array.isArray(json) ? json as Record<string, unknown>[] : [], status: 'AVAILABLE' }
  } catch (error) {
    return providerError(error instanceof Error ? error.message : `FINRA ${config.dataset} request failed`)
  }
}

async function queryPublicRegShoDaily(ticker: string): Promise<ProviderFetchResult<Record<string, unknown>>> {
  if (process.env.FINRA_ENABLE_PUBLIC_REGSHO_FALLBACK === 'false') return { rows: [], status: 'UNAVAILABLE' }
  const lookbackDays = Number(process.env.FINRA_REGSHO_PUBLIC_LOOKBACK_DAYS ?? 14)
  const dates = recentBusinessDates(new Date(), Number.isFinite(lookbackDays) && lookbackDays > 0 ? lookbackDays : 14)
  for (const date of dates) {
    const url = `https://cdn.finra.org/equity/regsho/daily/CNMSshvol${yyyymmdd(date)}.txt`
    try {
      const response = await fetchWithProviderTimeout(url, { headers: { Accept: 'text/plain' } })
      if (response.status === 404) continue
      if (!response.ok) continue
      const text = await response.text()
      const row = parseRegShoText(text, ticker)
      if (row) return { rows: [{ ...row, sourceUrl: url }], status: 'AVAILABLE' }
    } catch {
      continue
    }
  }
  return { rows: [], status: 'UNAVAILABLE', errorMessage: `No public FINRA Reg SHO daily row found for ${ticker}` }
}

function newestRecord(rows: Record<string, unknown>[]) {
  return rows[0] ?? null
}

function dateFromRecord(record: Record<string, unknown> | null) {
  if (!record) return null
  const value = record.settlementDate ?? record.reportingPeriodDate ?? record.tradeReportDate ?? record.Date ?? record.date
  if (typeof value !== 'string') return null
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) ? date : null
}

function numberFromRecord(record: Record<string, unknown> | null, fields: string[]) {
  if (!record) return null
  for (const field of fields) {
    const value = record[field]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value.replace(/,/g, ''))
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

function parseRegShoText(text: string, ticker: string) {
  const lines = text.trim().split(/\r?\n/)
  const header = lines.shift()?.split('|') ?? []
  const symbolIndex = header.indexOf('Symbol')
  if (symbolIndex < 0) return null
  for (const line of lines) {
    const values = line.split('|')
    if (values[symbolIndex]?.toUpperCase() !== ticker.toUpperCase()) continue
    const row: Record<string, unknown> = {}
    header.forEach((field, index) => {
      row[field] = values[index] ?? ''
    })
    row.tradeReportDate = normalizeRegShoDate(String(row.Date ?? ''))
    row.shortVolume = row.ShortVolume
    row.totalVolume = row.TotalVolume
    return row
  }
  return null
}

function normalizeRegShoDate(value: string) {
  return value.length === 8 ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value
}

function recentBusinessDates(start: Date, count: number) {
  const dates: Date[] = []
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))
  while (dates.length < count) {
    const day = cursor.getUTCDay()
    if (day !== 0 && day !== 6) dates.push(new Date(cursor))
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return dates
}

function yyyymmdd(date: Date) {
  const year = date.getUTCFullYear()
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0')
  const day = `${date.getUTCDate()}`.padStart(2, '0')
  return `${year}${month}${day}`
}
