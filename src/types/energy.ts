import type { Provenance } from './provenance'

export type EnergySourceBacklogItem = {
  name: string
  providerTarget: string
  reasonBlocked: string
  status: 'Not yet sourced'
}

export type GasolineSeasonalBar = {
  year: number
  average: number
  weeks: number
  sampleStart: string
  sampleEnd: string
  isPartial: boolean
  sampleLabel: string
  sourceRows: { date: string; value: number }[]
}

export type EnergyInventorySeries = {
  id: string
  ticker: string
  name: string
  unit: string
  observations: { date: string; value: number }[]
}

export type PaidEnergyFlowSeries = {
  ticker: string
  name: string
  unit: string
  providerTarget: string
  status: string
  observations: {
    date: string
    value: number
    provider: string
    sourceName: string
    sourceUrl: string
  }[]
}

export type EnergyInventorySeasonalRow = {
  dayOfYear: number
  label: string
  [year: string]: string | number | undefined
}

export type EnergyResearchRecord = Provenance & {
  id: string
  title: string
  unit: string
  latestObservation: { date: string; value: number } | null
  currentSampleLabel: string
  seasonalBars: GasolineSeasonalBar[]
  fiveYearAverage: number | null
  currentAverage: number | null
  spreadToFiveYear: number | null
  inventorySeries: EnergyInventorySeries[]
  inventorySeasonalRows: EnergyInventorySeasonalRow[]
  inventorySeasonalYears: number[]
  paidFlowSeries: PaidEnergyFlowSeries[]
  sourceBacklog: EnergySourceBacklogItem[]
}
