import type { ReactNode } from 'react'
import type { RiskLevel } from '@/types/theme'
import type { DataQuality } from '@/types/provenance'
import { getSourceAudit } from '@/lib/data/getSourceAudit'

type BadgeProps = {
  children: ReactNode
  tone?: 'default' | 'low' | 'watch' | 'elevated' | 'high' | 'crisis' | 'source'
}

export function Badge({ children, tone = 'default' }: BadgeProps) {
  const tones = {
    default: 'border-line bg-[rgba(255,255,255,0.06)] text-muted',
    low: 'border-[rgba(80,210,193,0.35)] bg-[rgba(80,210,193,0.12)] text-steel',
    watch: 'border-[rgba(124,190,255,0.35)] bg-[rgba(124,190,255,0.12)] text-[rgb(180,220,255)]',
    elevated: 'border-[rgba(255,228,168,0.38)] bg-[rgba(255,228,168,0.12)] text-amber',
    high: 'border-[rgba(255,170,110,0.38)] bg-[rgba(255,170,110,0.12)] text-[rgb(255,210,180)]',
    crisis: 'border-[rgba(255,122,122,0.45)] bg-[rgba(255,122,122,0.14)] text-crisis',
    source: 'border-[rgba(80,210,193,0.4)] bg-[rgba(80,210,193,0.13)] text-steel'
  }

  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const tone = level === 'Low' ? 'low' : level === 'Watch' ? 'watch' : level === 'Elevated' ? 'elevated' : level === 'High' ? 'high' : 'crisis'
  return <Badge tone={tone}>{level}</Badge>
}

export function SourceDataBadge() {
  const audit = getSourceAudit()
  return <Badge tone={audit.status === 'passed' ? 'source' : 'crisis'}>{audit.status === 'passed' ? 'Source Data' : 'Audit Failed'}</Badge>
}

export function DataStatusBadge({ status }: { status: DataQuality }) {
  if (status === 'source') return <Badge tone="source">Source Data</Badge>
  if (status === 'derived') return <Badge tone="watch">Derived Data</Badge>
  if (status === 'cached') return <Badge tone="elevated">Cached</Badge>
  return <Badge tone="crisis">Unavailable</Badge>
}
