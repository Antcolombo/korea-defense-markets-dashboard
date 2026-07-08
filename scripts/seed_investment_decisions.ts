import { createInvestmentDecision, getInvestmentDecision, updateInvestmentDecision, buildInvestmentDecisionTemplate } from '../src/lib/research/decisions'

async function main() {
  const template = await buildInvestmentDecisionTemplate('NVDA')
  const decision = {
    slug: 'nvda-decision-audit-2026-07-02',
    ticker: 'NVDA',
    companyName: template.companyName,
    status: 'watch' as const,
    decision: 'watch' as const,
    marketBelief: 'Market can treat NVDA as an AI leadership long that deserves immediate re-risking after pullbacks, assuming secular demand overwhelms near-term tape weakness.',
    variantView: 'My variant view is not that NVDA is good. It is that this idea should not be promoted yet because sourced price/relative strength and catalyst coverage do not support an accepted long. If the market is right, relative strength and volume should recover and a sourced catalyst should appear before this moves from watch to long.',
    evidence: [
      {
        driver: 'Price and relative strength',
        claim: 'The tape is not confirming immediate re-risking.',
        sourcedEvidence: 'Local report as of 2026-07-02 shows NVDA 20D return -11.3%, 20D relative strength vs SPY -9.5%, and trend label fading.',
        sourceStatus: 'sourced' as const,
        whyItMatters: 'A PM should not accept a long variant while the sourced tape still argues against momentum sponsorship.'
      },
      {
        driver: 'Positioning and crowding',
        claim: 'Sponsorship is early, not euphoric, but key options fields are still partial.',
        sourcedEvidence: 'Crowding score is 43.0, extension risk is 34.4, setup label is Early Accumulation; live options OI/IV remain deferred.',
        sourceStatus: 'partial' as const,
        whyItMatters: 'This creates a watch setup rather than a clean long: there may be room for accumulation, but source quality is not complete.'
      },
      {
        driver: 'Catalyst quality',
        claim: 'The catalyst path is not sourced enough for promotion.',
        sourcedEvidence: 'Report shows no sourced catalyst row for NVDA and catalyst support score missing/deferred.',
        sourceStatus: 'partial' as const,
        whyItMatters: 'Without a dated catalyst or estimate path, the idea lacks a clear reason for price to move on a defined horizon.'
      }
    ],
    risk: {
      thesis: 'NVDA stays watchlist until source-confirmed RS repair and catalyst coverage improve.',
      decidedAt: '2026-07-02T00:00:00.000Z',
      entry: 'No entry until NVDA reclaims short-term trend and 20D relative strength vs SPY turns positive, or until a sourced catalyst/estimate revision changes the setup.',
      entryPrice: null,
      targetPrice: null,
      sizing: 'small' as const,
      positionSizePct: null,
      stop: 'If later accepted, cut or reject if 20D relative strength remains negative, volume stays below 1.0x 20D average, or the catalyst remains unsourced at next review.',
      stopPrice: null,
      upside: 'Upside requires source refresh to show RS recovery plus a sourced catalyst; otherwise upside is undefined and the decision stays watch.',
      downside: 'Downside case is continued fading tape with no catalyst, where the correct action is pass/reject rather than averaging down.',
      timeHorizon: '1-3 months',
      catalystDate: '',
      confidence: null,
      whatWouldChangeMind: 'Positive 20D RS vs SPY, volume confirmation above 1.0x, a sourced catalyst row, and refreshed options OI/IV.'
    },
    invalidation: 'The watch thesis is wrong if relative strength keeps deteriorating, volume fades below the 20D average, catalyst coverage remains unavailable, or early accumulation breaks into distribution.',
    timeHorizon: '1-3 months',
    expectedReturn: null,
    downside: null,
    sourceSnapshot: template.sourceSnapshot,
    outcomeReturn: null,
    lesson: '',
    isPublic: true,
    featuredRank: 1
  }

  const existing = await getInvestmentDecision(decision.slug)
  const record = existing
    ? await updateInvestmentDecision(decision.slug, decision)
    : await createInvestmentDecision(decision)
  console.log(`Seeded ${record.slug} (${record.status}/${record.decision})`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
