export type SetupScoreInput = {
  crowdingScore: number | null
  extensionRiskScore: number | null
  catalystSupportScore: number | null
}

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, value))
}

export function averageAvailable(values: (number | null | undefined)[]) {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (valid.length === 0) return null
  return Number((valid.reduce((sum, value) => sum + value, 0) / valid.length).toFixed(1))
}

export function crowdingScoreFromComponents(input: {
  momentumScore: number | null
  volumeScore: number | null
  optionsScore?: number | null
  shortInterestScore?: number | null
}) {
  return averageAvailable([input.momentumScore, input.volumeScore, input.optionsScore, input.shortInterestScore])
}

export function extensionRiskScoreFromComponents(input: {
  volatilityScore: number | null
  distanceFrom20dMa?: number | null
  distanceFrom50dMa?: number | null
}) {
  const distance20RiskScore = input.distanceFrom20dMa === null || input.distanceFrom20dMa === undefined ? null : clampScore(Math.abs(input.distanceFrom20dMa) * 5)
  const distance50RiskScore = input.distanceFrom50dMa === null || input.distanceFrom50dMa === undefined ? null : clampScore(Math.abs(input.distanceFrom50dMa) * 4)
  return averageAvailable([input.volatilityScore, distance20RiskScore, distance50RiskScore])
}

export function crowdingLabel(score: number | null) {
  if (score === null) return 'Unavailable'
  if (score < 25) return 'Ignored / Weak'
  if (score < 50) return 'Early Accumulation'
  if (score < 75) return 'Confirmed Sponsorship'
  return 'Crowded Sponsorship'
}

export function setupLabel(input: SetupScoreInput) {
  if (input.crowdingScore === null && input.extensionRiskScore === null && input.catalystSupportScore === null) return 'Unavailable'
  const extended = (input.extensionRiskScore ?? 0) >= 75
  const catalystSupported = (input.catalystSupportScore ?? 0) >= 50
  if (extended && catalystSupported) return 'Catalyst-Supported Extension'
  if (extended) return 'Extended / Catalyst Unconfirmed'
  return crowdingLabel(input.crowdingScore)
}
