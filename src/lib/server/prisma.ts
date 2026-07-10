import { PrismaClient } from '@prisma/client'
import { resolveResearchDataMode } from '@/platform/data/data-mode'

declare global {
  var __flowPrisma: PrismaClient | undefined
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim())
}

export function getPrisma() {
  if (resolveResearchDataMode().mode === 'generated') return null
  if (!hasDatabaseUrl()) return null
  if (!globalThis.__flowPrisma) {
    globalThis.__flowPrisma = new PrismaClient()
  }
  return globalThis.__flowPrisma
}
