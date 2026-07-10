import { getPrisma } from '@/lib/server/prisma'
import { researchSnapshotCutoff } from '@/platform/data/data-mode'
import type {
  OptionsBattlefieldMode,
  OptionsBattlefieldView,
  OptionsExpiryClusterView,
  OptionsStrikeSignalView,
  PitchSourceQuality
} from '@/types/pitch'

type StrikeInput = Omit<OptionsStrikeSignalView, 'magnetScore'> & {
  magnetScore?: number | null
}

type PersistedStrikeRow = {
  ticker: string
  date: Date | string
  expirationDate: Date | string
  strikePrice: number
  callVolume: number | null
  putVolume: number | null
  totalVolume: number | null
  openInterest: number | null
  impliedVolatility: number | null
  gamma: number | null
  gammaExposure: number | null
  gammaProxy: number | null
  magnetScore: number | null
  sourceQuality: string
  mode: string
  asOfDate: Date | string
  provider: string
}

export async function getOptionsBattlefield(ticker: string, currentPrice?: number | null): Promise<OptionsBattlefieldView> {
  const symbol = normalizeTicker(ticker)
  const prisma = getPrisma()
  const cutoff = researchSnapshotCutoff()

  if (prisma) {
    try {
      const snapshot = await prisma.optionsBattlefieldSnapshot.findFirst({
        where: { ticker: symbol, ...(cutoff ? { asOfDate: { lte: cutoff } } : {}) },
        orderBy: [{ date: 'desc' }, { asOfDate: 'desc' }]
      })
      const fromPayload = normalizeBattlefieldPayload(snapshot?.payload, symbol)
      if (fromPayload) return fromPayload
    } catch (error) {
      console.warn(`Options battlefield snapshot lookup skipped for ${symbol}. ${describeError(error)}`)
    }
  }

  if (prisma) {
    try {
      const rows = await prisma.optionsStrikeSignal.findMany({
        where: { ticker: symbol, ...(cutoff ? { asOfDate: { lte: cutoff } } : {}) },
        orderBy: [{ date: 'desc' }, { expirationDate: 'asc' }, { strikePrice: 'asc' }],
        take: 400
      }) as PersistedStrikeRow[]
      if (rows.length) {
        const latestDate = isoDate(rows[0]?.date)
        const latestRows = rows.filter(row => isoDate(row.date) === latestDate)
        return buildOptionsBattlefieldFromStrikeSignals({
          ticker: symbol,
          asOfDate: isoDate(rows[0]?.asOfDate) || latestDate,
          provider: rows[0]?.provider || 'persisted option strike signals',
          strikes: latestRows.map(row => ({
            expirationDate: isoDate(row.expirationDate),
            strikePrice: row.strikePrice,
            callVolume: finiteOrNull(row.callVolume),
            putVolume: finiteOrNull(row.putVolume),
            totalVolume: finiteOrNull(row.totalVolume),
            openInterest: finiteOrNull(row.openInterest),
            impliedVolatility: finiteOrNull(row.impliedVolatility),
            gamma: finiteOrNull(row.gamma),
            gammaExposure: finiteOrNull(row.gammaExposure),
            gammaProxy: finiteOrNull(row.gammaProxy),
            magnetScore: finiteOrNull(row.magnetScore),
            sourceQuality: normalizeQuality(row.sourceQuality)
          })),
          currentPrice
        })
      }
    } catch (error) {
      console.warn(`Options strike signal lookup skipped for ${symbol}. ${describeError(error)}`)
    }
  }

  if (prisma) {
    try {
      const positioning = await prisma.positioningSnapshot.findFirst({
        where: {
          ticker: { ticker: symbol },
          ...(cutoff ? { asOfDate: { lte: cutoff } } : {})
        },
        orderBy: [{ date: 'desc' }, { asOfDate: 'desc' }]
      })
      const optionsRaw = optionsRawFromComponents(positioning?.components)
      const fromRaw = optionsRaw ? buildOptionsBattlefieldFromRaw(symbol, optionsRaw, currentPrice, isoDate(positioning?.asOfDate)) : null
      if (fromRaw) return fromRaw
    } catch (error) {
      console.warn(`Positioning options fallback skipped for ${symbol}. ${describeError(error)}`)
    }
  }

  return unavailableBattlefield(symbol)
}

export function buildOptionsBattlefieldFromRaw(ticker: string, raw: unknown, currentPrice?: number | null, asOfDate?: string): OptionsBattlefieldView | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const record = raw as Record<string, unknown>
  const symbol = normalizeTicker(ticker)
  if (record.mode === 'options-basic-proxy') {
    const samples = arrayOfRecords(record.aggregateSamples)
    const strikes = samples.flatMap(sample => strikeFromBasicSample(sample))
    if (strikes.length) {
      return buildOptionsBattlefieldFromStrikeSignals({
        ticker: symbol,
        asOfDate: asOfDate || today(),
        provider: 'Massive Options Basic',
        sourceLabel: 'Options Proxy',
        strikes,
        currentPrice,
        gaps: ['OI/IV/Greeks are plan-locked under current Massive Basic data. Proxy uses contract reference plus delayed aggregate samples.']
      })
    }
    const sampledContracts = arrayOfRecords(record.sampledContracts)
    const contractStrikes = sampledContracts.flatMap(contract => strikeFromBasicContract(contract))
    if (contractStrikes.length) {
      return buildOptionsBattlefieldFromStrikeSignals({
        ticker: symbol,
        asOfDate: asOfDate || today(),
        provider: 'Massive Options Basic',
        sourceLabel: 'Options Proxy',
        strikes: contractStrikes,
        currentPrice,
        gaps: ['No aggregate sample volume yet. Strike map uses selected contract references only. OI/IV/Greeks remain plan-locked.']
      })
    }
    return planLockedBattlefield(symbol, asOfDate)
  }

  const snapshotRows = arrayOfRecords(record.results)
  const strikes = snapshotRows.flatMap(row => strikeFromSnapshotRow(row, currentPrice ?? null))
  if (!strikes.length) return null
  return buildOptionsBattlefieldFromStrikeSignals({
    ticker: symbol,
    asOfDate: asOfDate || today(),
    provider: 'Polygon/Massive option snapshot',
    sourceLabel: 'True GEX',
    strikes,
    currentPrice
  })
}

export function buildOptionsBattlefieldFromStrikeSignals(input: {
  ticker: string
  asOfDate: string
  provider: string
  sourceLabel?: OptionsBattlefieldView['sourceLabel']
  strikes: StrikeInput[]
  currentPrice?: number | null
  gaps?: string[]
}): OptionsBattlefieldView {
  const ticker = normalizeTicker(input.ticker)
  const normalized = normalizeStrikeSignals(input.strikes)
  const hasTrueData = normalized.some(strike => {
    const hasOi = numberValue(strike.openInterest) > 0
    const hasIv = numberValue(strike.impliedVolatility) > 0
    const hasGreek = strike.gamma !== null || strike.gammaExposure !== null
    return hasOi && (hasIv || hasGreek)
  })
  const mode: OptionsBattlefieldMode = hasTrueData ? 'true-gex' : normalized.length ? 'proxy' : 'plan-locked'
  const sourceLabel = input.sourceLabel && (input.sourceLabel !== 'True GEX' || hasTrueData)
    ? input.sourceLabel
    : mode === 'true-gex' ? 'True GEX' : mode === 'proxy' ? 'Options Proxy' : 'Plan Locked'
  const scored = scoreMagnets(normalized, input.currentPrice ?? null)
  const callWall = wallStrike(scored, 'call')
  const putWall = wallStrike(scored, 'put')
  const zeroGamma = hasTrueData ? zeroGammaStrike(scored) : null
  const expiryClusters = expiryClustersFromStrikes(scored, input.currentPrice ?? null)
  const expectedMove = nearestExpectedMove(expiryClusters)
  const callVolume = sum(scored.map(strike => strike.callVolume))
  const putVolume = sum(scored.map(strike => strike.putVolume))
  const pressureDirection = callVolume === null || putVolume === null
    ? 'unknown'
    : callVolume > putVolume * 1.2
      ? 'call-pressure'
      : putVolume > callVolume * 1.2
        ? 'put-pressure'
        : 'balanced'
  const gaps = [
    ...(input.gaps ?? []),
    mode === 'proxy' ? 'True dealer gamma, zero-gamma, OI wall, and IV expected move require Massive snapshot entitlement.' : null,
    mode === 'plan-locked' ? 'Options snapshot/OI/IV/Greeks unavailable under current source state.' : null
  ].filter((item): item is string => Boolean(item))

  return {
    ticker,
    asOfDate: input.asOfDate || today(),
    mode,
    sourceLabel,
    provider: input.provider,
    callWall,
    putWall,
    zeroGamma,
    expectedMove,
    pressureDirection,
    confidence: mode === 'true-gex' ? 82 : mode === 'proxy' ? 46 : 12,
    strikes: scored,
    expiryClusters,
    gaps: uniqueStrings(gaps)
  }
}

function normalizeBattlefieldPayload(value: unknown, ticker: string): OptionsBattlefieldView | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Partial<OptionsBattlefieldView>
  if (!raw.ticker || !raw.sourceLabel) return null
  return {
    ticker: normalizeTicker(raw.ticker || ticker),
    asOfDate: stringOr(raw.asOfDate, today()),
    mode: normalizeMode(raw.mode),
    sourceLabel: normalizeSourceLabel(raw.sourceLabel, normalizeMode(raw.mode)),
    provider: stringOr(raw.provider, 'persisted options battlefield'),
    callWall: finiteOrNull(raw.callWall),
    putWall: finiteOrNull(raw.putWall),
    zeroGamma: finiteOrNull(raw.zeroGamma),
    expectedMove: finiteOrNull(raw.expectedMove),
    pressureDirection: raw.pressureDirection === 'call-pressure' || raw.pressureDirection === 'put-pressure' || raw.pressureDirection === 'balanced' ? raw.pressureDirection : 'unknown',
    confidence: numberValue(raw.confidence),
    strikes: normalizeStrikeSignals(Array.isArray(raw.strikes) ? raw.strikes : []),
    expiryClusters: Array.isArray(raw.expiryClusters) ? raw.expiryClusters.map(normalizeExpiryCluster).filter(Boolean) as OptionsExpiryClusterView[] : [],
    gaps: stringArray(raw.gaps)
  }
}

function normalizeStrikeSignals(rows: StrikeInput[]): OptionsStrikeSignalView[] {
  const byKey = new Map<string, OptionsStrikeSignalView>()
  for (const row of rows) {
    const strike = finiteOrNull(row.strikePrice)
    if (strike === null) continue
    const expirationDate = stringOr(row.expirationDate, '')
    if (!expirationDate) continue
    const key = `${expirationDate}-${strike}`
    const previous = byKey.get(key)
    const merged: OptionsStrikeSignalView = {
      expirationDate,
      strikePrice: strike,
      callVolume: addNullable(previous?.callVolume, row.callVolume),
      putVolume: addNullable(previous?.putVolume, row.putVolume),
      totalVolume: addNullable(previous?.totalVolume, row.totalVolume),
      openInterest: addNullable(previous?.openInterest, row.openInterest),
      impliedVolatility: averageNullable(previous?.impliedVolatility, row.impliedVolatility),
      gamma: averageNullable(previous?.gamma, row.gamma),
      gammaExposure: addNullable(previous?.gammaExposure, row.gammaExposure),
      gammaProxy: addNullable(previous?.gammaProxy, row.gammaProxy),
      magnetScore: previous?.magnetScore ?? finiteOrNull(row.magnetScore),
      sourceQuality: previous?.sourceQuality === 'sourced' || row.sourceQuality === 'sourced' ? 'sourced' : normalizeQuality(row.sourceQuality)
    }
    if (merged.totalVolume === null) merged.totalVolume = addNullable(merged.callVolume, merged.putVolume)
    byKey.set(key, merged)
  }
  return [...byKey.values()].sort((a, b) => a.expirationDate.localeCompare(b.expirationDate) || a.strikePrice - b.strikePrice)
}

function scoreMagnets(strikes: OptionsStrikeSignalView[], currentPrice: number | null): OptionsStrikeSignalView[] {
  const rawScores = strikes.map(strike => {
    const volume = numberValue(strike.totalVolume)
    const oi = numberValue(strike.openInterest)
    const gamma = Math.abs(numberValue(strike.gammaExposure))
    const proxy = numberValue(strike.gammaProxy)
    const distancePenalty = currentPrice && currentPrice > 0
      ? Math.max(0.25, 1 - Math.min(0.75, Math.abs(strike.strikePrice / currentPrice - 1)))
      : 1
    return (Math.log10(volume + 1) * 24 + Math.log10(oi + 1) * 24 + Math.log10(gamma + 1) * 12 + proxy) * distancePenalty
  })
  const maxScore = Math.max(1, ...rawScores)
  return strikes.map((strike, index) => ({
    ...strike,
    magnetScore: round(Math.max(0, Math.min(100, rawScores[index] / maxScore * 100)))
  }))
}

function expiryClustersFromStrikes(strikes: OptionsStrikeSignalView[], currentPrice: number | null): OptionsExpiryClusterView[] {
  const grouped = new Map<string, OptionsStrikeSignalView[]>()
  for (const strike of strikes) grouped.set(strike.expirationDate, [...grouped.get(strike.expirationDate) ?? [], strike])
  return [...grouped.entries()].map(([expirationDate, rows]) => {
    const ivValues = rows.map(row => row.impliedVolatility).filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)
    const iv = ivValues.length ? ivValues.reduce((total, value) => total + value, 0) / ivValues.length : null
    return {
      expirationDate,
      totalVolume: sum(rows.map(row => row.totalVolume)),
      openInterest: sum(rows.map(row => row.openInterest)),
      impliedVolatility: iv ? round(iv, 4) : null,
      expectedMove: iv && currentPrice && currentPrice > 0 ? round(currentPrice * iv * Math.sqrt(daysToExpiry(expirationDate) / 365), 2) : null,
      sourceQuality: rows.some(row => row.sourceQuality === 'sourced') ? 'sourced' as const : rows.some(row => row.sourceQuality === 'proxy') ? 'proxy' as const : 'plan-locked' as const
    }
  }).sort((a, b) => a.expirationDate.localeCompare(b.expirationDate))
}

function wallStrike(strikes: OptionsStrikeSignalView[], side: 'call' | 'put') {
  const sorted = [...strikes].sort((a, b) => {
    const aVolume = numberValue(side === 'call' ? a.callVolume : a.putVolume)
    const bVolume = numberValue(side === 'call' ? b.callVolume : b.putVolume)
    const aGamma = side === 'call' ? Math.max(0, numberValue(a.gammaExposure)) : Math.max(0, -numberValue(a.gammaExposure))
    const bGamma = side === 'call' ? Math.max(0, numberValue(b.gammaExposure)) : Math.max(0, -numberValue(b.gammaExposure))
    return (bVolume + bGamma + numberValue(b.magnetScore)) - (aVolume + aGamma + numberValue(a.magnetScore))
  })
  return sorted[0]?.strikePrice ?? null
}

function zeroGammaStrike(strikes: OptionsStrikeSignalView[]) {
  const rows = strikes
    .filter(row => row.gammaExposure !== null)
    .sort((a, b) => a.strikePrice - b.strikePrice)
  for (let index = 1; index < rows.length; index += 1) {
    const previous = numberValue(rows[index - 1]?.gammaExposure)
    const current = numberValue(rows[index]?.gammaExposure)
    if ((previous <= 0 && current >= 0) || (previous >= 0 && current <= 0)) {
      return round((rows[index - 1].strikePrice + rows[index].strikePrice) / 2, 2)
    }
  }
  return null
}

function nearestExpectedMove(clusters: OptionsExpiryClusterView[]) {
  return clusters.find(cluster => cluster.expectedMove !== null)?.expectedMove ?? null
}

function strikeFromBasicSample(sample: Record<string, unknown>): StrikeInput[] {
  const contract = sample.contract && typeof sample.contract === 'object' && !Array.isArray(sample.contract)
    ? sample.contract as Record<string, unknown>
    : {}
  const volume = finiteOrNull(sample.volume)
  const row = strikeFromContractRecord(contract, volume)
  return row ? [row] : []
}

function strikeFromBasicContract(contract: Record<string, unknown>): StrikeInput[] {
  const row = strikeFromContractRecord(contract, null)
  return row ? [row] : []
}

function strikeFromContractRecord(contract: Record<string, unknown>, volume: number | null): StrikeInput | null {
  const type = String(contract.contract_type ?? '').toLowerCase()
  const strike = finiteOrNull(contract.strike_price)
  const expirationDate = stringOr(contract.expiration_date, '')
  if (!strike || !expirationDate || (type !== 'call' && type !== 'put')) return null
  const proxy = volume === null ? 3 : Math.min(100, Math.log10(volume + 1) * 18)
  return {
    expirationDate,
    strikePrice: strike,
    callVolume: type === 'call' ? volume : null,
    putVolume: type === 'put' ? volume : null,
    totalVolume: volume,
    openInterest: null,
    impliedVolatility: null,
    gamma: null,
    gammaExposure: null,
    gammaProxy: round(proxy),
    sourceQuality: 'proxy'
  }
}

function strikeFromSnapshotRow(row: Record<string, unknown>, currentPrice: number | null): StrikeInput[] {
  const details = row.details && typeof row.details === 'object' && !Array.isArray(row.details)
    ? row.details as Record<string, unknown>
    : {}
  const day = row.day && typeof row.day === 'object' && !Array.isArray(row.day)
    ? row.day as Record<string, unknown>
    : {}
  const greeks = row.greeks && typeof row.greeks === 'object' && !Array.isArray(row.greeks)
    ? row.greeks as Record<string, unknown>
    : {}
  const type = String(details.contract_type ?? '').toLowerCase()
  const strike = finiteOrNull(details.strike_price)
  const expirationDate = stringOr(details.expiration_date, '')
  if (!strike || !expirationDate || (type !== 'call' && type !== 'put')) return []
  const volume = finiteOrNull(day.volume)
  const openInterest = finiteOrNull(row.open_interest)
  const iv = finiteOrNull(row.implied_volatility)
  const gamma = finiteOrNull(greeks.gamma)
  const sign = type === 'put' ? -1 : 1
  const gammaExposure = gamma !== null && openInterest !== null && currentPrice && currentPrice > 0
    ? gamma * openInterest * 100 * currentPrice * currentPrice * 0.01 * sign
    : null
  return [{
    expirationDate,
    strikePrice: strike,
    callVolume: type === 'call' ? volume : null,
    putVolume: type === 'put' ? volume : null,
    totalVolume: volume,
    openInterest,
    impliedVolatility: iv,
    gamma,
    gammaExposure: gammaExposure === null ? null : round(gammaExposure, 2),
    gammaProxy: null,
    sourceQuality: openInterest !== null || iv !== null || gamma !== null ? 'sourced' : 'proxy'
  }]
}

function planLockedBattlefield(ticker: string, asOfDate?: string): OptionsBattlefieldView {
  return {
    ticker,
    asOfDate: asOfDate || today(),
    mode: 'plan-locked',
    sourceLabel: 'Plan Locked',
    provider: 'Massive Options Basic',
    callWall: null,
    putWall: null,
    zeroGamma: null,
    expectedMove: null,
    pressureDirection: 'unknown',
    confidence: 12,
    strikes: [],
    expiryClusters: [],
    gaps: ['Massive Basic has contract reference only here. OI/IV/Greeks/GEX require snapshot entitlement.']
  }
}

function unavailableBattlefield(ticker: string): OptionsBattlefieldView {
  return {
    ticker,
    asOfDate: today(),
    mode: process.env.MASSIVE_OPTIONS_USE_SNAPSHOT === 'true' || process.env.POLYGON_OPTIONS_USE_SNAPSHOT === 'true' ? 'unavailable' : 'plan-locked',
    sourceLabel: process.env.MASSIVE_OPTIONS_USE_SNAPSHOT === 'true' || process.env.POLYGON_OPTIONS_USE_SNAPSHOT === 'true' ? 'Unavailable' : 'Plan Locked',
    provider: 'Polygon/Massive',
    callWall: null,
    putWall: null,
    zeroGamma: null,
    expectedMove: null,
    pressureDirection: 'unknown',
    confidence: 0,
    strikes: [],
    expiryClusters: [],
    gaps: ['No option strike rows available. Run positioning ingest with Massive enabled to build the battlefield.']
  }
}

function optionsRawFromComponents(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = (value as Record<string, unknown>).options
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null
}

function normalizeExpiryCluster(value: unknown): OptionsExpiryClusterView | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Partial<OptionsExpiryClusterView>
  return {
    expirationDate: stringOr(raw.expirationDate, ''),
    totalVolume: finiteOrNull(raw.totalVolume),
    openInterest: finiteOrNull(raw.openInterest),
    impliedVolatility: finiteOrNull(raw.impliedVolatility),
    expectedMove: finiteOrNull(raw.expectedMove),
    sourceQuality: normalizeQuality(raw.sourceQuality)
  }
}

function normalizeMode(value: unknown): OptionsBattlefieldMode {
  return value === 'true-gex' || value === 'proxy' || value === 'plan-locked' || value === 'unavailable' ? value : 'unavailable'
}

function normalizeSourceLabel(value: unknown, mode: OptionsBattlefieldMode): OptionsBattlefieldView['sourceLabel'] {
  if (value === 'True GEX' || value === 'Options Proxy' || value === 'Plan Locked' || value === 'Unavailable') return value
  return mode === 'true-gex' ? 'True GEX' : mode === 'proxy' ? 'Options Proxy' : mode === 'plan-locked' ? 'Plan Locked' : 'Unavailable'
}

function normalizeQuality(value: unknown): PitchSourceQuality {
  return value === 'sourced' || value === 'derived' || value === 'proxy' || value === 'plan-locked' || value === 'unavailable' ? value : 'proxy'
}

function arrayOfRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : []
}

function addNullable(a: unknown, b: unknown) {
  const left = finiteOrNull(a)
  const right = finiteOrNull(b)
  if (left === null) return right
  if (right === null) return left
  return round(left + right)
}

function averageNullable(a: unknown, b: unknown) {
  const left = finiteOrNull(a)
  const right = finiteOrNull(b)
  if (left === null) return right
  if (right === null) return left
  return round((left + right) / 2, 4)
}

function finiteOrNull(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function numberValue(value: unknown) {
  return finiteOrNull(value) ?? 0
}

function sum(values: (number | null | undefined)[]) {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (!valid.length) return null
  return round(valid.reduce((total, value) => total + value, 0))
}

function daysToExpiry(expirationDate: string) {
  const expiry = Date.parse(`${expirationDate}T00:00:00.000Z`)
  if (!Number.isFinite(expiry)) return 30
  return Math.max(1, Math.round((expiry - Date.now()) / 86_400_000))
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : []
}

function stringOr(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function uniqueStrings(rows: string[]) {
  return [...new Set(rows.filter(Boolean))]
}

function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '').slice(0, 10)
}

function isoDate(value: Date | string | null | undefined) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : String(value).slice(0, 10)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}
