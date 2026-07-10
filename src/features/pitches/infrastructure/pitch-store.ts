import { randomBytes } from 'node:crypto'
import { pitchTemplate } from '@/features/pitches/domain/template'
import { prismaPitchRepository } from '@/features/pitches/infrastructure/prisma-pitch-repository'
import type { PitchRow } from '@/features/pitches/application/ports'
import { createPitchPersistenceService } from '@/features/pitches/application/persistence-service'
import { buildPitchFromSourcedContext, type CreateStockPitchInput, type UpdateStockPitchInput } from '@/features/pitches/application/pitches'
import { coercePitch } from '@/features/pitches/domain/normalization'
import type { PitchRecommendation, StockPitch, StockPitchRecord, StockPitchStatus, StockPitchSummary } from '@/types/pitch'

const persistence = createPitchPersistenceService(
  prismaPitchRepository,
  () => randomBytes(18).toString('base64url')
)

export async function listStockPitchSummaries(): Promise<StockPitchSummary[]> {
  if (!persistence.isAvailable()) return [fallbackPitchRecord()]
  try {
    const rows = await persistence.list(100)
    return rows.length ? rows.map(row => pitchSummaryFromRow(row)) : [fallbackPitchRecord()]
  } catch (error) {
    console.warn(`Stock pitch database unavailable; using seeded pitch. ${describeError(error)}`)
    return [fallbackPitchRecord()]
  }
}

export async function getDefaultStockPitch(): Promise<StockPitchRecord> {
  if (!persistence.isAvailable()) return fallbackPitchRecord()
  try {
    const row = await persistence.findLatest()
    return row ? pitchRecordFromRow(row) : fallbackPitchRecord()
  } catch (error) {
    console.warn(`Stock pitch database unavailable; using seeded pitch. ${describeError(error)}`)
    return fallbackPitchRecord()
  }
}

export async function getStockPitch(slug: string): Promise<StockPitchRecord | null> {
  const normalized = normalizeSlug(slug)
  if (!normalized) return null
  if (!persistence.isAvailable()) return normalized === fallbackPitchRecord().slug ? fallbackPitchRecord() : null
  try {
    const row = await persistence.findBySlug(normalized)
    return row ? pitchRecordFromRow(row) : null
  } catch (error) {
    console.warn(`Stock pitch lookup unavailable; using seeded pitch if possible. ${describeError(error)}`)
    return normalized === fallbackPitchRecord().slug ? fallbackPitchRecord() : null
  }
}

export async function getSharedStockPitch(slug: string, token: string | undefined): Promise<StockPitchRecord | null> {
  const normalized = normalizeSlug(slug)
  if (!normalized || !token) return null
  if (!persistence.isAvailable()) return null
  try {
    const row = await persistence.findShared(normalized, token)
    if (!row) return null
    return pitchRecordFromRow(row)
  } catch (error) {
    console.warn(`Shared stock pitch lookup unavailable. ${describeError(error)}`)
    return null
  }
}

export async function createStockPitch(input: CreateStockPitchInput = {}): Promise<StockPitchRecord> {
  if (!persistence.isAvailable()) throw new Error('DATABASE_URL is required to create stock pitches.')
  const pitch = coercePitch(await buildPitchFromSourcedContext(input))
  const fields = pitchFields(pitch)
  const row = await persistence.create({
    ...fields,
    slugBase: slugify(pitch.id || `${pitch.setup.ticker}-${pitch.setup.date}-pitch`),
    status: 'draft',
    shareEnabled: false,
    payload: pitch
  })
  return pitchRecordFromRow(row)
}

export async function updateStockPitch(slug: string, input: UpdateStockPitchInput): Promise<StockPitchRecord> {
  if (!persistence.isAvailable()) throw new Error('DATABASE_URL is required to update stock pitches.')
  const pitch = coercePitch(input.pitch)
  const fields = pitchFields(pitch)
  const row = await persistence.update(normalizeSlug(slug), {
    ...fields,
    status: input.status ?? undefined,
    shareEnabled: input.shareEnabled ?? undefined,
    payload: pitch
  })
  return pitchRecordFromRow(row)
}

export function pitchSharePath(record: StockPitchRecord) {
  return `/pitch/${encodeURIComponent(record.slug)}?token=${encodeURIComponent(record.shareToken || '')}`
}

export function pitchPrintPath(record: StockPitchRecord) {
  return `/pitch/${encodeURIComponent(record.slug)}/print?token=${encodeURIComponent(record.shareToken || '')}`
}

function pitchRecordFromRow(row: PitchRow): StockPitchRecord {
  const pitch = coercePitch(row.payload)
  return stripUndefinedDeep({
    ...pitchSummaryFromRow(row, pitch),
    shareToken: row.shareToken,
    pitch
  })
}

function pitchSummaryFromRow(row: PitchRow, pitch = coercePitch(row.payload)): StockPitchSummary {
  return stripUndefinedDeep({
    id: row.id,
    slug: row.slug,
    ticker: row.ticker || pitch.setup.ticker,
    companyName: row.companyName || pitch.setup.companyName,
    recommendation: normalizeRecommendation(row.recommendation || pitch.setup.recommendation),
    status: normalizeStatus(row.status),
    shareEnabled: Boolean(row.shareEnabled),
    date: pitch.setup.date,
    oneLineThesis: pitch.setup.oneLineThesis,
    targetPrice: pitch.setup.targetPrice,
    downsidePrice: pitch.setup.downsidePrice,
    expectedReturn: pitch.setup.expectedReturn,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  })
}

function fallbackPitchRecord(): StockPitchRecord {
  const pitch = coercePitch(pitchTemplate)
  return stripUndefinedDeep({
    id: 'seeded-hood-pitch',
    slug: normalizeSlug(pitch.id),
    ticker: pitch.setup.ticker,
    companyName: pitch.setup.companyName,
    recommendation: pitch.setup.recommendation,
    status: 'draft',
    shareEnabled: false,
    shareToken: '',
    date: pitch.setup.date,
    oneLineThesis: pitch.setup.oneLineThesis,
    targetPrice: pitch.setup.targetPrice,
    downsidePrice: pitch.setup.downsidePrice,
    expectedReturn: pitch.setup.expectedReturn,
    createdAt: `${pitch.setup.date}T00:00:00.000Z`,
    updatedAt: `${pitch.setup.date}T00:00:00.000Z`,
    pitch
  })
}

function pitchFields(pitch: StockPitch) {
  return {
    ticker: normalizeTicker(pitch.setup.ticker),
    companyName: pitch.setup.companyName || normalizeTicker(pitch.setup.ticker),
    recommendation: pitch.setup.recommendation
  }
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)
}
function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
function normalizeTicker(value: string | undefined) {
  return (value || 'HOOD').trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '').slice(0, 12) || 'HOOD'
}
function normalizeStatus(value: string | undefined): StockPitchStatus {
  if (value === 'review' || value === 'published' || value === 'archived') return value
  return 'draft'
}
function normalizeRecommendation(value: string | undefined): PitchRecommendation {
  if (value === 'long' || value === 'short' || value === 'no-trade') return value
  return 'watchlist'
}
function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) return value.map(item => stripUndefinedDeep(item)).filter(item => item !== undefined) as T
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined).map(([key, item]) => [key, stripUndefinedDeep(item)])) as T
  return value
}
function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value
}
function describeError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}
