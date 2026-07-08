import { combineStatuses, metric, sourceCoverage } from '@/lib/data/availability'
import { crowdingLabel } from '@/lib/research/crowdingScores'
import type { CrowdingRow, MetricValue } from '@/lib/research/types'

export { crowdingLabel }

export function scoreAvailableComponents(components: MetricValue[]) {
  const available = components.filter(item => item.value !== null && item.availability === 'Available')
  if (available.length === 0) return metric(null, 'UNAVAILABLE', 'No sourced components available')
  const score = available.reduce((sum, item) => sum + Math.max(0, Math.min(100, item.value ?? 0)), 0) / available.length
  const status = combineStatuses(components.map(item => item.dataStatus))
  return metric(Number(score.toFixed(1)), status)
}

export function explainCrowding(row: Pick<CrowdingRow, 'crowdingScore' | 'excludedUnavailableInputs'>) {
  if (row.crowdingScore.value === null) return 'No sourced components are available yet, so no crowding read is produced.'
  const coverage = sourceCoverage([row.crowdingScore])
  const excluded = row.excludedUnavailableInputs.length > 0 ? ` Excluded: ${row.excludedUnavailableInputs.join(', ')}.` : ''
  return `Crowding score is based only on sourced components with ${coverage}% score availability.${excluded}`
}
