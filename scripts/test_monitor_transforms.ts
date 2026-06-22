import assert from 'node:assert/strict'
import { indexedMove, moveModeForAsset, windowedRows } from '../src/lib/monitor'
import type { Asset } from '../src/types/asset'

const equity = { assetClass: 'equity', sourceQuality: 'us-listed-source' } as Pick<Asset, 'assetClass' | 'sourceQuality'>
const macro = { assetClass: 'rate', sourceQuality: 'macro-source' } as Pick<Asset, 'assetClass' | 'sourceQuality'>

const rows = Array.from({ length: 40 }, (_, index) => ({
  date: `2026-04-${String(index + 1).padStart(2, '0')}`,
  price: 100 + index
})).map((row, index) => ({
  ...row,
  date: index < 30 ? row.date : `2026-05-${String(index - 29).padStart(2, '0')}`
}))

assert.equal(windowedRows(rows, '7D').at(-1)?.date, '2026-05-10')
assert.ok(windowedRows(rows, '7D').length >= 2)
assert.ok(windowedRows(rows, '30D').length >= windowedRows(rows, '7D').length)
assert.equal(windowedRows(rows, 'YTD')[0]?.date, '2026-04-01')
assert.equal(windowedRows([{ date: '2026-05-01', price: 100 }], '30D').length, 1)
assert.deepEqual(windowedRows([], '1Y'), [])

assert.equal(moveModeForAsset(equity), 'percent')
assert.equal(moveModeForAsset(macro), 'level')
assert.equal(indexedMove(equity, 100, 110), 10)
assert.equal(indexedMove(equity, 0, 110), 0)
assert.equal(indexedMove(macro, 4.25, 4.5), 0.25)
assert.equal(indexedMove(macro, 4.25, 4.0), -0.25)

const flatRows = [
  { date: '2026-05-01', price: 100 },
  { date: '2026-05-02', price: 100 }
]
assert.equal(indexedMove(equity, flatRows[0].price, flatRows[1].price), 0)

console.log('monitor transform tests passed')
