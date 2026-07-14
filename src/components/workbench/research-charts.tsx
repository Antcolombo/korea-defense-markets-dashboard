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
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  ZAxis
} from 'recharts'
import type { ShellMeta, UnavailableField } from '@/lib/research/api'
import type { CrowdingRow, MetricValue, ReportMetric, RotationRow, StockReport } from '@/lib/research/types'
import { useTerminalStore } from '@/features/workspace/components/workspace-store'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'good' | 'warn' | 'danger'

type MetricLike = Pick<MetricValue, 'value' | 'availability' | 'dataStatus' | 'reason'> | undefined

type MathTraceItem = {
  label: string
  raw: string
  normalized: string
  weight?: string
  confidence?: string
  result: string
  tone?: Tone
}

export const chartTheme = {
  colors: {
    good: '#65e4c6',
    warn: '#d9b96e',
    danger: '#ff7777',
    neutral: '#8fa7a2',
    accent: '#74b3f2',
    muted: 'rgba(255,255,255,0.58)',
    foreground: '#ffffff',
    grid: 'rgba(255,255,255,0.075)',
    zero: 'rgba(255,255,255,0.24)',
    categorical: ['#65e4c6', '#74b3f2', '#d9b96e', '#ff9f43', '#ff7777', '#b6a7ff']
  },
  axis: { fill: 'rgba(255,255,255,0.65)', fontSize: 11 },
  axisSmall: { fill: 'rgba(255,255,255,0.62)', fontSize: 10 },
  margin: { top: 16, right: 22, bottom: 22, left: 8 },
  tooltipStyle: {
    background: '#071b1a',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    color: '#fff',
    boxShadow: '0 18px 50px rgba(0,0,0,0.28)'
  },
  missingState: 'grid min-h-[180px] place-items-center rounded-md border border-dashed border-border bg-background/35 p-4 text-center'
} as const

export type TerminalMetric = {
  id: string
  label: string
  value: string
  sub: string
  tone?: Tone
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
    <section className={cn('border-b border-border bg-background p-2 md:hidden', metricToneClass(source.tone))}>
      <div className="grid gap-1 rounded-md border border-border bg-card p-3">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-medium tracking-[0.04em] text-muted-foreground">{source.label}</p>
            <p className="mt-1 truncate text-sm font-semibold text-foreground">{source.value}</p>
          </div>
          {context ? (
            <div className="min-w-0 text-right">
              <p className="truncate text-[0.68rem] text-muted-foreground">{context.label}</p>
              <p className="truncate text-sm font-semibold">{context.value}</p>
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
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('cursor-grab rounded-md border border-border bg-card p-3 shadow-none ring-0 active:cursor-grabbing', metricToneClass(metric.tone))}
      {...attributes}
      {...listeners}
    >
      <div className="min-w-0">
        <p className="text-[0.68rem] font-medium tracking-[0.04em] text-muted-foreground">{metric.label}</p>
        <p className="mt-1 truncate text-lg font-semibold text-foreground">{metric.value}</p>
        <p className="mt-1 truncate text-[0.72rem] text-muted-foreground">{metric.sub}</p>
      </div>
    </div>
  )
}

function metricToneClass(tone: TerminalMetric['tone']) {
  if (tone === 'good') return 'border-l-2 border-l-emerald-300/80 bg-emerald-300/[0.04]'
  if (tone === 'warn') return 'border-l-2 border-l-amber/80 bg-amber/10'
  if (tone === 'danger') return 'border-l-2 border-l-destructive/80 bg-destructive/10'
  return ''
}

export function statusConfidence(metric: MetricLike) {
  if (!metric || metric.value === null) return 0
  if (metric.dataStatus === 'AVAILABLE') return 1
  if (metric.dataStatus === 'PARTIAL') return 0.72
  if (metric.dataStatus === 'STALE') return 0.48
  if (metric.dataStatus === 'ENTITLEMENT_MISSING') return 0.28
  if (metric.dataStatus === 'PROVIDER_ERROR') return 0.16
  return 0.1
}

export function normalizeMetricScore(metric: MetricLike, label: string) {
  const value = metric?.value
  if (value === null || value === undefined) return 0
  if (label.includes('Volume')) return clamp(value * 55, 0, 100)
  if (label.includes('RS vs SPY')) return clamp(50 + value * 3, 0, 100)
  if (label.includes('return')) return clamp(50 + value * 2.5, 0, 100)
  if (label.includes('Extension risk')) return clamp(100 - value, 0, 100)
  if (label.includes('score') || label.includes('Crowding') || label.includes('Catalyst')) return clamp(value, 0, 100)
  return clamp(value, 0, 100)
}

export function toneForScore(score: number): Tone {
  if (score >= 70) return 'good'
  if (score >= 45) return 'warn'
  return 'danger'
}

export function formatMathStep(raw: string, normalized: string, confidence?: string, result?: string) {
  return [raw, normalized, confidence, result].filter(Boolean).join(' -> ')
}

export function MathTraceGrid({ items }: { items: MathTraceItem[] }) {
  if (!items.length) return null
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {items.map(item => <MathTrace key={item.label} item={item} />)}
    </div>
  )
}

export function MathTrace({ item }: { item: MathTraceItem }) {
  const tone = item.tone ?? 'neutral'
  return (
    <div className={cn('rounded-md border border-border bg-background/40 p-3', traceToneClass(tone))}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs font-semibold">{item.label}</p>
          <p className="mt-1 text-[0.68rem] leading-4 text-muted-foreground">
            {formatMathStep(item.raw, item.normalized, item.confidence, item.result)}
          </p>
        </div>
        {item.weight ? <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[0.62rem] text-muted-foreground">{item.weight}</span> : null}
      </div>
    </div>
  )
}

function traceToneClass(tone: Tone) {
  if (tone === 'good') return 'border-l-2 border-l-emerald-300/80'
  if (tone === 'warn') return 'border-l-2 border-l-amber/80'
  if (tone === 'danger') return 'border-l-2 border-l-destructive/80'
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
        <BarChart data={data} margin={chartTheme.margin}>
          <CartesianGrid stroke={chartTheme.colors.grid} vertical={false} />
          <XAxis dataKey="name" tick={chartTheme.axis} />
          <YAxis tick={chartTheme.axis} />
          <RechartsTooltip contentStyle={chartTheme.tooltipStyle} />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {data.map(row => <Cell key={row.name} fill={(row.value ?? 0) >= 0 ? chartTheme.colors.good : chartTheme.colors.danger} />)}
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
          <CartesianGrid stroke={chartTheme.colors.grid} horizontal={false} />
          <XAxis type="number" tick={chartTheme.axis} />
          <YAxis type="category" dataKey="name" width={88} tick={chartTheme.axisSmall} />
          <ReferenceLine x={0} stroke={chartTheme.colors.zero} strokeDasharray="4 4" />
          <RechartsTooltip contentStyle={chartTheme.tooltipStyle} formatter={(value) => [Number(value).toFixed(1), 'Value']} labelFormatter={(label, payload) => payload?.[0]?.payload?.fullLabel ?? label} />
          <Bar dataKey="value" radius={[0, 3, 3, 0]}>
            {data.map(row => <Cell key={row.fullLabel} fill={row.value >= 0 ? chartTheme.colors.good : chartTheme.colors.danger} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RotationQuadrantChart({ rows }: { rows: RotationRow[] }) {
  const data = rows
    .flatMap(row => {
      const rs = row.relativeStrengthVsSpy20d.value
      const return20d = row.return20d.value
      if (rs === null || return20d === null) return []
      return [{
        ticker: row.ticker,
        rs,
        return20d,
        volume: row.volumeVs20dAvg.value ?? 1,
        trend: row.trendLabel,
        status: row.dataStatus,
        asOfDate: row.asOfDate
      }]
    })
    .sort((a, b) => (Math.abs(b.rs) + Math.abs(b.return20d) + b.volume) - (Math.abs(a.rs) + Math.abs(a.return20d) + a.volume))
    .map((row, index) => ({ ...row, rank: index + 1 }))

  if (!data.length) return <MissingChartState title="No rotation plot" detail="20D return and RS vs SPY are missing." />
  const xDomain = paddedDomain(data.map(row => row.rs))
  const yDomain = paddedDomain(data.map(row => row.return20d))

  return (
    <div className="grid gap-3">
      <div className="relative h-[320px] w-full">
        <QuadrantOverlay labels={{ topLeft: 'Weak tape / RS bid', topRight: 'Leadership', bottomLeft: 'Lagging', bottomRight: 'Tape bid / RS lag' }} />
        <ResponsiveContainer>
          <ScatterChart margin={chartTheme.margin}>
            <CartesianGrid stroke={chartTheme.colors.grid} />
            <ReferenceArea x1={0} x2={xDomain[1]} y1={0} y2={yDomain[1]} fill={chartTheme.colors.good} fillOpacity={0.08} />
            <ReferenceArea x1={xDomain[0]} x2={0} y1={yDomain[0]} y2={0} fill={chartTheme.colors.danger} fillOpacity={0.08} />
            <ReferenceArea x1={xDomain[0]} x2={0} y1={0} y2={yDomain[1]} fill={chartTheme.colors.warn} fillOpacity={0.05} />
            <ReferenceArea x1={0} x2={xDomain[1]} y1={yDomain[0]} y2={0} fill={chartTheme.colors.accent} fillOpacity={0.04} />
            <XAxis type="number" dataKey="rs" name="RS vs SPY" domain={xDomain} tick={chartTheme.axis} />
            <YAxis type="number" dataKey="return20d" name="20D return" domain={yDomain} tick={chartTheme.axis} />
            <ZAxis type="number" dataKey="volume" range={[80, 360]} />
            <ReferenceLine x={0} stroke={chartTheme.colors.zero} strokeDasharray="4 4" />
            <ReferenceLine y={0} stroke={chartTheme.colors.zero} strokeDasharray="4 4" />
            <RechartsTooltip content={<ScatterTooltip xLabel="RS vs SPY" yLabel="20D return" zLabel="Volume/avg" />} />
            <Scatter data={data}>
              {data.map(row => (
                <Cell
                  key={row.ticker}
                  fill={row.rs >= 0 && row.return20d >= 0 ? chartTheme.colors.good : row.rs < 0 && row.return20d < 0 ? chartTheme.colors.danger : chartTheme.colors.warn}
                  fillOpacity={row.rank <= 5 ? 0.95 : 0.38}
                />
              ))}
              <LabelList dataKey="ticker" content={props => <PointLabel {...props} rows={data} />} />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <BubbleLegend label="Bubble size" detail="Volume vs 20D average" />
      <MathTraceGrid items={[
        { label: 'RS axis', raw: '20D RS vs SPY', normalized: 'x position', confidence: 'source status kept in tooltip', result: 'right side = relative leadership', tone: 'neutral' },
        { label: 'Return axis', raw: '20D return', normalized: 'y position', confidence: 'price freshness', result: 'upper side = positive tape', tone: 'neutral' },
        { label: 'Bubble', raw: 'Volume/avg', normalized: 'size scale', result: 'larger = stronger participation', tone: 'good' },
        { label: 'Label priority', raw: 'absolute signal + volume', normalized: 'rank top 5', result: 'direct labels only on highest-signal names', tone: 'warn' }
      ]} />
    </div>
  )
}

export function CrowdingRiskMap({ rows }: { rows: CrowdingRow[] }) {
  const data = rows
    .flatMap(row => {
      const crowding = row.crowdingScore.value
      const extension = row.extensionRiskScore.value
      if (crowding === null || extension === null) return []
      return [{
        ticker: row.ticker,
        crowding,
        extension,
        catalyst: row.catalystSupportScore.value ?? 1,
        setup: row.setupLabel,
        status: row.dataStatus,
        asOfDate: row.asOfDate
      }]
    })
    .sort((a, b) => (b.crowding + b.extension + b.catalyst) - (a.crowding + a.extension + a.catalyst))
    .map((row, index) => ({ ...row, rank: index + 1 }))

  if (!data.length) return <MissingChartState title="No crowding map" detail="Crowding and extension scores are missing." />

  return (
    <div className="grid gap-3">
      <div className="relative h-[320px] w-full">
        <QuadrantOverlay labels={{ topLeft: 'Watch extension', topRight: 'Chase risk', bottomLeft: 'Quiet', bottomRight: 'Sponsored' }} />
        <ResponsiveContainer>
          <ScatterChart margin={chartTheme.margin}>
            <CartesianGrid stroke={chartTheme.colors.grid} />
            <ReferenceArea x1={70} x2={100} y1={70} y2={100} fill={chartTheme.colors.danger} fillOpacity={0.1} />
            <ReferenceArea x1={55} x2={100} y1={0} y2={45} fill={chartTheme.colors.good} fillOpacity={0.08} />
            <ReferenceArea x1={0} x2={55} y1={55} y2={100} fill={chartTheme.colors.warn} fillOpacity={0.07} />
            <XAxis type="number" dataKey="crowding" domain={[0, 100]} tick={chartTheme.axis} />
            <YAxis type="number" dataKey="extension" domain={[0, 100]} tick={chartTheme.axis} />
            <ZAxis type="number" dataKey="catalyst" range={[90, 420]} />
            <ReferenceLine x={70} stroke={chartTheme.colors.zero} strokeDasharray="4 4" />
            <ReferenceLine y={70} stroke={chartTheme.colors.zero} strokeDasharray="4 4" />
            <RechartsTooltip content={<ScatterTooltip xLabel="Crowding" yLabel="Extension" zLabel="Catalyst" />} />
            <Scatter data={data}>
              {data.map(row => (
                <Cell
                  key={row.ticker}
                  fill={row.extension >= 70 && row.crowding >= 70 ? chartTheme.colors.danger : row.catalyst >= 65 ? chartTheme.colors.good : chartTheme.colors.warn}
                  fillOpacity={row.rank <= 5 ? 0.95 : 0.38}
                />
              ))}
              <LabelList dataKey="ticker" content={props => <PointLabel {...props} rows={data} />} />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <BubbleLegend label="Bubble size" detail="Catalyst support score" />
      <MathTraceGrid items={[
        { label: 'Crowding', raw: 'sponsorship components', normalized: 'x 0-100', confidence: 'source status kept in tooltip', result: 'right side = crowded/sponsored', tone: 'neutral' },
        { label: 'Extension', raw: 'volatility + MA distance', normalized: 'y 0-100', result: 'upper side = chase risk', tone: 'danger' },
        { label: 'Catalyst', raw: 'support score', normalized: 'bubble size', result: 'larger = better confirmation', tone: 'good' },
        { label: 'Setup', raw: 'crowding + extension + catalyst', normalized: 'rank top 5', result: 'direct labels on highest-risk reads', tone: 'warn' }
      ]} />
    </div>
  )
}

export function ReportSignalRadar({ report }: { report: StockReport }) {
  const rows = [
    scorecardPoint(report, 'Tape', '20D return', '20%', 'Price trend contribution'),
    scorecardPoint(report, 'RS', '20D RS vs SPY', '20%', 'Relative strength contribution'),
    scorecardPoint(report, 'Volume', 'Volume vs 20D average', '15%', 'Participation confirmation'),
    scorecardPoint(report, 'Crowding', 'Crowding score', '15%', 'Sponsorship pressure'),
    scorecardPoint(report, 'Extension', 'Extension risk score', '15%', 'Risk penalty'),
    scorecardPoint(report, 'Catalyst', 'Catalyst support score', '15%', 'Confirmation quality')
  ]
  const available = rows.filter(row => row.available).length
  const average = rows.length ? rows.reduce((sum, row) => sum + row.contribution, 0) / rows.length : 0
  const averageTone = toneForScore(average)

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 md:grid-cols-3">
        <div className={cn('rounded-md border border-border bg-background/45 p-3 md:col-span-1', traceToneClass(averageTone))}>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">Evidence Scorecard</p>
          <p className="mt-2 font-mono text-2xl font-semibold">{available}/{rows.length}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Small multiples show raw value, normalized score, source confidence, and final contribution. Missing data carries confidence penalty.</p>
        </div>
        <div className="grid gap-2 md:col-span-2 md:grid-cols-2">
          {rows.map(row => (
            <div key={row.axis} className={cn('rounded-md border border-border bg-background/35 p-3', traceToneClass(row.tone))}>
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-semibold">{row.axis}</p>
                  <p className="mt-1 truncate text-[0.68rem] text-muted-foreground">{row.detail}</p>
                </div>
                <span className="font-mono text-[0.68rem] text-muted-foreground">{row.weight}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${row.contribution}%`, backgroundColor: chartTheme.colors[row.tone] }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[0.68rem]">
                <span className="truncate text-muted-foreground">Raw <span className="font-mono text-foreground">{row.raw}</span></span>
                <span className="truncate text-muted-foreground">Score <span className="font-mono text-foreground">{Math.round(row.score)}</span></span>
                <span className="truncate text-muted-foreground">Conf <span className="font-mono text-foreground">{Math.round(row.confidence * 100)}%</span></span>
                <span className="truncate text-muted-foreground">Read <span className="font-mono text-foreground">{row.read}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <MathTraceGrid items={rows.map(row => ({
        label: row.axis,
        raw: row.raw,
        normalized: `${Math.round(row.score)} normalized`,
        weight: row.weight,
        confidence: `${Math.round(row.confidence * 100)}% confidence`,
        result: `${Math.round(row.contribution)} final`,
        tone: row.tone
      }))} />
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
              <stop offset="5%" stopColor={chartTheme.colors.good} stopOpacity={0.42} />
              <stop offset="95%" stopColor={chartTheme.colors.good} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={chartTheme.colors.grid} vertical={false} />
          <XAxis dataKey="name" tick={chartTheme.axis} />
          <YAxis tick={chartTheme.axis} />
          <ReferenceLine y={0} stroke={chartTheme.colors.zero} strokeDasharray="4 4" />
          <RechartsTooltip contentStyle={chartTheme.tooltipStyle} formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Return']} />
          <Area type="monotone" dataKey="value" stroke={chartTheme.colors.good} strokeWidth={2} fill="url(#returnRibbonFill)" />
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
            <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(shell.coveragePercent, 100))}%`, background: `linear-gradient(90deg, ${chartTheme.colors.danger}, ${chartTheme.colors.warn}, ${chartTheme.colors.good})` }} />
          </div>
        </div>
        <p className="font-mono text-xl font-semibold">{shell.coveragePercent}%</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {rows.slice(0, 8).map(row => (
          <div key={row.id} className="rounded-md border border-border bg-background/35 p-2">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColor(row.status) }} />
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

function ScatterTooltip({
  active,
  payload,
  xLabel,
  yLabel,
  zLabel
}: {
  active?: boolean
  payload?: { payload: Record<string, unknown> }[]
  xLabel: string
  yLabel: string
  zLabel?: string
}) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <div className="rounded-md border border-border bg-background/95 p-3 shadow">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs font-semibold">{String(row.ticker ?? 'N/A')}</p>
        {row.rank ? <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[0.62rem] text-muted-foreground">#{String(row.rank)}</span> : null}
      </div>
      <p className="mt-2 text-[0.68rem] text-muted-foreground">{xLabel}: {numberText(row.rs ?? row.crowding)}</p>
      <p className="text-[0.68rem] text-muted-foreground">{yLabel}: {numberText(row.return20d ?? row.extension)}</p>
      {zLabel ? <p className="text-[0.68rem] text-muted-foreground">{zLabel}: {numberText(row.catalyst ?? row.volume)}</p> : null}
      {row.status ? <p className="text-[0.68rem] text-muted-foreground">Status: {String(row.status)}</p> : null}
      {row.asOfDate ? <p className="text-[0.68rem] text-muted-foreground">As of: {String(row.asOfDate)}</p> : null}
      {row.trend || row.setup ? <p className="mt-2 text-[0.68rem] text-foreground">{String(row.trend ?? row.setup)}</p> : null}
    </div>
  )
}

function MissingChartState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className={chartTheme.missingState}>
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

function scorecardPoint(report: StockReport, axis: string, label: string, weight: string, detail: string) {
  const metric = metricByLabel(report, label)
  const score = normalizeMetricScore(metric, label)
  const confidence = statusConfidence(metric)
  const contribution = clamp(score * confidence, 0, 100)
  const tone = toneForScore(contribution)
  return {
    axis,
    label,
    detail,
    weight,
    score,
    raw: metric?.displayValue ?? 'Unavailable',
    available: metric?.value !== null && metric?.value !== undefined,
    confidence,
    contribution,
    tone,
    read: finalRead(contribution)
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function numberText(value: unknown) {
  if (typeof value === 'number') return value.toFixed(1)
  if (typeof value === 'string') return value
  return 'n/a'
}

function statusColor(status: ShellMeta['providerHealth'][number]['status']) {
  if (status === 'available') return chartTheme.colors.good
  if (status === 'partial') return chartTheme.colors.accent
  if (status === 'stale') return chartTheme.colors.warn
  if (status === 'entitlement_missing') return '#ff9f43'
  if (status === 'provider_error') return chartTheme.colors.danger
  return chartTheme.colors.neutral
}

function gapColor(reason: string, index: number) {
  const lower = reason.toLowerCase()
  if (lower.includes('provider') || lower.includes('unavailable')) return 'rgba(255, 119, 119, 0.55)'
  if (lower.includes('stale')) return 'rgba(217, 185, 110, 0.62)'
  if (lower.includes('entitlement')) return 'rgba(255, 159, 67, 0.58)'
  const palette = ['rgba(101, 228, 198, 0.35)', 'rgba(116, 179, 242, 0.35)', 'rgba(217, 185, 110, 0.38)']
  return palette[index % palette.length]
}

function finalRead(score: number) {
  if (score >= 70) return 'support'
  if (score >= 45) return 'mixed'
  return 'weak'
}

function paddedDomain(values: number[]): [number, number] {
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 0)
  const pad = Math.max(1, (max - min) * 0.18)
  return [Math.floor(min - pad), Math.ceil(max + pad)]
}

function QuadrantOverlay({ labels }: { labels: { topLeft: string; topRight: string; bottomLeft: string; bottomRight: string } }) {
  const labelClass = 'pointer-events-none absolute z-10 rounded border border-border bg-background/70 px-2 py-1 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground backdrop-blur'
  return (
    <>
      <span className={`${labelClass} left-12 top-4`}>{labels.topLeft}</span>
      <span className={`${labelClass} right-4 top-4`}>{labels.topRight}</span>
      <span className={`${labelClass} bottom-10 left-12`}>{labels.bottomLeft}</span>
      <span className={`${labelClass} bottom-10 right-4`}>{labels.bottomRight}</span>
    </>
  )
}

function BubbleLegend({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-background/35 px-3 py-2 text-[0.68rem] text-muted-foreground">
      <span className="font-mono text-foreground">{label}</span>
      <span>{detail}</span>
      <span className="ml-auto flex items-center gap-1">
        <span className="h-2 w-2 rounded-full border border-border bg-primary/70" />
        <span className="h-3 w-3 rounded-full border border-border bg-primary/70" />
        <span className="h-4 w-4 rounded-full border border-border bg-primary/70" />
      </span>
    </div>
  )
}

function PointLabel({ x, y, index, rows }: { x?: number | string; y?: number | string; index?: number; rows: { ticker: string; rank: number }[] }) {
  const row = typeof index === 'number' ? rows[index] : null
  if (!row || row.rank > 5 || x === undefined || y === undefined) return null
  return (
    <text
      x={Number(x) + 8}
      y={Number(y) - 8}
      fill={chartTheme.colors.foreground}
      fontFamily="JetBrains Mono, ui-monospace, monospace"
      fontSize={10}
      fontWeight={700}
    >
      {row.ticker}
    </text>
  )
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
