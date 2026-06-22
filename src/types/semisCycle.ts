import type { Provenance } from './provenance'

export type SemisCycleRecord = Provenance & {
  date: string
  layer: 'price_tape' | 'fundamentals_cycle'
  title: string
  status: 'sourced' | 'proxy' | 'not_configured'
  signal: string
  evidence: string[]
  soxx5d: number | null
  smh5d: number | null
  nvda5d: number | null
  tsm5d: number | null
  mu5d: number | null
  samsung5d: number | null
  skHynix5d: number | null
  sourceBacklog: string[]
}
