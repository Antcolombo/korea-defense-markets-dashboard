import { randomBytes } from 'node:crypto'
import { createApiResponse, createShellMeta } from '@/lib/research/api'
import { getStockReport, isValidTickerSymbol, normalizeTickerSymbol } from '@/lib/research/repository'
import { prismaDecisionRepository } from '@/features/decisions/infrastructure/prisma-decision-repository'
import { createDecisionPersistenceService } from '@/features/decisions/application/persistence-service'
import type { DecisionRow } from '@/features/decisions/application/ports'
import { evidenceQuality, missingAcceptFields, missingCloseFields, missingRiskFields, validateDecisionState, variantStrength } from '@/features/decisions/domain/readiness'
import type { UpsertInvestmentDecisionInput } from '@/features/decisions/contracts'
export type { UpsertInvestmentDecisionInput } from '@/features/decisions/contracts'
import type {
  DecisionAction,
  DecisionSourceSnapshot,
  DecisionStatus,
  EvidenceDriver,
  EvidenceQuality,
  InvestmentDecisionRecord,
  InvestmentDecisionSummary,
  RiskPlan,
  SourceStatus,
  VariantStrength
} from '@/types/decision'

const persistence = createDecisionPersistenceService(prismaDecisionRepository, newId)

export async function listInvestmentDecisionSummaries(): Promise<InvestmentDecisionSummary[]> {
  const records = await listInvestmentDecisions()
  return records.map(decisionSummary)
}

export async function listInvestmentDecisions(): Promise<InvestmentDecisionRecord[]> {
  if (!persistence.isAvailable()) return [await fallbackDecision()]
  try {
    const rows = await persistence.list(100)
    return rows.map(recordFromRow)
  } catch (error) {
    console.warn(`InvestmentDecision list unavailable; using local template. ${describeError(error)}`)
    return [await fallbackDecision()]
  }
}

export async function listPublicInvestmentDecisions(): Promise<InvestmentDecisionRecord[]> {
  if (!persistence.isAvailable()) return []
  try {
    const rows = await persistence.listPublic(8)
    return rows.map(recordFromRow)
  } catch (error) {
    console.warn(`Public InvestmentDecision list unavailable. ${describeError(error)}`)
    return []
  }
}

export async function getInvestmentDecision(slug: string): Promise<InvestmentDecisionRecord | null> {
  const normalized = slugify(slug)
  const fallback = await fallbackDecision()
  if (!normalized || normalized === fallback.slug) return fallback
  if (!persistence.isAvailable()) return null
  try {
    const row = await persistence.findBySlug(normalized)
    return row ? recordFromRow(row) : null
  } catch (error) {
    console.warn(`InvestmentDecision read unavailable for ${normalized}. ${describeError(error)}`)
    return normalized === fallback.slug ? fallback : null
  }
}

export async function createInvestmentDecision(input: UpsertInvestmentDecisionInput = {}): Promise<InvestmentDecisionRecord> {
  const prepared = await buildDecisionFromInput(input)
  validateDecisionState(prepared)
  if (!persistence.isAvailable()) return prepared
  try {
    const row = await persistence.create(prepared)
    return row ? recordFromRow(row) : prepared
  } catch (error) {
    throw new Error(`InvestmentDecision create failed. ${describeError(error)}`)
  }
}
export async function updateInvestmentDecision(slug: string, input: UpsertInvestmentDecisionInput): Promise<InvestmentDecisionRecord> {
  const existing = await getInvestmentDecision(slug)
  if (!existing) throw new Error('Investment decision not found.')
  const prepared = await buildDecisionFromInput({ ...existing, ...input, slug: existing.slug })
  validateDecisionState(prepared)
  if (!persistence.isAvailable()) return prepared
  try {
    const row = await persistence.update(existing.slug, prepared)
    return row ? recordFromRow(row) : prepared
  } catch (error) {
    throw new Error(`InvestmentDecision update failed. ${describeError(error)}`)
  }
}
export async function refreshInvestmentDecisionSources(slug: string): Promise<InvestmentDecisionRecord> {
  const existing = await getInvestmentDecision(slug)
  if (!existing) throw new Error('Investment decision not found.')
  if (isTemplateDecision(existing)) {
    throw new Error('Save this decision before refreshing its source snapshot.')
  }
  const template = await buildInvestmentDecisionTemplate(existing.ticker)
  return updateInvestmentDecision(existing.slug, {
    ...existing,
    sourceSnapshot: template.sourceSnapshot,
    companyName: existing.companyName || template.companyName,
    timeHorizon: existing.timeHorizon || template.timeHorizon
  })
}

export async function deleteInvestmentDecision(slug: string): Promise<{ deleted: boolean; slug: string }> {
  const existing = await getInvestmentDecision(slug)
  if (!existing) throw new Error('Investment decision not found.')
  return persistence.delete(existing)
}

export async function buildInvestmentDecisionTemplate(tickerValue = 'NVDA'): Promise<InvestmentDecisionRecord> {
  const ticker = normalizeDecisionTicker(tickerValue)
  let companyName = ticker
  let sourceSnapshot: DecisionSourceSnapshot | null = null
  let timeHorizon = '1-3 months'
  try {
    const report = await getStockReport(ticker)
    companyName = report.companyName || ticker
    timeHorizon = report.summary.includes('mixed evidence') ? '1-3 months' : '1-6 months'
    const response = createApiResponse({ report })
    const shell = createShellMeta(response)
    sourceSnapshot = {
      summary: shell.sourceSummary,
      reportAsOf: report.asOfDate,
      sourceStates: shell.sourceStates.map(state => ({ label: state.label, status: state.status, detail: state.detail })),
      reportUrl: `/report/${encodeURIComponent(ticker)}`
    }
  } catch (error) {
    console.warn(`Decision template source context unavailable for ${ticker}. ${describeError(error)}`)
  }

  return enrichDecision({
    id: `template-${ticker.toLowerCase()}`,
    slug: `${ticker.toLowerCase()}-decision-template`,
    ticker,
    companyName,
    status: 'watch',
    decision: 'watch',
    marketBelief: '',
    variantView: '',
    evidence: defaultEvidenceDrivers(),
    risk: defaultRiskPlan(timeHorizon),
    invalidation: '',
    timeHorizon,
    expectedReturn: null,
    downside: null,
    sourceSnapshot,
    outcomeReturn: null,
    lesson: '',
    isPublic: false,
    featuredRank: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })
}

async function buildDecisionFromInput(input: UpsertInvestmentDecisionInput): Promise<InvestmentDecisionRecord> {
  const ticker = normalizeDecisionTicker(input.ticker)
  const template = await buildInvestmentDecisionTemplate(ticker)
  return enrichDecision({
    ...template,
    ...input,
    ticker,
    slug: input.slug ? slugify(input.slug) : await persistence.uniqueSlug(slugify(`${ticker}-${new Date().toISOString().slice(0, 10)}-decision`)),
    companyName: input.companyName?.trim() || template.companyName,
    marketBelief: input.marketBelief?.trim() ?? template.marketBelief,
    variantView: input.variantView?.trim() ?? template.variantView,
    evidence: normalizeEvidence(input.evidence ?? template.evidence),
    risk: normalizeRisk(input.risk ?? template.risk),
    invalidation: input.invalidation?.trim() ?? template.invalidation,
    timeHorizon: input.timeHorizon?.trim() || input.risk?.timeHorizon || template.timeHorizon,
    expectedReturn: nullableNumber(input.expectedReturn),
    downside: nullableNumber(input.downside),
    sourceSnapshot: input.sourceSnapshot === undefined ? template.sourceSnapshot : input.sourceSnapshot,
    outcomeReturn: nullableNumber(input.outcomeReturn),
    lesson: input.lesson?.trim() ?? template.lesson,
    isPublic: Boolean(input.isPublic),
    featuredRank: nullableInteger(input.featuredRank),
    createdAt: template.createdAt,
    updatedAt: new Date().toISOString()
  })
}

function recordFromRow(row: DecisionRow): InvestmentDecisionRecord {
  return enrichDecision({
    id: row.id,
    slug: row.slug,
    ticker: row.ticker,
    companyName: row.companyName,
    status: normalizeStatus(row.status),
    decision: normalizeDecision(row.decision),
    marketBelief: row.marketBelief ?? '',
    variantView: row.variantView ?? '',
    evidence: normalizeEvidence(row.evidenceJson),
    risk: normalizeRisk(row.riskJson),
    invalidation: row.invalidation ?? '',
    timeHorizon: row.timeHorizon ?? '',
    expectedReturn: nullableNumber(row.expectedReturn),
    downside: nullableNumber(row.downside),
    sourceSnapshot: normalizeSourceSnapshot(row.sourceSnapshotJson),
    outcomeReturn: nullableNumber(row.outcomeReturn),
    lesson: row.lesson ?? '',
    isPublic: Boolean(row.isPublic),
    featuredRank: nullableInteger(row.featuredRank),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  })
}

function enrichDecision(record: Omit<InvestmentDecisionRecord, 'pmRead' | 'readiness'>): InvestmentDecisionRecord {
  const missingForAccept = missingAcceptFields(record)
  const missingForClose = missingCloseFields(record)
  const pmRead = {
    variantStrength: variantStrength(record),
    evidenceQuality: evidenceQuality(record.evidence),
    riskClarity: missingRiskFields(record).length ? 'missing' as const : 'clear' as const,
    whatWouldChangeMind: record.risk.whatWouldChangeMind || record.invalidation || 'Not written.',
    nextCatalystDate: record.risk.catalystDate || 'Not set.'
  }
  return {
    ...record,
    evidence: normalizeEvidence(record.evidence),
    risk: normalizeRisk(record.risk),
    pmRead,
    readiness: {
      canAccept: missingForAccept.length === 0,
      canClose: missingForClose.length === 0,
      missingForAccept,
      missingForClose
    }
  }
}

function decisionSummary(record: InvestmentDecisionRecord): InvestmentDecisionSummary {
  return {
    id: record.id,
    slug: record.slug,
    ticker: record.ticker,
    companyName: record.companyName,
    status: record.status,
    decision: record.decision,
    variantView: record.variantView,
    expectedReturn: record.expectedReturn,
    downside: record.downside,
    outcomeReturn: record.outcomeReturn,
    lesson: record.lesson,
    isPublic: record.isPublic,
    pmRead: record.pmRead,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  }
}

async function fallbackDecision() {
  return buildInvestmentDecisionTemplate('NVDA')
}

function normalizeEvidence(value: unknown): EvidenceDriver[] {
  const rows = Array.isArray(value) ? value : []
  const normalized = rows.slice(0, 3).map((item, index) => {
    const raw = item && typeof item === 'object' ? item as Partial<EvidenceDriver> : {}
    return {
      driver: stringOr(raw.driver, defaultEvidenceDrivers()[index]?.driver ?? `Driver ${index + 1}`),
      claim: stringOr(raw.claim, ''),
      sourcedEvidence: stringOr(raw.sourcedEvidence, ''),
      sourceStatus: normalizeSourceStatus(raw.sourceStatus),
      whyItMatters: stringOr(raw.whyItMatters, '')
    }
  })
  while (normalized.length < 3) normalized.push(defaultEvidenceDrivers()[normalized.length])
  return normalized
}

function normalizeRisk(value: unknown): RiskPlan {
  const raw = value && typeof value === 'object' ? value as Partial<RiskPlan> : {}
  return {
    thesis: stringOr(raw.thesis, ''),
    decidedAt: stringOr(raw.decidedAt, new Date().toISOString()),
    entry: stringOr(raw.entry, ''),
    entryPrice: nullableNumber(raw.entryPrice),
    targetPrice: nullableNumber(raw.targetPrice),
    sizing: raw.sizing === 'medium' || raw.sizing === 'large' ? raw.sizing : 'small',
    positionSizePct: nullableNumber(raw.positionSizePct),
    stop: stringOr(raw.stop, ''),
    stopPrice: nullableNumber(raw.stopPrice),
    upside: stringOr(raw.upside, ''),
    downside: stringOr(raw.downside, ''),
    timeHorizon: stringOr(raw.timeHorizon, '1-3 months'),
    catalystDate: stringOr(raw.catalystDate, ''),
    confidence: nullableNumber(raw.confidence),
    whatWouldChangeMind: stringOr(raw.whatWouldChangeMind, '')
  }
}

function normalizeSourceSnapshot(value: unknown): DecisionSourceSnapshot | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<DecisionSourceSnapshot>
  return {
    summary: stringOr(raw.summary, 'Source snapshot attached.'),
    reportAsOf: raw.reportAsOf,
    reportUrl: raw.reportUrl,
    sourceStates: Array.isArray(raw.sourceStates) ? raw.sourceStates.map(item => ({
      label: stringOr((item as { label?: string }).label, 'Source'),
      status: stringOr((item as { status?: string }).status, 'unknown'),
      detail: stringOr((item as { detail?: string }).detail, '')
    })) : undefined
  }
}

function defaultEvidenceDrivers(): EvidenceDriver[] {
  return [
    { driver: 'Driver 1', claim: '', sourcedEvidence: '', sourceStatus: 'missing', whyItMatters: '' },
    { driver: 'Driver 2', claim: '', sourcedEvidence: '', sourceStatus: 'missing', whyItMatters: '' },
    { driver: 'Driver 3', claim: '', sourcedEvidence: '', sourceStatus: 'missing', whyItMatters: '' }
  ]
}

function defaultRiskPlan(timeHorizon = '1-3 months'): RiskPlan {
  return {
    thesis: '',
    decidedAt: new Date().toISOString(),
    entry: '',
    entryPrice: null,
    targetPrice: null,
    sizing: 'small',
    positionSizePct: null,
    stop: '',
    stopPrice: null,
    upside: '',
    downside: '',
    timeHorizon,
    catalystDate: '',
    confidence: null,
    whatWouldChangeMind: ''
  }
}

function isTemplateDecision(record: Pick<InvestmentDecisionRecord, 'id' | 'slug'>) {
  return record.id.startsWith('template-') || record.slug.endsWith('-decision-template')
}

function normalizeStatus(value: unknown): DecisionStatus {
  return value === 'accepted' || value === 'rejected' || value === 'closed' ? value : 'watch'
}

function normalizeDecision(value: unknown): DecisionAction {
  return value === 'long' || value === 'short' || value === 'pass' ? value : 'watch'
}

function normalizeSourceStatus(value: unknown): SourceStatus {
  return value === 'sourced' || value === 'partial' || value === 'stale' ? value : 'missing'
}

function normalizeDecisionTicker(value: unknown) {
  const ticker = normalizeTickerSymbol(typeof value === 'string' ? value : 'NVDA')
  return isValidTickerSymbol(ticker) ? ticker : 'NVDA'
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'investment-decision'
}

function newId() {
  return `decision_${randomBytes(12).toString('hex')}`
}

function stringOr(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function nullableInteger(value: unknown): number | null {
  const number = nullableNumber(value)
  return number === null ? null : Math.round(number)
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
