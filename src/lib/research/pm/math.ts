import type { PmDefaults } from '@/types/pm'

export const PM_DEFAULTS: PmDefaults = {
  nav: 1_000_000,
  riskBudgetPct: 0.5,
  maxSingleNamePct: 5,
  maxGrossPct: 100,
  maxNetPct: 60,
  maxSectorGrossPct: 30,
  maxBeta: 0.8,
  maxAdvParticipationPct: 10,
  targetLiquidationDays: 3,
  maxPairCorrelation: 0.75,
  maxAnnualizedPositionRiskContributionPct: 2.5
}

export const PM_FACTORS = ['SPY', 'QQQ', 'IWM', 'TLT', 'GLD', 'USO', 'VIXY', 'EWY', 'SMH', 'ITA', 'XAR'] as const

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function round(value: number, digits = 2) {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

export function variance(values: number[]) {
  if (values.length < 2) return 0
  const mean = average(values)
  return values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (values.length - 1)
}

export function stdev(values: number[]) {
  return Math.sqrt(variance(values))
}

export function covariance(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length)
  if (length < 2) return 0
  const a = left.slice(-length)
  const b = right.slice(-length)
  const meanA = average(a)
  const meanB = average(b)
  let total = 0
  for (let index = 0; index < length; index += 1) total += (a[index] - meanA) * (b[index] - meanB)
  return total / (length - 1)
}

export function correlation(left: number[], right: number[]) {
  const denom = stdev(left) * stdev(right)
  return denom > 0 ? covariance(left, right) / denom : 0
}

export function annualizedVolatility(returns: number[]) {
  return stdev(returns) * Math.sqrt(252) * 100
}

export function returnsFromPrices(rows: { date: string; price: number }[]) {
  const sorted = [...rows].filter(row => row.price > 0).sort((a, b) => a.date.localeCompare(b.date))
  const returns: { date: string; value: number }[] = []
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1]
    const current = sorted[index]
    if (previous.price > 0) returns.push({ date: current.date, value: (current.price - previous.price) / previous.price })
  }
  return returns
}

export function alignReturnSeries(series: Record<string, { date: string; value: number }[]>) {
  const dates = new Set<string>()
  for (const rows of Object.values(series)) for (const row of rows) dates.add(row.date)
  const sortedDates = [...dates].sort()
  const maps = Object.fromEntries(Object.entries(series).map(([ticker, rows]) => [ticker, new Map(rows.map(row => [row.date, row.value]))]))
  return sortedDates.map(date => {
    const values: Record<string, number> = {}
    for (const [ticker, map] of Object.entries(maps)) {
      const value = map.get(date)
      if (typeof value === 'number' && Number.isFinite(value)) values[ticker] = value
    }
    return { date, values }
  })
}

export function percentile(values: number[], pct: number) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return 0
  const index = clamp(Math.floor((pct / 100) * sorted.length), 0, sorted.length - 1)
  return sorted[index]
}

export function matrixVector(matrix: number[][], vector: number[]) {
  return matrix.map(row => row.reduce((sum, value, index) => sum + value * (vector[index] ?? 0), 0))
}

export function dot(left: number[], right: number[]) {
  return left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0)
}

export function solveLinearSystem(matrix: number[][], vector: number[]) {
  const size = vector.length
  const augmented = matrix.map((row, index) => [...row.slice(0, size), vector[index]])
  for (let pivot = 0; pivot < size; pivot += 1) {
    let best = pivot
    for (let row = pivot + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[best][pivot])) best = row
    }
    if (Math.abs(augmented[best][pivot]) < 1e-9) continue
    if (best !== pivot) [augmented[pivot], augmented[best]] = [augmented[best], augmented[pivot]]
    const divisor = augmented[pivot][pivot]
    for (let col = pivot; col <= size; col += 1) augmented[pivot][col] /= divisor
    for (let row = 0; row < size; row += 1) {
      if (row === pivot) continue
      const factor = augmented[row][pivot]
      for (let col = pivot; col <= size; col += 1) augmented[row][col] -= factor * augmented[pivot][col]
    }
  }
  return augmented.map(row => Number.isFinite(row[size]) ? row[size] : 0)
}

export function isoDate(value: Date | string | null | undefined) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : String(value).slice(0, 10)
}
