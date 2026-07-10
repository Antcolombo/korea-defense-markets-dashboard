import type { InvestmentDecisionRecord } from '@/types/decision'
import { canDeleteDraftDecision, validateDecisionState } from '../domain/readiness'
import type { DecisionRepository, DecisionRow } from './ports'

export function createDecisionPersistenceService(
  repository: DecisionRepository,
  createId: () => string
) {
  return {
    isAvailable: () => repository.isAvailable(),
    list: (limit = 100) => repository.list(limit),
    listPublic: (limit = 8) => repository.listPublic(limit),
    findBySlug: (slug: string) => repository.findBySlug(normalizeSlug(slug)),

    async create(record: InvestmentDecisionRecord): Promise<DecisionRow | null> {
      validateDecisionState(record)
      if (!repository.isAvailable()) return null
      return repository.create(createId(), record)
    },

    async update(slug: string, record: InvestmentDecisionRecord): Promise<DecisionRow | null> {
      validateDecisionState(record)
      if (!repository.isAvailable()) return null
      return repository.update(normalizeSlug(slug), record)
    },

    async delete(record: InvestmentDecisionRecord) {
      if (!canDeleteDraftDecision(record)) throw new Error('Only blank non-public watch drafts can be deleted.')
      if (repository.isAvailable()) await repository.delete(normalizeSlug(record.slug))
      return { deleted: true, slug: record.slug }
    },

    async uniqueSlug(baseValue: string, now: () => number = Date.now) {
      const base = normalizeSlug(baseValue) || 'investment-decision'
      if (!repository.isAvailable()) return base
      for (let index = 0; index < 98; index += 1) {
        const candidate = index === 0 ? base : `${base}-${index + 1}`
        try {
          if (!await repository.slugExists(candidate)) return candidate
        } catch {
          return candidate
        }
      }
      return `${base}-${now()}`
    }
  }
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)
}
