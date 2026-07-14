const DEFAULT_SEC_FILING_LIMIT = 100

type JsonRecord = Record<string, unknown>

export function compactSecSubmissions(value: unknown, limit = DEFAULT_SEC_FILING_LIMIT) {
  const source = record(value)
  const filings = record(source.filings)
  const recent = record(filings.recent)
  const previousRetention = record(source.retention)
  const originalRecentRows = maximumArrayLength(recent)
  const historicalFileIndexes = Array.isArray(filings.files) ? filings.files.length : 0

  const compactRecent = Object.fromEntries(Object.entries(recent).map(([key, item]) => [
    key,
    Array.isArray(item) ? item.slice(0, limit) : item
  ]))

  return {
    cik: source.cik,
    name: source.name,
    tickers: source.tickers,
    exchanges: source.exchanges,
    sic: source.sic,
    sicDescription: source.sicDescription,
    fiscalYearEnd: source.fiscalYearEnd,
    filings: { recent: compactRecent },
    retention: {
      policy: `latest-${limit}-filings`,
      retainedRecentRows: Math.min(originalRecentRows, limit),
      discardedRecentRows: number(previousRetention.discardedRecentRows) + Math.max(0, originalRecentRows - limit),
      discardedHistoricalFileIndexes: number(previousRetention.discardedHistoricalFileIndexes) + historicalFileIndexes
    }
  }
}

function maximumArrayLength(value: JsonRecord) {
  return Math.max(0, ...Object.values(value).map(item => Array.isArray(item) ? item.length : 0))
}

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
}

function number(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}
