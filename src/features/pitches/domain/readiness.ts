import type { PitchReadiness, StockPitch } from '@/types/pitch'

export function buildPitchReadiness(pitch: StockPitch): PitchReadiness {
  const missing = [
    !pitch.thesis.trim() ? 'thesis' : null,
    ...pitch.evidenceDrivers.flatMap((driver, index) => [
      !driver.driver.trim() ? `driver ${index + 1} name` : null,
      !driver.claim.trim() ? `driver ${index + 1} claim` : null,
      !driver.evidence.trim() ? `driver ${index + 1} evidence` : null,
      !driver.whyItMatters.trim() ? `driver ${index + 1} why it matters` : null,
      driver.sourceStatus === 'unavailable' ? `driver ${index + 1} source` : null
    ]),
    pitch.setup.currentPrice <= 0 ? 'current price' : null,
    !pitch.setup.targetPrice || pitch.setup.targetPrice <= 0 ? 'target price' : null,
    !pitch.setup.downsidePrice || pitch.setup.downsidePrice <= 0 ? 'downside price' : null,
    !pitch.tradeStructure.invalidation.trim() ? 'invalidation' : null,
    pitch.catalysts.length === 0 || pitch.catalysts.every(row => !row.date || row.date === 'TBD') ? 'dated catalyst' : null
  ].filter((item): item is string => Boolean(item))
  const sourceScore = Math.round((pitch.evidenceDrivers.filter(driver => driver.sourceStatus === 'sourced' || driver.sourceStatus === 'derived').length / 3) * 100)
  return {
    canPromote: missing.length === 0,
    missing,
    sourceScore
  }
}
