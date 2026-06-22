import type { CrowdingRow, DailyNoteDto, RotationRow } from '@/lib/research/types'
import { pointInTime, sourceCoverage } from '@/lib/data/availability'

export function generateDailyNote(input: {
  asOfDate: string
  rotations: RotationRow[]
  crowding: CrowdingRow[]
  source: string
  provider: string
}): DailyNoteDto {
  const rankedRotations = input.rotations
    .filter(row => row.return20d.value !== null)
    .sort((a, b) => (b.return20d.value ?? -Infinity) - (a.return20d.value ?? -Infinity))
  const crowded = input.crowding
    .filter(row => (row.crowdingScore.value ?? 0) >= 75)
    .sort((a, b) => (b.crowdingScore.value ?? 0) - (a.crowdingScore.value ?? 0))
  const early = input.crowding
    .filter(row => (row.crowdingScore.value ?? 0) >= 25 && (row.crowdingScore.value ?? 0) < 50)
    .sort((a, b) => (b.crowdingScore.value ?? 0) - (a.crowdingScore.value ?? 0))
  const metrics = input.rotations.flatMap(row => [row.return20d, row.relativeStrengthVsSpy20d, row.volumeVs20dAvg])
  const excludedUnavailableInputs = [
    ...input.rotations.flatMap(row => row.volumeVs20dAvg.value === null ? [`${row.ticker}: volume confirmation`] : []),
    ...input.crowding.flatMap(row => row.excludedUnavailableInputs.map(item => `${row.ticker}: ${item}`))
  ]
  const topRotations = rankedRotations.slice(0, 5).map(row => `${row.ticker} ${row.return20d.value?.toFixed(1)}% 20D`)
  const crowdedLongs = crowded.slice(0, 5).map(row => `${row.ticker} ${row.crowdingScore.value?.toFixed(1)} ${row.crowdingLabel}`)
  const earlyAccumulation = early.slice(0, 5).map(row => `${row.ticker} ${row.crowdingScore.value?.toFixed(1)} ${row.crowdingLabel}`)
  const reversalRisks = crowded.filter(row => row.crowdingLabel === 'Reversal Risk').slice(0, 5).map(row => row.ticker)
  const pmQuestions = [
    'Which rotations are confirmed by both relative strength and volume?',
    'Which crowded longs have deteriorating forward risk/reward?',
    'Which themes have catalyst support but incomplete positioning data?'
  ]
  const body = [
    `# PM Daily Flow & Positioning Note - ${input.asOfDate}`,
    '',
    `Source coverage: ${sourceCoverage(metrics)}%.`,
    '',
    `Top rotations: ${topRotations.length > 0 ? topRotations.join('; ') : 'No sourced rotation leaders available.'}`,
    `Crowded longs: ${crowdedLongs.length > 0 ? crowdedLongs.join('; ') : 'No sourced crowded-long set available.'}`,
    `Early accumulation: ${earlyAccumulation.length > 0 ? earlyAccumulation.join('; ') : 'No sourced early-accumulation set available.'}`,
    '',
    'PM questions:',
    ...pmQuestions.map(question => `- ${question}`)
  ].join('\n')

  return {
    id: `generated-${input.asOfDate}`,
    date: input.asOfDate,
    title: `PM Daily Flow & Positioning Note - ${input.asOfDate}`,
    marketRegime: rankedRotations.length > 0 ? 'Rotation data available; inspect leaders and laggards.' : 'Unavailable',
    topRotations,
    crowdedLongs,
    earlyAccumulation,
    reversalRisks,
    pmQuestions,
    body,
    inputSnapshotIds: [],
    excludedUnavailableInputs,
    generatedAt: new Date().toISOString(),
    humanEditedAt: null,
    noteStatus: 'GENERATED',
    sourceCoveragePercent: sourceCoverage(metrics),
    ...pointInTime({
      asOfDate: input.asOfDate,
      observedAt: input.asOfDate,
      ingestedAt: new Date().toISOString(),
      source: input.source,
      provider: input.provider,
      dataStatus: metrics.some(item => item.value !== null) ? 'PARTIAL' : 'UNAVAILABLE'
    })
  }
}
