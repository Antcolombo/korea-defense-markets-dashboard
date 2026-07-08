import { randomBytes } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { createApiResponse, createShellMeta } from '@/lib/research/api'
import { getStockReport, isValidTickerSymbol, normalizeTickerSymbol } from '@/lib/research/repository'
import { getPrisma } from '@/lib/server/prisma'
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

type DecisionRow = {
  id: string
  slug: string
  ticker: string
  companyName: string
  status: string
  decision: string
  marketBelief: string
  variantView: string
  evidenceJson: unknown
  riskJson: unknown
  invalidation: string
  timeHorizon: string | null
  expectedReturn: number | null
  downside: number | null
  sourceSnapshotJson: unknown | null
  outcomeReturn: number | null
  lesson: string | null
  isPublic: boolean
  featuredRank: number | null
  createdAt: Date | string
  updatedAt: Date | string
}

export type UpsertInvestmentDecisionInput = Partial<{
  id: string
  slug: string
  ticker: string
  companyName: string
  status: DecisionStatus
  decision: DecisionAction
  marketBelief: string
  variantView: string
  evidence: EvidenceDriver[]
  risk: RiskPlan
  invalidation: string
  timeHorizon: string
  expectedReturn: number | null
  downside: number | null
  sourceSnapshot: DecisionSourceSnapshot | null
  outcomeReturn: number | null
  lesson: string
  isPublic: boolean
  featuredRank: number | null
}>

export async function listInvestmentDecisionSummaries(): Promise<InvestmentDecisionSummary[]> {
  const records = await listInvestmentDecisions()
  return records.map(decisionSummary)
}

export async function listInvestmentDecisions(): Promise<InvestmentDecisionRecord[]> {
  const prisma = getPrisma()
  if (!prisma) return [await fallbackDecision()]
  try {
    const rows = await prisma.$queryRaw<DecisionRow[]>`
      SELECT * FROM "InvestmentDecision"
      ORDER BY "updatedAt" DESC
      LIMIT 100
    `
    return rows.map(recordFromRow)
  } catch (error) {
    console.warn(`InvestmentDecision list unavailable; using local template. ${describeError(error)}`)
    return [await fallbackDecision()]
  }
}

export async function listPublicInvestmentDecisions(): Promise<InvestmentDecisionRecord[]> {
  const prisma = getPrisma()
  if (!prisma) return []
  try {
    const rows = await prisma.$queryRaw<DecisionRow[]>`
      SELECT * FROM "InvestmentDecision"
      WHERE "isPublic" = true
      ORDER BY "featuredRank" ASC NULLS LAST, "updatedAt" DESC
      LIMIT 8
    `
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
  const prisma = getPrisma()
  if (!prisma) return null
  try {
    const rows = await prisma.$queryRaw<DecisionRow[]>`
      SELECT * FROM "InvestmentDecision"
      WHERE "slug" = ${normalized}
      LIMIT 1
    `
    return rows[0] ? recordFromRow(rows[0]) : null
  } catch (error) {
    console.warn(`InvestmentDecision read unavailable for ${normalized}. ${describeError(error)}`)
    return normalized === fallback.slug ? fallback : null
  }
}

export async function createInvestmentDecision(input: UpsertInvestmentDecisionInput = {}): Promise<InvestmentDecisionRecord> {
  const prepared = await buildDecisionFromInput(input)
  validateDecisionState(prepared)
  const prisma = getPrisma()
  if (!prisma) return prepared
  try {
    const evidenceJson = JSON.stringify(prepared.evidence)
    const riskJson = JSON.stringify(prepared.risk)
    const sourceJson = prepared.sourceSnapshot ? JSON.stringify(prepared.sourceSnapshot) : null
    const rows = await prisma.$queryRaw<DecisionRow[]>(Prisma.sql`
      INSERT INTO "InvestmentDecision" (
        "id", "slug", "ticker", "companyName", "status", "decision",
        "marketBelief", "variantView", "evidenceJson", "riskJson", "invalidation",
        "timeHorizon", "expectedReturn", "downside", "sourceSnapshotJson",
        "outcomeReturn", "lesson", "isPublic", "featuredRank", "createdAt", "updatedAt"
      ) VALUES (
        ${newId()}, ${prepared.slug}, ${prepared.ticker}, ${prepared.companyName}, ${prepared.status}, ${prepared.decision},
        ${prepared.marketBelief}, ${prepared.variantView}, ${evidenceJson}::jsonb, ${riskJson}::jsonb, ${prepared.invalidation},
        ${prepared.timeHorizon || null}, ${prepared.expectedReturn}, ${prepared.downside},
        ${sourceJson ? Prisma.sql`${sourceJson}::jsonb` : Prisma.sql`NULL`},
        ${prepared.outcomeReturn}, ${prepared.lesson || null}, ${prepared.isPublic}, ${prepared.featuredRank},
        NOW(), NOW()
      )
      RETURNING *
    `)
    return recordFromRow(rows[0])
  } catch (error) {
    throw new Error(`InvestmentDecision create failed. ${describeError(error)}`)
  }
}

export async function updateInvestmentDecision(slug: string, input: UpsertInvestmentDecisionInput): Promise<InvestmentDecisionRecord> {
  const existing = await getInvestmentDecision(slug)
  if (!existing) throw new Error('Investment decision not found.')
  const prepared = await buildDecisionFromInput({ ...existing, ...input, slug: existing.slug })
  validateDecisionState(prepared)
  const prisma = getPrisma()
  if (!prisma) return prepared
  try {
    const evidenceJson = JSON.stringify(prepared.evidence)
    const riskJson = JSON.stringify(prepared.risk)
    const sourceJson = prepared.sourceSnapshot ? JSON.stringify(prepared.sourceSnapshot) : null
    const rows = await prisma.$queryRaw<DecisionRow[]>(Prisma.sql`
      UPDATE "InvestmentDecision"
      SET
        "ticker" = ${prepared.ticker},
        "companyName" = ${prepared.companyName},
        "status" = ${prepared.status},
        "decision" = ${prepared.decision},
        "marketBelief" = ${prepared.marketBelief},
        "variantView" = ${prepared.variantView},
        "evidenceJson" = ${evidenceJson}::jsonb,
        "riskJson" = ${riskJson}::jsonb,
        "invalidation" = ${prepared.invalidation},
        "timeHorizon" = ${prepared.timeHorizon || null},
        "expectedReturn" = ${prepared.expectedReturn},
        "downside" = ${prepared.downside},
        "sourceSnapshotJson" = ${sourceJson ? Prisma.sql`${sourceJson}::jsonb` : Prisma.sql`NULL`},
        "outcomeReturn" = ${prepared.outcomeReturn},
        "lesson" = ${prepared.lesson || null},
        "isPublic" = ${prepared.isPublic},
        "featuredRank" = ${prepared.featuredRank},
        "updatedAt" = NOW()
      WHERE "slug" = ${existing.slug}
      RETURNING *
    `)
    return recordFromRow(rows[0])
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
  if (!canDeleteDraftDecision(existing)) {
    throw new Error('Only blank non-public watch drafts can be deleted.')
  }
  const prisma = getPrisma()
  if (!prisma) return { deleted: true, slug: existing.slug }
  await prisma.$executeRaw`
    DELETE FROM "InvestmentDecision"
    WHERE "slug" = ${existing.slug}
  `
  return { deleted: true, slug: existing.slug }
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

function validateDecisionState(record: InvestmentDecisionRecord) {
  if (record.status === 'accepted' && !record.readiness.canAccept) {
    throw new Error(`Decision cannot be accepted yet. Missing: ${record.readiness.missingForAccept.join(', ')}`)
  }
  if (record.status === 'closed' && !record.readiness.canClose) {
    throw new Error(`Decision cannot be closed yet. Missing: ${record.readiness.missingForClose.join(', ')}`)
  }
}

async function buildDecisionFromInput(input: UpsertInvestmentDecisionInput): Promise<InvestmentDecisionRecord> {
  const ticker = normalizeDecisionTicker(input.ticker)
  const template = await buildInvestmentDecisionTemplate(ticker)
  return enrichDecision({
    ...template,
    ...input,
    ticker,
    slug: input.slug ? slugify(input.slug) : await uniqueDecisionSlug(slugify(`${ticker}-${new Date().toISOString().slice(0, 10)}-decision`)),
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

async function uniqueDecisionSlug(base: string) {
  const prisma = getPrisma()
  if (!prisma) return base || 'investment-decision'
  let candidate = base || 'investment-decision'
  for (let index = 2; index < 100; index += 1) {
    try {
      const existing = await prisma.$queryRaw<{ slug: string }[]>`
        SELECT "slug" FROM "InvestmentDecision"
        WHERE "slug" = ${candidate}
        LIMIT 1
      `
      if (!existing.length) return candidate
    } catch {
      return candidate
    }
    candidate = `${base}-${index}`
  }
  return `${base}-${Date.now()}`
}

function missingAcceptFields(record: Omit<InvestmentDecisionRecord, 'pmRead' | 'readiness'>) {
  return [
    !record.risk.thesis.trim() ? 'thesis' : null,
    !record.marketBelief.trim() ? 'market belief' : null,
    !record.variantView.trim() ? 'variant view' : null,
    ...record.evidence.flatMap((driver, index) => [
      !driver.driver.trim() ? `driver ${index + 1} name` : null,
      !driver.claim.trim() ? `driver ${index + 1} claim` : null,
      !driver.sourcedEvidence.trim() ? `driver ${index + 1} sourced evidence` : null,
      !driver.whyItMatters.trim() ? `driver ${index + 1} why it matters` : null,
      driver.sourceStatus === 'missing' ? `driver ${index + 1} source status` : null
    ]),
    !record.invalidation.trim() ? 'invalidation' : null,
    ...missingRiskFields(record)
  ].filter((item): item is string => Boolean(item))
}

function missingCloseFields(record: Omit<InvestmentDecisionRecord, 'pmRead' | 'readiness'>) {
  return [
    ...missingAcceptFields(record),
    record.outcomeReturn === null ? 'outcome return' : null,
    !record.lesson.trim() ? 'lesson' : null
  ].filter((item): item is string => Boolean(item))
}

function missingRiskFields(record: Pick<InvestmentDecisionRecord, 'risk'> | Omit<InvestmentDecisionRecord, 'pmRead' | 'readiness'>) {
  const risk = record.risk
  return [
    !risk.decidedAt.trim() ? 'decision timestamp' : null,
    !risk.entry.trim() ? 'entry' : null,
    risk.entryPrice === null ? 'entry price' : null,
    risk.targetPrice === null ? 'target price' : null,
    !risk.sizing ? 'sizing' : null,
    risk.positionSizePct === null ? 'position size %' : null,
    !risk.stop.trim() ? 'stop' : null,
    risk.stopPrice === null ? 'stop price' : null,
    !risk.upside.trim() ? 'upside' : null,
    !risk.downside.trim() ? 'downside' : null,
    !risk.timeHorizon.trim() ? 'time horizon' : null,
    risk.confidence === null ? 'confidence' : null,
    !risk.whatWouldChangeMind.trim() ? 'what would change mind' : null
  ].filter((item): item is string => Boolean(item))
}

function variantStrength(record: Omit<InvestmentDecisionRecord, 'pmRead' | 'readiness'>): VariantStrength {
  const length = record.risk.thesis.trim().length + record.marketBelief.trim().length + record.variantView.trim().length
  if (length >= 240 && record.variantView.toLowerCase().includes('because')) return 'strong'
  if (length >= 90) return 'medium'
  return 'weak'
}

function evidenceQuality(evidence: EvidenceDriver[]): EvidenceQuality {
  if (evidence.some(item => item.sourceStatus === 'stale')) return 'stale'
  if (evidence.length && evidence.every(item => item.sourceStatus === 'sourced')) return 'sourced'
  return 'partial'
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

function canDeleteDraftDecision(record: InvestmentDecisionRecord) {
  return !isTemplateDecision(record) &&
    !record.isPublic &&
    record.status === 'watch' &&
    record.decision === 'watch' &&
    !record.marketBelief.trim() &&
    !record.variantView.trim() &&
    !record.invalidation.trim() &&
    record.evidence.every(driver => !driver.claim.trim() && !driver.sourcedEvidence.trim() && !driver.whyItMatters.trim()) &&
    !record.outcomeReturn &&
    !record.lesson.trim()
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
