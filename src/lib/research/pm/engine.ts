import { pointInTime } from '@/lib/data/availability'
import { loadPriceSeries } from '@/features/pm-engine/infrastructure/price-series-prisma'
import { listInvestmentDecisions } from '@/lib/research/decisions'
import { getCrowdingRows, getPositioningRows, getRotationRows } from '@/lib/research/repository'
import type { InvestmentDecisionRecord } from '@/types/decision'
import type { PricePoint } from '@/types/market'
import type { PmDecisionOverlay, PmEngineView, PmFactorHeatmapRow, PmLiquidityExit, PmRiskContribution, PmSectorExposure } from '@/types/pm'
import { summarizePmBacktest } from './backtest'
import { buildScenarios } from './expectedValue'
import { buildFactorModel, portfolioVariance, type PriceSeries } from './factorRisk'
import { latestEstimateByTicker, latestFundamentalByTicker } from './fundamentals'
import { annualizedVolatility, average, correlation, PM_DEFAULTS, PM_FACTORS, returnsFromPrices, round } from './math'
import { optimizePmBook } from './optimizer'
import { buildSizingWaterfall } from './sizing'
import { estimateTransactionCost } from './transactionCosts'
import { historicalRisk, stressScenarios } from './varStress'

export async function buildPmEngineView(
  decisionsInput?: InvestmentDecisionRecord[],
  clock: () => Date = () => new Date()
): Promise<PmEngineView> {
  const generatedAt = clock().toISOString()
  const decisions = decisionsInput ?? await listInvestmentDecisions()
  const active = decisions.filter(decision => decision.status !== 'closed')
  const tickers = unique(active.map(decision => decision.ticker))
  const [rotations, crowdingRows, positioningRows, priceSeries, fundamentals, estimates] = await Promise.all([
    getRotationRows(),
    getCrowdingRows(),
    getPositioningRows(),
    loadPriceSeries([...tickers, ...PM_FACTORS]),
    latestFundamentalByTicker(tickers),
    latestEstimateByTicker(tickers)
  ])
  const rotationByTicker = new Map(rotations.map(row => [row.ticker, row]))
  const crowdingByTicker = new Map(crowdingRows.map(row => [row.ticker, row]))
  const positioningByTicker = new Map(positioningRows.map(row => [row.ticker, row]))
  const factorModel = buildFactorModel(priceSeries, tickers)
  const globalBacktest = summarizePmBacktest(buildBacktestSamples(priceSeries, tickers))
  let currentGrossPct = 0
  let currentNetPct = 0
  const sectorGross = new Map<string, number>()
  const overlays: PmDecisionOverlay[] = []

  for (const decision of active) {
    const rotation = rotationByTicker.get(decision.ticker)
    const crowding = crowdingByTicker.get(decision.ticker)
    const positioning = positioningByTicker.get(decision.ticker)
    const series = priceSeries[decision.ticker] ?? []
    const returns = returnsFromPrices(series).map(row => row.value * 100)
    const annualizedRiskPct = rotation?.realizedVol20d.value ?? factorModel.annualizedVolByTicker[decision.ticker] ?? annualizedVolatility(returns.map(value => value / 100))
    const advDollars = averageAdvDollars(series)
    const humanSizePct = decision.decision === 'long' || decision.decision === 'short' ? decision.risk.positionSizePct ?? 0 : 0
    const scenarios = buildScenarios({
      entryPrice: decision.risk.entryPrice,
      targetPrice: decision.risk.targetPrice,
      stopPrice: decision.risk.stopPrice,
      side: decision.decision,
      confidence: decision.risk.confidence
    })
    const preCost = estimateTransactionCost({
      sizePct: Math.max(humanSizePct, 1),
      annualizedVolPct: annualizedRiskPct,
      advDollars,
      nav: PM_DEFAULTS.nav
    })
    const costAdjustedEvPct = round(scenarios.expectedValuePct - preCost.estimatedCostPct, 2)
    const beta = factorModel.betaByTicker[decision.ticker] ?? 0
    const maxCorrelation = maxPairCorrelation(decision.ticker, tickers, priceSeries)
    const sector = rotation?.sector ?? crowding?.basket ?? 'Unclassified'
    const sizing = buildSizingWaterfall({
      entryPrice: decision.risk.entryPrice,
      stopPrice: decision.risk.stopPrice,
      side: decision.decision,
      defaults: PM_DEFAULTS,
      annualizedVolPct: annualizedRiskPct,
      liquidityDays: liquidityDays(preCost.advParticipationPct),
      beta,
      currentGrossPct,
      currentNetPct,
      sectorGrossPct: sectorGross.get(sector) ?? 0,
      maxCorrelation,
      costAdjustedEvPct
    })
    const finalCost = estimateTransactionCost({
      sizePct: sizing.finalSizePct,
      annualizedVolPct: annualizedRiskPct,
      advDollars,
      nav: PM_DEFAULTS.nav
    })
    const gapRows = [
      fundamentals.has(decision.ticker) ? null : 'fundamentals missing',
      estimates.has(decision.ticker) ? null : 'consensus estimates missing',
      series.length >= 60 ? null : 'price history too short',
      positioning?.optionsVolume.value !== null || positioning?.openInterest.value !== null ? null : 'options/positioning incomplete',
      (factorModel.observationsByTicker[decision.ticker] ?? 0) >= 30 ? null : 'factor model partial',
      globalBacktest.grade === 'N/A' ? 'backtest sample too small' : null,
      finalCost.liquidityMissing ? 'liquidity/ADV missing' : null
    ].filter((item): item is string => Boolean(item))
    const sourceLights = [
      light('Fundamentals', fundamentals.has(decision.ticker), 'Point-in-time fundamentals snapshot.'),
      light('Estimates', estimates.has(decision.ticker), 'Point-in-time consensus estimate snapshot.'),
      light('Price', series.length >= 60, `${series.length} price rows.`),
      light('Options', positioning?.optionsVolume.value !== null || positioning?.openInterest.value !== null, positioning?.positioningNotes ?? 'Options/short data unavailable.'),
      light('Risk Model', (factorModel.observationsByTicker[decision.ticker] ?? 0) >= 30, `${factorModel.observationsByTicker[decision.ticker] ?? 0} aligned observations.`),
      light('Backtest', globalBacktest.grade !== 'N/A', `Grade ${globalBacktest.grade}.`)
    ]
    const pmReady = gapRows.length === 0 && costAdjustedEvPct > 0 && sizing.finalSizePct > 0
    const sideSign = decision.decision === 'short' ? -1 : decision.decision === 'long' ? 1 : 0
    if (sideSign !== 0) {
      currentGrossPct += Math.abs(sizing.finalSizePct)
      currentNetPct += sideSign * sizing.finalSizePct
      sectorGross.set(sector, (sectorGross.get(sector) ?? 0) + Math.abs(sizing.finalSizePct))
    }
    overlays.push({
      ...pointInTime({
        asOfDate: generatedAt,
        observedAt: generatedAt,
        providerTimestamp: generatedAt,
        ingestedAt: generatedAt,
        source: 'PM engine overlay from current decision log, sourced prices, signals, positioning, and optional fundamentals/estimates',
        provider: 'internal PM engine',
        dataStatus: pmReady ? 'AVAILABLE' : 'PARTIAL'
      }),
      decisionSlug: decision.slug,
      ticker: decision.ticker,
      side: decision.decision,
      status: decision.status,
      sector,
      humanSizePct,
      suggestedSizePct: sizing.finalSizePct,
      sizeDeltaPct: round(sizing.finalSizePct - humanSizePct, 2),
      rawStopSizePct: sizing.rawStopSizePct,
      finalSizePct: sizing.finalSizePct,
      expectedValuePct: scenarios.expectedValuePct,
      costAdjustedEvPct,
      estimatedCostPct: finalCost.estimatedCostPct,
      annualizedRiskPct: round(annualizedRiskPct, 2),
      riskContributionPct: round((sizing.finalSizePct / 100) * annualizedRiskPct, 2),
      beta,
      liquidityDays: liquidityDays(finalCost.advParticipationPct),
      activeCapReason: sizing.activeCapReason,
      optimizerAction: 'watch',
      optimizerReason: 'pending optimizer',
      pmReady,
      sourceLights,
      scenarios: scenarios.scenarios,
      sizingWaterfall: sizing.sizingWaterfall,
      factorExposures: factorModel.exposuresByTicker[decision.ticker] ?? [],
      stressScenarios: stressScenarios({
        beta,
        semisExposure: exposure(factorModel, decision.ticker, 'SMH'),
        koreaExposure: exposure(factorModel, decision.ticker, 'EWY'),
        ratesExposure: exposure(factorModel, decision.ticker, 'TLT'),
        vixExposure: exposure(factorModel, decision.ticker, 'VIXY'),
        sizePct: sizing.finalSizePct
      }),
      backtest: summarizePmBacktest(buildBacktestSamples(priceSeries, [decision.ticker])),
      sourceGaps: gapRows,
      excludedUnavailableInputs: gapRows
    })
  }

  const optimized = optimizePmBook(overlays, PM_DEFAULTS)
  const weights = optimized.decisions.map(decision => (decision.side === 'short' ? -1 : 1) * decision.suggestedSizePct / 100)
  const riskVariance = portfolioVariance({
    tickers: optimized.decisions.map(decision => decision.ticker),
    weights,
    factorModel
  })
  const portfolioReturns = weightedPortfolioReturns(priceSeries, optimized.decisions)
  const portfolioRisk = historicalRisk(portfolioReturns)
  const annualizedRiskPct = round(Math.sqrt(riskVariance) * Math.sqrt(252) * 100, 2)
  const portfolioBeta = round(optimized.decisions.reduce((sum, decision) => sum + (decision.suggestedSizePct / 100) * (decision.side === 'short' ? -1 : 1) * decision.beta, 0), 3)
  const pmReadyCount = optimized.decisions.filter(decision => decision.pmReady).length
  const engineDataStatus = optimized.decisions.length === 0 ? 'UNAVAILABLE' : pmReadyCount === optimized.decisions.length ? 'AVAILABLE' : 'PARTIAL'
  const portfolioDataStatus = optimized.decisions.length === 0 ? 'UNAVAILABLE' : 'AVAILABLE'
  const portfolioPoint = pointInTime({
    asOfDate: generatedAt,
    observedAt: generatedAt,
    providerTimestamp: generatedAt,
    ingestedAt: generatedAt,
    source: 'PM engine portfolio construction',
    provider: 'internal PM engine',
    dataStatus: portfolioDataStatus
  })
  const portfolio = {
    ...portfolioPoint,
    pmReadyCount,
    grossPct: optimized.grossPct,
    netPct: optimized.netPct,
    portfolioBeta,
    annualizedRiskPct,
    valueAtRisk95Pct: portfolioRisk.valueAtRisk95Pct,
    valueAtRisk99Pct: portfolioRisk.valueAtRisk99Pct,
    expectedShortfallPct: portfolioRisk.expectedShortfallPct,
    costAdjustedEvPct: round(optimized.decisions.reduce((sum, decision) => sum + (decision.suggestedSizePct / 100) * decision.costAdjustedEvPct, 0), 2),
    liquidityDays: round(Math.max(0, ...optimized.decisions.map(decision => decision.liquidityDays)), 1),
    factorHeatmap: buildFactorHeatmap(optimized.decisions),
    sectorExposure: buildSectorExposure(optimized.decisions),
    riskContribution: buildRiskContribution(optimized.decisions),
    liquidityExit: buildLiquidityExit(optimized.decisions, priceSeries),
    optimizerLedger: optimized.ledger,
    backtest: globalBacktest
  }

  return {
    defaults: PM_DEFAULTS,
    portfolio,
    decisions: optimized.decisions,
    dataStatus: engineDataStatus,
    gaps: unique([...factorModel.gaps, ...optimized.decisions.flatMap(decision => decision.sourceGaps)])
  }
}

function buildBacktestSamples(priceSeries: PriceSeries, tickers: string[]) {
  return tickers.flatMap(ticker => {
    const rows = [...priceSeries[ticker] ?? []].sort((a, b) => a.date.localeCompare(b.date))
    const samples: { score: number; forwardReturn: number; cost: number }[] = []
    for (let index = 40; index + 20 < rows.length; index += 10) {
      const prior = rows[index - 20]
      const anchor = rows[index]
      const forward = rows[index + 20]
      if (!prior || !anchor || !forward || prior.price <= 0 || anchor.price <= 0) continue
      const score = ((anchor.price - prior.price) / prior.price) * 100
      const forwardReturn = ((forward.price - anchor.price) / anchor.price) * 100
      samples.push({ score, forwardReturn, cost: 0.12 })
    }
    return samples
  })
}

function weightedPortfolioReturns(priceSeries: PriceSeries, decisions: PmDecisionOverlay[]) {
  const byDate = new Map<string, number>()
  for (const decision of decisions) {
    if (decision.suggestedSizePct <= 0) continue
    const sign = decision.side === 'short' ? -1 : 1
    for (const row of returnsFromPrices(priceSeries[decision.ticker] ?? [])) {
      byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.value * 100 * sign * decision.suggestedSizePct / 100)
    }
  }
  return [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, value]) => value)
}

function averageAdvDollars(rows: PriceSeries[string]) {
  const values = rows
    .filter(row => row.volume !== null && row.volume !== undefined && row.volume > 0)
    .slice(-20)
    .map(row => row.price * Number(row.volume))
  return values.length >= 10 ? average(values) : null
}

function liquidityDays(advParticipationPct: number | null) {
  if (advParticipationPct === null) return 999
  return round(Math.max(0.1, advParticipationPct / PM_DEFAULTS.maxAdvParticipationPct), 1)
}

function maxPairCorrelation(ticker: string, tickers: string[], priceSeries: PriceSeries) {
  const base = returnsFromPrices(priceSeries[ticker] ?? []).map(row => row.value)
  return Math.max(0, ...tickers.filter(item => item !== ticker).map(other => correlation(base, returnsFromPrices(priceSeries[other] ?? []).map(row => row.value))))
}

function exposure(model: ReturnType<typeof buildFactorModel>, ticker: string, factor: string) {
  return model.exposuresByTicker[ticker]?.find(item => item.factor === factor)?.exposure ?? 0
}

function buildFactorHeatmap(decisions: PmDecisionOverlay[]): PmFactorHeatmapRow[] {
  return decisions.map(decision => ({
    ticker: decision.ticker,
    exposures: Object.fromEntries(decision.factorExposures.map(item => [item.factor, item.exposure]))
  }))
}

function buildSectorExposure(decisions: PmDecisionOverlay[]): PmSectorExposure[] {
  const map = new Map<string, PmSectorExposure>()
  for (const decision of decisions) {
    const current = map.get(decision.sector) ?? { sector: decision.sector, grossPct: 0, netPct: 0, count: 0 }
    current.grossPct += Math.abs(decision.suggestedSizePct)
    current.netPct += (decision.side === 'short' ? -1 : 1) * decision.suggestedSizePct
    current.count += decision.suggestedSizePct > 0 ? 1 : 0
    map.set(decision.sector, current)
  }
  return [...map.values()].map(row => ({ ...row, grossPct: round(row.grossPct, 2), netPct: round(row.netPct, 2) })).sort((a, b) => b.grossPct - a.grossPct)
}

function buildRiskContribution(decisions: PmDecisionOverlay[]): PmRiskContribution[] {
  const total = decisions.reduce((sum, decision) => sum + Math.abs(decision.riskContributionPct), 0)
  return decisions.map(decision => ({
    ticker: decision.ticker,
    riskPct: total > 0 ? round(Math.abs(decision.riskContributionPct) / total * 100, 1) : 0,
    sizePct: decision.suggestedSizePct
  })).sort((a, b) => b.riskPct - a.riskPct)
}

function buildLiquidityExit(decisions: PmDecisionOverlay[], priceSeries: PriceSeries): PmLiquidityExit[] {
  return decisions.map(decision => {
    const cost = estimateTransactionCost({
      sizePct: decision.suggestedSizePct,
      annualizedVolPct: decision.annualizedRiskPct,
      advDollars: averageAdvDollars(priceSeries[decision.ticker] ?? []),
      nav: PM_DEFAULTS.nav
    })
    return {
      ticker: decision.ticker,
      daysToExit: decision.liquidityDays,
      advParticipationPct: cost.advParticipationPct ?? 0,
      estimatedCostPct: cost.estimatedCostPct
    }
  }).sort((a, b) => b.daysToExit - a.daysToExit)
}

function light(label: string, ok: boolean | undefined, detail: string) {
  return {
    label,
    status: ok ? 'available' as const : 'missing' as const,
    detail
  }
}

function unique<T>(rows: T[]) {
  return [...new Set(rows.filter(Boolean))]
}
