import type { PitchRecommendation } from '@/types/pitch'

export function recommendationFromMetrics(input: {
  rs20d: number | null
  return20d: number | null
  catalystSupport: number | null
  extensionRisk: number | null
}): PitchRecommendation {
  const rs = input.rs20d ?? 0
  const ret = input.return20d ?? 0
  const catalyst = input.catalystSupport ?? 0
  const extension = input.extensionRisk ?? 100
  if (rs > 0 && ret > 0 && catalyst >= 50 && extension < 65) return 'long'
  if (rs < -8 && ret < -8) return 'no-trade'
  return 'watchlist'
}

export function scenarioReturnMap(input: {
  rs20d: number | null
  rs60d: number | null
  return20d: number | null
  return60d: number | null
  crowding: number | null
  extensionRisk: number | null
  catalystSupport: number | null
}) {
  const rs20 = input.rs20d ?? 0
  const rs60 = input.rs60d ?? 0
  const ret20 = input.return20d ?? 0
  const ret60 = input.return60d ?? 0
  const crowding = input.crowding ?? 50
  const extension = input.extensionRisk ?? 50
  const catalyst = input.catalystSupport ?? 50
  const base = clampReturn((rs20 * 0.6) + ((crowding - 50) * 0.08) + ((catalyst - 50) * 0.12) - (extension * 0.04))
  const bull = clampReturn(Math.max(base + 10, (rs60 * 0.5) + (ret60 * 0.25) + ((catalyst - 50) * 0.12)), -5, 35)
  const bear = clampReturn(Math.min(base - 10, (ret20 * 0.75) - (extension * 0.08)), -35, 5)
  return { bear: round(bear, 1), base: round(base, 1), bull: round(bull, 1) }
}

export function priceFromReturn(currentPrice: number, impliedReturn: number) {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return 0
  return round(currentPrice * (1 + impliedReturn / 100), 2)
}

function clampReturn(value: number, min = -25, max = 25) {
  return Math.max(min, Math.min(max, value))
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
