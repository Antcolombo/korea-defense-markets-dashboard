import type { EventCategory } from '@/types/event'

export const DISCLAIMER = 'This project uses public information only. It does not use classified, restricted, confidential, or material nonpublic information. It is a research workbench for market decision support and is not investment advice or a recommendation to buy or sell securities.'

export const EVENT_CATEGORIES: EventCategory[] = [
  'NORTH_KOREA_MISSILE',
  'NORTH_KOREA_NUCLEAR',
  'DPRK_BORDER_ACTIVITY',
  'US_ROK_EXERCISE',
  'US_ROK_JAPAN_TRILATERAL',
  'DEFENSE_BUDGET',
  'DEFENSE_PROCUREMENT',
  'KOREAN_DEFENSE_EXPORTS',
  'CHINA_TAIWAN_SECURITY',
  'SEMICONDUCTOR_EXPORT_CONTROLS',
  'SANCTIONS',
  'SHIPPING_NAVAL_RISK',
  'OIL_ENERGY_SECURITY',
  'ELECTION_POLICY',
  'CYBER_SECURITY',
  'DIPLOMATIC_DEVELOPMENT'
]

export const RETURN_WINDOWS = ['1D', '5D', '20D', '60D'] as const
