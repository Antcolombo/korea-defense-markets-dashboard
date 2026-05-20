import type { Provenance } from './provenance'

export type AssetClass = 'equity' | 'etf' | 'fx' | 'rate' | 'commodity' | 'index'

export type Asset = Provenance & {
  ticker: string
  name: string
  assetClass: AssetClass
  country: string
  sector: string
  group: string
  sleeve: string
  themes: string[]
  description: string
  return1d: number | null
  return5d: number | null
  return20d: number | null
  returnYtd: number | null
  relatedEventCount: number | null
  riskSensitivity: number | null
  notes?: string
}
