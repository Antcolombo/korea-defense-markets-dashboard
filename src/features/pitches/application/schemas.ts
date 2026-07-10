import { z } from 'zod'
import type { StockPitch } from '@/types/pitch'

const tickerSchema = z.string().trim().min(1).max(12).transform(value => value.toUpperCase())

const stockPitchSchema = z.object({
  id: z.string().min(1),
  thesis: z.string(),
  evidenceDrivers: z.array(z.unknown()),
  setup: z.object({
    ticker: tickerSchema,
    companyName: z.string(),
    date: z.string(),
    recommendation: z.enum(['long', 'short', 'watchlist', 'no-trade'])
  }).passthrough(),
  variantView: z.object({}).passthrough(),
  positioning: z.object({}).passthrough(),
  catalysts: z.array(z.unknown()),
  model: z.object({}).passthrough(),
  valuation: z.object({}).passthrough(),
  tradeStructure: z.object({}).passthrough(),
  redTeam: z.object({}).passthrough(),
  sourceEvidence: z.array(z.unknown()),
  readiness: z.object({}).passthrough()
}).passthrough().transform(value => value as unknown as StockPitch)

export const createPitchBodySchema = z.object({
  ticker: tickerSchema.optional(),
  companyName: z.string().trim().max(200).optional(),
  analyst: z.string().trim().max(200).optional(),
  pitch: stockPitchSchema.optional()
})

export const updatePitchBodySchema = z.object({
  pitch: stockPitchSchema,
  status: z.enum(['draft', 'review', 'published', 'archived']).optional(),
  shareEnabled: z.boolean().optional()
})
