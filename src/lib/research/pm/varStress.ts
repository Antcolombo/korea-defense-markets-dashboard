import type { PmStressScenario } from '@/types/pm'
import { average, percentile, round } from './math'

export function historicalRisk(returnsPct: number[]) {
  const losses = returnsPct.map(value => -value).sort((a, b) => a - b)
  const var95 = percentile(losses, 95)
  const var99 = percentile(losses, 99)
  const tail = losses.filter(loss => loss >= var95)
  return {
    valueAtRisk95Pct: round(var95, 2),
    valueAtRisk99Pct: round(var99, 2),
    expectedShortfallPct: round(tail.length ? average(tail) : var95, 2)
  }
}

export function stressScenarios(input: {
  beta: number
  semisExposure: number
  koreaExposure: number
  ratesExposure: number
  vixExposure: number
  sizePct: number
}): PmStressScenario[] {
  const scale = Math.max(0.25, Math.abs(input.sizePct) / 5)
  return [
    { label: 'Normal VaR', lossPct: round(Math.max(0, Math.abs(input.beta) * 2.2 * scale), 2), detail: 'Daily historical factor-risk proxy.' },
    { label: '99% VaR', lossPct: round(Math.max(0, Math.abs(input.beta) * 3.4 * scale), 2), detail: 'Severe one-day quantile proxy.' },
    { label: 'Expected Shortfall', lossPct: round(Math.max(0, Math.abs(input.beta) * 4.1 * scale), 2), detail: 'Average tail loss proxy.' },
    { label: 'Korea shock', lossPct: round(Math.abs(input.koreaExposure) * 6 * scale, 2), detail: 'EWY/Korea beta stress.' },
    { label: 'Semis shock', lossPct: round(Math.abs(input.semisExposure) * 7 * scale, 2), detail: 'SMH/semis factor stress.' },
    { label: 'Rates shock', lossPct: round(Math.abs(input.ratesExposure) * 4 * scale, 2), detail: 'TLT/rates factor stress.' },
    { label: 'VIX shock', lossPct: round(Math.abs(input.vixExposure) * 8 * scale, 2), detail: 'VIXY volatility shock.' }
  ]
}
