import assert from 'node:assert/strict'
import { buildPitchFromTemplate } from '../src/features/pitches/domain/builder'
import { priceFromReturn, recommendationFromMetrics, scenarioReturnMap } from '../src/features/pitches/domain/market-rules'
import { buildPitchReadiness } from '../src/features/pitches/domain/readiness'
import { coercePitch } from '../src/features/pitches/domain/normalization'

assert.equal(recommendationFromMetrics({ rs20d: 12, return20d: 10, catalystSupport: 70, extensionRisk: 30 }), 'long')
assert.equal(recommendationFromMetrics({ rs20d: -12, return20d: -10, catalystSupport: null, extensionRisk: null }), 'no-trade')
assert.equal(recommendationFromMetrics({ rs20d: 1, return20d: -1, catalystSupport: 40, extensionRisk: 80 }), 'watchlist')

const scenarios = scenarioReturnMap({
  rs20d: 8, rs60d: 12, return20d: 10, return60d: 20,
  crowding: 60, extensionRisk: 40, catalystSupport: 70
})
assert.deepEqual(scenarios, { bear: -3.6, base: 6.4, bull: 16.4 })
assert.equal(priceFromReturn(100, scenarios.base), 106.4)
assert.equal(priceFromReturn(0, 20), 0)

const fixedNow = () => new Date('2026-07-10T12:00:00.000Z')
const first = buildPitchFromTemplate({ ticker: 'nvda', companyName: 'NVIDIA', now: fixedNow })
const second = buildPitchFromTemplate({ ticker: 'nvda', companyName: 'NVIDIA', now: fixedNow })
assert.equal(first.setup.ticker, 'NVDA')
assert.equal(first.setup.companyName, 'NVIDIA')
assert.deepEqual(coercePitch(first, fixedNow), coercePitch(second, fixedNow), 'Pure template build is deterministic with an injected clock.')

const readiness = buildPitchReadiness(first)
assert.equal(readiness.canPromote, false)
assert.ok(readiness.missing.length > 0)

console.log('Pitch domain tests passed')
