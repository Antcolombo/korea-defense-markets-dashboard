import type { Asset } from '@/types/asset'
import type { Event } from '@/types/event'
import type { EventReturn } from '@/types/market'

export type BacktestFilters = {
  eventCategory: string
  assetGroup: string
  returnWindow: '1D' | '5D' | '20D' | '60D'
}

export type BacktestRow = EventReturn & {
  assetName: string
  assetGroup: string
  selectedReturn: number
}

function getWindowReturn(row: EventReturn, returnWindow: BacktestFilters['returnWindow']) {
  if (returnWindow === '1D') return row.return1d
  if (returnWindow === '5D') return row.return5d
  if (returnWindow === '20D') return row.return20d
  return row.return60d
}

export function calculateAverageReturn(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function calculateMedianReturn(values: number[]) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) return (sorted[middle - 1] + sorted[middle]) / 2
  return sorted[middle]
}

export function calculateHitRate(values: number[]) {
  if (values.length === 0) return 0
  return (values.filter(value => value > 0).length / values.length) * 100
}

export function getBestPerformer(rows: BacktestRow[]) {
  return [...rows].sort((a, b) => b.selectedReturn - a.selectedReturn)[0]
}

export function getWorstPerformer(rows: BacktestRow[]) {
  return [...rows].sort((a, b) => a.selectedReturn - b.selectedReturn)[0]
}

export function runEventBacktest(events: Event[], assets: Asset[], eventReturns: EventReturn[], filters: BacktestFilters) {
  const validEventIds = events
    .filter(event => filters.eventCategory === 'All' || event.category === filters.eventCategory)
    .map(event => event.id)

  const assetByTicker = new Map(assets.map(asset => [asset.ticker, asset]))

  const rows = eventReturns
    .filter(row => validEventIds.includes(row.eventId))
    .map(row => {
      const asset = assetByTicker.get(row.ticker)
      return {
        ...row,
        assetName: asset?.name ?? row.ticker,
        assetGroup: asset?.sleeve ?? 'Other',
        selectedReturn: getWindowReturn(row, filters.returnWindow)
      }
    })
    .filter(row => filters.assetGroup === 'All' || row.assetGroup === filters.assetGroup)

  const selectedReturns = rows.map(row => row.selectedReturn)

  return {
    rows,
    averageReturn: calculateAverageReturn(selectedReturns),
    medianReturn: calculateMedianReturn(selectedReturns),
    hitRate: calculateHitRate(selectedReturns),
    bestPerformer: getBestPerformer(rows),
    worstPerformer: getWorstPerformer(rows),
    eventCount: new Set(rows.map(row => row.eventId)).size
  }
}
