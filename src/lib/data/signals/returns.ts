export type PriceBar = {
  date: string
  close: number
  volume: number | null
}

export function calculateReturnFromBars(bars: PriceBar[], days: number) {
  const sorted = [...bars].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length <= days) return null
  const start = sorted[sorted.length - 1 - days]
  const end = sorted[sorted.length - 1]
  if (!start || !end || start.close === 0) return null
  return ((end.close - start.close) / start.close) * 100
}

export function movingAverage(values: number[], window: number) {
  if (values.length < window) return null
  const slice = values.slice(-window)
  return slice.reduce((sum, value) => sum + value, 0) / slice.length
}

export function realizedVolatility20d(bars: PriceBar[]) {
  const sorted = [...bars].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length < 21) return null
  const returns = sorted.slice(-21).slice(1).map((bar, index) => {
    const previous = sorted[sorted.length - 21 + index]
    if (!previous || previous.close === 0) return null
    return (bar.close - previous.close) / previous.close
  }).filter((value): value is number => value !== null && Number.isFinite(value))
  if (returns.length < 2) return null
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length
  const variance = returns.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (returns.length - 1)
  return Math.sqrt(variance) * Math.sqrt(252) * 100
}

export function volumeVsAverage20d(bars: PriceBar[]) {
  const sorted = [...bars].sort((a, b) => a.date.localeCompare(b.date))
  const latest = sorted.at(-1)
  if (!latest?.volume) return null
  const history = sorted.slice(-21, -1).map(bar => bar.volume).filter((value): value is number => value !== null && Number.isFinite(value))
  if (history.length < 20) return null
  const average = history.reduce((sum, value) => sum + value, 0) / history.length
  if (average === 0) return null
  return latest.volume / average
}

export function distanceFromMovingAverage(bars: PriceBar[], window: number) {
  const sorted = [...bars].sort((a, b) => a.date.localeCompare(b.date))
  const latest = sorted.at(-1)
  if (!latest) return null
  const average = movingAverage(sorted.map(bar => bar.close), window)
  if (!average) return null
  return ((latest.close - average) / average) * 100
}

export function trendLabel(input: {
  return20d: number | null
  relativeStrengthVsSpy20d: number | null
  volumeVs20dAvg: number | null
  realizedVol20d: number | null
  distanceFrom50dMa: number | null
}) {
  const highVolume = (input.volumeVs20dAvg ?? 0) >= 1.2
  const weakVolume = (input.volumeVs20dAvg ?? 1) < 0.8
  const extremeMove = Math.abs(input.distanceFrom50dMa ?? 0) >= 12
  const highVol = (input.realizedVol20d ?? 0) >= 45
  if (extremeMove && highVol) return 'reversal risk'
  if ((input.return20d ?? 0) > 0 && (input.relativeStrengthVsSpy20d ?? 0) > 0 && highVolume) return 'confirmed momentum'
  if ((input.return20d ?? 0) > 0 && weakVolume) return 'weak momentum'
  if ((input.return20d ?? 0) < 0 && (input.relativeStrengthVsSpy20d ?? 0) < 0) return 'fading'
  if (Math.abs(input.return20d ?? 0) < 1 && highVolume) return 'watchlist'
  return 'mixed'
}
