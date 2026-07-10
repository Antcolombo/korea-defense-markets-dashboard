import { Badge } from '@/components/ui/badge'
import type { UnavailableField } from '@/contracts/provenance'

export function SourceLadder({ fields }: { fields: UnavailableField[] }) {
  const labels = fields.map(field => `${field.field} ${field.reason}`.toLowerCase())
  const has = (patterns: RegExp[]) => labels.some(label => patterns.some(pattern => pattern.test(label)))
  const rows = [
    {
      label: 'Daily OHLCV / RS',
      status: 'available',
      detail: 'Required price and relative-strength source rows.'
    },
    {
      label: 'Massive Basic options proxy',
      status: has([/options volume/, /put\/call/, /options component/]) ? 'limited' : 'available',
      detail: 'Free-tier sampled options volume and put/call proxy; 5 calls/min throttle.'
    },
    {
      label: 'FINRA short-sale flow',
      status: has([/short-sale/, /short volume/]) ? 'limited' : 'available',
      detail: 'Daily short-sale volume proxy when public rows are present.'
    },
    {
      label: 'Live OI / IV / Greeks',
      status: has([/open interest/, /implied vol/, /\biv\b/, /greek/, /gamma/]) ? 'plan-locked' : 'not requested',
      detail: 'Plan-locked under Massive Basic; not treated as broken active coverage.'
    }
  ]
  return (
    <div className="grid gap-2">
      {rows.map(row => (
        <div key={row.label} className="rounded-md border border-border bg-background/45 p-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-mono text-xs font-semibold">{row.label}</p>
            <Badge variant={row.status === 'available' ? 'secondary' : 'outline'} className="font-mono">{row.status}</Badge>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{row.detail}</p>
        </div>
      ))}
    </div>
  )
}
