import assert from 'node:assert/strict'
import { createPitchPersistenceService } from '../src/features/pitches/application/persistence-service'
import type { PitchRepository, PitchRow } from '../src/features/pitches/application/ports'
import { createDecisionPersistenceService } from '../src/features/decisions/application/persistence-service'
import type { DecisionRepository, DecisionRow } from '../src/features/decisions/application/ports'
import type { InvestmentDecisionRecord } from '../src/types/decision'

async function main() {
  await testPitchServiceWithFakeRepository()
  await testDecisionServiceWithFakeRepository()
  console.log('Repository application-service tests passed')
}

async function testPitchServiceWithFakeRepository() {
  const rows = new Map<string, PitchRow>()
  rows.set('nvda-pitch', pitchRow('nvda-pitch'))
  const repository: PitchRepository = {
    isAvailable: () => true,
    list: async () => [...rows.values()],
    findLatest: async () => [...rows.values()].at(-1) ?? null,
    findBySlug: async slug => rows.get(slug) ?? null,
    slugExists: async slug => rows.has(slug),
    create: async input => {
      const row = { ...pitchRow(input.slug), ...input, id: `id-${input.slug}` }
      rows.set(input.slug, row)
      return row
    },
    update: async (slug, input) => {
      const current = rows.get(slug)
      if (!current) throw new Error('missing')
      const row = { ...current, ...input, updatedAt: '2026-07-10T01:00:00.000Z' }
      rows.set(slug, row)
      return row
    }
  }
  const service = createPitchPersistenceService(repository, () => 'fixed-token', () => 123)
  const created = await service.create({
    slugBase: 'NVDA Pitch',
    ticker: 'NVDA',
    companyName: 'NVIDIA',
    recommendation: 'long',
    payload: { setup: true },
    status: 'draft',
    shareEnabled: false
  })
  assert.equal(created.slug, 'nvda-pitch-2')
  assert.equal(created.shareToken, 'fixed-token')
  assert.equal(await service.findShared(created.slug, 'wrong'), null)
  await service.update(created.slug, { ...created, shareEnabled: true })
  assert.equal((await service.findShared(created.slug, 'fixed-token'))?.slug, created.slug)
}

async function testDecisionServiceWithFakeRepository() {
  const rows = new Map<string, DecisionRow>()
  rows.set('nvda-decision', decisionRow('nvda-decision'))
  const repository: DecisionRepository = {
    isAvailable: () => true,
    list: async () => [...rows.values()],
    listPublic: async () => [...rows.values()].filter(row => row.isPublic),
    findBySlug: async slug => rows.get(slug) ?? null,
    create: async (id, record) => {
      const row = decisionRow(record.slug, record, id)
      rows.set(record.slug, row)
      return row
    },
    update: async (slug, record) => {
      const row = decisionRow(slug, record, rows.get(slug)?.id)
      rows.set(slug, row)
      return row
    },
    delete: async slug => { rows.delete(slug) },
    slugExists: async slug => rows.has(slug)
  }
  const service = createDecisionPersistenceService(repository, () => 'fixed-id')
  assert.equal(await service.uniqueSlug('nvda-decision'), 'nvda-decision-2')

  const draft = decisionRecord('new-decision')
  const created = await service.create(draft)
  assert.equal(created?.id, 'fixed-id')
  await assert.rejects(
    () => service.create({ ...draft, status: 'accepted', decision: 'long' }),
    /cannot be accepted/i
  )
  await service.delete(draft)
  assert.equal(rows.has(draft.slug), false)
  await assert.rejects(
    () => service.delete({ ...draft, marketBelief: 'Not blank' }),
    /Only blank non-public watch drafts/
  )
}

function pitchRow(slug: string): PitchRow {
  return {
    id: `id-${slug}`,
    slug,
    ticker: 'NVDA',
    companyName: 'NVIDIA',
    recommendation: 'watchlist',
    status: 'draft',
    shareToken: 'fixed-token',
    shareEnabled: false,
    payload: {},
    createdAt: '2026-07-10T00:00:00.000Z',
    updatedAt: '2026-07-10T00:00:00.000Z'
  }
}

function decisionRecord(slug: string): InvestmentDecisionRecord {
  return {
    id: `id-${slug}`,
    slug,
    ticker: 'NVDA',
    companyName: 'NVIDIA',
    status: 'watch',
    decision: 'watch',
    marketBelief: '',
    variantView: '',
    evidence: [0, 1, 2].map(index => ({
      driver: `Driver ${index + 1}`,
      claim: '',
      sourcedEvidence: '',
      sourceStatus: 'missing' as const,
      whyItMatters: ''
    })),
    risk: {
      thesis: '', decidedAt: '2026-07-10T00:00:00.000Z', entry: '', entryPrice: null,
      targetPrice: null, sizing: 'small', positionSizePct: null, stop: '', stopPrice: null,
      upside: '', downside: '', timeHorizon: '1-3 months', catalystDate: '', confidence: null,
      whatWouldChangeMind: ''
    },
    invalidation: '',
    timeHorizon: '1-3 months',
    expectedReturn: null,
    downside: null,
    sourceSnapshot: null,
    outcomeReturn: null,
    lesson: '',
    isPublic: false,
    featuredRank: null,
    pmRead: {
      variantStrength: 'weak', evidenceQuality: 'partial', riskClarity: 'missing',
      whatWouldChangeMind: 'Not written.', nextCatalystDate: 'Not set.'
    },
    readiness: { canAccept: false, canClose: false, missingForAccept: [], missingForClose: [] },
    createdAt: '2026-07-10T00:00:00.000Z',
    updatedAt: '2026-07-10T00:00:00.000Z'
  }
}

function decisionRow(slug: string, record = decisionRecord(slug), id = `id-${slug}`): DecisionRow {
  return {
    id,
    slug,
    ticker: record.ticker,
    companyName: record.companyName,
    status: record.status,
    decision: record.decision,
    marketBelief: record.marketBelief,
    variantView: record.variantView,
    evidenceJson: record.evidence,
    riskJson: record.risk,
    invalidation: record.invalidation,
    timeHorizon: record.timeHorizon,
    expectedReturn: record.expectedReturn,
    downside: record.downside,
    sourceSnapshotJson: record.sourceSnapshot,
    outcomeReturn: record.outcomeReturn,
    lesson: record.lesson,
    isPublic: record.isPublic,
    featuredRank: record.featuredRank,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  }
}

void main()
