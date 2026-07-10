import type { ResearchDataMode } from '@/contracts/data'

export type { ResearchDataMode } from '@/contracts/data'

export type ResearchDataModeConfig = {
  mode: ResearchDataMode
  asOfDate: string | null
}

export function resolveResearchDataMode(env: NodeJS.ProcessEnv = process.env): ResearchDataModeConfig {
  const requested = env.RESEARCH_DATA_MODE?.trim().toLowerCase()
  const asOfDate = normalizeAsOfDate(env.DEMO_AS_OF_DATE)
  const mode = requested ? parseMode(requested) : asOfDate ? 'snapshot' : 'live'
  if (mode === 'snapshot' && !asOfDate) {
    throw new Error('RESEARCH_DATA_MODE=snapshot requires DEMO_AS_OF_DATE=YYYY-MM-DD.')
  }
  return { mode, asOfDate: mode === 'snapshot' ? asOfDate : null }
}

export function researchSnapshotCutoff(env: NodeJS.ProcessEnv = process.env) {
  const config = resolveResearchDataMode(env)
  return config.mode === 'snapshot' && config.asOfDate
    ? new Date(`${config.asOfDate}T23:59:59.999Z`)
    : null
}

function parseMode(value: string): ResearchDataMode {
  if (value === 'live' || value === 'snapshot' || value === 'generated') return value
  throw new Error(`Invalid RESEARCH_DATA_MODE=${value}. Expected live, snapshot, or generated.`)
}

function normalizeAsOfDate(value: string | undefined) {
  const normalized = value?.trim()
  if (!normalized) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error('DEMO_AS_OF_DATE must use YYYY-MM-DD format.')
  }
  const date = new Date(`${normalized}T00:00:00.000Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== normalized) {
    throw new Error('DEMO_AS_OF_DATE must be a valid calendar date.')
  }
  return normalized
}
