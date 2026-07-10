import { getPrisma } from '@/lib/server/prisma'
import { researchSnapshotCutoff } from '@/platform/data/data-mode'
import type { ProviderRunAudit, ProviderRunRepository } from '@/platform/persistence/ports'

type ProviderRunRow = {
  provider: string
  source: string
  startedAt: Date
  finishedAt: Date | null
  rowsIngested: number
  errorMessage: string | null
  metadata: unknown
  dataStatus: string
}

export class PrismaProviderRunRepository implements ProviderRunRepository {
  async getAudit(): Promise<ProviderRunAudit> {
    const prisma = getPrisma()
    if (!prisma) return unavailableAudit()
    const cutoff = researchSnapshotCutoff()
    try {
      const where = cutoff ? { asOfDate: { lte: cutoff } } : undefined
      const [latest, successful] = await Promise.all([
        prisma.providerRun.findFirst({ where, orderBy: { startedAt: 'desc' } }),
        prisma.providerRun.findFirst({
          where: { ...where, dataStatus: 'AVAILABLE' },
          orderBy: { finishedAt: 'desc' }
        })
      ]) as [ProviderRunRow | null, ProviderRunRow | null]
      if (!latest) return unavailableAudit()
      const metadata = objectRecord(latest.metadata)
      return {
        latestAttemptAt: latest.startedAt.toISOString(),
        lastSuccessfulAt: successful?.finishedAt?.toISOString() ?? null,
        latestStatus: lifecycle(latest, metadata),
        provider: latest.provider,
        dataset: latest.source,
        rowsIngested: latest.rowsIngested,
        errorCategory: stringValue(metadata.errorCategory) ?? (latest.errorMessage ? 'provider_failure' : null)
      }
    } catch {
      return unavailableAudit()
    }
  }
}

export const providerRunRepository = new PrismaProviderRunRepository()

function lifecycle(row: ProviderRunRow, metadata: Record<string, unknown>) {
  const recorded = stringValue(metadata.lifecycle)
  if (recorded === 'running' || recorded === 'succeeded' || recorded === 'partial' || recorded === 'failed') return recorded
  if (!row.finishedAt) return 'running'
  if (row.dataStatus === 'AVAILABLE') return 'succeeded'
  if (row.dataStatus === 'PARTIAL') return 'partial'
  return 'failed'
}

function unavailableAudit(): ProviderRunAudit {
  return {
    latestAttemptAt: null,
    lastSuccessfulAt: null,
    latestStatus: 'unavailable',
    provider: null,
    dataset: null,
    rowsIngested: 0,
    errorCategory: null
  }
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value ? value : null
}
