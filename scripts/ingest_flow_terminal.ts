import { sleep } from './lib/io'
import { PrismaClient } from '@prisma/client'
import { fetchFinraShortData } from '../src/lib/data/providers/finra'
import { demoModeAsOfDate } from '../src/lib/data/providers/common'
import { fetchPolygonDailyBars, fetchPolygonOptionSnapshot } from '../src/lib/data/providers/polygon'
import { calculateReturnFromBars, distanceFromMovingAverage, realizedVolatility20d, trendLabel, volumeVsAverage20d } from '../src/lib/data/signals/returns'
import { seedTickers } from '../src/lib/data/baskets/seedTickers'
import { seedBaskets } from '../src/lib/data/baskets/seedBaskets'

const prisma = new PrismaClient()
const lookbackDays = Number(process.env.FLOW_TERMINAL_LOOKBACK_DAYS ?? 180)
const ingestLimit = Number(process.env.FLOW_TERMINAL_INGEST_LIMIT ?? 80)
const polygonThrottleMs = Number(process.env.POLYGON_THROTTLE_MS ?? 0)

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

  const tickers = await prisma.ticker.findMany({ orderBy: { ticker: 'asc' }, take: ingestLimit })
  const to = new Date()
  const from = new Date(to)
  from.setUTCDate(to.getUTCDate() - lookbackDays)
  const fromText = from.toISOString().slice(0, 10)
  const toText = to.toISOString().slice(0, 10)

  for (const ticker of tickers) {
    const run = await prisma.providerRun.create({
      data: {
        provider: 'Polygon/Massive',
        source: 'https://polygon.io/docs/rest/stocks/aggregates/custom-bars',
        asOfDate: to,
        observedAt: to,
        dataStatus: 'AVAILABLE'
      }
    })
    const bars = await fetchPolygonDailyBars(ticker.ticker, fromText, toText)
    if (bars.status !== 'AVAILABLE') {
      await prisma.providerRun.update({ where: { id: run.id }, data: { finishedAt: new Date(), dataStatus: bars.status, errorMessage: bars.errorMessage, rowsIngested: 0 } })
    } else {
      for (const bar of bars.rows) {
        await prisma.dailyPrice.upsert({
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
        })
      }
      await prisma.providerRun.update({ where: { id: run.id }, data: { finishedAt: new Date(), dataStatus: bars.status, rowsIngested: bars.rows.length } })
    }

    if (!ticker.isEtf || ['SPY', 'QQQ', 'SMH', 'ITA', 'XAR', 'EWY'].includes(ticker.ticker)) {
      await ingestPositioning(ticker.id, ticker.ticker, to)
    }
    if (polygonThrottleMs > 0) await sleep(polygonThrottleMs)
  }

  await computeAllSnapshots(to)
}

async function ingestPositioning(tickerId: string, symbol: string, date: Date) {
  const [options, shortData] = await Promise.all([
    fetchPolygonOptionSnapshot(symbol),
    fetchFinraShortData(symbol)
  ])
  const optionRow = options.rows[0]
  const shortRow = shortData.rows[0]
  if (!optionRow && !shortRow) return
  const status = combineProviderStatus(options.status, shortData.status)
  const excludedUnavailableInputs = [
    ...(optionRow?.excludedUnavailableInputs ?? ['options volume', 'open interest', 'put/call ratio', 'implied volatility']),
    ...(shortRow ? [] : ['short interest', 'short volume'])
  ]
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
      positioningNotes: 'Sourced from Polygon/Massive option snapshot and FINRA short data where configured.',
      components: { options: optionRow?.raw ?? null, short: shortRow?.raw ?? null },
      excludedUnavailableInputs,
      observedAt: date,
      ingestedAt: new Date(),
      source: 'https://polygon.io/docs/rest/options/snapshots/option-chain-snapshot; https://developer.finra.org/docs',
      dataStatus: status
    },
    create: {
      tickerId,
      date,
      asOfDate: date,
      observedAt: date,
      providerTimestamp: date,
      ingestedAt: new Date(),
      source: 'https://polygon.io/docs/rest/options/snapshots/option-chain-snapshot; https://developer.finra.org/docs',
      provider: 'Polygon/Massive + FINRA',
      dataStatus: status,
      optionsVolume: optionRow?.optionsVolume ?? null,
      openInterest: optionRow?.openInterest ?? null,
      putCallRatio: optionRow?.putCallRatio ?? null,
      impliedVolatility: optionRow?.impliedVolatility ?? null,
      shortInterest: shortRow?.shortInterest ?? null,
      shortVolume: shortRow?.shortVolume ?? null,
      shortVolumeRatio: shortRow?.shortVolumeRatio ?? null,
      positioningNotes: 'Sourced from Polygon/Massive option snapshot and FINRA short data where configured.',
      components: { options: optionRow?.raw ?? null, short: shortRow?.raw ?? null },
      excludedUnavailableInputs
    }
  })
}

async function computeAllSnapshots(asOfDate: Date) {
  const tickers = await prisma.ticker.findMany({ orderBy: { ticker: 'asc' } })
  const spy = await priceBarsForTicker('SPY', asOfDate)
  const spy20 = calculateReturnFromBars(spy, 20)
  const spy60 = calculateReturnFromBars(spy, 60)

  for (const ticker of tickers) {
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
    await computeCrowding(ticker.id, date, asOfDate)
  }
}

async function computeCrowding(tickerId: string, date: Date, asOfDate: Date) {
  const signal = await prisma.signalSnapshot.findFirst({ where: { tickerId }, orderBy: { asOfDate: 'desc' } })
  const positioning = await prisma.positioningSnapshot.findFirst({ where: { tickerId }, orderBy: { asOfDate: 'desc' } })
  if (!signal) return
  const momentumScore = clamp((signal.return20d ?? 0) * 3 + 50)
  const volumeScore = signal.volumeVs20dAvg === null ? null : clamp(signal.volumeVs20dAvg * 35)
  const optionsScore = positioning?.optionsVolume === null || positioning?.optionsVolume === undefined ? null : clamp(Math.log10(Math.max(1, positioning.optionsVolume)) * 20)
  const volatilityScore = signal.realizedVol20d === null ? null : clamp(signal.realizedVol20d * 1.5)
  const shortInterestScore = positioning?.shortVolumeRatio === null || positioning?.shortVolumeRatio === undefined ? null : clamp(positioning.shortVolumeRatio * 100)
  const components = [momentumScore, volumeScore, optionsScore, volatilityScore, shortInterestScore].filter((item): item is number => item !== null)
  const crowdingScore = components.length > 0 ? Number((components.reduce((sum, value) => sum + value, 0) / components.length).toFixed(1)) : null
  const excluded = [
    volumeScore === null ? 'volume score' : null,
    optionsScore === null ? 'options score' : null,
    volatilityScore === null ? 'volatility score' : null,
    shortInterestScore === null ? 'short interest score' : null
  ].filter((item): item is string => Boolean(item))
  const dataStatus = excluded.length === 0 ? 'AVAILABLE' : components.length > 0 ? 'PARTIAL' : 'UNAVAILABLE'
  await prisma.crowdingSnapshot.upsert({
    where: { tickerId_date_provider_asOfDate: { tickerId, date, provider: 'derived from sourced signal/positioning snapshots', asOfDate } },
    update: {
      crowdingScore,
      crowdingLabel: labelForCrowding(crowdingScore),
      momentumScore,
      volumeScore,
      optionsScore,
      volatilityScore,
      shortInterestScore,
      explanation: 'Crowding score uses only sourced available components; missing inputs are excluded.',
      components: { momentumScore, volumeScore, optionsScore, volatilityScore, shortInterestScore },
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
      crowdingLabel: labelForCrowding(crowdingScore),
      momentumScore,
      volumeScore,
      optionsScore,
      volatilityScore,
      shortInterestScore,
      explanation: 'Crowding score uses only sourced available components; missing inputs are excluded.',
      components: { momentumScore, volumeScore, optionsScore, volatilityScore, shortInterestScore },
      excludedUnavailableInputs: excluded
    }
  })
}

async function priceBarsForTicker(ticker: string, asOfDate: Date): Promise<PriceBar[]> {
  const row = await prisma.ticker.findUnique({ where: { ticker } })
  if (!row) return []
  const prices = await prisma.dailyPrice.findMany({
    where: { tickerId: row.id, date: { lte: asOfDate }, dataStatus: { in: ['AVAILABLE', 'PARTIAL'] } },
    orderBy: { date: 'asc' },
    take: 260
  })
  return prices.map(price => ({
    date: price.date.toISOString().slice(0, 10),
    close: price.adjustedClose ?? price.close,
    volume: price.volume === null ? null : Number(price.volume)
  }))
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

function labelForCrowding(score: number | null) {
  if (score === null) return 'Unavailable'
  if (score < 25) return 'Ignored / Weak'
  if (score < 50) return 'Early Accumulation'
  if (score < 75) return 'Confirmed Sponsorship'
  if (score < 90) return 'Crowded Momentum'
  return 'Reversal Risk'
}

main().catch(error => {
  console.error(error)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
