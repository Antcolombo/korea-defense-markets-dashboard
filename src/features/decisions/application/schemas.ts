import { z } from 'zod'
import type { UpsertInvestmentDecisionInput } from '@/features/decisions/contracts'

const tickerSchema = z.string().trim().min(1).max(12).transform(value => value.toUpperCase())

const decisionInputSchema = z.object({
  ticker: tickerSchema.optional(),
  companyName: z.string().trim().max(200).optional(),
  status: z.enum(['watch', 'accepted', 'rejected', 'closed']).optional(),
  decision: z.enum(['long', 'short', 'watch', 'pass']).optional(),
  marketBelief: z.string().optional(),
  variantView: z.string().optional(),
  invalidation: z.string().optional(),
  expectedReturn: z.number().nullable().optional(),
  downside: z.number().nullable().optional(),
  outcomeReturn: z.number().nullable().optional(),
  lesson: z.string().optional(),
  isPublic: z.boolean().optional()
}).passthrough().transform(value => value as UpsertInvestmentDecisionInput)

export const createDecisionBodySchema = z.object({
  ticker: tickerSchema.optional(),
  companyName: z.string().trim().max(200).optional(),
  decision: decisionInputSchema.optional()
})

export const updateDecisionBodySchema = z.object({
  decision: decisionInputSchema.optional(),
  refreshSources: z.boolean().optional()
})
