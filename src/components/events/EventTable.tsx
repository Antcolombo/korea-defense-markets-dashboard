import type { Event } from '@/types/event'
import { formatCategory, formatDate } from '@/lib/formatters'

type EventTableProps = {
  events: Event[]
  selectedId: string
  onSelect: (event: Event) => void
}

export function EventTable({ events, selectedId, onSelect }: EventTableProps) {
  return (
    <div className="workbench-table-wrap">
      <table className="workbench-table min-w-[820px]">
        <thead>
          <tr>
            <th>Date</th>
            <th>Headline</th>
            <th>Region</th>
            <th>Category</th>
            <th>Context Tags</th>
            <th>Confirmation</th>
            <th>Use</th>
            <th>Affected Assets</th>
            <th>Verified</th>
          </tr>
        </thead>
        <tbody>
          {events.map(event => (
            <tr
              key={event.id}
              onClick={() => onSelect(event)}
              className={`cursor-pointer align-top ${selectedId === event.id ? 'is-selected' : ''}`}
            >
              <td className="whitespace-nowrap">{formatDate(event.date)}</td>
              <td className="font-medium text-ink">{event.title}</td>
              <td>{event.region}</td>
              <td>{formatCategory(event.category)}</td>
              <td>{event.sourceContext.slice(0, 3).join(', ')}</td>
              <td>{event.priceConfirmationRequired ? 'Price check required' : 'Confirmed'}</td>
              <td>{event.eventUse}</td>
              <td>{event.affectedAssets.slice(0, 4).join(', ')}</td>
              <td>{event.verified ? 'Verified' : 'Unverified'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
