import eventsJson from '@/generated/events.json'
import type { Event } from '@/types/event'

export function getEvents(): Event[] {
  return eventsJson as Event[]
}
