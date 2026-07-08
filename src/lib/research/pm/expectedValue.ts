import type { DecisionAction } from '@/types/decision'
import type { PmScenario } from '@/types/pm'
import { clamp, round } from './math'

export function scenarioReturn(entryPrice: number | null, targetPrice: number | null, stopPrice: number | null, side: DecisionAction) {
  const signed = side === 'short' ? -1 : 1
  const base = entryPrice && targetPrice && entryPrice > 0
    ? ((targetPrice - entryPrice) / entryPrice) * 100 * signed
    : 0
  const bear = entryPrice && stopPrice && entryPrice > 0
    ? ((stopPrice - entryPrice) / entryPrice) * 100 * signed
    : Math.min(-6, base - 10)
  const bull = Math.max(base + 8, base * 1.35)
  return {
    bear: round(clamp(bear, -35, 5), 2),
    base: round(clamp(base, -25, 35), 2),
    bull: round(clamp(bull, -5, 50), 2)
  }
}

export function probabilitiesFromConfidence(confidence: number | null | undefined) {
  if (typeof confidence !== 'number' || !Number.isFinite(confidence)) {
    return { bear: 25, base: 50, bull: 25 }
  }
  const tilt = clamp((confidence - 50) * 0.35, -12, 14)
  const bear = clamp(25 - tilt, 10, 45)
  const bull = clamp(25 + tilt, 10, 45)
  const base = Math.max(10, 100 - bear - bull)
  const total = bear + base + bull
  return {
    bear: round((bear / total) * 100, 2),
    base: round((base / total) * 100, 2),
    bull: round((bull / total) * 100, 2)
  }
}

export function buildScenarios(input: {
  entryPrice: number | null
  targetPrice: number | null
  stopPrice: number | null
  side: DecisionAction
  confidence?: number | null
}): { scenarios: PmScenario[]; expectedValuePct: number } {
  const returns = scenarioReturn(input.entryPrice, input.targetPrice, input.stopPrice, input.side)
  const probabilities = probabilitiesFromConfidence(input.confidence)
  const scenarios: PmScenario[] = [
    { name: 'bear', probability: probabilities.bear, returnPct: returns.bear, contributionPct: round((probabilities.bear / 100) * returns.bear, 2) },
    { name: 'base', probability: probabilities.base, returnPct: returns.base, contributionPct: round((probabilities.base / 100) * returns.base, 2) },
    { name: 'bull', probability: probabilities.bull, returnPct: returns.bull, contributionPct: round((probabilities.bull / 100) * returns.bull, 2) }
  ]
  return {
    scenarios,
    expectedValuePct: round(scenarios.reduce((sum, scenario) => sum + scenario.contributionPct, 0), 2)
  }
}
