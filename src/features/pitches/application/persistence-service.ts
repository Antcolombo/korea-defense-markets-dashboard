import type { PitchRepository, PitchRow, PitchWriteFields } from './ports'

export type NewPitchPersistenceInput = PitchWriteFields & {
  slugBase: string
  status: string
  shareEnabled: boolean
}

export type UpdatePitchPersistenceInput = PitchWriteFields & {
  status?: string
  shareEnabled?: boolean
}

export function createPitchPersistenceService(
  repository: PitchRepository,
  generateToken: () => string,
  now: () => number = Date.now
) {
  return {
    isAvailable: () => repository.isAvailable(),
    list: (limit = 100) => repository.list(limit),
    findLatest: () => repository.findLatest(),
    findBySlug: (slug: string) => repository.findBySlug(slug),

    async findShared(slug: string, token: string | undefined): Promise<PitchRow | null> {
      if (!token) return null
      const row = await repository.findBySlug(slug)
      return row?.shareEnabled && row.shareToken === token ? row : null
    },

    async create(input: NewPitchPersistenceInput): Promise<PitchRow> {
      const slug = await uniqueSlug(repository, normalizeSlug(input.slugBase), now)
      return repository.create({
        ticker: input.ticker,
        companyName: input.companyName,
        recommendation: input.recommendation,
        payload: input.payload,
        slug,
        status: input.status,
        shareToken: generateToken(),
        shareEnabled: input.shareEnabled
      })
    },

    update(slug: string, input: UpdatePitchPersistenceInput) {
      return repository.update(normalizeSlug(slug), input)
    }
  }
}

async function uniqueSlug(repository: PitchRepository, baseValue: string, now: () => number) {
  const base = baseValue || 'stock-pitch'
  for (let index = 0; index < 50; index += 1) {
    const candidate = index === 0 ? base : `${base}-${index + 1}`
    if (!await repository.slugExists(candidate)) return candidate
  }
  return `${base}-${now()}`
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)
}
