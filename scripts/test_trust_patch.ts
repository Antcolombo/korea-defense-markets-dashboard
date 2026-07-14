import assert from 'node:assert/strict'
import { metric, pointInTime } from '../src/lib/data/availability'
import { createApiResponse, createShellMeta } from '../src/lib/research/api'
import { unavailableFieldVisibility } from '../src/lib/research/datasetRegistry'
import { crowdingLabel, crowdingScoreFromComponents, extensionRiskScoreFromComponents, setupLabel } from '../src/lib/research/crowdingScores'

function testMetricReasonOnlyOnMissing() {
  const realValue = metric(100, 'PARTIAL', 'Crowding snapshot missing')
  assert.equal(realValue.value, 100)
  assert.equal(realValue.reason, undefined)

  const missingValue = metric(null, 'UNAVAILABLE', 'Crowding snapshot missing')
  assert.equal(missingValue.value, null)
  assert.equal(missingValue.reason, 'Crowding snapshot missing')
}

function testDeferredRegistryExactness() {
  assert.equal(unavailableFieldVisibility({ field: 'crowding.optionsScore', reason: 'Options component missing' }), 'deferred')
  assert.equal(unavailableFieldVisibility({ field: 'shortVolumeRatio', reason: 'FINRA short-sale volume row missing' }), 'deferred')
  assert.equal(unavailableFieldVisibility({ field: 'caption', reason: 'optionality is a normal word here' }), 'active')
  assert.equal(unavailableFieldVisibility({ field: 'macrobioticSignal', reason: 'not a macro provider field' }), 'active')
}

function testProviderHealthSplit() {
  const point = pointInTime({
    asOfDate: '2026-06-22',
    observedAt: '2026-06-22',
    provider: 'Postgres',
    source: 'theme basket taxonomy + sourced snapshots',
    dataStatus: 'PARTIAL'
  })
  const response = createApiResponse({
    crowding: [{
      ...point,
      ticker: 'MRVL',
      crowdingScore: metric(100, 'PARTIAL', 'Crowding snapshot missing'),
      optionsScore: metric(null, 'UNAVAILABLE', 'Options component missing')
    }]
  })
  const shell = createShellMeta(response)
  const postgres = shell.providerHealth.find(item => item.id === 'postgres')

  assert.equal(response.unavailableFields.length, 0)
  assert.equal(response.deferredUnavailableFields.length, 1)
  assert.equal(postgres?.status, 'available')
  assert.ok(shell.deferredProviderHealth.some(item => item.id === 'polygon-options'))
}

function testMrvlScoreSemantics() {
  const crowdingScore = crowdingScoreFromComponents({
    momentumScore: 100,
    volumeScore: 100,
    optionsScore: 100,
    shortInterestScore: null
  })
  const extensionRiskScore = extensionRiskScoreFromComponents({
    volatilityScore: 100,
    distanceFrom20dMa: 25,
    distanceFrom50dMa: 25
  })
  const unsupportedSetup = setupLabel({ crowdingScore, extensionRiskScore, catalystSupportScore: null })
  const supportedSetup = setupLabel({ crowdingScore, extensionRiskScore, catalystSupportScore: 80 })

  assert.equal(crowdingScore, 100)
  assert.equal(crowdingLabel(crowdingScore), 'Crowded Sponsorship')
  assert.equal(unsupportedSetup, 'Extended / Catalyst Unconfirmed')
  assert.equal(supportedSetup, 'Catalyst-Supported Extension')
  assert.notEqual(unsupportedSetup, 'Reversal Risk')
}

function testGeneratedShellUsesActualProviders() {
  const previous = process.env.RESEARCH_DATA_MODE
  process.env.RESEARCH_DATA_MODE = 'generated'
  const sourced = pointInTime({
    asOfDate: '2026-07-13',
    observedAt: '2026-07-14',
    provider: 'Nasdaq Historical',
    source: 'Nasdaq Historical daily close',
    dataStatus: 'AVAILABLE'
  })
  const missing = pointInTime({
    provider: 'not configured',
    source: 'signal snapshot',
    dataStatus: 'UNAVAILABLE'
  })
  const shell = createShellMeta(createApiResponse({
    rows: [
      { ...sourced, return20d: metric(4.2, 'AVAILABLE') },
      { ...missing, return20d: metric(null, 'UNAVAILABLE', 'Signal snapshot missing') }
    ]
  }))

  assert.equal(shell.sourceStates.find(item => item.key === 'prices')?.status, 'available')
  assert.equal(shell.sourceStates.find(item => item.key === 'catalyst')?.status, 'available')
  assert.ok(shell.providerHealth.some(item => item.label === 'Nasdaq / FRED market data'))
  assert.ok(!shell.providerHealth.some(item => item.label === 'Postgres' || item.label === 'Polygon OHLCV'))
  if (previous === undefined) delete process.env.RESEARCH_DATA_MODE
  else process.env.RESEARCH_DATA_MODE = previous
}

testMetricReasonOnlyOnMissing()
testDeferredRegistryExactness()
testProviderHealthSplit()
testMrvlScoreSemantics()
testGeneratedShellUsesActualProviders()

console.log('Trust patch regression tests passed')
