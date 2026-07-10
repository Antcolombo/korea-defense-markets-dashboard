import type { PricePoint } from '@/types/market'

export type ChartPricePoint = Pick<PricePoint, 'date' | 'ticker' | 'price'>
