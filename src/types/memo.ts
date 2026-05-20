import type { RiskLevel } from './theme'
import type { Provenance } from './provenance'

export type Memo = Provenance & {
  id: string
  date: string
  title: string
  researchPriority: number
  riskLevel: RiskLevel
  topEvents: string[]
  marketReaction: string
  themeUpdate: string
  watchlist: string[]
  investmentImplication: string
  whatToWatchNext: string[]
  sources: string[]
}
