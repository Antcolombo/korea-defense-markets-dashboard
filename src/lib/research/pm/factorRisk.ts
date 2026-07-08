import type { PmFactorExposure } from '@/types/pm'
import { alignReturnSeries, annualizedVolatility, average, covariance, dot, matrixVector, PM_FACTORS, returnsFromPrices, round, solveLinearSystem, variance } from './math'

export type PriceSeries = Record<string, { date: string; price: number; volume?: number | null }[]>

export type FactorModel = {
  factors: string[]
  factorCovariance: number[][]
  exposuresByTicker: Record<string, PmFactorExposure[]>
  betaByTicker: Record<string, number>
  residualVarianceByTicker: Record<string, number>
  annualizedVolByTicker: Record<string, number>
  observationsByTicker: Record<string, number>
  gaps: string[]
}

export function buildFactorModel(priceSeries: PriceSeries, tickers: string[], factors = [...PM_FACTORS]): FactorModel {
  const series = Object.fromEntries(Object.entries(priceSeries).map(([ticker, rows]) => [ticker, returnsFromPrices(rows)]))
  const aligned = alignReturnSeries(series)
  const usableFactors = factors.filter(factor => (series[factor]?.length ?? 0) >= 30)
  const factorCovariance = usableFactors.map(left => usableFactors.map(right => covariance(
    aligned.flatMap(row => typeof row.values[left] === 'number' && typeof row.values[right] === 'number' ? [row.values[left]] : []),
    aligned.flatMap(row => typeof row.values[left] === 'number' && typeof row.values[right] === 'number' ? [row.values[right]] : [])
  )))
  const exposuresByTicker: Record<string, PmFactorExposure[]> = {}
  const betaByTicker: Record<string, number> = {}
  const residualVarianceByTicker: Record<string, number> = {}
  const annualizedVolByTicker: Record<string, number> = {}
  const observationsByTicker: Record<string, number> = {}
  const gaps: string[] = []

  for (const ticker of tickers) {
    const rows = aligned.filter(row => typeof row.values[ticker] === 'number' && usableFactors.every(factor => typeof row.values[factor] === 'number'))
    const y = rows.map(row => row.values[ticker])
    annualizedVolByTicker[ticker] = round(annualizedVolatility(series[ticker]?.map(row => row.value) ?? []), 2)
    observationsByTicker[ticker] = rows.length
    if (rows.length < Math.max(30, usableFactors.length + 5) || usableFactors.length === 0) {
      exposuresByTicker[ticker] = usableFactors.map(factor => ({ factor, exposure: 0 }))
      betaByTicker[ticker] = 0
      residualVarianceByTicker[ticker] = variance(y)
      gaps.push(`${ticker}: factor model needs at least 30 aligned observations; found ${rows.length}.`)
      continue
    }
    const x = rows.map(row => usableFactors.map(factor => row.values[factor]))
    const beta = ordinaryLeastSquares(x, y)
    const residuals = y.map((value, index) => value - dot(x[index], beta))
    exposuresByTicker[ticker] = usableFactors.map((factor, index) => ({ factor, exposure: round(beta[index], 4) }))
    betaByTicker[ticker] = round(beta[usableFactors.indexOf('SPY')] ?? beta[usableFactors.indexOf('QQQ')] ?? average(beta), 3)
    residualVarianceByTicker[ticker] = variance(residuals)
  }

  return {
    factors: usableFactors,
    factorCovariance,
    exposuresByTicker,
    betaByTicker,
    residualVarianceByTicker,
    annualizedVolByTicker,
    observationsByTicker,
    gaps: [
      ...gaps,
      ...factors.filter(factor => !usableFactors.includes(factor)).map(factor => `${factor}: factor return history unavailable.`)
    ]
  }
}

export function portfolioVariance(input: {
  tickers: string[]
  weights: number[]
  factorModel: FactorModel
}) {
  const { tickers, weights, factorModel } = input
  const exposureMatrix = tickers.map(ticker => factorModel.factors.map(factor => factorModel.exposuresByTicker[ticker]?.find(item => item.factor === factor)?.exposure ?? 0))
  const factorCov = factorModel.factorCovariance
  let total = 0
  for (let i = 0; i < tickers.length; i += 1) {
    for (let j = 0; j < tickers.length; j += 1) {
      const factorPart = dot(exposureMatrix[i], matrixVector(factorCov, exposureMatrix[j]))
      const residualPart = i === j ? (factorModel.residualVarianceByTicker[tickers[i]] ?? 0) : 0
      total += weights[i] * weights[j] * (factorPart + residualPart)
    }
  }
  return Math.max(0, total)
}

export function ordinaryLeastSquares(x: number[][], y: number[]) {
  const cols = x[0]?.length ?? 0
  if (!cols) return []
  const xtx = Array.from({ length: cols }, () => Array.from({ length: cols }, () => 0))
  const xty = Array.from({ length: cols }, () => 0)
  for (let row = 0; row < x.length; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      xty[col] += x[row][col] * y[row]
      for (let other = 0; other < cols; other += 1) xtx[col][other] += x[row][col] * x[row][other]
    }
  }
  for (let col = 0; col < cols; col += 1) xtx[col][col] += 1e-6
  return solveLinearSystem(xtx, xty)
}
