import { demoModeAsOfDate, nowMeta, providerError, type ProviderFetchResult, type ProviderRowMeta } from './common'

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
  error?: string
  error_description?: string
}

export async function fetchFinraShortData(ticker: string): Promise<ProviderFetchResult<FinraShortRow>> {
  const demoAsOf = demoModeAsOfDate()
  if (demoAsOf) return providerError(`DEMO_AS_OF_DATE=${process.env.DEMO_AS_OF_DATE} blocks live FINRA fetches`, 'UNAVAILABLE')
  const tokenResult = await getFinraToken()
  if (!tokenResult.accessToken) return providerError(tokenResult.error ?? 'FINRA credentials are not configured', tokenResult.entitlement ? 'ENTITLEMENT_MISSING' : 'UNAVAILABLE')

  const [shortInterest, shortVolume] = await Promise.all([
    queryFinraDataset(tokenResult.accessToken, 'otcMarket', 'consolidatedShortInterest', ticker),
    queryFinraDataset(tokenResult.accessToken, 'otcMarket', 'regShoDaily', ticker)
  ])
  if (shortInterest.status === 'PROVIDER_ERROR' || shortVolume.status === 'PROVIDER_ERROR') {
    return providerError(shortInterest.errorMessage ?? shortVolume.errorMessage ?? `FINRA provider error for ${ticker}`)
  }
  if (shortInterest.status === 'ENTITLEMENT_MISSING' || shortVolume.status === 'ENTITLEMENT_MISSING') {
    return providerError(shortInterest.errorMessage ?? shortVolume.errorMessage ?? `FINRA entitlement missing for ${ticker}`, 'ENTITLEMENT_MISSING')
  }

  const latestShortInterest = newestRecord(shortInterest.rows)
  const latestShortVolume = newestRecord(shortVolume.rows)
  const asOfDate = dateFromRecord(latestShortInterest ?? latestShortVolume) ?? new Date()
  const shortVolumeValue = numberFromRecord(latestShortVolume, ['shortVolume', 'shortSaleVolume'])
  const totalVolume = numberFromRecord(latestShortVolume, ['totalVolume', 'volume'])
  const status = latestShortInterest || latestShortVolume ? latestShortInterest && latestShortVolume ? 'AVAILABLE' : 'PARTIAL' : 'UNAVAILABLE'

  return {
    status,
    rows: [{
      ...nowMeta({
        asOfDate,
        observedAt: asOfDate,
        providerTimestamp: asOfDate,
        source: 'https://developer.finra.org/docs',
        provider: 'FINRA',
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
  const clientId = process.env.FINRA_CLIENT_ID?.trim()
  const clientSecret = process.env.FINRA_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return { accessToken: null, error: 'FINRA_CLIENT_ID or FINRA_CLIENT_SECRET is not configured', entitlement: false }
  const response = await fetch('https://ews.fip.finra.org/fip/rest/ews/oauth2/access_token?grant_type=client_credentials', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      Accept: 'application/json'
    }
  })
  if (response.status === 401 || response.status === 403) return { accessToken: null, error: 'FINRA auth or entitlement failed', entitlement: true }
  if (!response.ok) return { accessToken: null, error: `${response.status} ${response.statusText} from FINRA token endpoint`, entitlement: false }
  const json = await response.json() as FinraTokenResponse
  return { accessToken: json.access_token ?? null, error: json.error_description ?? json.error, entitlement: Boolean(json.error) }
}

async function queryFinraDataset(accessToken: string, group: string, dataset: string, ticker: string): Promise<ProviderFetchResult<Record<string, unknown>>> {
  const response = await fetch(`https://api.finra.org/data/group/${group}/name/${dataset}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      limit: 30,
      compareFilters: [{ compareType: 'equal', fieldName: 'symbolCode', fieldValue: ticker }],
      sortFields: ['settlementDate'],
      descending: true
    })
  })
  if (response.status === 401 || response.status === 403) return providerError(`FINRA entitlement/auth failed for ${dataset}`, 'ENTITLEMENT_MISSING')
  if (!response.ok) return providerError(`${response.status} ${response.statusText} for FINRA ${dataset}`)
  const json = await response.json()
  return { rows: Array.isArray(json) ? json as Record<string, unknown>[] : [], status: 'AVAILABLE' }
}

function newestRecord(rows: Record<string, unknown>[]) {
  return rows[0] ?? null
}

function dateFromRecord(record: Record<string, unknown> | null) {
  if (!record) return null
  const value = record.settlementDate ?? record.reportingPeriodDate ?? record.tradeReportDate ?? record.date
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
