import { clamp, round } from './math'

export function estimateTransactionCost(input: {
  sizePct: number
  annualizedVolPct: number
  advDollars: number | null
  nav: number
}) {
  const positionDollars = Math.abs(input.sizePct / 100) * input.nav
  const advParticipation = input.advDollars && input.advDollars > 0
    ? (positionDollars / input.advDollars) * 100
    : null
  const spreadPct = 0.04
  const impactPct = advParticipation === null
    ? 0.35
    : clamp(Math.sqrt(Math.max(0, advParticipation)) * (input.annualizedVolPct / 100) * 0.18, 0.02, 2.5)
  const borrowFeePct = 0
  return {
    estimatedCostPct: round(spreadPct + impactPct + borrowFeePct, 2),
    advParticipationPct: advParticipation === null ? null : round(advParticipation, 2),
    liquidityMissing: advParticipation === null
  }
}
