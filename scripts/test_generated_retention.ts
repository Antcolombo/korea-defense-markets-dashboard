import assert from 'node:assert/strict'
import { compactSecSubmissions } from './lib/generated_retention'

const dates = Array.from({ length: 140 }, (_, index) => `2026-01-${String(index + 1).padStart(2, '0')}`)
const compacted = compactSecSubmissions({
  cik: '0000123456',
  name: 'Example Defense',
  addresses: { business: { street: 'discard me' } },
  filings: {
    recent: { filingDate: dates, form: dates.map(() => '8-K') },
    files: [{ name: 'old-submissions.json' }]
  }
}) as unknown as {
  name: string
  addresses?: unknown
  filings: { recent: { filingDate: string[]; form: string[] }; files?: unknown }
  retention: { discardedRecentRows: number; discardedHistoricalFileIndexes: number }
}

assert.equal(compacted.name, 'Example Defense')
assert.equal(compacted.filings.recent.filingDate.length, 100)
assert.equal(compacted.filings.recent.form.length, 100)
assert.equal(compacted.retention.discardedRecentRows, 40)
assert.equal(compacted.retention.discardedHistoricalFileIndexes, 1)
assert.equal(compacted.addresses, undefined)
assert.equal(compacted.filings.files, undefined)
const compactedAgain = compactSecSubmissions(compacted) as unknown as typeof compacted
assert.equal(compactedAgain.retention.discardedRecentRows, 40)
assert.equal(compactedAgain.retention.discardedHistoricalFileIndexes, 1)
console.log('Generated retention tests passed')
