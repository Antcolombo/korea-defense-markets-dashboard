import type { PmDecisionOverlay, PmDefaults } from '@/types/pm'
import { round } from './math'

export function optimizePmBook(decisions: PmDecisionOverlay[], defaults: PmDefaults) {
  let gross = 0
  let net = 0
  const sectorGross = new Map<string, number>()
  const ranked = [...decisions].sort((a, b) => b.costAdjustedEvPct - a.costAdjustedEvPct)
  const output: PmDecisionOverlay[] = []

  for (const decision of ranked) {
    const sign = decision.side === 'short' ? -1 : decision.side === 'long' ? 1 : 0
    const currentSectorGross = sectorGross.get(decision.sector) ?? 0
    let action: PmDecisionOverlay['optimizerAction'] = 'accepted'
    let reason = 'accepted by optimizer'
    if (sign === 0 || decision.finalSizePct <= 0) {
      action = 'watch'
      reason = decision.activeCapReason || 'no active exposure'
    } else if (decision.costAdjustedEvPct <= 0) {
      action = 'rejected'
      reason = 'negative cost-adjusted EV'
    } else if (gross + decision.finalSizePct > defaults.maxGrossPct) {
      action = 'rejected'
      reason = 'gross cap'
    } else if (Math.abs(net + sign * decision.finalSizePct) > defaults.maxNetPct) {
      action = 'rejected'
      reason = 'net cap'
    } else if (currentSectorGross + Math.abs(decision.finalSizePct) > defaults.maxSectorGrossPct) {
      action = 'rejected'
      reason = 'sector cap'
    } else if (Math.abs(decision.beta) > defaults.maxBeta && decision.finalSizePct >= defaults.maxSingleNamePct) {
      action = 'rejected'
      reason = 'beta cap'
    } else {
      gross += Math.abs(decision.finalSizePct)
      net += sign * decision.finalSizePct
      sectorGross.set(decision.sector, currentSectorGross + Math.abs(decision.finalSizePct))
    }
    output.push({
      ...decision,
      optimizerAction: action,
      optimizerReason: reason,
      suggestedSizePct: action === 'accepted' ? decision.finalSizePct : 0
    })
  }

  const restoredOrder = decisions.map(decision => output.find(item => item.decisionSlug === decision.decisionSlug) ?? decision)
  return {
    decisions: restoredOrder,
    grossPct: round(gross, 2),
    netPct: round(net, 2),
    ledger: restoredOrder.map(decision => ({
      ticker: decision.ticker,
      action: decision.optimizerAction,
      reason: decision.optimizerReason,
      suggestedSizePct: decision.suggestedSizePct
    }))
  }
}
