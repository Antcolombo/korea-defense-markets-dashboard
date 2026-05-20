import eventReturnsJson from '@/generated/eventReturns.json'
import type { EventReturn } from '@/types/market'

export function getEventReturns(): EventReturn[] {
  return eventReturnsJson as EventReturn[]
}
