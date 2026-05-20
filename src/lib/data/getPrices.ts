import pricesJson from '@/generated/prices.json'
import type { PricePoint } from '@/types/market'

export function getPrices(): PricePoint[] {
  return pricesJson as PricePoint[]
}
