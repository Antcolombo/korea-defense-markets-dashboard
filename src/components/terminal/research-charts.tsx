import { useMemo } from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card as TremorCard } from '@tremor/react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  ZAxis
} from 'recharts'
import { GripVertical } from 'lucide-react'
import type { ShellMeta, UnavailableField } from '@/lib/research/api'
import type { CrowdingRow, MetricValue, ReportMetric, RotationRow, StockReport } from '@/lib/research/types'
import { useTerminalStore } from '@/components/terminal/terminal-store'
import { cn } from '@/lib/utils'

export type TerminalMetric = {
  id: string
  label: string
  value: string
  sub: string
  tone?: 'neutral' | 'good' | 'warn' | 'danger'
}

export function SortableMetricStrip({ metrics }: { metrics: TerminalMetric[] }) {
  const metricOrder = useTerminalStore(state => state.metricOrder)
  const setMetricOrder = useTerminalStore(state => state.setMetricOrder)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const ordered = useMemo(() => {
    const fallback = metrics.map(metric => metric.id)
    const ids = metricOrder.length ? metricOrder.filter(id => metrics.some(metric => metric.id === id)) : fallback
    const missing = fallback.filter(id => !ids.includes(id))
    return [...ids, ...missing].map(id => metrics.find(metric => metric.id === id)).filter(Boolean) as TerminalMetric[]
  }, [metricOrder, metrics])

  function dragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = ordered.findIndex(metric => metric.id === active.id)
    const newIndex = ordered.findIndex(metric => metric.id === over.id)
    setMetricOrder(arrayMove(ordered, oldIndex, newIndex).map(metric => metric.id))
  }

  return (
    <>
      <CompactMetricBar metrics={ordered} />
      <DndContext id="liquidchain-metric-strip" sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
        <SortableContext items={ordered.map(metric => metric.id)}>
          <section className="hidden grid-cols-2 gap-2 border-b border-border bg-background/95 p-2 md:grid md:grid-cols-5">
            {ordered.map(metric => <SortableMetricCard key={metric.id} metric={metric} />)}
          </section>
        </SortableContext>
      </DndContext>
    </>
  )
}

function CompactMetricBar({ metrics }: { metrics: TerminalMetric[] }) {
  const source = metrics.find(metric => metric.id === 'coverage') ?? metrics[0]
  const context = metrics.find(metric => metric.id === 'top-rs') ?? metrics[1]
  if (!source) return null
  return (
    <section className={cn('border-b border-border bg-background/95 p-2 md:hidden', metricToneClass(source.tone))}>
      <div className="grid gap-1 rounded-md border border-border bg-card p-3">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[0.66rem] tracking-[0.04em] text-muted-foreground">{source.label}</p>
            <p className="mt-1 truncate font-mono text-sm font-semibold text-foreground">{source.value}</p>
          </div>
          {context ? (
            <div className="min-w-0 text-right">
              <p className="truncate font-mono text-[0.66rem] text-muted-foreground">{context.label}</p>
              <p className="truncate font-mono text-sm font-semibold">{context.value}</p>
            </div>
          ) : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">{source.sub}</p>
      </div>
    </section>
  )
}

function SortableMetricCard({ metric }: { metric: TerminalMetric }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: metric.id })
  return (
    <TremorCard
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('rounded-md border border-border bg-card p-3 shadow-none ring-0', metricToneClass(metric.tone))}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[0.66rem] tracking-[0.04em] text-muted-foreground">{metric.label}</p>
          <p className="mt-1 truncate font-mono text-lg font-semibold text-foreground">{metric.value}</p>
          <p className="mt-1 truncate font-mono text-[0.68rem] text-muted-foreground">{metric.sub}</p>
        </div>
        <button type="button" className="hidden text-muted-foreground hover:text-foreground md:block" aria-label={`Reorder ${metric.label}`} {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
    </TremorCard>
  )
}

function metricToneClass(tone: TerminalMetric['tone']) {
  if (tone === 'good') return 'border-l-2 border-l-emerald-300/80 bg-emerald-300/[0.04]'
  if (tone === 'warn') return 'border-l-2 border-l-amber/80 bg-amber/10'
  if (tone === 'danger') return 'border-l-2 border-l-destructive/80 bg-destructive/10'
  return ''
}

export function MetricBarChart({
  rows
}: {
  rows: { name: string; value: number | null }[]
}) {
  const data = rows.filter(row => row.value !== null).slice(0, 10)
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 11 }} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 11 }} />
          <RechartsTooltip contentStyle={{ background: '#071b1a', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {data.map(row => <Cell key={row.name} fill={(row.value ?? 0) >= 0 ? '#50d2c1' : '#ff6565'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ScenarioLineChart({ metrics }: { metrics: ReportMetric[] }) {
  const seen = new Set<string>()
  const data = metrics
    .filter(metric => metric.value !== null)
    .filter(metric => {
      if (seen.has(metric.label)) return false
      seen.add(metric.label)
      return true
    })
    .slice(0, 8)
    .map(metric => ({ name: shortMetricLabel(metric.label), value: metric.value ?? 0, fullLabel: metric.label }))
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 18, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
          <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={88} tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 10 }} />
          <ReferenceLine x={0} stroke="rgba(255,255,255,0.22)" strokeDasharray="4 4" />
          <RechartsTooltip contentStyle={tooltipStyle} formatter={(value) => [Number(value).toFixed(1), 'Value']} labelFormatter={(label, payload) => payload?.[0]?.payload?.fullLabel ?? label} />
          <Bar dataKey="value" radius={[0, 3, 3, 0]}>
            {data.map(row => <Cell key={row.fullLabel} fill={row.value >= 0 ? '#50d2c1' : '#ff7777'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RotationQuadrantChart({ rows }: { rows: RotationRow[] }) {
  const data = rows
    .map(row => ({
      ticker: row.ticker,
      rs: row.relativeStrengthVsSpy20d.value,
      return20d: row.return20d.value,
      volume: row.volumeVs20dAvg.value ?? 1,
      trend: row.trendLabel
    }))
    .filter((row): row is { ticker: string; rs: number; return20d: number; volume: number; trend: string } => row.rs !== null && row.return20d !== null)

  if (!data.length) return <MissingChartState title="No rotation plot" detail="20D return and RS vs SPY are missing." />

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 14, right: 18, bottom: 20, left: 8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" />
          <XAxis type="number" dataKey="rs" name="RS vs SPY" tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 11 }} />
          <YAxis type="number" dataKey="return20d" name="20D return" tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 11 }} />
          <ZAxis type="number" dataKey="volume" range={[80, 360]} />
          <ReferenceLine x={0} stroke="rgba(255,255,255,0.22)" strokeDasharray="4 4" />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.22)" strokeDasharray="4 4" />
          <RechartsTooltip content={<ScatterTooltip xLabel="RS vs SPY" yLabel="20D return" />} />
          <Scatter data={data}>
            {data.map(row => <Cell key={row.ticker} fill={row.rs >= 0 && row.return20d >= 0 ? '#50d2c1' : row.rs < 0 && row.return20d < 0 ? '#ff7777' : '#d6b36a'} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CrowdingRiskMap({ rows }: { rows: CrowdingRow[] }) {
  const data = rows
    .map(row => ({
      ticker: row.ticker,
      crowding: row.crowdingScore.value,
      extension: row.extensionRiskScore.value,
      catalyst: row.catalystSupportScore.value ?? 1,
      setup: row.setupLabel
    }))
    .filter((row): row is { ticker: string; crowding: number; extension: number; catalyst: number; setup: string } => row.crowding !== null && row.extension !== null)

  if (!data.length) return <MissingChartState title="No crowding map" detail="Crowding and extension scores are missing." />

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 14, right: 18, bottom: 20, left: 8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" />
          <XAxis type="number" dataKey="crowding" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 11 }} />
          <YAxis type="number" dataKey="extension" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 11 }} />
          <ZAxis type="number" dataKey="catalyst" range={[90, 420]} />
          <ReferenceLine x={70} stroke="rgba(255,255,255,0.24)" strokeDasharray="4 4" />
          <ReferenceLine y={70} stroke="rgba(255,255,255,0.24)" strokeDasharray="4 4" />
          <RechartsTooltip content={<ScatterTooltip xLabel="Crowding" yLabel="Extension" zLabel="Catalyst" />} />
          <Scatter data={data}>
            {data.map(row => <Cell key={row.ticker} fill={row.extension >= 70 && row.crowding >= 70 ? '#ff7777' : row.catalyst >= 65 ? '#50d2c1' : '#d6b36a'} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ReportSignalRadar({ report }: { report: StockReport }) {
  const rows = [
    radarPoint(report, 'Tape', '20D return', 2.5),
    radarPoint(report, 'RS', '20D RS vs SPY', 3),
    radarPoint(report, 'Volume', 'Volume vs 20D average', 55, 'x'),
    radarPoint(report, 'Crowding', 'Crowding score', 1, 'score'),
    radarPoint(report, 'Extension', 'Extension risk score', 1, 'score'),
    radarPoint(report, 'Catalyst', 'Catalyst support score', 1, 'score')
  ]
  const available = rows.filter(row => row.available).length

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
      <div className="h-[300px] w-full">
        <ResponsiveContainer>
          <RadarChart data={rows}>
            <PolarGrid stroke="rgba(255,255,255,0.12)" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: 'rgba(255,255,255,0.72)', fontSize: 10 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar dataKey="score" stroke="#50d2c1" fill="#50d2c1" fillOpacity={0.24} strokeWidth={2} />
            <RechartsTooltip contentStyle={tooltipStyle} formatter={(value, name, item) => [`${Math.round(Number(value))}`, item.payload.raw]} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid content-start gap-2">
        <div className="rounded-md border border-border bg-background/45 p-3">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">Evidence Readiness</p>
          <p className="mt-2 font-mono text-2xl font-semibold">{available}/{rows.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Radar only scores sourced metrics. Missing axes stay at zero.</p>
        </div>
        {rows.map(row => (
          <div key={row.axis} className="grid grid-cols-[1fr_auto] gap-2 rounded-md border border-border bg-background/35 p-2">
            <span className="truncate font-mono text-[0.68rem] text-muted-foreground">{row.axis}</span>
            <span className={row.available ? 'font-mono text-[0.68rem] text-foreground' : 'font-mono text-[0.68rem] text-muted-foreground'}>{row.raw}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ReturnRibbonChart({ report }: { report: StockReport }) {
  const data = ['1D return', '5D return', '20D return', '60D return']
    .map(label => metricByLabel(report, label))
    .map(metric => ({
      name: metric?.label.replace(' return', '') ?? 'Missing',
      value: metric?.value,
      display: metric?.displayValue ?? 'Unavailable'
    }))
    .filter((row): row is { name: string; value: number; display: string } => row.value !== null && row.value !== undefined)

  if (!data.length) return <MissingChartState title="No return ribbon" detail="Return windows are missing from source snapshot." />

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 16, right: 20, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="returnRibbonFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#50d2c1" stopOpacity={0.42} />
              <stop offset="95%" stopColor="#50d2c1" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 11 }} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 11 }} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.22)" strokeDasharray="4 4" />
          <RechartsTooltip contentStyle={tooltipStyle} formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Return']} />
          <Area type="monotone" dataKey="value" stroke="#50d2c1" strokeWidth={2} fill="url(#returnRibbonFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ProviderHealthMap({ shell }: { shell: ShellMeta }) {
  const rows = [...shell.providerHealth, ...shell.deferredProviderHealth]
  if (!rows.length) return <MissingChartState title="No provider map" detail="Static module or no source audit rows." />
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-[1fr_auto] items-end gap-3 rounded-md border border-border bg-background/45 p-3">
        <div>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">Coverage</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#ff7777,#d6b36a,#50d2c1)]" style={{ width: `${Math.max(0, Math.min(shell.coveragePercent, 100))}%` }} />
          </div>
        </div>
        <p className="font-mono text-xl font-semibold">{shell.coveragePercent}%</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {rows.slice(0, 8).map(row => (
          <div key={row.id} className="rounded-md border border-border bg-background/35 p-2">
            <div className="mb-2 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${statusDot(row.status)}`} />
              <span className="truncate font-mono text-[0.68rem]">{row.label}</span>
            </div>
            <p className="line-clamp-2 text-[0.66rem] leading-4 text-muted-foreground">{row.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function GapHeatmap({ fields, limit = 12 }: { fields: UnavailableField[]; limit?: number }) {
  if (!fields.length) return <MissingChartState title="No active gaps" detail="Current response has no missing active fields." />
  const rows = fields.slice(0, limit)
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-4 gap-1">
        {rows.map((field, index) => (
          <div
            key={`${field.field}-${index}`}
            className="h-10 rounded-sm border border-border"
            style={{ background: gapColor(field.reason, index) }}
            title={`${field.field}: ${field.reason}`}
          />
        ))}
      </div>
      <div className="grid gap-1">
        {rows.slice(0, 6).map((field, index) => (
          <div key={`${field.field}-label-${index}`} className="grid grid-cols-[8px_1fr] gap-2 text-[0.68rem]">
            <span className="mt-1.5 h-2 w-2 rounded-full" style={{ background: gapColor(field.reason, index) }} />
            <span className="truncate text-muted-foreground"><span className="font-mono text-foreground">{field.field}</span> {field.reason}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function metricNumber(metric: MetricValue | undefined) {
  return metric?.value ?? null
}

const tooltipStyle = {
  background: '#071b1a',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#fff'
}

function ScatterTooltip({
  active,
  payload,
  xLabel,
  yLabel,
  zLabel
}: {
  active?: boolean
  payload?: { payload: Record<string, string | number> }[]
  xLabel: string
  yLabel: string
  zLabel?: string
}) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <div className="rounded-md border border-border bg-background/95 p-2 shadow">
      <p className="font-mono text-xs font-semibold">{row.ticker}</p>
      <p className="mt-1 text-[0.68rem] text-muted-foreground">{xLabel}: {numberText(row.rs ?? row.crowding)}</p>
      <p className="text-[0.68rem] text-muted-foreground">{yLabel}: {numberText(row.return20d ?? row.extension)}</p>
      {zLabel ? <p className="text-[0.68rem] text-muted-foreground">{zLabel}: {numberText(row.catalyst)}</p> : null}
      {row.trend || row.setup ? <p className="mt-1 text-[0.68rem] text-foreground">{row.trend ?? row.setup}</p> : null}
    </div>
  )
}

function MissingChartState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="grid min-h-[180px] place-items-center rounded-md border border-dashed border-border bg-background/35 p-4 text-center">
      <div>
        <p className="font-mono text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}

function allReportMetrics(report: StockReport) {
  return [...report.evidence, report.positioning, report.catalysts].flatMap(section => section.metrics)
}

function metricByLabel(report: StockReport, label: string) {
  return allReportMetrics(report).find(metric => metric.label === label)
}

function radarPoint(report: StockReport, axis: string, label: string, factor: number, mode: 'signed' | 'x' | 'score' = 'signed') {
  const metric = metricByLabel(report, label)
  const value = metric?.value ?? null
  const score = value === null
    ? 0
    : mode === 'score'
      ? clamp(value, 0, 100)
      : mode === 'x'
        ? clamp(value * factor, 0, 100)
        : clamp(50 + value * factor, 0, 100)
  return {
    axis,
    score,
    raw: metric?.displayValue ?? 'Unavailable',
    available: value !== null
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function numberText(value: string | number | undefined) {
  if (typeof value === 'number') return value.toFixed(1)
  return value ?? 'n/a'
}

function statusDot(status: ShellMeta['providerHealth'][number]['status']) {
  if (status === 'available') return 'bg-emerald-300'
  if (status === 'partial') return 'bg-cyan-300'
  if (status === 'stale') return 'bg-amber-300'
  if (status === 'entitlement_missing') return 'bg-orange-300'
  if (status === 'provider_error') return 'bg-red-400'
  return 'bg-muted'
}

function gapColor(reason: string, index: number) {
  const lower = reason.toLowerCase()
  if (lower.includes('provider') || lower.includes('unavailable')) return 'rgba(255, 119, 119, 0.55)'
  if (lower.includes('stale')) return 'rgba(214, 179, 106, 0.62)'
  if (lower.includes('entitlement')) return 'rgba(255, 159, 67, 0.58)'
  const palette = ['rgba(80, 210, 193, 0.35)', 'rgba(116, 179, 242, 0.35)', 'rgba(214, 179, 106, 0.38)']
  return palette[index % palette.length]
}

function shortMetricLabel(label: string) {
  if (label === '20D return') return '20D return'
  if (label === '20D RS vs SPY') return '20D RS'
  if (label === 'Volume vs 20D average') return 'Volume'
  if (label === 'Extension risk score') return 'Extension'
  if (label === 'Crowding score') return 'Crowding'
  if (label === 'Catalyst support score') return 'Catalyst'
  return label.length > 13 ? `${label.slice(0, 12)}…` : label
}
