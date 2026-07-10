import type { Prisma } from '@prisma/client'
import { getPrisma } from '@/lib/server/prisma'
import type { PitchRepository, PitchRow, PitchWriteFields } from '@/features/pitches/application/ports'

export const prismaPitchRepository: PitchRepository = {
  isAvailable() {
    return Boolean(getPrisma())
  },

  async list(limit = 100) {
    const prisma = requirePrisma()
    return prisma.stockPitch.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      take: limit
    }) as Promise<PitchRow[]>
  },

  async findLatest() {
    const prisma = requirePrisma()
    return prisma.stockPitch.findFirst({ orderBy: [{ updatedAt: 'desc' }] }) as Promise<PitchRow | null>
  },

  async findBySlug(slug) {
    const prisma = requirePrisma()
    return prisma.stockPitch.findUnique({ where: { slug } }) as Promise<PitchRow | null>
  },

  async slugExists(slug) {
    const prisma = requirePrisma()
    const row = await prisma.stockPitch.findUnique({ where: { slug }, select: { id: true } })
    return Boolean(row)
  },

  async create(input) {
    const prisma = requirePrisma()
    return prisma.stockPitch.create({
      data: {
        ...input,
        payload: input.payload as Prisma.InputJsonValue
      }
    }) as Promise<PitchRow>
  },

  async update(slug, input) {
    const prisma = requirePrisma()
    const data: PitchWriteFields & { status?: string; shareEnabled?: boolean } = input
    return prisma.stockPitch.update({
      where: { slug },
      data: {
        ticker: data.ticker,
        companyName: data.companyName,
        recommendation: data.recommendation,
        status: data.status,
        shareEnabled: data.shareEnabled,
        payload: data.payload as Prisma.InputJsonValue
      }
    }) as Promise<PitchRow>
  }
}

function requirePrisma() {
  const prisma = getPrisma()
  if (!prisma) throw new Error('DATABASE_URL is required for stock pitch persistence.')
  return prisma
}
