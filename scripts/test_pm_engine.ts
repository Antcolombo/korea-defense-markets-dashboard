import assert from 'node:assert/strict'
import { buildPmEngineView } from '../src/lib/research/pm'
import { buildScenarios, probabilitiesFromConfidence } from '../src/lib/research/pm/expectedValue'
import { buildFactorModel, portfolioVariance } from '../src/lib/research/pm/factorRisk'
import { PM_DEFAULTS } from '../src/lib/research/pm/math'
import { buildSizingWaterfall } from '../src/lib/research/pm/sizing'
import { historicalRisk } from '../src/lib/research/pm/varStress'
import type { InvestmentDecisionRecord } from '../src/types/decision'

function testExpectedValue() {
  const probs = probabilitiesFromConfidence(70)
  assert.equal(Math.round(probs.bear + probs.base + probs.bull), 100)
  const { scenarios, expectedValuePct } = buildScenarios({ entryPrice: 100, targetPrice: 120, stopPrice: 92, side: 'long', confidence: 70 })
  assert.equal(scenarios.length, 3)
  assert.ok(expectedValuePct > 0)
  assert.ok(scenarios.every(scenario => Number.isFinite(scenario.contributionPct)))
}

function testSizing() {
  const sizing = buildSizingWaterfall({
    entryPrice: 100,
    stopPrice: 92,
    side: 'long',
    defaults: PM_DEFAULTS,
    annualizedVolPct: 35,
    liquidityDays: 1,
    beta: 0.7,
    currentGrossPct: 0,
    currentNetPct: 0,
    sectorGrossPct: 0,
    maxCorrelation: 0.2,
    costAdjustedEvPct: 6
  })
  assert.equal(Number(sizing.rawStopSizePct.toFixed(2)), 6.25)
  assert.ok(sizing.finalSizePct <= PM_DEFAULTS.maxSingleNamePct)
  assert.ok(sizing.sizingWaterfall.length >= 7)
}

function testFactorRisk() {
  const series = syntheticPrices()
  const model = buildFactorModel(series, ['AAA'], ['SPY', 'QQQ'])
  assert.ok(model.exposuresByTicker.AAA.length === 2)
  const variance = portfolioVariance({ tickers: ['AAA'], weights: [0.05], factorModel: model })
  assert.ok(variance >= 0)
}

function testVar() {
  const risk = historicalRisk([1, -1, 2, -3, 0.5, -0.2, 1.4, -2.1, 0.7, -0.6])
  assert.ok(risk.valueAtRisk95Pct >= 0)
  assert.ok(risk.expectedShortfallPct >= risk.valueAtRisk95Pct)
}

async function testSyntheticPmView() {
  const decision: InvestmentDecisionRecord = {
    id: 'decision_test',
    slug: 'nvda-test-pm',
    ticker: 'NVDA',
    companyName: 'NVIDIA',
    status: 'accepted',
    decision: 'long',
    marketBelief: 'Market belief',
    variantView: 'Variant view because sourced setup matters.',
    evidence: [
      { driver: 'RS', claim: 'Claim', sourcedEvidence: 'Evidence', sourceStatus: 'sourced', whyItMatters: 'Matters' },
      { driver: 'Risk', claim: 'Claim', sourcedEvidence: 'Evidence', sourceStatus: 'partial', whyItMatters: 'Matters' },
      { driver: 'Catalyst', claim: 'Claim', sourcedEvidence: 'Evidence', sourceStatus: 'partial', whyItMatters: 'Matters' }
    ],
    risk: {
      thesis: 'Synthetic PM engine test thesis.',
      decidedAt: new Date().toISOString(),
      entry: 'Entry',
      entryPrice: 100,
      targetPrice: 120,
      sizing: 'small',
      positionSizePct: 2,
      stop: 'Stop',
      stopPrice: 92,
      upside: 'Upside',
      downside: 'Downside',
      timeHorizon: '1-3 months',
      catalystDate: '',
      confidence: 70,
      whatWouldChangeMind: 'Invalidation'
    },
    invalidation: 'Invalidation',
    timeHorizon: '1-3 months',
    expectedReturn: 20,
    downside: -8,
    sourceSnapshot: null,
    outcomeReturn: null,
    lesson: '',
    isPublic: false,
    featuredRank: null,
    pmRead: {
      variantStrength: 'medium',
      evidenceQuality: 'partial',
      riskClarity: 'clear',
      whatWouldChangeMind: 'Invalidation',
      nextCatalystDate: 'Not set.'
    },
    readiness: { canAccept: true, canClose: false, missingForAccept: [], missingForClose: ['outcome return', 'lesson'] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  const fixedNow = new Date('2026-07-10T12:00:00.000Z')
  const pm = await buildPmEngineView([decision], () => fixedNow)
  assert.equal(pm.decisions.length, 1)
  assert.equal(pm.decisions[0].ticker, 'NVDA')
  assert.ok(pm.decisions[0].sizingWaterfall.length > 0)
  assert.ok(pm.decisions[0].sourceLights.length >= 6)
  assert.equal(pm.decisions[0].asOfDate, fixedNow.toISOString())
  assert.equal(pm.portfolio.asOfDate, fixedNow.toISOString())
}

function syntheticPrices() {
  const rows: Record<string, { date: string; price: number; volume: number }[]> = { AAA: [], SPY: [], QQQ: [] }
  for (let index = 0; index < 80; index += 1) {
    const date = new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10)
    rows.SPY.push({ date, price: 100 + index * 0.4, volume: 10_000_000 })
    rows.QQQ.push({ date, price: 120 + index * 0.6, volume: 8_000_000 })
    rows.AAA.push({ date, price: 50 + index * 0.5, volume: 1_000_000 })
  }
  return rows
}

async function main() {
  testExpectedValue()
  testSizing()
  testFactorRisk()
  testVar()
  await testSyntheticPmView()
  console.log('PM engine tests passed')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
