import type { Event } from '@/types/event'
import { formatCategory, formatDate } from '@/lib/formatters'

export function TopEventsTable({ events }: { events: Event[] }) {
  if (events.length === 0) {
    return <div className="p-4 text-sm text-muted">Data build failed strict event readiness. Run ingestion and audit before publication.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="workbench-table min-w-[760px]">
        <thead>
          <tr>
            <th>Date</th>
            <th>Headline</th>
            <th>Category</th>
            <th>Source</th>
            <th>Assets</th>
          </tr>
        </thead>
        <tbody>
          {events.map(event => (
            <tr key={event.id} className="align-top">
              <td className="whitespace-nowrap">{formatDate(event.date)}</td>
              <td className="font-medium text-ink">{event.title}</td>
              <td>{formatCategory(event.category)}</td>
              <td>{event.verified ? 'Verified' : 'Unverified'}</td>
              <td>{event.affectedAssets.slice(0, 4).join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
