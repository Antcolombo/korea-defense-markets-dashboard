import type { Provenance } from './provenance'

export type RiskLevel = 'Low' | 'Watch' | 'Elevated' | 'High' | 'Crisis'

export type Theme = Provenance & {
  id: string
  name: string
  description: string
  marketChannels: string[]
  relatedAssets: string[]
  relatedCompanies: string[]
  currentRiskLevel: RiskLevel
  investmentImplication: string
  keyCatalysts?: string[]
  keyRisks?: string[]
}
