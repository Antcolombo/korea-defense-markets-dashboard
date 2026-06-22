import type { Provenance } from './provenance'

export type KoreaStressDriver = 'FX-only' | 'Equity-flow driven' | 'Rates-driven' | 'Broad macro stress' | 'Quiet / mixed'

export type KoreaMacroSummary = Provenance & {
  date: string
  stressDriver: KoreaStressDriver
  summary: string
  usdKrw5d: number | null
  kr10y5d: number | null
  foreignEquityFlowKrwBn: number | null
  bokBaseRate: number | null
  currentAccountUsdBn: number | null
  tradeBalanceUsdBn: number | null
  krwPressureIndicators: string[]
  sourceBacklog: string[]
}
