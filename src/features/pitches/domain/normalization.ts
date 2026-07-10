import { pitchTemplate } from '@/features/pitches/domain/template'
import { buildPitchReadiness } from '@/features/pitches/domain/readiness'
import type { AiScanView, Catalyst, PitchEvidenceDriver, PitchModel, PitchNewsTapeItem, PitchPriceProvenance, PitchSourceEvidence, PitchSourceQuality, PitchSourceSnapshot, PitchValuation, RedTeam, StockPitch, TradeStructure } from '@/types/pitch'

export function coercePitch(value: unknown, now: () => Date = () => new Date()): StockPitch {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<StockPitch>
  const setup = { ...pitchTemplate.setup, ...(raw.setup ?? {}) }
  const pitch: StockPitch = {
    id: stringOr(raw.id, pitchTemplate.id),
    thesis: stringOr(raw.thesis, raw.setup?.oneLineThesis ?? pitchTemplate.thesis),
    evidenceDrivers: normalizeEvidenceDrivers(raw.evidenceDrivers),
    setup: {
      ...setup,
      ticker: normalizeTicker(setup.ticker),
      recommendation: normalizeRecommendation(setup.recommendation),
      currentPrice: numberOr(setup.currentPrice, 0),
      marketCap: numberOr(setup.marketCap, 0),
      expectedReturn: optionalNumber(setup.expectedReturn),
      targetPrice: optionalNumber(setup.targetPrice),
      downsidePrice: optionalNumber(setup.downsidePrice)
    },
    variantView: { ...pitchTemplate.variantView, ...(raw.variantView ?? {}) },
    positioning: {
      ...pitchTemplate.positioning,
      ...(raw.positioning ?? {}),
      relativeStrengthSummary: stringOr(raw.positioning?.relativeStrengthSummary, pitchTemplate.positioning.relativeStrengthSummary),
      positioningConclusion: stringOr(raw.positioning?.positioningConclusion, pitchTemplate.positioning.positioningConclusion)
    },
    catalysts: normalizeCatalysts(raw.catalysts),
    model: normalizeModel(raw.model),
    valuation: normalizeValuation(raw.valuation),
    tradeStructure: normalizeTradeStructure(raw.tradeStructure),
    redTeam: normalizeRedTeam(raw.redTeam),
    postMortem: { ...pitchTemplate.postMortem, ...(raw.postMortem ?? {}) },
    sourceEvidence: normalizeSourceEvidence(raw.sourceEvidence),
    readiness: pitchTemplate.readiness,
    sourceSnapshot: normalizeSourceSnapshot(raw.sourceSnapshot, now),
    aiScanId: optionalString(raw.aiScanId),
    aiScan: normalizeAiScan(raw.aiScan, now),
    newsTape: normalizeNewsTape(raw.newsTape),
    priceProvenance: normalizePriceProvenance(raw.priceProvenance)
  }
  pitch.readiness = buildPitchReadiness(pitch)
  return stripUndefinedDeep(pitch)
}

export function normalizeEvidenceDrivers(value: unknown): PitchEvidenceDriver[] {
  const rows = Array.isArray(value) ? value : []
  const normalized = rows.slice(0, 3).map((item, index) => {
    const raw = item && typeof item === 'object' ? item as Partial<PitchEvidenceDriver> : {}
    return {
      driver: stringOr(raw.driver, pitchTemplate.evidenceDrivers[index]?.driver ?? `Driver ${index + 1}`),
      claim: stringOr(raw.claim, ''),
      sourceStatus: normalizeSourceQuality(raw.sourceStatus),
      evidence: stringOr(raw.evidence, ''),
      sourceUrl: raw.sourceUrl ?? null,
      whyItMatters: stringOr(raw.whyItMatters, '')
    }
  })
  const defaults = pitchTemplate.evidenceDrivers
  while (normalized.length < 3) {
    const fallback = defaults[normalized.length]
    normalized.push({
      driver: fallback?.driver ?? `Driver ${normalized.length + 1}`,
      claim: fallback?.claim ?? '',
      sourceStatus: fallback?.sourceStatus ?? 'unavailable',
      evidence: fallback?.evidence ?? '',
      sourceUrl: fallback?.sourceUrl ?? null,
      whyItMatters: fallback?.whyItMatters ?? ''
    })
  }
  return normalized
}

export function normalizeSourceEvidence(value: unknown): PitchSourceEvidence[] {
  if (!Array.isArray(value)) return []
  return value.map((item, index) => {
    const raw = item && typeof item === 'object' ? item as Partial<PitchSourceEvidence> : {}
    return {
      asOfDate: raw.asOfDate ?? null,
      observedAt: raw.observedAt ?? null,
      providerTimestamp: raw.providerTimestamp ?? null,
      ingestedAt: raw.ingestedAt ?? null,
      source: stringOr(raw.source, 'source evidence'),
      provider: stringOr(raw.provider, 'source provider'),
      revisionFlag: raw.revisionFlag ?? 'UNKNOWN',
      dataStatus: raw.dataStatus ?? 'PARTIAL',
      availability: raw.availability ?? 'Partial',
      label: stringOr(raw.label, `Evidence ${index + 1}`),
      detail: stringOr(raw.detail, ''),
      url: raw.url ?? null,
      sourceStatus: normalizeSourceQuality(raw.sourceStatus)
    }
  })
}

export function normalizeCatalysts(value: unknown): Catalyst[] {
  const rows = Array.isArray(value) ? value : pitchTemplate.catalysts
  return rows.map((item, index) => ({
    ...pitchTemplate.catalysts[0],
    ...(item && typeof item === 'object' ? item : {}),
    id: stringOr((item as Catalyst | undefined)?.id, `catalyst-${index + 1}`)
  }))
}

export function normalizeSourceQuality(value: unknown): PitchSourceQuality {
  if (value === 'sourced' || value === 'derived' || value === 'proxy' || value === 'plan-locked') return value
  return 'unavailable'
}

export function normalizeModel(value: unknown): PitchModel {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<PitchModel>
  return {
    revenueDrivers: stringArray(raw.revenueDrivers, pitchTemplate.model.revenueDrivers),
    keyKpis: Array.isArray(raw.keyKpis) ? raw.keyKpis : pitchTemplate.model.keyKpis,
    marginAssumptions: Array.isArray(raw.marginAssumptions) ? raw.marginAssumptions : pitchTemplate.model.marginAssumptions,
    epsFcfAssumptions: Array.isArray(raw.epsFcfAssumptions) ? raw.epsFcfAssumptions : pitchTemplate.model.epsFcfAssumptions,
    mostImportantDriver: stringOr(raw.mostImportantDriver, pitchTemplate.model.mostImportantDriver),
    modelConclusion: stringOr(raw.modelConclusion, pitchTemplate.model.modelConclusion)
  }
}

export function normalizeValuation(value: unknown): PitchValuation {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<PitchValuation>
  return {
    primaryMethod: stringOr(raw.primaryMethod, pitchTemplate.valuation.primaryMethod),
    peerSet: stringArray(raw.peerSet, pitchTemplate.valuation.peerSet),
    scenarios: Array.isArray(raw.scenarios) ? raw.scenarios : pitchTemplate.valuation.scenarios,
    valuationConclusion: stringOr(raw.valuationConclusion, pitchTemplate.valuation.valuationConclusion)
  }
}

export function normalizeTradeStructure(value: unknown): TradeStructure {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<TradeStructure>
  return {
    ...pitchTemplate.tradeStructure,
    ...raw,
    stopLevel: optionalNumber(raw.stopLevel),
    takeProfitLevel: optionalNumber(raw.takeProfitLevel)
  }
}

export function normalizeRedTeam(value: unknown): RedTeam {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<RedTeam>
  return {
    bearCase: stringOr(raw.bearCase, pitchTemplate.redTeam.bearCase),
    strongestCounterargument: stringOr(raw.strongestCounterargument, pitchTemplate.redTeam.strongestCounterargument),
    whatWouldMakeMeWrong: stringOr(raw.whatWouldMakeMeWrong, pitchTemplate.redTeam.whatWouldMakeMeWrong),
    dataToMonitor: stringArray(raw.dataToMonitor, pitchTemplate.redTeam.dataToMonitor)
  }
}

export function normalizeSourceSnapshot(value: unknown, now: () => Date = () => new Date()): PitchSourceSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Partial<PitchSourceSnapshot>
  return {
    ticker: normalizeTicker(raw.ticker),
    generatedAt: stringOr(raw.generatedAt, now().toISOString()),
    reportAsOf: stringOr(raw.reportAsOf, ''),
    price: normalizePriceProvenance(raw.price) ?? null,
    newsTape: normalizeNewsTape(raw.newsTape) ?? [],
    providerNotes: stringArray(raw.providerNotes, []),
    gaps: stringArray(raw.gaps, []),
    optionsBattlefield: raw.optionsBattlefield,
    dayMap: raw.dayMap,
    targetConfidence: raw.targetConfidence,
    sourceQuality: raw.sourceQuality
  }
}

export function normalizePriceProvenance(value: unknown): PitchPriceProvenance | undefined {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Partial<PitchPriceProvenance>
  const price = optionalNumber(raw.price)
  if (price === undefined) return undefined
  return {
    asOfDate: raw.asOfDate ?? null,
    observedAt: raw.observedAt ?? null,
    providerTimestamp: raw.providerTimestamp ?? null,
    ingestedAt: raw.ingestedAt ?? null,
    source: stringOr(raw.source, 'price source'),
    provider: stringOr(raw.provider, 'price provider'),
    revisionFlag: raw.revisionFlag ?? 'UNKNOWN',
    dataStatus: raw.dataStatus ?? 'PARTIAL',
    availability: raw.availability ?? 'Partial',
    ticker: normalizeTicker(raw.ticker),
    date: stringOr(raw.date, ''),
    price,
    label: stringOr(raw.label, 'sourced price'),
    fallback: Boolean(raw.fallback)
  }
}

export function normalizeNewsTape(value: unknown): PitchNewsTapeItem[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.map((item, index) => {
    const raw = item && typeof item === 'object' ? item as Partial<PitchNewsTapeItem> : {}
    return {
      asOfDate: raw.asOfDate ?? null,
      observedAt: raw.observedAt ?? null,
      providerTimestamp: raw.providerTimestamp ?? null,
      ingestedAt: raw.ingestedAt ?? null,
      source: stringOr(raw.source, 'news source'),
      provider: stringOr(raw.provider, 'news provider'),
      revisionFlag: raw.revisionFlag ?? 'UNKNOWN',
      dataStatus: raw.dataStatus ?? 'PARTIAL',
      availability: raw.availability ?? 'Partial',
      id: stringOr(raw.id, `news-${index + 1}`),
      date: stringOr(raw.date, ''),
      headline: stringOr(raw.headline, 'Untitled news row'),
      sourceName: raw.sourceName ?? null,
      url: raw.url ?? null,
      tickers: stringArray(raw.tickers, []),
      theme: stringOr(raw.theme, 'ticker catalyst'),
      materiality: raw.materiality === null ? null : optionalNumber(raw.materiality) ?? null,
      priceConfirmationRequired: Boolean(raw.priceConfirmationRequired),
      whyMatters: stringOr(raw.whyMatters, ''),
      relevance: raw.relevance === 'ai-confirmed' || raw.relevance === 'theme-context' ? raw.relevance : 'direct'
    }
  })
}

export function normalizeAiScan(value: unknown, now: () => Date = () => new Date()): AiScanView | undefined {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Partial<AiScanView>
  return {
    id: optionalString(raw.id),
    ticker: normalizeTicker(raw.ticker),
    mode: stringOr(raw.mode, 'stock-pitch'),
    inputHash: optionalString(raw.inputHash),
    model: stringOr(raw.model, 'unconfigured'),
    status: raw.status === 'completed' || raw.status === 'error' ? raw.status : 'unavailable',
    createdAt: stringOr(raw.createdAt, now().toISOString()),
    errorMessage: optionalString(raw.errorMessage),
    payload: raw.payload
  }
}


function stringOr(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}
function stringArray(value: unknown, fallback: string[]) {
  return Array.isArray(value) ? value.map(item => String(item)).filter(Boolean) : fallback
}
function numberOr(value: unknown, fallback: number) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}
function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined
  const next = Number(value)
  return Number.isFinite(next) ? next : undefined
}
function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function normalizeTicker(value: string | undefined) {
  return (value || 'HOOD').trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '').slice(0, 12) || 'HOOD'
}

function normalizeRecommendation(value: string | undefined) {
  if (value === 'long' || value === 'short' || value === 'no-trade') return value
  return 'watchlist'
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => stripUndefinedDeep(item)).filter(item => item !== undefined) as T
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, stripUndefinedDeep(item)])) as T
  }
  return value
}
