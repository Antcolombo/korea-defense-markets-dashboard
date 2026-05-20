import type { Provenance } from './provenance'

export type EventReturn = Provenance & {
  eventId: string
  ticker: string
  eventCategory: string
  return1d: number
  return5d: number
  return20d: number
  return60d: number
  interpretation: string
}

export type PricePoint = Provenance & {
  date: string
  ticker: string
  price: number
  returnValue: number
}
