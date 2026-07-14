import { companyWatchlist } from './lib/watchlist'
import { compactSecSubmissions } from './lib/generated_retention'
import { assertNonEmpty, fetchJson, nowIso, requiredEnv, writeJson } from './lib/io'

const outputPath = 'src/generated/raw/filings.json'
const openDartApiKey = requiredEnv('OPENDART_API_KEY')
const secUserAgent = requiredEnv('SEC_USER_AGENT')

type OpenDartDisclosure = {
  stock_code?: string
  corp_name?: string
  report_nm?: string
  rcept_dt?: string
  rcept_no?: string
}

async function fetchSecSubmissions(cik: string) {
  const padded = cik.padStart(10, '0')
  const url = `https://data.sec.gov/submissions/CIK${padded}.json`
  return fetchJson(url, {
    'User-Agent': secUserAgent,
    Accept: 'application/json'
  })
}

function dateDaysAgo(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10).replaceAll('-', '')
}

async function fetchOpenDartDisclosures() {
  const koreanStockCodes = companyWatchlist
    .filter(company => company.country === 'South Korea')
    .map(company => company.ticker.replace('.KS', '').padStart(6, '0'))
  const url = new URL('https://opendart.fss.or.kr/api/list.json')
  url.searchParams.set('crtfc_key', openDartApiKey)
  url.searchParams.set('bgn_de', dateDaysAgo(30))
  url.searchParams.set('page_count', '100')
  const data = await fetchJson(url.toString())
  if (data.status !== '000') {
    throw new Error(`OpenDART status ${data.status}: ${data.message ?? 'request failed'}`)
  }
  const records = assertNonEmpty((data.list ?? []) as OpenDartDisclosure[], 'OpenDART recent disclosures')
  const matchedWatchlistRecords = records.filter(record => koreanStockCodes.includes(record.stock_code ?? ''))

  return {
    provider: 'OpenDART',
    sourceUrl: 'https://engopendart.fss.or.kr/intro/main.do',
    status: 'source',
    records,
    matchedWatchlistRecords: matchedWatchlistRecords.length,
    note: 'Records are recent public disclosures. Watchlist records are matched by Korea Exchange stock code when present.'
  }
}

async function main() {
  const retrievedAt = nowIso()
  const sec = []
  const failures: string[] = []

  for (const company of companyWatchlist.filter(company => 'cik' in company)) {
    try {
      sec.push({
        ticker: company.ticker,
        cik: company.cik,
        status: 'source',
        data: compactSecSubmissions(await fetchSecSubmissions(company.cik))
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(`${company.ticker}: ${message}`)
      sec.push({
        ticker: company.ticker,
        cik: company.cik,
        status: 'unavailable',
        error: message,
        data: null
      })
    }
  }

  assertNonEmpty(sec.filter(record => record.status === 'source'), 'SEC EDGAR submissions')
  let openDart
  try {
    openDart = await fetchOpenDartDisclosures()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    failures.push(`OpenDART: ${message}`)
    openDart = {
      provider: 'OpenDART',
      sourceUrl: 'https://engopendart.fss.or.kr/intro/main.do',
      status: 'unavailable',
      error: message,
      records: []
    }
  }

  await writeJson(outputPath, {
    retrievedAt,
    status: failures.length === 0 ? 'source' : 'failed',
    failures,
    sec: {
      provider: 'SEC EDGAR',
      sourceUrl: 'https://data.sec.gov/',
      records: sec
    },
    openDart
  })
  if (failures.length > 0) {
    throw new Error(`Filings ingestion failed: ${failures.join('; ')}`)
  }
  console.log(`Wrote ${outputPath}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
