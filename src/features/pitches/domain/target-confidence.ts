import type { StockReport } from '@/types/research'
import type { PitchSourceSnapshot, StockPitch, TargetConfidenceView } from '@/types/pitch'

export function buildTargetConfidence(input: {
  pitch?: StockPitch
  report?: StockReport
  sourceSnapshot?: PitchSourceSnapshot
  currentPrice?: number | null
  targetPrice?: number | null
  expectedReturn?: number | null
}): TargetConfidenceView {
  const pitch = input.pitch
  const source = input.sourceSnapshot ?? pitch?.sourceSnapshot
  const currentPrice = finiteOrNull(input.currentPrice) ?? finiteOrNull(pitch?.setup.currentPrice) ?? finiteOrNull(source?.price?.price)
  const targetPrice = finiteOrNull(input.targetPrice) ?? finiteOrNull(pitch?.setup.targetPrice)
  const expectedReturn = finiteOrNull(input.expectedReturn) ?? finiteOrNull(pitch?.setup.expectedReturn)
  const battlefield = source?.optionsBattlefield
  const newsCount = source?.newsTape.length ?? 0
  const gaps = source?.gaps ?? []
  const drivers: string[] = []
  const blockers: string[] = []
  const nextDataNeeded: string[] = []
  let score = 20

  if (currentPrice && targetPrice) {
    score += 10
    drivers.push(`Sourced price and scenario target available: ${money(currentPrice)} spot vs ${money(targetPrice)} base.`)
  } else {
    blockers.push('Current price or base target missing.')
    nextDataNeeded.push('Latest sourced DailyPrice close and scenario target.')
  }

  if (battlefield?.mode === 'true-gex') {
    score += 22
    drivers.push('True options battlefield present with OI/IV/Greeks.')
  } else if (battlefield?.mode === 'proxy') {
    score += 10
    drivers.push('Massive Basic options proxy present; useful for strike interest, not true GEX.')
    blockers.push('No true OI/IV/Greeks, so walls and gamma are proxy labels.')
    nextDataNeeded.push('Massive snapshot entitlement for true OI/IV/Greeks/GEX.')
  } else {
    blockers.push('Options battlefield unavailable or plan-locked.')
    nextDataNeeded.push('Run positioning ingest with Massive enabled, or enable paid snapshot later.')
  }

  const cluster = targetPrice && battlefield ? nearestStrikeCluster(battlefield.strikes, targetPrice) : null
  if (targetPrice && cluster) {
    const distancePct = Math.abs((cluster.strikePrice / targetPrice) - 1) * 100
    if (distancePct <= 2.5) {
      score += 16
      drivers.push(`Target overlaps option magnet near ${money(cluster.strikePrice)} (${distancePct.toFixed(1)}% away).`)
    } else if (distancePct <= 5) {
      score += 8
      drivers.push(`Target sits near option interest at ${money(cluster.strikePrice)} (${distancePct.toFixed(1)}% away).`)
    } else {
      blockers.push(`Base target does not overlap nearby option cluster; nearest is ${money(cluster.strikePrice)}.`)
    }
  }

  if (currentPrice && targetPrice && battlefield?.expectedMove) {
    const targetMove = Math.abs(targetPrice - currentPrice)
    if (battlefield.expectedMove >= targetMove) {
      score += 12
      drivers.push(`Expected move can reach target distance: ${money(battlefield.expectedMove)} vs ${money(targetMove)} needed.`)
    } else {
      blockers.push(`Expected move is smaller than target distance: ${money(battlefield.expectedMove)} vs ${money(targetMove)} needed.`)
    }
  } else if (battlefield?.mode !== 'true-gex') {
    nextDataNeeded.push('ATM IV by expiry for expected-move confirmation.')
  }

  const rs20 = reportMetric(input.report, '20D RS vs SPY')
  const volume = reportMetric(input.report, 'Volume vs 20D average')
  if (rs20 !== null && rs20 > 0) {
    score += 8
    drivers.push(`20D RS vs SPY positive (${rs20.toFixed(1)}%).`)
  } else if (rs20 !== null) {
    blockers.push(`20D RS vs SPY negative or weak (${rs20.toFixed(1)}%).`)
  }
  if (volume !== null && volume >= 1) {
    score += 6
    drivers.push(`Volume confirmation >= 1.0x (${volume.toFixed(2)}x).`)
  }

  if (newsCount > 0) {
    score += 8
    drivers.push(`${newsCount} direct ticker catalyst/news row${newsCount === 1 ? '' : 's'} passed relevance filter.`)
  } else {
    blockers.push('No direct ticker catalyst row passed relevance filter.')
    nextDataNeeded.push('Company-specific filing/news/transcript row.')
  }

  if (typeof expectedReturn === 'number' && Number.isFinite(expectedReturn)) {
    score += expectedReturn > 0 ? 4 : 0
  }

  if (gaps.length > 0) {
    const penalty = Math.min(18, gaps.length * 3)
    score -= penalty
    blockers.push(`${gaps.length} source gap${gaps.length === 1 ? '' : 's'} still reduce conviction.`)
  } else {
    score += 6
    drivers.push('No active source gaps in pitch snapshot.')
  }

  const bounded = Math.max(0, Math.min(100, Math.round(score)))
  return {
    score: bounded,
    confidenceLabel: bounded >= 75 ? 'High' : bounded >= 50 ? 'Medium' : bounded >= 25 ? 'Low' : 'Blocked',
    drivers: uniqueStrings(drivers).slice(0, 8),
    blockers: uniqueStrings(blockers).slice(0, 8),
    nextDataNeeded: uniqueStrings(nextDataNeeded).slice(0, 8)
  }
}

function nearestStrikeCluster(strikes: NonNullable<PitchSourceSnapshot['optionsBattlefield']>['strikes'], targetPrice: number) {
  if (!strikes.length) return null
  return [...strikes]
    .filter(strike => strike.magnetScore !== null)
    .sort((a, b) => {
      const aDistance = Math.abs(a.strikePrice - targetPrice)
      const bDistance = Math.abs(b.strikePrice - targetPrice)
      const aScore = aDistance - (a.magnetScore ?? 0) * 0.01
      const bScore = bDistance - (b.magnetScore ?? 0) * 0.01
      return aScore - bScore
    })[0] ?? null
}

function reportMetric(report: StockReport | undefined, label: string) {
  if (!report) return null
  const metric = [...report.evidence, report.positioning, report.catalysts]
    .flatMap(section => section.metrics)
    .find(item => item.label === label)
  return typeof metric?.value === 'number' && Number.isFinite(metric.value) ? metric.value : null
}

function finiteOrNull(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function uniqueStrings(rows: string[]) {
  return [...new Set(rows.filter(Boolean))]
}

function money(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A'
  return `$${value.toFixed(value >= 100 ? 0 : 2)}`
}
