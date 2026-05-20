import assetsJson from '@/generated/assets.json'
import type { Asset } from '@/types/asset'

export function getAssets(): Asset[] {
  return assetsJson as Asset[]
}

export function getAsset(ticker: string) {
  return getAssets().find(asset => asset.ticker.toLowerCase() === ticker.toLowerCase())
}
