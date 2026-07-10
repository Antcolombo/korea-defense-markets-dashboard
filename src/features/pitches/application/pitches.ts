import { buildPitchFromReport, buildPitchFromTemplate } from '@/features/pitches/domain/builder'
import { pitchTemplate } from '@/features/pitches/domain/template'
import { getStockReport } from '@/lib/research/repository'
import { buildStockPitchSourceSnapshot } from '@/lib/research/stockPitchSources'
import type { StockPitch, StockPitchStatus } from '@/types/pitch'

export type CreateStockPitchInput = {
  ticker?: string
  companyName?: string
  analyst?: string
  pitch?: StockPitch
}

export type UpdateStockPitchInput = {
  pitch: StockPitch
  status?: StockPitchStatus
  shareEnabled?: boolean
}

export async function buildPitchFromSourcedContext(input: CreateStockPitchInput = {}): Promise<StockPitch> {
  if (input.pitch) return buildPitchFromTemplate(input)
  const ticker = normalizeTicker(input.ticker || pitchTemplate.setup.ticker)
  try {
    const report = await getStockReport(ticker)
    const sourceSnapshot = await buildStockPitchSourceSnapshot(ticker, report)
    return buildPitchFromReport(report, input, sourceSnapshot)
  } catch (error) {
    console.warn(`Sourced pitch context unavailable for ${ticker}; using template. ${describeError(error)}`)
    return buildPitchFromTemplate(input)
  }
}

export { buildPitchFromReport, buildPitchFromTemplate }

function normalizeTicker(value: string | undefined) {
  return (value || 'HOOD').trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '').slice(0, 12) || 'HOOD'
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}
