import type { Event } from '@/types/event'
import { Card } from '@/components/ui/Card'
import { formatCategory, formatDate } from '@/lib/formatters'

export function EventDetailPanel({ event }: { event: Event }) {
  return (
    <Card className="p-5">
      <p className="workbench-kicker">Selected Event</p>
      <h2 className="mt-2 text-xl font-semibold text-ink">{event.title}</h2>
      <p className="mt-1 text-sm text-muted">{formatDate(event.date)} · {event.region} · {formatCategory(event.category)}</p>
      <div className="mt-5 grid gap-4 text-sm leading-6 text-muted">
        <div>
          <p className="font-semibold text-ink">Summary</p>
          <p>{event.summary}</p>
        </div>
        <div>
          <p className="font-semibold text-ink">Source</p>
          <a href={event.sourceUrl} className="text-steel underline">{event.sourceName}</a>
        </div>
        <div>
          <p className="font-semibold text-ink">Why it matters</p>
          <p>{event.analystNote}</p>
        </div>
        <div>
          <p className="font-semibold text-ink">Market channels</p>
          <p>{event.affectedThemes.join(', ')}</p>
        </div>
        <div>
          <p className="font-semibold text-ink">Affected assets</p>
          <p>{event.affectedAssets.join(', ')}</p>
        </div>
      </div>
    </Card>
  )
}
