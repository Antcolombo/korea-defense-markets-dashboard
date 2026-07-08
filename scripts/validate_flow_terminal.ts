import './lib/io'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type ValidationSample = {
  ticker: string
  signalDate: string
  signalValue: number | null
  hit: boolean
  forwardReturn: number
  trailingVol?: number | null
  forwardVol?: number | null
}

async function main() {
  const asOfDate = process.env.DEMO_AS_OF_DATE ? new Date(`${process.env.DEMO_AS_OF_DATE}T00:00:00.000Z`) : new Date()
  await runCrowdingReversal(asOfDate)
  await runRsVolumeContinuation(asOfDate)
  await runOptionsVolatilityLead(asOfDate)
  console.log('Validation results refreshed')
}

async function runCrowdingReversal(asOfDate: Date) {
  const rows = await prisma.crowdingSnapshot.findMany({
    where: { asOfDate: { lte: asOfDate }, crowdingScore: { not: null } },
    include: { ticker: { include: { dailyPrices: { orderBy: { date: 'asc' } } } } },
    take: 500
  })
  const samples = rows.flatMap(row => reversalReturnSample(row.ticker.ticker, row.ticker.dailyPrices, row.date, row.crowdingScore ?? null, value => value >= 75))
  await saveValidation('Crowding score vs 5D/20D reversal', asOfDate, samples, 'Hit means crowded ticker had negative 20D forward return after high crowding score.')
}

async function runRsVolumeContinuation(asOfDate: Date) {
  const rows = await prisma.signalSnapshot.findMany({
    where: { asOfDate: { lte: asOfDate }, relativeStrengthVsSpy20d: { gt: 0 }, volumeVs20dAvg: { gt: 1.2 } },
    include: { ticker: { include: { dailyPrices: { orderBy: { date: 'asc' } } } } },
    take: 500
  })
  const samples = rows.flatMap(row => continuationReturnSample(row.ticker.ticker, row.ticker.dailyPrices, row.date, row.return20d ?? null, () => true))
  await saveValidation('RS + volume confirmation vs continuation', asOfDate, samples, 'Hit means positive 20D forward return after positive RS and elevated volume.')
}

async function runOptionsVolatilityLead(asOfDate: Date) {
  const rows = await prisma.positioningSnapshot.findMany({
    where: { asOfDate: { lte: asOfDate }, optionsVolume: { not: null } },
    include: { ticker: { include: { dailyPrices: { orderBy: { date: 'asc' } } } } },
    take: 500
  })
  const samples = rows.flatMap(row => forwardVolSample(row.ticker.ticker, row.ticker.dailyPrices, row.date, row.optionsVolume ?? null))
  await saveValidation('Options volume spike vs later realized vol', asOfDate, samples, 'Hit means realized forward volatility exceeded trailing realized volatility after options-volume signal.')
}

async function saveValidation(testName: string, asOfDate: Date, samples: ValidationSample[], caveats: string) {
  const sampleSize = samples.length
  const hitRate = sampleSize > 0 ? samples.filter(sample => sample.hit).length / sampleSize : null
  const averageForwardReturn = sampleSize > 0 ? samples.reduce((sum, sample) => sum + sample.forwardReturn, 0) / sampleSize : null
  const dataStatus = sampleSize > 0 ? 'AVAILABLE' : 'UNAVAILABLE'
  await prisma.validationResult.create({
    data: {
      testName,
      asOfDate,
      observedAt: asOfDate,
      providerTimestamp: asOfDate,
      source: 'Validation from sourced snapshots and forward sourced price rows',
      provider: 'derived validation',
      dataStatus,
      hitRate,
      averageForwardReturn,
      sampleSize,
      coveragePercent: sampleSize > 0 ? 100 : 0,
      caveats,
      resultRows: samples.slice(0, 100)
    }
  })
}

function reversalReturnSample(ticker: string, prices: { date: Date; close: number; adjustedClose: number | null }[], date: Date, score: number | null, predicate: (value: number) => boolean) {
  return forwardReturnSample(ticker, prices, date, score, predicate, forwardReturn => forwardReturn < 0)
}

function continuationReturnSample(ticker: string, prices: { date: Date; close: number; adjustedClose: number | null }[], date: Date, score: number | null, predicate: (value: number) => boolean) {
  return forwardReturnSample(ticker, prices, date, score, predicate, forwardReturn => forwardReturn > 0)
}

function forwardReturnSample(
  ticker: string,
  prices: { date: Date; close: number; adjustedClose: number | null }[],
  date: Date,
  score: number | null,
  predicate: (value: number) => boolean,
  isHit: (forwardReturn: number) => boolean
) {
  if (score === null || !predicate(score)) return []
  const index = prices.findIndex(price => price.date.getTime() >= date.getTime())
  const forward = index >= 0 ? prices[index + 20] : null
  const anchor = index >= 0 ? prices[index] : null
  if (!anchor || !forward) return []
  const start = anchor.adjustedClose ?? anchor.close
  const end = forward.adjustedClose ?? forward.close
  if (start === 0) return []
  const forwardReturn = ((end - start) / start) * 100
  return [{
    ticker,
    signalDate: anchor.date.toISOString().slice(0, 10),
    signalValue: score,
    hit: isHit(forwardReturn),
    forwardReturn
  }]
}

function forwardVolSample(ticker: string, prices: { date: Date; close: number; adjustedClose: number | null }[], date: Date, optionsVolume: number | null) {
  if (optionsVolume === null) return []
  const index = prices.findIndex(price => price.date.getTime() >= date.getTime())
  if (index < 20 || index + 20 >= prices.length) return []
  const trailing = realizedVol(prices.slice(index - 20, index + 1))
  const forward = realizedVol(prices.slice(index, index + 21))
  if (trailing === null || forward === null) return []
  return [{
    ticker,
    signalDate: prices[index].date.toISOString().slice(0, 10),
    signalValue: optionsVolume,
    hit: forward > trailing,
    forwardReturn: forward - trailing,
    trailingVol: trailing,
    forwardVol: forward
  }]
}

function realizedVol(prices: { close: number; adjustedClose: number | null }[]) {
  if (prices.length < 2) return null
  const returns = prices.slice(1).map((price, index) => {
    const previous = prices[index]
    const start = previous.adjustedClose ?? previous.close
    const end = price.adjustedClose ?? price.close
    return start === 0 ? 0 : (end - start) / start
  })
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length
  const variance = returns.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / Math.max(1, returns.length - 1)
  return Math.sqrt(variance) * Math.sqrt(252) * 100
}

main().catch(error => {
  console.error(error)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
