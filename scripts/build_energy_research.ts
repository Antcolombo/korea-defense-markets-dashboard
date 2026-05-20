import { nowIso, readJson, writeJson } from './lib/io'
import type { PricePoint } from '../src/types/market'
import type { EnergyInventorySeasonalRow, EnergyInventorySeries, EnergyResearchRecord, EnergySourceBacklogItem, GasolineSeasonalBar, PaidEnergyFlowSeries } from '../src/types/energy'

type RawEiaSeries = {
  id: string
  ticker: string
  name: string
  unit: string
  status: string
  observations: { period: string; value: number; units?: string | null }[]
}

type RawPaidEnergySeries = {
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

const generatedAt = nowIso()

function provenance(sourceName: string, methodologyNote: string, sourceUrl = '/methodology') {
  return {
    provider: 'derived',
    sourceUrl,
    sourceName,
    retrievedAt: generatedAt,
    publishedAt: generatedAt,
    isDerived: true,
    methodologyNote,
    dataQuality: 'derived' as const
  }
}

function average(values: number[]) {
  if (values.length === 0) return null
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))
}

function month(date: string) {
  return Number(date.slice(5, 7))
}

function day(date: string) {
  return Number(date.slice(8, 10))
}

function seasonalBars(gasolinePrices: PricePoint[]): GasolineSeasonalBar[] {
  const currentYear = Math.max(...gasolinePrices.map(point => Number(point.date.slice(0, 4))))
  const seasonal = gasolinePrices
    .filter(point => {
      const year = Number(point.date.slice(0, 4))
      if (year === currentYear) return month(point.date) === 5 && day(point.date) <= 15
      return month(point.date) >= 5 && month(point.date) <= 8
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  const byYear = new Map<number, PricePoint[]>()
  for (const point of seasonal) {
    const year = Number(point.date.slice(0, 4))
    const list = byYear.get(year) ?? []
    list.push(point)
    byYear.set(year, list)
  }

  return Array.from(byYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, points]) => ({
      year,
      average: average(points.map(point => point.price)) ?? 0,
      weeks: points.length,
      sampleStart: points[0]?.date ?? '',
      sampleEnd: points.at(-1)?.date ?? '',
      isPartial: year === currentYear,
      sampleLabel: year === currentYear ? 'May 1-15 only' : 'May-Aug average',
      sourceRows: points.map(point => ({ date: point.date, value: point.price }))
    }))
    .filter(row => row.weeks > 0)
}

function eiaInventorySeries(rawSeries: RawEiaSeries[]): EnergyInventorySeries[] {
  return rawSeries
    .filter(series => series.status === 'source')
    .map(series => ({
      id: series.id,
      ticker: series.ticker,
      name: series.name,
      unit: series.unit,
      observations: series.observations
        .map(row => ({ date: row.period, value: Number(row.value) }))
        .filter(row => row.date && Number.isFinite(row.value))
        .sort((a, b) => a.date.localeCompare(b.date))
    }))
    .filter(series => series.observations.length > 0)
}

function dayOfYear(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`)
  const start = new Date(`${date.slice(0, 4)}-01-01T00:00:00Z`)
  return Math.floor((parsed.getTime() - start.getTime()) / 86400000) + 1
}

function inventorySeasonalRows(series: EnergyInventorySeries | null): { rows: EnergyInventorySeasonalRow[]; years: number[] } {
  if (!series) return { rows: [], years: [] }
  const years = Array.from(new Set(series.observations.map(row => Number(row.date.slice(0, 4)))))
    .sort((a, b) => a - b)
    .slice(-6)
  const rowsByDay = new Map<number, EnergyInventorySeasonalRow>()

  for (const point of series.observations) {
    const year = Number(point.date.slice(0, 4))
    if (!years.includes(year)) continue
    const doy = dayOfYear(point.date)
    const row = rowsByDay.get(doy) ?? { dayOfYear: doy, label: point.date.slice(5) }
    row[String(year)] = point.value
    rowsByDay.set(doy, row)
  }

  return { rows: Array.from(rowsByDay.values()).sort((a, b) => a.dayOfYear - b.dayOfYear), years }
}

function energyBacklog(inventorySeries: EnergyInventorySeries[], rawEiaStatus?: string): EnergySourceBacklogItem[] {
  const sourcedTickers = new Set(inventorySeries.map(series => series.ticker))
  const backlog: EnergySourceBacklogItem[] = []

  for (const item of [
    ['US_GASOLINE_STOCKS', 'U.S. gasoline inventories', 'EIA Open Data', rawEiaStatus === 'not_configured' ? 'EIA_API_KEY is not configured.' : 'EIA series did not return sourced observations.'],
    ['US_CRUDE_STOCKS_EX_SPR', 'U.S. crude inventories excluding SPR', 'EIA Open Data', rawEiaStatus === 'not_configured' ? 'EIA_API_KEY is not configured.' : 'EIA series did not return sourced observations.'],
    ['US_DISTILLATE_STOCKS', 'U.S. distillate inventories', 'EIA Open Data', rawEiaStatus === 'not_configured' ? 'EIA_API_KEY is not configured.' : 'EIA series did not return sourced observations.']
  ] as const) {
    if (!sourcedTickers.has(item[0])) {
      backlog.push({ name: item[1], providerTarget: item[2], reasonBlocked: item[3], status: 'Not yet sourced' })
    }
  }

  return backlog
}

function paidFlowSeries(rawSeries: RawPaidEnergySeries[]): PaidEnergyFlowSeries[] {
  return rawSeries.map(series => ({
    ticker: series.ticker,
    name: series.name,
    unit: series.unit,
    providerTarget: series.providerTarget,
    status: series.status,
    observations: (series.observations ?? [])
      .map(row => ({
        date: row.date,
        value: Number(row.value),
        provider: row.provider,
        sourceName: row.sourceName,
        sourceUrl: row.sourceUrl
      }))
      .filter(row => row.date && Number.isFinite(row.value))
      .sort((a, b) => a.date.localeCompare(b.date))
  }))
}

function paidFlowBacklog(series: PaidEnergyFlowSeries[]): EnergySourceBacklogItem[] {
  return series
    .filter(item => item.observations.length === 0)
    .map(item => ({
      name: item.name,
      providerTarget: item.providerTarget,
      reasonBlocked: `No private export found in data/private/energy-flows for ${item.ticker}.`,
      status: 'Not yet sourced' as const
    }))
}

async function main() {
  const prices = await readJson<PricePoint[]>('src/generated/prices.json', [])
  const rawEia = await readJson<{ status?: string; series?: RawEiaSeries[] }>('src/generated/raw/energy.eia.json', {})
  const rawPrivate = await readJson<{ status?: string; series?: RawPaidEnergySeries[] }>('src/generated/raw/energy.private.json', {})
  const gasolinePrices = prices
    .filter(point => point.ticker === 'GASOLINE')
    .sort((a, b) => a.date.localeCompare(b.date))

  if (gasolinePrices.length === 0) {
    throw new Error('Energy research build requires sourced GASOLINE price observations from FRED GASREGW.')
  }

  const bars = seasonalBars(gasolinePrices)
  const currentYear = Math.max(...bars.map(row => row.year))
  const priorFive = bars.filter(row => row.year >= currentYear - 5 && row.year < currentYear && !row.isPartial).slice(-5)
  const current = bars.find(row => row.year === currentYear) ?? null
  const fiveYearAverage = average(priorFive.map(row => row.average))
  const currentAverage = current?.average ?? null
  const inventorySeries = eiaInventorySeries(rawEia.series ?? [])
  const privateFlows = paidFlowSeries(rawPrivate.series ?? [])
  const gasolineInventory = inventorySeries.find(series => series.ticker === 'US_GASOLINE_STOCKS') ?? null
  const seasonalInventory = inventorySeasonalRows(gasolineInventory)

  const record: EnergyResearchRecord = {
    ...provenance('Energy research dataset', 'Retail gasoline seasonality is derived from FRED GASREGW. Petroleum inventories hydrate from EIA when EIA_API_KEY is configured. Paid global flow datasets remain explicit backlog items.'),
    id: 'us-retail-gasoline-seasonality',
    title: 'U.S. retail gasoline seasonality and petroleum inventory coverage',
    unit: 'dollars per gallon',
    latestObservation: gasolinePrices.at(-1) ? { date: gasolinePrices.at(-1)!.date, value: gasolinePrices.at(-1)!.price } : null,
    currentSampleLabel: `${currentYear} is May 1-15 only`,
    seasonalBars: bars.slice(-8),
    fiveYearAverage,
    currentAverage,
    spreadToFiveYear: fiveYearAverage !== null && currentAverage !== null ? Number((currentAverage - fiveYearAverage).toFixed(2)) : null,
    inventorySeries,
    inventorySeasonalRows: seasonalInventory.rows,
    inventorySeasonalYears: seasonalInventory.years,
    paidFlowSeries: privateFlows,
    sourceBacklog: [...energyBacklog(inventorySeries, rawEia.status), ...paidFlowBacklog(privateFlows)]
  }

  await writeJson('src/generated/energyResearch.json', [record])
  console.log(`Built energy research dataset: ${gasolinePrices.length} gasoline observations, ${inventorySeries.length} EIA inventory series`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
