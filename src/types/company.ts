import type { Provenance } from './provenance'

export type Company = Provenance & {
  ticker: string
  name: string
  country: string
  sector: string
  exchange: string
  description: string
  defenseExposure: string
  catalysts: string[]
  risks: string[]
  relatedThemes: string[]
  valuationSnapshot: string
  researchStatus: string
}
