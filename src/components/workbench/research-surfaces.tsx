import { useState, type ReactNode } from 'react'
import { Clipboard } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function Panel({ title, kicker, action, children }: { title: string; kicker: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card className="rounded-md border-border bg-card shadow-none">
      <CardHeader className="border-b border-border pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.66rem] font-medium tracking-[0.04em] text-muted-foreground">{kicker}</p>
            <CardTitle className="mt-1 truncate text-sm font-semibold">{title}</CardTitle>
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  )
}

export function MetricPanel({ label, value }: { label: string; value: string }) {
  return (
    <Panel title={value} kicker={label}>
      <div className="h-1 rounded-full bg-primary/50" />
    </Panel>
  )
}

export function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/45 p-2">
      <p className="text-[0.66rem] font-medium tracking-[0.04em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  )
}

export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="text-[0.66rem] font-medium tracking-[0.04em] text-muted-foreground">{label}</p>
      <p className="mt-2 truncate text-lg font-semibold">{value}</p>
    </div>
  )
}

export function DeferredPanel({
  title = 'Deferred Feed',
  detail = 'Optional options, FINRA, and catalyst feeds are hidden from active coverage until they are needed.'
}: {
  title?: string
  detail?: string
} = {}) {
  return (
    <Panel title={title} kicker="Deferred">
      <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
    </Panel>
  )
}

export function ListPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <Panel title={title} kicker={`${items.length} items`}>
      <ul className="grid gap-2">
        {items.length ? items.map(item => <li key={item} className="rounded-md border border-border bg-background/45 p-2 text-sm leading-6 text-muted-foreground">{item}</li>) : <li className="text-sm text-muted-foreground">No rows.</li>}
      </ul>
    </Panel>
  )
}

export function Formula({ title, body }: { title: string; body: string }) {
  return (
    <Panel title={title} kicker="Formula">
      <pre className="whitespace-pre-wrap rounded-md border border-border bg-background/60 p-3 font-mono text-xs leading-6 text-muted-foreground">{body}</pre>
    </Panel>
  )
}

export function Rule({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-md border border-border bg-background/45 p-3">
      <p className="font-mono text-xs font-semibold tracking-[0.06em] text-primary">{label}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  )
}

export function ProvenanceWarning({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-md border border-amber-300/35 bg-amber-300/10 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-amber-300/45 font-mono text-amber-100">provenance</Badge>
        <p className="font-mono text-xs font-semibold text-amber-100">{title}</p>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  )
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        fallbackCopy(text)
      }
      setFailed(false)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
      setFailed(true)
      window.setTimeout(() => setFailed(false), 1600)
    }
  }
  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      <Clipboard className="h-4 w-4" />
      {failed ? 'Copy failed' : copied ? 'Copied' : label}
    </Button>
  )
}

export function fallbackCopy(text: string) {
  const element = document.createElement('textarea')
  element.value = text
  element.setAttribute('readonly', '')
  element.style.position = 'fixed'
  element.style.top = '-9999px'
  document.body.appendChild(element)
  element.select()
  document.execCommand('copy')
  document.body.removeChild(element)
}

export function EmptyLine({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="p-4 text-center">
      <p className="font-mono text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  const variant = normalized.includes('available') && !normalized.includes('unavailable')
    ? 'secondary'
    : normalized.includes('partial')
      ? 'outline'
      : normalized.includes('stale') || normalized.includes('error')
        ? 'destructive'
        : 'outline'
  return <Badge variant={variant} className="font-mono">{status.replace(/_/g, ' ')}</Badge>
}
