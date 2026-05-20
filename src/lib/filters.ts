import type { Event } from '@/types/event'

export type EventFiltersState = {
  region: string
  country: string
  category: string
  context: string
  asset: string
  verified: string
}

export const defaultEventFilters: EventFiltersState = {
  region: 'All',
  country: 'All',
  category: 'All',
  context: 'All',
  asset: 'All',
  verified: 'All'
}

export function filterEvents(events: Event[], filters: EventFiltersState) {
  return events.filter(event => {
    const matchesRegion = filters.region === 'All' || event.region === filters.region
    const matchesCountry = filters.country === 'All' || event.country === filters.country
    const matchesCategory = filters.category === 'All' || event.category === filters.category
    const matchesContext = filters.context === 'All' || event.sourceContext.includes(filters.context)
    const matchesAsset = filters.asset === 'All' || event.affectedAssets.includes(filters.asset)
    const matchesVerified = filters.verified === 'All' || String(event.verified) === filters.verified

    return matchesRegion && matchesCountry && matchesCategory && matchesContext && matchesAsset && matchesVerified
  })
}
