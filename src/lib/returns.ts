import type { Asset } from '@/types/asset'

export function calculateReturn(startPrice: number, endPrice: number) {
  if (startPrice === 0) return 0
  return ((endPrice - startPrice) / startPrice) * 100
}

export function formatReturn(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A'
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${value.toFixed(1)}%`
}

export function getReturnClass(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'text-[var(--text-secondary)]'
  if (value > 0.5) return 'text-good'
  if (value < -0.5) return 'text-danger'
  return 'text-muted'
}

export function formatAssetMove(asset: Pick<Asset, 'assetClass'> | null | undefined, value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A'
  if (!asset || asset.assetClass === 'equity' || asset.assetClass === 'etf') return formatReturn(value)
  const prefix = value > 0 ? '+' : ''
  if (asset.assetClass === 'rate') return `${prefix}${value.toFixed(2)} pp`
  return `${prefix}${value.toFixed(1)} pts`
}
