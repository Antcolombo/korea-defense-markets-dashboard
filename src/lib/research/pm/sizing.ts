import type { PmDefaults, PmWaterfallStep } from '@/types/pm'
import { clamp, round } from './math'

export function buildSizingWaterfall(input: {
  entryPrice: number | null
  stopPrice: number | null
  side: 'long' | 'short' | 'watch' | 'pass'
  defaults: PmDefaults
  annualizedVolPct: number
  liquidityDays: number
  beta: number
  currentGrossPct: number
  currentNetPct: number
  sectorGrossPct: number
  maxCorrelation: number
  costAdjustedEvPct: number
}) {
  const riskPct = stopRiskPct(input.entryPrice, input.stopPrice, input.side)
  const rawStopSizePct = riskPct > 0 ? input.defaults.riskBudgetPct / riskPct : 0
  const volCap = input.annualizedVolPct > 0
    ? (input.defaults.maxAnnualizedPositionRiskContributionPct / input.annualizedVolPct) * 100
    : input.defaults.maxSingleNamePct
  const liquidityCap = input.liquidityDays > input.defaults.targetLiquidationDays
    ? input.defaults.maxSingleNamePct * (input.defaults.targetLiquidationDays / input.liquidityDays)
    : input.defaults.maxSingleNamePct
  const correlationCap = input.maxCorrelation > input.defaults.maxPairCorrelation
    ? input.defaults.maxSingleNamePct * 0.6
    : input.defaults.maxSingleNamePct
  const grossCap = Math.max(0, input.defaults.maxGrossPct - input.currentGrossPct)
  const sideSign = input.side === 'short' ? -1 : 1
  const netRoom = sideSign > 0
    ? input.defaults.maxNetPct - input.currentNetPct
    : input.defaults.maxNetPct + input.currentNetPct
  const betaCap = Math.abs(input.beta) > input.defaults.maxBeta ? input.defaults.maxSingleNamePct * (input.defaults.maxBeta / Math.abs(input.beta)) : input.defaults.maxSingleNamePct
  const sectorCap = Math.max(0, input.defaults.maxSectorGrossPct - input.sectorGrossPct)
  const evCap = input.costAdjustedEvPct <= 0 ? 0 : input.defaults.maxSingleNamePct
  const caps = [
    { label: 'Raw stop-size', value: rawStopSizePct, reason: 'Risk budget divided by entry-stop loss.' },
    { label: 'Single-name cap', value: input.defaults.maxSingleNamePct, reason: 'Hard max position size.' },
    { label: 'Vol cap', value: volCap, reason: 'Annualized risk contribution cap.' },
    { label: 'Liquidity cap', value: liquidityCap, reason: 'ADV/liquidation-day cap.' },
    { label: 'Correlation cap', value: correlationCap, reason: 'Pair correlation cap.' },
    { label: 'Gross/net cap', value: Math.min(grossCap, Math.max(0, netRoom)), reason: 'Portfolio gross/net exposure cap.' },
    { label: 'Sector/beta cap', value: Math.min(sectorCap, betaCap), reason: 'Sector and beta exposure cap.' },
    { label: 'EV gate', value: evCap, reason: input.costAdjustedEvPct <= 0 ? 'Cost-adjusted EV is not positive.' : 'Cost-adjusted EV positive.' }
  ]
  let running = rawStopSizePct
  const steps: PmWaterfallStep[] = caps.map((cap, index) => {
    const next = index === 0 ? cap.value : Math.min(running, cap.value)
    const active = next < running || (index === 0 && cap.value === 0)
    running = next
    return {
      label: cap.label,
      valuePct: round(clamp(next, 0, input.defaults.maxSingleNamePct), 2),
      reason: cap.reason,
      active
    }
  })
  const finalSizePct = round(clamp(running, 0, input.defaults.maxSingleNamePct), 2)
  const activeCap = [...steps].reverse().find(step => step.active)?.label ?? 'No active cap'
  return {
    riskPct: round(riskPct * 100, 2),
    rawStopSizePct: round(rawStopSizePct, 2),
    finalSizePct,
    activeCapReason: activeCap,
    sizingWaterfall: steps
  }
}

function stopRiskPct(entryPrice: number | null, stopPrice: number | null, side: string) {
  if (!entryPrice || !stopPrice || entryPrice <= 0) return 0
  if (side === 'short') return Math.max(0, (stopPrice - entryPrice) / entryPrice)
  return Math.max(0, (entryPrice - stopPrice) / entryPrice)
}
