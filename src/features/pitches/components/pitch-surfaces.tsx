import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function Panel({ title, kicker, children }: { title: string; kicker: string; children: ReactNode }) {
  return (
    <Card className="rounded-md border-border bg-card shadow-none">
      <CardHeader className="border-b border-border pb-3">
        <p className="font-mono text-[0.65rem] tracking-[0.04em] text-muted-foreground">{kicker}</p>
        <CardTitle className="mt-1 font-mono text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  )
}
export function EditorPanel({ title, kicker, children }: { title: string; kicker: string; children: ReactNode }) {
  return (
    <Panel title={title} kicker={kicker}>
      <div className="grid gap-4">{children}</div>
    </Panel>
  )
}

export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="font-mono text-[0.65rem] tracking-[0.04em] text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-mono text-sm font-semibold leading-tight">{value}</p>
    </div>
  )
}

export function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/45 p-2">
      <p className="font-mono text-[0.65rem] tracking-[0.04em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-mono text-sm font-semibold">{value}</p>
    </div>
  )
}

export function TextBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-border bg-background/45 p-3">
      <p className="font-mono text-[0.65rem] tracking-[0.04em] text-muted-foreground">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body || 'N/A'}</p>
    </div>
  )
}

export function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-border bg-background/45 p-3">
      <p className="font-mono text-[0.65rem] tracking-[0.04em] text-muted-foreground">{title}</p>
      <ol className="mt-2 grid gap-2">
        {items.length ? items.map(item => <li key={item} className="text-sm leading-6 text-muted-foreground">{item}</li>) : <li className="text-sm text-muted-foreground">N/A</li>}
      </ol>
    </div>
  )
}
