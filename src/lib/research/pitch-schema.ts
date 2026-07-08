import { z } from 'zod'

export const assumptionFormSchema = z.object({
  ticker: z.string().trim().min(1, 'Ticker is required').max(12, 'Ticker is too long').transform(value => value.toUpperCase()),
  scenario: z.enum(['bull', 'base', 'bear']),
  asOfDate: z.date(),
  revenueGrowth: z.coerce.number().min(-100).max(500),
  margin: z.coerce.number().min(-100).max(100),
  terminalMultiple: z.coerce.number().min(0).max(200),
  note: z.string().trim().min(8, 'Add a short rationale')
})

export type AssumptionFormValues = z.infer<typeof assumptionFormSchema>
export type AssumptionFormInput = z.input<typeof assumptionFormSchema>

export function defaultAssumptionValues(ticker: string, asOfDate = new Date()): AssumptionFormValues {
  return {
    ticker: ticker.toUpperCase(),
    scenario: 'base',
    asOfDate,
    revenueGrowth: 12,
    margin: 18,
    terminalMultiple: 24,
    note: 'Base case assumes sourced trend and crowding inputs remain consistent.'
  }
}
