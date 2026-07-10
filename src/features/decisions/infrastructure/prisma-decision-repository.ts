import { Prisma } from '@prisma/client'
import { getPrisma } from '@/lib/server/prisma'
import type { DecisionRepository, DecisionRow } from '@/features/decisions/application/ports'

export const prismaDecisionRepository: DecisionRepository = {
  isAvailable: () => Boolean(getPrisma()),

  async list(limit = 100) {
    return requirePrisma().$queryRaw<DecisionRow[]>(Prisma.sql`
      SELECT * FROM "InvestmentDecision" ORDER BY "updatedAt" DESC LIMIT ${limit}
    `)
  },

  async listPublic(limit = 8) {
    return requirePrisma().$queryRaw<DecisionRow[]>(Prisma.sql`
      SELECT * FROM "InvestmentDecision"
      WHERE "isPublic" = true
      ORDER BY "featuredRank" ASC NULLS LAST, "updatedAt" DESC
      LIMIT ${limit}
    `)
  },

  async findBySlug(slug) {
    const rows = await requirePrisma().$queryRaw<DecisionRow[]>(Prisma.sql`
      SELECT * FROM "InvestmentDecision" WHERE "slug" = ${slug} LIMIT 1
    `)
    return rows[0] ?? null
  },

  async create(id, record) {
    const evidenceJson = JSON.stringify(record.evidence)
    const riskJson = JSON.stringify(record.risk)
    const sourceJson = record.sourceSnapshot ? JSON.stringify(record.sourceSnapshot) : null
    const rows = await requirePrisma().$queryRaw<DecisionRow[]>(Prisma.sql`
      INSERT INTO "InvestmentDecision" (
        "id", "slug", "ticker", "companyName", "status", "decision",
        "marketBelief", "variantView", "evidenceJson", "riskJson", "invalidation",
        "timeHorizon", "expectedReturn", "downside", "sourceSnapshotJson",
        "outcomeReturn", "lesson", "isPublic", "featuredRank", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${record.slug}, ${record.ticker}, ${record.companyName}, ${record.status}, ${record.decision},
        ${record.marketBelief}, ${record.variantView}, ${evidenceJson}::jsonb, ${riskJson}::jsonb, ${record.invalidation},
        ${record.timeHorizon || null}, ${record.expectedReturn}, ${record.downside},
        ${sourceJson ? Prisma.sql`${sourceJson}::jsonb` : Prisma.sql`NULL`},
        ${record.outcomeReturn}, ${record.lesson || null}, ${record.isPublic}, ${record.featuredRank}, NOW(), NOW()
      ) RETURNING *
    `)
    return rows[0]
  },

  async update(slug, record) {
    const evidenceJson = JSON.stringify(record.evidence)
    const riskJson = JSON.stringify(record.risk)
    const sourceJson = record.sourceSnapshot ? JSON.stringify(record.sourceSnapshot) : null
    const rows = await requirePrisma().$queryRaw<DecisionRow[]>(Prisma.sql`
      UPDATE "InvestmentDecision" SET
        "ticker" = ${record.ticker}, "companyName" = ${record.companyName},
        "status" = ${record.status}, "decision" = ${record.decision},
        "marketBelief" = ${record.marketBelief}, "variantView" = ${record.variantView},
        "evidenceJson" = ${evidenceJson}::jsonb, "riskJson" = ${riskJson}::jsonb,
        "invalidation" = ${record.invalidation}, "timeHorizon" = ${record.timeHorizon || null},
        "expectedReturn" = ${record.expectedReturn}, "downside" = ${record.downside},
        "sourceSnapshotJson" = ${sourceJson ? Prisma.sql`${sourceJson}::jsonb` : Prisma.sql`NULL`},
        "outcomeReturn" = ${record.outcomeReturn}, "lesson" = ${record.lesson || null},
        "isPublic" = ${record.isPublic}, "featuredRank" = ${record.featuredRank}, "updatedAt" = NOW()
      WHERE "slug" = ${slug} RETURNING *
    `)
    return rows[0]
  },

  async delete(slug) {
    await requirePrisma().$executeRaw(Prisma.sql`DELETE FROM "InvestmentDecision" WHERE "slug" = ${slug}`)
  },

  async slugExists(slug) {
    return Boolean(await this.findBySlug(slug))
  }
}

function requirePrisma() {
  const prisma = getPrisma()
  if (!prisma) throw new Error('DATABASE_URL is required for investment decision persistence.')
  return prisma
}
