import { sleep } from './lib/io'
import { Prisma, PrismaClient } from '@prisma/client'
import { fetchFinraShortData } from '../src/lib/data/providers/finra'
import { demoModeAsOfDate } from '../src/lib/data/providers/common'
import { fetchPolygonDailyBars, fetchPolygonOptionSnapshot } from '../src/lib/data/providers/polygon'
import { calculateReturnFromBars, distanceFromMovingAverage, realizedVolatility20d, trendLabel, volumeVsAverage20d } from '../src/lib/data/signals/returns'
import { seedTickers } from '../src/lib/data/baskets/seedTickers'
import { seedBaskets } from '../src/lib/data/baskets/seedBaskets'
import { crowdingLabel, crowdingScoreFromComponents, extensionRiskScoreFromComponents, setupLabel } from '../src/lib/research/crowdingScores'
import { buildOptionsBattlefieldFromRaw } from '../src/lib/research/optionsBattlefield'
import type { DbDataStatus } from '../src/lib/research/types'
import { providerRunMetadata, shouldPublishProviderResult } from './lib/provider_run_lifecycle'
import { isTransientPrismaError, withRetries } from './lib/retry'

const prisma = new PrismaClient()
const lookbackDays = Number(process.env.FLOW_TERMINAL_LOOKBACK_DAYS ?? 180)
const ingestLimit = Number(process.env.FLOW_TERMINAL_INGEST_LIMIT ?? 80)
const polygonThrottleMs = Number(process.env.POLYGON_THROTTLE_MS ?? 0)
const enableDeferredPositioningFeeds = process.env.ENABLE_DEFERRED_POSITIONING_FEEDS === 'true'
  || process.env.ENABLE_MASSIVE_OPTIONS === 'true'
  || process.env.ENABLE_POLYGON_OPTIONS === 'true'
const positioningOnly = process.env.FLOW_TERMINAL_POSITIONING_ONLY === 'true'
const positioningLimit = Number(process.env.FLOW_TERMINAL_POSITIONING_LIMIT ?? process.env.MASSIVE_OPTIONS_BACKFILL_LIMIT ?? 5)
const targetTickers = new Set((process.env.FLOW_TERMINAL_TICKERS ?? '').split(',').map(item => item.trim().toUpperCase()).filter(Boolean))
const optionThrottleMs = Math.max(12_000, Number(process.env.MASSIVE_OPTIONS_THROTTLE_MS ?? process.env.POLYGON_OPTIONS_THROTTLE_MS ?? process.env.POLYGON_THROTTLE_MS ?? 13_000))
let lastOptionRequestAt = 0

type PriceBar = {
  date: string
  close: number
  volume: number | null
}

async function main() {
  await seedTaxonomy()
  const demoDate = demoModeAsOfDate()
  if (demoDate) {
    console.log(`DEMO_AS_OF_DATE=${process.env.DEMO_AS_OF_DATE} active; skipping live fetches and recomputing sourced snapshots from DB`)
    await computeAllSnapshots(demoDate)
    return
  }

  const tickers = await selectIngestTickers(positioningOnly ? positioningLimit : ingestLimit)
  const to = new Date()
  if (positioningOnly) {
    for (const ticker of tickers.filter(ticker => shouldIngestDeferredPositioning(ticker.ticker, ticker.isEtf))) {
      await ingestPositioning(ticker.id, ticker.ticker, to)
    }
    await computeAllSnapshots(to)
    return
  }

  const from = new Date(to)
  from.setUTCDate(to.getUTCDate() - lookbackDays)
  const fromText = from.toISOString().slice(0, 10)
  const toText = to.toISOString().slice(0, 10)

  const refreshedTickers = new Set<string>()
  for (const ticker of tickers) {
    const startedAt = new Date()
    const providerRunId = await startProviderRun(startedAt, to, ticker.ticker)
    const bars = await fetchPolygonDailyBars(ticker.ticker, fromText, toText)
    if (!shouldPublishProviderResult(bars.status, bars.rows.length)) {
      const status = bars.status === 'AVAILABLE' ? 'UNAVAILABLE' : bars.status
      await finishProviderRun(providerRunId, to, status, 0, bars.errorMessage ?? 'Provider returned no rows.', ticker.ticker)
    } else {
      const writes = bars.rows.map(bar => prisma.dailyPrice.upsert({
          where: { tickerId_date_provider_asOfDate: { tickerId: ticker.id, date: bar.date, provider: bar.provider, asOfDate: bar.asOfDate } },
          update: {
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
            adjustedClose: bar.adjustedClose,
            volume: bar.volume,
            observedAt: bar.observedAt,
            providerTimestamp: bar.providerTimestamp,
            ingestedAt: bar.ingestedAt,
            source: bar.source,
            revisionFlag: bar.revisionFlag,
            dataStatus: bar.dataStatus
          },
          create: {
            tickerId: ticker.id,
            date: bar.date,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
            adjustedClose: bar.adjustedClose,
            volume: bar.volume,
            asOfDate: bar.asOfDate,
            observedAt: bar.observedAt,
            providerTimestamp: bar.providerTimestamp,
            ingestedAt: bar.ingestedAt,
            source: bar.source,
            provider: bar.provider,
            revisionFlag: bar.revisionFlag,
            dataStatus: bar.dataStatus
          }
        }))
      for (let index = 0; index < writes.length; index += 100) {
        await prisma.$transaction(writes.slice(index, index + 100))
      }
      refreshedTickers.add(ticker.ticker)
      await finishProviderRun(providerRunId, to, bars.status, bars.rows.length, undefined, ticker.ticker)
    }

    if (enableDeferredPositioningFeeds && shouldIngestDeferredPositioning(ticker.ticker, ticker.isEtf)) {
      await ingestPositioning(ticker.id, ticker.ticker, to)
    }
    if (polygonThrottleMs > 0) await sleep(polygonThrottleMs)
  }

  await computeAllSnapshots(to, refreshedTickers)
}

async function selectIngestTickers(limit: number) {
  const where = targetTickers.size ? { ticker: { in: [...targetTickers] } } : {}
  return prisma.ticker.findMany({
    where,
    orderBy: { ticker: 'asc' },
    take: Number.isFinite(limit) && limit > 0 ? limit : undefined
  })
}

async function startProviderRun(startedAt: Date, asOfDate: Date, ticker: string) {
  const run = await prisma.providerRun.create({
    data: {
      provider: 'Polygon/Massive',
      source: 'https://polygon.io/docs/rest/stocks/aggregates/custom-bars',
      startedAt,
      asOfDate,
      observedAt: asOfDate,
      dataStatus: 'PARTIAL',
      metadata: providerRunMetadata({ ticker, dataset: 'daily-ohlcv', asOfDate, finished: false }),
      rowsIngested: 0
    }
  })
  return run.id
}

async function finishProviderRun(runId: string, asOfDate: Date, dataStatus: DbDataStatus, rowsIngested: number, errorMessage?: string, ticker?: string) {
  await prisma.providerRun.update({
    where: { id: runId },
    data: {
      finishedAt: new Date(),
      asOfDate,
      observedAt: asOfDate,
      dataStatus,
      errorMessage,
      metadata: providerRunMetadata({
        ticker: ticker ?? 'unknown',
        dataset: 'daily-ohlcv',
        asOfDate,
        dataStatus,
        finished: true,
        hasError: Boolean(errorMessage)
      }),
      rowsIngested
    }
  })
}

function shouldIngestDeferredPositioning(ticker: string, isEtf: boolean) {
  return !isEtf || ['SPY', 'QQQ', 'SMH', 'ITA', 'XAR', 'EWY'].includes(ticker)
}

async function ingestPositioning(tickerId: string, symbol: string, date: Date) {
  await throttleOptionChain(symbol)
  const underlyingPrice = await latestClose(tickerId, date)
  const [options, shortData] = await Promise.all([
    fetchPolygonOptionSnapshot(symbol, { underlyingPrice }),
    fetchFinraShortData(symbol)
  ])
  const optionRow = options.rows[0]
  const shortRow = shortData.rows[0]
  const status = combineProviderStatus(options.status, shortData.status)
  if (options.errorMessage) console.warn(`${symbol} options provider: ${options.errorMessage}`)
  if (shortData.errorMessage) console.warn(`${symbol} FINRA provider: ${shortData.errorMessage}`)
  const excludedUnavailableInputs = [
    ...(optionRow?.excludedUnavailableInputs ?? ['options volume', 'open interest', 'put/call ratio', 'implied volatility']),
    ...(shortRow ? [] : ['short interest', 'short volume'])
  ]
  const components = {
    options: optionRow?.raw ?? null,
    short: shortRow?.raw ?? null,
    errors: {
      options: options.errorMessage ?? null,
      short: shortData.errorMessage ?? null
    }
  }
  const positioningNotes = providerNote(options.status, shortData.status, optionRow?.raw)
  const source = [optionRow?.source, shortRow?.source ?? 'https://developer.finra.org/docs']
    .filter((item): item is string => Boolean(item))
    .join('; ')
  await prisma.positioningSnapshot.upsert({
    where: { tickerId_date_provider_asOfDate: { tickerId, date, provider: 'Polygon/Massive + FINRA', asOfDate: date } },
    update: {
      optionsVolume: optionRow?.optionsVolume ?? null,
      openInterest: optionRow?.openInterest ?? null,
      putCallRatio: optionRow?.putCallRatio ?? null,
      impliedVolatility: optionRow?.impliedVolatility ?? null,
      shortInterest: shortRow?.shortInterest ?? null,
      shortVolume: shortRow?.shortVolume ?? null,
      shortVolumeRatio: shortRow?.shortVolumeRatio ?? null,
      positioningNotes,
      components,
      excludedUnavailableInputs,
      observedAt: date,
      ingestedAt: new Date(),
      source,
      dataStatus: status
    },
    create: {
      tickerId,
      date,
      asOfDate: date,
      observedAt: date,
      providerTimestamp: date,
      ingestedAt: new Date(),
      source,
      provider: 'Polygon/Massive + FINRA',
      dataStatus: status,
      optionsVolume: optionRow?.optionsVolume ?? null,
      openInterest: optionRow?.openInterest ?? null,
      putCallRatio: optionRow?.putCallRatio ?? null,
      impliedVolatility: optionRow?.impliedVolatility ?? null,
      shortInterest: shortRow?.shortInterest ?? null,
      shortVolume: shortRow?.shortVolume ?? null,
      shortVolumeRatio: shortRow?.shortVolumeRatio ?? null,
      positioningNotes,
      components,
      excludedUnavailableInputs
    }
  })
  await persistOptionsBattlefield(symbol, date, optionRow?.raw, underlyingPrice, {
    provider: optionRow?.provider ?? 'Polygon/Massive',
    source: optionRow?.source ?? 'https://polygon.io/docs/rest/options',
    asOfDate: optionRow?.asOfDate ?? date,
    observedAt: optionRow?.observedAt ?? date,
    providerTimestamp: optionRow?.providerTimestamp ?? date,
    ingestedAt: optionRow?.ingestedAt ?? new Date(),
    dataStatus: optionRow?.dataStatus ?? options.status
  })
}

async function persistOptionsBattlefield(symbol: string, date: Date, rawOptions: unknown, underlyingPrice: number | null, meta: {
  provider: string
  source: string
  asOfDate: Date
  observedAt: Date | null
  providerTimestamp: Date | null
  ingestedAt: Date
  dataStatus: DbDataStatus
}) {
  if (!rawOptions || typeof rawOptions !== 'object' || Array.isArray(rawOptions)) return
  const asOfText = meta.asOfDate.toISOString().slice(0, 10)
  const battlefield = buildOptionsBattlefieldFromRaw(symbol, rawOptions, underlyingPrice, asOfText)
  const contracts = optionContractsFromRaw(symbol, rawOptions)
  const bars = optionBarsFromRaw(symbol, rawOptions, date)

  for (const contract of contracts) {
    await prisma.optionContract.upsert({
      where: { optionTicker: contract.optionTicker },
      update: {
        underlyingTicker: symbol,
        expirationDate: contract.expirationDate,
        strikePrice: contract.strikePrice,
        contractType: contract.contractType,
        exerciseStyle: contract.exerciseStyle,
        sharesPerContract: contract.sharesPerContract,
        asOfDate: meta.asOfDate,
        observedAt: meta.observedAt,
        providerTimestamp: meta.providerTimestamp,
        ingestedAt: meta.ingestedAt,
        source: meta.source,
        provider: meta.provider,
        dataStatus: meta.dataStatus
      },
      create: {
        optionTicker: contract.optionTicker,
        underlyingTicker: symbol,
        expirationDate: contract.expirationDate,
        strikePrice: contract.strikePrice,
        contractType: contract.contractType,
        exerciseStyle: contract.exerciseStyle,
        sharesPerContract: contract.sharesPerContract,
        asOfDate: meta.asOfDate,
        observedAt: meta.observedAt,
        providerTimestamp: meta.providerTimestamp,
        ingestedAt: meta.ingestedAt,
        source: meta.source,
        provider: meta.provider,
        dataStatus: meta.dataStatus
      }
    })
  }

  for (const bar of bars) {
    await prisma.optionContractBar.upsert({
      where: { optionTicker_date_provider_asOfDate: { optionTicker: bar.optionTicker, date: bar.date, provider: meta.provider, asOfDate: meta.asOfDate } },
      update: {
        underlyingTicker: symbol,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
        vwap: bar.vwap,
        transactions: bar.transactions,
        observedAt: meta.observedAt,
        providerTimestamp: meta.providerTimestamp,
        ingestedAt: meta.ingestedAt,
        source: meta.source,
        dataStatus: bar.volume === null ? 'PARTIAL' : 'AVAILABLE'
      },
      create: {
        optionTicker: bar.optionTicker,
        underlyingTicker: symbol,
        date: bar.date,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
        vwap: bar.vwap,
        transactions: bar.transactions,
        asOfDate: meta.asOfDate,
        observedAt: meta.observedAt,
        providerTimestamp: meta.providerTimestamp,
        ingestedAt: meta.ingestedAt,
        source: meta.source,
        provider: meta.provider,
        dataStatus: bar.volume === null ? 'PARTIAL' : 'AVAILABLE'
      }
    })
  }

  if (!battlefield) return
  for (const strike of battlefield.strikes) {
    await prisma.optionsStrikeSignal.upsert({
      where: {
        ticker_date_expirationDate_strikePrice_mode: {
          ticker: symbol,
          date,
          expirationDate: dateFromIso(strike.expirationDate) ?? date,
          strikePrice: strike.strikePrice,
          mode: battlefield.mode
        }
      },
      update: {
        callVolume: strike.callVolume,
        putVolume: strike.putVolume,
        totalVolume: strike.totalVolume,
        openInterest: strike.openInterest,
        impliedVolatility: strike.impliedVolatility,
        gamma: strike.gamma,
        gammaExposure: strike.gammaExposure,
        gammaProxy: strike.gammaProxy,
        magnetScore: strike.magnetScore,
        sourceQuality: strike.sourceQuality,
        asOfDate: meta.asOfDate,
        observedAt: meta.observedAt,
        providerTimestamp: meta.providerTimestamp,
        ingestedAt: meta.ingestedAt,
        source: meta.source,
        provider: meta.provider,
        dataStatus: battlefield.mode === 'true-gex' ? 'AVAILABLE' : 'PARTIAL'
      },
      create: {
        ticker: symbol,
        date,
        expirationDate: dateFromIso(strike.expirationDate) ?? date,
        strikePrice: strike.strikePrice,
        callVolume: strike.callVolume,
        putVolume: strike.putVolume,
        totalVolume: strike.totalVolume,
        openInterest: strike.openInterest,
        impliedVolatility: strike.impliedVolatility,
        gamma: strike.gamma,
        gammaExposure: strike.gammaExposure,
        gammaProxy: strike.gammaProxy,
        magnetScore: strike.magnetScore,
        sourceQuality: strike.sourceQuality,
        mode: battlefield.mode,
        asOfDate: meta.asOfDate,
        observedAt: meta.observedAt,
        providerTimestamp: meta.providerTimestamp,
        ingestedAt: meta.ingestedAt,
        source: meta.source,
        provider: meta.provider,
        dataStatus: battlefield.mode === 'true-gex' ? 'AVAILABLE' : 'PARTIAL'
      }
    })
  }

  await prisma.optionsBattlefieldSnapshot.upsert({
    where: { ticker_date_mode_provider_asOfDate: { ticker: symbol, date, mode: battlefield.mode, provider: meta.provider, asOfDate: meta.asOfDate } },
    update: {
      sourceLabel: battlefield.sourceLabel,
      callWall: battlefield.callWall,
      putWall: battlefield.putWall,
      zeroGamma: battlefield.zeroGamma,
      expectedMove: battlefield.expectedMove,
      pressureDirection: battlefield.pressureDirection,
      confidence: battlefield.confidence,
      payload: battlefield as unknown as Prisma.InputJsonValue,
      observedAt: meta.observedAt,
      providerTimestamp: meta.providerTimestamp,
      ingestedAt: meta.ingestedAt,
      source: meta.source,
      dataStatus: battlefield.mode === 'true-gex' ? 'AVAILABLE' : 'PARTIAL'
    },
    create: {
      ticker: symbol,
      date,
      mode: battlefield.mode,
      sourceLabel: battlefield.sourceLabel,
      callWall: battlefield.callWall,
      putWall: battlefield.putWall,
      zeroGamma: battlefield.zeroGamma,
      expectedMove: battlefield.expectedMove,
      pressureDirection: battlefield.pressureDirection,
      confidence: battlefield.confidence,
      payload: battlefield as unknown as Prisma.InputJsonValue,
      asOfDate: meta.asOfDate,
      observedAt: meta.observedAt,
      providerTimestamp: meta.providerTimestamp,
      ingestedAt: meta.ingestedAt,
      source: meta.source,
      provider: meta.provider,
      dataStatus: battlefield.mode === 'true-gex' ? 'AVAILABLE' : 'PARTIAL'
    }
  })
}

function optionContractsFromRaw(symbol: string, rawOptions: unknown) {
  const raw = recordOrNull(rawOptions)
  if (!raw) return []
  const contracts = raw.mode === 'options-basic-proxy'
    ? [...arrayOfRecords(raw.calls), ...arrayOfRecords(raw.puts), ...arrayOfRecords(raw.sampledContracts)]
    : arrayOfRecords(raw.results).map(row => recordOrNull(row.details)).filter((item): item is Record<string, unknown> => Boolean(item))
  const seen = new Set<string>()
  return contracts.flatMap(contract => {
    const optionTicker = stringOr(contract.ticker)
    const expirationDate = dateFromIso(stringOr(contract.expiration_date))
    const strikePrice = numberOrNull(contract.strike_price)
    const contractType = stringOr(contract.contract_type)
    if (!optionTicker || !expirationDate || strikePrice === null || !contractType || seen.has(optionTicker)) return []
    seen.add(optionTicker)
    return [{
      optionTicker,
      underlyingTicker: symbol,
      expirationDate,
      strikePrice,
      contractType,
      exerciseStyle: stringOr(contract.exercise_style) || null,
      sharesPerContract: integerOrNull(contract.shares_per_contract)
    }]
  })
}

function optionBarsFromRaw(symbol: string, rawOptions: unknown, fallbackDate: Date) {
  const raw = recordOrNull(rawOptions)
  if (!raw || raw.mode !== 'options-basic-proxy') return []
  return arrayOfRecords(raw.aggregateSamples).flatMap(sample => {
    const contract = recordOrNull(sample.contract)
    const optionTicker = stringOr(contract?.ticker)
    const date = dateFromIso(stringOr(sample.date)) ?? fallbackDate
    if (!optionTicker) return []
    return [{
      optionTicker,
      underlyingTicker: symbol,
      date,
      open: numberOrNull(sample.open),
      high: numberOrNull(sample.high),
      low: numberOrNull(sample.low),
      close: numberOrNull(sample.close),
      volume: bigintOrNull(sample.volume),
      vwap: numberOrNull(sample.vwap),
      transactions: integerOrNull(sample.transactions)
    }]
  })
}

function providerNote(optionsStatus: string, shortStatus: string, rawOptions: unknown) {
  const optionsSourced = optionsStatus === 'AVAILABLE' || optionsStatus === 'PARTIAL'
  const shortSourced = shortStatus === 'AVAILABLE' || shortStatus === 'PARTIAL'
  const optionMode = rawOptions && typeof rawOptions === 'object' && !Array.isArray(rawOptions)
    ? (rawOptions as Record<string, unknown>).mode
    : null
  const optionText = optionMode === 'options-basic-proxy'
    ? 'Sourced Massive Options Basic proxy from contract reference plus delayed aggregate samples; live snapshot, OI, and IV deferred.'
    : 'Sourced Polygon/Massive option data.'

  if (optionsSourced && shortSourced) return `${optionText} FINRA short data sourced.`
  if (optionsSourced) return `${optionText} FINRA short data unavailable or entitlement-blocked.`
  if (shortSourced) return 'Sourced FINRA short data; Polygon/Massive options unavailable or entitlement-blocked.'
  return 'Polygon/Massive options and FINRA short data unavailable or entitlement-blocked; see provider errors in components.'
}

async function throttleOptionChain(symbol: string) {
  const elapsed = Date.now() - lastOptionRequestAt
  if (lastOptionRequestAt > 0 && elapsed < optionThrottleMs) {
    const waitMs = optionThrottleMs - elapsed
    console.log(`Massive options throttle: waiting ${Math.ceil(waitMs / 1000)}s before ${symbol}`)
    await sleep(waitMs)
  }
  lastOptionRequestAt = Date.now()
}

async function computeAllSnapshots(asOfDate: Date, tickerFilter?: ReadonlySet<string>) {
  const tickers = await prisma.ticker.findMany({ orderBy: { ticker: 'asc' } })
  const spy = await priceBarsForTicker('SPY', asOfDate)
  const spy20 = calculateReturnFromBars(spy, 20)
  const spy60 = calculateReturnFromBars(spy, 60)

  for (const ticker of tickers) {
    if (tickerFilter && !tickerFilter.has(ticker.ticker)) continue
    const bars = await priceBarsForTicker(ticker.ticker, asOfDate)
    if (bars.length === 0) continue
    const date = new Date(`${bars.at(-1)?.date}T00:00:00.000Z`)
    const return1d = calculateReturnFromBars(bars, 1)
    const return5d = calculateReturnFromBars(bars, 5)
    const return20d = calculateReturnFromBars(bars, 20)
    const return60d = calculateReturnFromBars(bars, 60)
    const volumeVs20dAvg = volumeVsAverage20d(bars)
    const realizedVol20d = realizedVolatility20d(bars)
    const distanceFrom20dMa = distanceFromMovingAverage(bars, 20)
    const distanceFrom50dMa = distanceFromMovingAverage(bars, 50)
    const relativeStrengthVsSpy20d = return20d !== null && spy20 !== null ? return20d - spy20 : null
    const relativeStrengthVsSpy60d = return60d !== null && spy60 !== null ? return60d - spy60 : null
    const label = trendLabel({ return20d, relativeStrengthVsSpy20d, volumeVs20dAvg, realizedVol20d, distanceFrom50dMa })
    const missing = [
      return20d === null ? '20D return' : null,
      relativeStrengthVsSpy20d === null ? 'RS vs SPY' : null,
      volumeVs20dAvg === null ? 'volume confirmation' : null,
      realizedVol20d === null ? 'realized volatility' : null
    ].filter((item): item is string => Boolean(item))
    const dataStatus = missing.length === 0 ? 'AVAILABLE' : 'PARTIAL'

    await prisma.signalSnapshot.upsert({
      where: { tickerId_date_provider_asOfDate: { tickerId: ticker.id, date, provider: 'derived from Polygon/Massive', asOfDate } },
      update: {
        return1d,
        return5d,
        return20d,
        return60d,
        relativeStrengthVsSpy20d,
        relativeStrengthVsSpy60d,
        volumeVs20dAvg,
        realizedVol20d,
        distanceFrom20dMa,
        distanceFrom50dMa,
        trendLabel: label,
        excludedUnavailableInputs: missing,
        dataStatus
      },
      create: {
        tickerId: ticker.id,
        date,
        asOfDate,
        observedAt: date,
        providerTimestamp: date,
        source: 'Signal calculations from sourced Polygon/Massive OHLCV rows',
        provider: 'derived from Polygon/Massive',
        dataStatus,
        return1d,
        return5d,
        return20d,
        return60d,
        relativeStrengthVsSpy20d,
        relativeStrengthVsSpy60d,
        volumeVs20dAvg,
        realizedVol20d,
        distanceFrom20dMa,
        distanceFrom50dMa,
        trendLabel: label,
        excludedUnavailableInputs: missing
      }
    })
    await computeCrowding(ticker.id, ticker.ticker, date, asOfDate)
  }
}

async function computeCrowding(tickerId: string, symbol: string, date: Date, asOfDate: Date) {
  const signal = await prisma.signalSnapshot.findFirst({ where: { tickerId }, orderBy: { asOfDate: 'desc' } })
  const positioning = await prisma.positioningSnapshot.findFirst({ where: { tickerId }, orderBy: { asOfDate: 'desc' } })
  if (!signal) return
  const momentumScore = clamp((signal.return20d ?? 0) * 3 + 50)
  const volumeScore = signal.volumeVs20dAvg === null ? null : clamp(signal.volumeVs20dAvg * 35)
  const optionsVolumeScore = positioning?.optionsVolume === null || positioning?.optionsVolume === undefined ? null : clamp(Math.log10(Math.max(1, positioning.optionsVolume)) * 20)
  const optionsScore = optionsVolumeScore ?? positioningOptionScoreProxy(positioning?.components)
  const volatilityScore = signal.realizedVol20d === null ? null : clamp(signal.realizedVol20d * 1.5)
  const shortInterestScore = positioning?.shortVolumeRatio === null || positioning?.shortVolumeRatio === undefined ? null : clamp(positioning.shortVolumeRatio * 100)
  const extensionRiskScore = extensionRiskScoreFromComponents({
    volatilityScore,
    distanceFrom20dMa: signal.distanceFrom20dMa,
    distanceFrom50dMa: signal.distanceFrom50dMa
  })
  const catalystSupportScore = await catalystSupportScoreForTicker(symbol, asOfDate)
  const crowdingScore = crowdingScoreFromComponents({ momentumScore, volumeScore, optionsScore, shortInterestScore })
  const label = setupLabel({ crowdingScore, extensionRiskScore, catalystSupportScore })
  const activeMissing = [
    volumeScore === null ? 'volume score' : null,
    extensionRiskScore === null ? 'extension risk score' : null
  ].filter((item): item is string => Boolean(item))
  const deferredMissing = [
    optionsScore === null ? 'options score' : null,
    shortInterestScore === null ? 'short interest score' : null,
    catalystSupportScore === null ? 'catalyst support score' : null
  ].filter((item): item is string => Boolean(item))
  const excluded = [
    ...activeMissing,
    ...deferredMissing
  ]
  const dataStatus = activeMissing.length === 0 ? 'AVAILABLE' : crowdingScore !== null || extensionRiskScore !== null ? 'PARTIAL' : 'UNAVAILABLE'
  const components = {
    momentumScore,
    volumeScore,
    optionsScore,
    volatilityScore,
    shortInterestScore,
    extensionRiskScore,
    catalystSupportScore,
    setupLabel: label,
    distanceFrom20dMa: signal.distanceFrom20dMa,
    distanceFrom50dMa: signal.distanceFrom50dMa
  }
  await prisma.crowdingSnapshot.upsert({
    where: { tickerId_date_provider_asOfDate: { tickerId, date, provider: 'derived from sourced signal/positioning snapshots', asOfDate } },
    update: {
      crowdingScore,
      crowdingLabel: crowdingLabel(crowdingScore),
      momentumScore,
      volumeScore,
      optionsScore,
      volatilityScore,
      shortInterestScore,
      catalystScore: catalystSupportScore,
      explanation: `Crowding score uses sponsorship components only; extension risk and catalyst support are separate. Setup label: ${label}.`,
      components,
      excludedUnavailableInputs: excluded,
      dataStatus
    },
    create: {
      tickerId,
      date,
      asOfDate,
      observedAt: date,
      providerTimestamp: date,
      source: 'Crowding calculation from sourced signal and positioning snapshots',
      provider: 'derived from sourced signal/positioning snapshots',
      dataStatus,
      crowdingScore,
      crowdingLabel: crowdingLabel(crowdingScore),
      momentumScore,
      volumeScore,
      optionsScore,
      volatilityScore,
      shortInterestScore,
      catalystScore: catalystSupportScore,
      explanation: `Crowding score uses sponsorship components only; extension risk and catalyst support are separate. Setup label: ${label}.`,
      components,
      excludedUnavailableInputs: excluded
    }
  })
}

async function catalystSupportScoreForTicker(symbol: string, asOfDate: Date) {
  const ticker = await prisma.ticker.findUnique({ where: { ticker: symbol } })
  const companyName = ticker?.name ?? symbol
  const rows = await prisma.catalystEvent.findMany({
    where: { tickerTags: { has: symbol }, asOfDate: { lte: asOfDate }, materialityScore: { not: null } },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: 5
  })
  const values = rows
    .filter(row => storedCatalystIsDirectTicker(row, symbol, companyName))
    .map(row => row.materialityScore)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (values.length > 0) return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1))
  return null
}

function storedCatalystIsDirectTicker(record: { title: string; summary: string | null; sourceName: string | null; url: string | null }, ticker: string, companyName: string) {
  const text = [record.title, record.summary, record.sourceName, record.url].filter(Boolean).join(' ').toLowerCase()
  const symbol = ticker.toLowerCase()
  if (new RegExp(`\\b${escapeRegex(symbol)}\\b`, 'i').test(text)) return true
  const companyTokens = directCompanyTokens(companyName)
  return companyTokens.some(token => new RegExp(`\\b${escapeRegex(token)}\\b`, 'i').test(text))
}

function directCompanyTokens(companyName: string) {
  const generic = new Set(['inc', 'corp', 'corporation', 'company', 'co', 'ltd', 'plc', 'holdings', 'markets', 'group'])
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(token => token.length >= 4 && !generic.has(token))
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function priceBarsForTicker(ticker: string, asOfDate: Date): Promise<PriceBar[]> {
  const row = await prisma.ticker.findUnique({ where: { ticker } })
  if (!row) return []
  const prices = await prisma.dailyPrice.findMany({
    where: { tickerId: row.id, date: { lte: asOfDate }, dataStatus: { in: ['AVAILABLE', 'PARTIAL'] } },
    orderBy: { date: 'desc' },
    take: 260
  })
  return prices.slice().reverse().map(price => ({
    date: price.date.toISOString().slice(0, 10),
    close: price.adjustedClose ?? price.close,
    volume: price.volume === null ? null : Number(price.volume)
  }))
}

async function latestClose(tickerId: string, asOfDate: Date) {
  const row = await prisma.dailyPrice.findFirst({
    where: { tickerId, date: { lte: asOfDate }, dataStatus: { in: ['AVAILABLE', 'PARTIAL'] } },
    orderBy: { date: 'desc' }
  })
  return row ? row.adjustedClose ?? row.close : null
}

function positioningOptionScoreProxy(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const options = (value as Record<string, unknown>).options
  if (!options || typeof options !== 'object' || Array.isArray(options)) return null
  const score = (options as Record<string, unknown>).optionScoreProxy
  return typeof score === 'number' && Number.isFinite(score) ? score : null
}

function recordOrNull(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function arrayOfRecords(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : []
}

function stringOr(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function numberOrNull(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function integerOrNull(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null
}

function bigintOrNull(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? BigInt(Math.round(value)) : null
}

function dateFromIso(value: string) {
  if (!value) return null
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) ? date : null
}

async function seedTaxonomy() {
  for (const ticker of seedTickers) {
    await prisma.ticker.upsert({
      where: { ticker: ticker.ticker },
      update: { name: ticker.name, sector: ticker.sector, industry: ticker.industry ?? null, country: ticker.country, assetType: ticker.assetType, isEtf: ticker.isEtf, description: ticker.description },
      create: { ticker: ticker.ticker, name: ticker.name, sector: ticker.sector, industry: ticker.industry ?? null, country: ticker.country, assetType: ticker.assetType, isEtf: ticker.isEtf, description: ticker.description }
    })
  }
  for (const basket of seedBaskets) {
    const saved = await prisma.themeBasket.upsert({
      where: { slug: basket.slug },
      update: { name: basket.name, description: basket.description, category: basket.category },
      create: { slug: basket.slug, name: basket.name, description: basket.description, category: basket.category }
    })
    for (const member of basket.members) {
      const ticker = await prisma.ticker.findUnique({ where: { ticker: member.ticker } })
      if (!ticker) continue
      await prisma.themeBasketMember.upsert({
        where: { basketId_tickerId: { basketId: saved.id, tickerId: ticker.id } },
        update: { rationale: member.rationale, weight: member.weight ?? null },
        create: { basketId: saved.id, tickerId: ticker.id, rationale: member.rationale, weight: member.weight ?? null }
      })
    }
  }
}

function combineProviderStatus(a: string, b: string) {
  if (a === 'PROVIDER_ERROR' || b === 'PROVIDER_ERROR') return 'PROVIDER_ERROR'
  if (a === 'ENTITLEMENT_MISSING' || b === 'ENTITLEMENT_MISSING') return 'ENTITLEMENT_MISSING'
  if (a === 'AVAILABLE' && b === 'AVAILABLE') return 'AVAILABLE'
  if (a === 'UNAVAILABLE' && b === 'UNAVAILABLE') return 'UNAVAILABLE'
  return 'PARTIAL'
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value))
}

withRetries(main, {
  attempts: 3,
  delayMs: attempt => attempt * 1_000,
  shouldRetry: isTransientPrismaError,
  onRetry: async (error, attempt) => {
    console.warn(`Transient database interruption; retrying ingestion after attempt ${attempt}. ${error instanceof Error ? error.message : String(error)}`)
    await prisma.$disconnect()
  }
}).catch(error => {
  console.error(error)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
