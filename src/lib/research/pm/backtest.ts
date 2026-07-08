import type { PmBacktestSummary } from '@/types/pm'
import { average, correlation, round, stdev } from './math'

export function summarizePmBacktest(samples: { score: number; forwardReturn: number; cost: number }[]): PmBacktestSummary {
  if (samples.length < 8) {
    return {
      grade: 'N/A',
      hitRate: null,
      informationCoefficient: null,
      decay: null,
      turnover: null,
      capacity: null,
      grossReturn: null,
      netReturn: null,
      maxDrawdown: null
    }
  }
  const gross = samples.map(sample => sample.forwardReturn)
  const net = samples.map(sample => sample.forwardReturn - sample.cost)
  const ic = correlation(samples.map(sample => sample.score), gross)
  const hitRate = gross.filter(value => value > 0).length / gross.length * 100
  const sharpeProxy = stdev(net) > 0 ? average(net) / stdev(net) : 0
  const grade = hitRate >= 58 && ic > 0.08 && average(net) > 0 ? 'A'
    : hitRate >= 52 && ic > 0 && average(net) > 0 ? 'B'
      : average(net) > 0 ? 'C'
        : 'D'
  return {
    grade,
    hitRate: round(hitRate, 1),
    informationCoefficient: round(ic, 3),
    decay: round(Math.max(0, ic) * 100, 1),
    turnover: round(Math.min(100, samples.length * 1.8), 1),
    capacity: round(Math.max(0, 100 - samples.length * 0.5), 1),
    grossReturn: round(average(gross), 2),
    netReturn: round(average(net), 2),
    maxDrawdown: round(maxDrawdown(net), 2)
  }
}

function maxDrawdown(returns: number[]) {
  let equity = 1
  let peak = 1
  let worst = 0
  for (const value of returns) {
    equity *= 1 + value / 100
    peak = Math.max(peak, equity)
    worst = Math.min(worst, (equity - peak) / peak * 100)
  }
  return worst
}
