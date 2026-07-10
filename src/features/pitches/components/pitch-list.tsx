import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Copy, Download, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { StockPitchRecord, StockPitchSummary } from '@/types/pitch'

export function PitchList({ pitches, activeSlug }: { pitches: StockPitchSummary[]; activeSlug?: string }) {
  return (
    <Card className="h-fit rounded-md border-border bg-card shadow-none">
      <CardHeader className="border-b border-border pb-3">
        <p className="font-mono text-[0.65rem] tracking-[0.04em] text-muted-foreground">Memo DB</p>
        <CardTitle className="font-mono text-sm">{pitches.length} pitches</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 pt-4">
        {pitches.map(pitch => {
          const active = activeSlug === pitch.slug
          const className = `rounded-md border p-3 no-underline ${active ? 'border-primary bg-primary/10' : 'border-border bg-background/45 hover:bg-muted/50'}`
          const content = <PitchListItem pitch={pitch} />
          return active ? (
            <div key={pitch.slug} className={className} aria-current="true">
              {content}
            </div>
          ) : (
            <Link
              key={pitch.slug}
              href={`/?module=stock-pitch&slug=${encodeURIComponent(pitch.slug)}`}
              className={className}
            >
              {content}
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}

function PitchListItem({ pitch }: { pitch: StockPitchSummary }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-sm font-semibold">{pitch.ticker}</p>
        <Badge variant={pitch.shareEnabled ? 'secondary' : 'outline'} className="font-mono">{pitch.status}</Badge>
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground">{pitch.companyName}</p>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{pitch.oneLineThesis}</p>
    </>
  )
}

export function ShareActions({ record, shareEnabled }: { record: StockPitchRecord; shareEnabled: boolean }) {
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])
  const sharePath = `/pitch/${encodeURIComponent(record.slug)}?token=${encodeURIComponent(record.shareToken || '')}`
  const printPath = `/pitch/${encodeURIComponent(record.slug)}/print?token=${encodeURIComponent(record.shareToken || '')}`
  const shareUrl = origin ? `${origin}${sharePath}` : sharePath
  const printUrl = origin ? `${origin}${printPath}` : printPath
  return (
    <div className="flex flex-wrap gap-2">
      <CopyButton text={shareUrl} label="Copy Share" disabled={!shareEnabled || !record.shareToken} />
      <Button asChild variant="outline" size="sm" aria-disabled={!shareEnabled}>
        <Link href={shareEnabled ? sharePath : '#'} target={shareEnabled ? '_blank' : undefined}>
          <ExternalLink className="h-4 w-4" />
          Live
        </Link>
      </Button>
      <CopyButton text={printUrl} label="Copy Print" disabled={!shareEnabled || !record.shareToken} />
      <Button asChild variant="outline" size="sm" aria-disabled={!shareEnabled}>
        <Link href={shareEnabled ? printPath : '#'} target={shareEnabled ? '_blank' : undefined}>
          <Download className="h-4 w-4" />
          Print
        </Link>
      </Button>
    </div>
  )
}

function CopyButton({ text, label, disabled = false }: { text: string; label: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    if (disabled) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }
  return (
    <Button type="button" variant="outline" size="sm" onClick={copy} disabled={disabled}>
      <Copy className="h-4 w-4" />
      {copied ? 'Copied' : label}
    </Button>
  )
}
