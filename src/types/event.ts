import type { Provenance } from './provenance'

export type EventCategory =
  | 'NORTH_KOREA_MISSILE'
  | 'NORTH_KOREA_NUCLEAR'
  | 'DPRK_BORDER_ACTIVITY'
  | 'US_ROK_EXERCISE'
  | 'US_ROK_JAPAN_TRILATERAL'
  | 'DEFENSE_BUDGET'
  | 'DEFENSE_PROCUREMENT'
  | 'KOREAN_DEFENSE_EXPORTS'
  | 'CHINA_TAIWAN_SECURITY'
  | 'SEMICONDUCTOR_EXPORT_CONTROLS'
  | 'SANCTIONS'
  | 'SHIPPING_NAVAL_RISK'
  | 'OIL_ENERGY_SECURITY'
  | 'ELECTION_POLICY'
  | 'CYBER_SECURITY'
  | 'DIPLOMATIC_DEVELOPMENT'

export type Event = Provenance & {
  id: string
  date: string
  title: string
  summary: string
  region: string
  country: string
  category: EventCategory
  sourceContext: string[]
  priceConfirmationRequired: boolean
  eventUse: string
  affectedAssets: string[]
  affectedThemes: string[]
  analystNote: string
  verified: boolean
}
