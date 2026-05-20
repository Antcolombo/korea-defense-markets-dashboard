import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/ui/Section'
import { EventFilters } from '@/components/events/EventFilters'
import { EventTable } from '@/components/events/EventTable'
import { EventDetailPanel } from '@/components/events/EventDetailPanel'
import { DataBuildFailure } from '@/components/ui/DataBuildFailure'
import { getEvents } from '@/lib/data/getEvents'
import { defaultEventFilters, filterEvents } from '@/lib/filters'

export function EventsPage() {
  const events = getEvents()
  const [filters, setFilters] = useState(defaultEventFilters)
  const [selectedEvent, setSelectedEvent] = useState(events[0] ?? null)
  const regions = useMemo(() => Array.from(new Set(events.map(event => event.region))).sort(), [events])
  const countries = useMemo(() => Array.from(new Set(events.map(event => event.country))).sort(), [events])
  const assets = useMemo(() => Array.from(new Set(events.flatMap(event => event.affectedAssets))).sort(), [events])
  const filteredEvents = filterEvents(events, filters)

  return (
    <>
      <PageHeader
        eyebrow="Event tape"
        title="Public-Source Event Tape"
        description="Filter sourced Korea and Indo-Pacific events that may affect USD/KRW, Korea beta, semis, A&D, and global risk overlays."
      />
      <Section>
        <EventFilters filters={filters} regions={regions} countries={countries} assets={assets} onChange={setFilters} />
      </Section>
      <Section className="pt-0">
        <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
          <div className="min-w-0">
            {filteredEvents.length > 0 ? <EventTable events={filteredEvents} selectedId={selectedEvent?.id ?? ''} onSelect={setSelectedEvent} /> : <DataBuildFailure title="No event records passed strict source mode" />}
          </div>
          <div className="min-w-0">
            {selectedEvent ? <EventDetailPanel event={selectedEvent} /> : <DataBuildFailure title="No selected sourced event" />}
          </div>
        </div>
      </Section>
    </>
  )
}

export default EventsPage
