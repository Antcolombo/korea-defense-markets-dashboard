import assert from 'node:assert/strict'
import { createInvestmentDecision } from '../src/lib/research/decisions'
import type { EvidenceDriver, RiskPlan } from '../src/types/decision'

const completeEvidence: EvidenceDriver[] = [
  {
    driver: 'Price and RS',
    claim: 'Claim',
    sourcedEvidence: 'Sourced evidence',
    sourceStatus: 'sourced',
    whyItMatters: 'Why it matters'
  },
  {
    driver: 'Positioning',
    claim: 'Claim',
    sourcedEvidence: 'Sourced evidence',
    sourceStatus: 'partial',
    whyItMatters: 'Why it matters'
  },
  {
    driver: 'Catalyst',
    claim: 'Claim',
    sourcedEvidence: 'Sourced evidence',
    sourceStatus: 'partial',
    whyItMatters: 'Why it matters'
  }
]

const completeRisk: RiskPlan = {
  thesis: 'Test thesis with variant decision rule.',
  decidedAt: new Date().toISOString(),
  entry: 'Entry rule',
  entryPrice: 100,
  targetPrice: 120,
  sizing: 'small',
  positionSizePct: 2,
  stop: 'Stop rule',
  stopPrice: 92,
  upside: 'Upside case',
  downside: 'Downside case',
  timeHorizon: '1-3 months',
  catalystDate: '',
  confidence: 62,
  whatWouldChangeMind: 'What would change mind'
}

async function rejectsAcceptedWithMissingJudgment() {
  await assert.rejects(
    () => createInvestmentDecision({ ticker: 'NVDA', status: 'accepted', decision: 'long' }),
    /Decision cannot be accepted yet/
  )
}

async function rejectsClosedWithoutOutcomeAndLesson() {
  await assert.rejects(
    () => createInvestmentDecision({
      ticker: 'NVDA',
      status: 'closed',
      decision: 'long',
      marketBelief: 'Market belief',
      variantView: 'Variant view because this test needs a complete judgment path.',
      evidence: completeEvidence,
      risk: completeRisk,
      invalidation: 'Invalidation rule'
    }),
    /Decision cannot be closed yet.*outcome return.*lesson/
  )
}

async function main() {
  await rejectsAcceptedWithMissingJudgment()
  await rejectsClosedWithoutOutcomeAndLesson()
  console.log('Decision validation regression tests passed')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
