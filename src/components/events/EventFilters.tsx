import type { EventFiltersState } from '@/lib/filters'
import { EVENT_CATEGORIES } from '@/lib/constants'

type EventFiltersProps = {
  filters: EventFiltersState
  regions: string[]
  countries: string[]
  assets: string[]
  onChange: (filters: EventFiltersState) => void
}

function updateFilter(filters: EventFiltersState, key: keyof EventFiltersState, value: string) {
  return {
    ...filters,
    [key]: value
  }
}

export function EventFilters({ filters, regions, countries, assets, onChange }: EventFiltersProps) {
  const contextTags = ['korea-linked', 'regional', 'security-event', 'macro-context', 'defense-readthrough', 'watchlist-context']

  return (
    <div className="workbench-control-grid md:grid-cols-2 xl:grid-cols-4">
      <label className="workbench-field">
        Region
        <select className="workbench-input" value={filters.region} onChange={event => onChange(updateFilter(filters, 'region', event.target.value))}>
          <option>All</option>
          {regions.map(region => <option key={region}>{region}</option>)}
        </select>
      </label>
      <label className="workbench-field">
        Country
        <select className="workbench-input" value={filters.country} onChange={event => onChange(updateFilter(filters, 'country', event.target.value))}>
          <option>All</option>
          {countries.map(country => <option key={country}>{country}</option>)}
        </select>
      </label>
      <label className="workbench-field">
        Category
        <select className="workbench-input" value={filters.category} onChange={event => onChange(updateFilter(filters, 'category', event.target.value))}>
          <option>All</option>
          {EVENT_CATEGORIES.map(category => <option key={category}>{category}</option>)}
        </select>
      </label>
      <label className="workbench-field">
        Affected Asset
        <select className="workbench-input" value={filters.asset} onChange={event => onChange(updateFilter(filters, 'asset', event.target.value))}>
          <option>All</option>
          {assets.map(asset => <option key={asset}>{asset}</option>)}
        </select>
      </label>
      <label className="workbench-field">
        Context Tag
        <select className="workbench-input" value={filters.context} onChange={event => onChange(updateFilter(filters, 'context', event.target.value))}>
          <option>All</option>
          {contextTags.map(tag => <option key={tag}>{tag}</option>)}
        </select>
      </label>
      <label className="workbench-field">
        Verified / Source
        <select className="workbench-input" value={filters.verified} onChange={event => onChange(updateFilter(filters, 'verified', event.target.value))}>
          <option value="All">All</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
      </label>
    </div>
  )
}
