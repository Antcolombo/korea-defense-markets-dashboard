import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Card as TremorCard } from '@tremor/react'
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import { createChart, LineSeries } from 'lightweight-charts'
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Clipboard,
  Download,
  FileText,
  Gauge,
  Layers3,
  LineChart,
  ListFilter,
  Search,
  Shield,
  SlidersHorizontal,
  Table2,
  Terminal,
  Zap
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { ShellMeta, UnavailableField } from '@/lib/research/api'
import type {
  BasketSummary,
  CrowdingRow,
  DailyNoteDto,
  MetricValue,
  PositioningRow,
  RotationRow,
  StockReport,
  ValidationRow
} from '@/lib/research/types'
import type { Event } from '@/types/event'
import type { PricePoint } from '@/types/market'

type ChartPricePoint = Pick<PricePoint, 'date' | 'ticker' | 'price'>

export type WorkspaceModule =
  | 'overview'
  | 'rotation'
  | 'baskets'
  | 'basket-detail'
  | 'positioning'
  | 'crowding'
  | 'daily-note'
  | 'validation'
  | 'methodology'
  | 'korea-defense'
  | 'stock-report'

export type WorkspaceData = {
  rotations?: RotationRow[]
  baskets?: BasketSummary[]
  basketSummary?: BasketSummary | null
  basketSignals?: RotationRow[]
  basketCrowding?: CrowdingRow[]
  positioning?: PositioningRow[]
  crowding?: CrowdingRow[]
  note?: DailyNoteDto
  validation?: ValidationRow[]
  report?: StockReport
  events?: Event[]
  prices?: ChartPricePoint[]
}

export type TerminalWorkspaceProps = {
  module: WorkspaceModule
  data: WorkspaceData
  shell: ShellMeta
  unavailableFields: UnavailableField[]
  selectedTicker?: string
  selectedSlug?: string
}

type ModuleMeta = {
  id: WorkspaceModule
  label: string
  short: string
  href: string
  icon: typeof Activity
}

const modules: ModuleMeta[] = [
  { id: 'overview', label: 'Overview', short: 'FLOW', href: '/?module=overview', icon: Terminal },
  { id: 'rotation', label: 'Rotation', short: 'RS', href: '/?module=rotation', icon: LineChart },
  { id: 'baskets', label: 'Baskets', short: 'BASKET', href: '/?module=baskets', icon: Layers3 },
  { id: 'positioning', label: 'Positioning', short: 'OPTIONS', href: '/?module=positioning', icon: SlidersHorizontal },
  { id: 'crowding', label: 'Crowding', short: 'CROWD', href: '/?module=crowding', icon: Gauge },
  { id: 'daily-note', label: 'Daily Note', short: 'NOTE', href: '/?module=daily-note', icon: FileText },
  { id: 'validation', label: 'Validation', short: 'VALID', href: '/?module=validation', icon: Table2 },
  { id: 'methodology', label: 'Methodology', short: 'METHOD', href: '/?module=methodology', icon: ListFilter },
  { id: 'korea-defense', label: 'Korea Defense', short: 'KDEF', href: '/?module=korea-defense', icon: Shield },
  { id: 'stock-report', label: 'Stock Report', short: 'REPORT', href: '/?module=stock-report&ticker=NVDA', icon: BarChart3 }
]

export function TerminalWorkspace({
  module,
  data,
  shell,
  unavailableFields,
  selectedTicker,
  selectedSlug
}: TerminalWorkspaceProps) {
  const router = useRouter()
  const activeMeta = modules.find(item => item.id === module) ?? modules[0]
  const watchlist = buildWatchlist(data)
  const defaultTicker = selectedTicker ?? data.report?.ticker ?? watchlist[0]?.ticker ?? 'NVDA'
  const [ticker, setTicker] = useState(defaultTicker)
  const focusedTicker = ticker || defaultTicker

  useEffect(() => {
    setTicker(defaultTicker)
  }, [defaultTicker])

  function submitTicker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = ticker.trim().toUpperCase()
    if (!value) return
    router.push(`/report/${encodeURIComponent(value)}`)
  }

  const mainPanel = (
    <MainModule
      module={module}
      data={data}
      shell={shell}
      selectedTicker={focusedTicker}
      selectedSlug={selectedSlug}
      unavailableFields={unavailableFields}
    />
  )

  return (
    <TooltipProvider>
      <main className="terminal-v2 flex h-screen min-h-screen flex-col overflow-hidden bg-background text-foreground">
        <header className="terminal-command-bar border-b border-border bg-card/80 px-3 py-2 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex min-w-[150px] items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/40 bg-primary/15 text-primary">
                <Terminal className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-bold tracking-[0.2em] text-foreground">LIQUIDCHAIN</p>
                <p className="truncate font-mono text-[0.62rem] uppercase text-muted-foreground">source aware market OS</p>
              </div>
            </div>

            <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto lg:flex" aria-label="Workspace modules">
              {modules.map(item => {
                const Icon = item.icon
                return (
                  <Button key={item.id} asChild variant={item.id === module ? 'secondary' : 'ghost'} size="sm" className="font-mono text-[0.7rem]">
                    <Link href={item.href}>
                      <Icon className="h-3.5 w-3.5" />
                      {item.short}
                    </Link>
                  </Button>
                )
              })}
            </nav>
          </div>

          <form onSubmit={submitTicker} className="flex min-w-0 items-center gap-2">
            <div className="relative min-w-[190px] flex-1 lg:w-[320px] lg:flex-none">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={ticker}
                onChange={event => setTicker(event.target.value.toUpperCase())}
                className="h-8 pl-8 font-mono text-xs"
                aria-label="Ticker command"
                placeholder="/report NVDA"
              />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="submit" size="icon-sm" variant="secondary" aria-label="Open stock report">
                  <Zap className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open stock report</TooltipContent>
            </Tooltip>
            <Badge variant="outline" className="hidden font-mono sm:inline-flex">{statusLabel(shell)}</Badge>
          </form>
        </header>

        <MetricStrip data={data} shell={shell} active={activeMeta} />

        <section className="hidden min-h-0 flex-1 lg:block">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={18} minSize={14}>
              <LeftRail active={module} watchlist={watchlist} data={data} />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={58} minSize={42}>
              {mainPanel}
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={24} minSize={18}>
              <RightRail shell={shell} data={data} unavailableFields={unavailableFields} active={activeMeta} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </section>

        <section className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden lg:hidden">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 p-3">
            <MobileModuleSelect module={module} />
            <LeftRail active={module} watchlist={watchlist} data={data} compact />
            {mainPanel}
            <RightRail shell={shell} data={data} unavailableFields={unavailableFields} active={activeMeta} />
          </div>
        </section>
      </main>
    </TooltipProvider>
  )
}

function MobileModuleSelect({ module }: { module: WorkspaceModule }) {
  const router = useRouter()
  return (
    <Select
      value={module}
      onValueChange={value => {
        const next = modules.find(item => item.id === value)
        if (next) router.push(next.href)
      }}
    >
      <SelectTrigger className="min-w-0 max-w-full font-mono">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {modules.map(item => (
          <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function MetricStrip({ data, shell, active }: { data: WorkspaceData; shell: ShellMeta; active: ModuleMeta }) {
  const topRotation = maxBy(data.rotations ?? data.basketSignals ?? [], row => row.return20d.value)
  const topCrowding = maxBy(data.crowding ?? data.basketCrowding ?? [], row => row.crowdingScore.value)
  const topBasket = maxBy(data.baskets ?? [], row => row.relativeStrengthVsSpy20d.value)
  const positioned = (data.positioning ?? []).filter(row => row.optionsVolume.value !== null).length
  const metrics = [
    { label: 'Module', value: active.short, sub: active.label },
    { label: 'Coverage', value: `${shell.coveragePercent}%`, sub: `${shell.unavailableCount} visible gaps` },
    { label: 'Top RS', value: topRotation?.ticker ?? topBasket?.name ?? 'N/A', sub: topRotation ? metricText(topRotation.relativeStrengthVsSpy20d) : topBasket ? metricText(topBasket.relativeStrengthVsSpy20d) : 'No row' },
    { label: 'Crowding', value: topCrowding?.ticker ?? 'N/A', sub: topCrowding ? `${metricText(topCrowding.crowdingScore, { suffix: '' })} ${topCrowding.crowdingLabel}` : 'No score' },
    { label: 'Options Rows', value: positioned.toString(), sub: data.positioning?.length ? `${data.positioning.length} proxy rows` : 'Module scoped' }
  ]

  return (
    <section className="grid grid-cols-2 gap-2 border-b border-border bg-background/95 p-2 md:grid-cols-5">
      {metrics.map(metric => (
        <TremorCard key={metric.label} className="rounded-md border border-border bg-card p-3 shadow-none ring-0">
          <p className="font-mono text-[0.65rem] uppercase text-muted-foreground">{metric.label}</p>
          <p className="mt-1 truncate font-mono text-lg font-semibold text-foreground">{metric.value}</p>
          <p className="mt-1 truncate font-mono text-[0.68rem] text-muted-foreground">{metric.sub}</p>
        </TremorCard>
      ))}
    </section>
  )
}

function LeftRail({
  active,
  watchlist,
  data,
  compact = false
}: {
  active: WorkspaceModule
  watchlist: WatchRow[]
  data: WorkspaceData
  compact?: boolean
}) {
  return (
    <aside className={`flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden border-r border-border bg-card/45 ${compact ? 'rounded-md border' : ''}`}>
      <div className="border-b border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
            <h2 className="font-mono text-sm font-semibold">Module Rail</h2>
          </div>
          <Badge variant="outline" className="font-mono">{active.toUpperCase()}</Badge>
        </div>
      </div>
      <ScrollArea className="min-h-0 w-full flex-1">
        <div className="grid gap-3 p-2">
          <div className="grid gap-1">
            {modules.map(item => {
              const Icon = item.icon
              return (
                <Button key={item.id} asChild variant={item.id === active ? 'secondary' : 'ghost'} className="w-full min-w-0 justify-start overflow-hidden font-mono text-xs">
                  <Link href={item.href}>
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                </Button>
              )
            })}
          </div>
          <Separator />
          <div>
            <p className="mb-2 px-1 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Watchlist</p>
            <div className="grid gap-1">
              {watchlist.length ? watchlist.slice(0, 14).map(row => (
                <Link
                  key={`${row.ticker}-${row.label}`}
                  href={`/?module=stock-report&ticker=${encodeURIComponent(row.ticker)}`}
                  className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md border border-transparent px-2 py-2 text-left no-underline hover:border-border hover:bg-muted/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-sm font-semibold">{row.ticker}</span>
                    <span className="block truncate font-mono text-[0.68rem] text-muted-foreground">{row.label}</span>
                  </span>
                  <span className={row.value >= 0 ? 'font-mono text-xs text-emerald-300' : 'font-mono text-xs text-red-300'}>{formatSigned(row.value)}</span>
                </Link>
              )) : (
                <EmptyLine title="No watchlist rows" detail="Selected module has no ticker set." />
              )}
            </div>
          </div>
          {data.baskets?.length ? (
            <>
              <Separator />
              <div>
                <p className="mb-2 px-1 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Theme Tape</p>
                <div className="grid gap-1">
                  {data.baskets.slice(0, 8).map(basket => (
                    <Link key={basket.slug} href={`/?module=basket-detail&slug=${basket.slug}`} className="block min-w-0 rounded-md px-2 py-2 no-underline hover:bg-muted/50">
                      <span className="block truncate font-mono text-xs font-semibold">{basket.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{basket.basketLabel}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </ScrollArea>
    </aside>
  )
}

function RightRail({
  shell,
  data,
  unavailableFields,
  active
}: {
  shell: ShellMeta
  data: WorkspaceData
  unavailableFields: UnavailableField[]
  active: ModuleMeta
}) {
  const questions = data.note?.pmQuestions ?? data.report?.pmQuestions ?? defaultQuestions(active.id)
  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-border bg-card/45">
      <div className="border-b border-border p-3">
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Source / Risk</p>
        <h2 className="mt-1 font-mono text-sm font-semibold">{active.label}</h2>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="grid gap-3 p-2">
          <Panel title="Provider Health" kicker="Live audit" action={<Badge variant="outline">{shell.coveragePercent}%</Badge>}>
            <div className="grid gap-2">
              {shell.providerHealth.length ? shell.providerHealth.map(item => (
                <div key={item.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-md border border-border bg-background/45 p-2">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-semibold">{item.label}</p>
                    <p className="truncate text-[0.68rem] text-muted-foreground">{item.detail}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              )) : <EmptyLine title="No provider rows" detail="Static module or unavailable source context." />}
            </div>
          </Panel>

          <Panel title="PM Questions" kicker="Decision queue">
            <ol className="grid gap-2">
              {questions.slice(0, 5).map(question => (
                <li key={question} className="rounded-md border border-border bg-background/45 p-2 text-xs leading-5 text-muted-foreground">{question}</li>
              ))}
            </ol>
          </Panel>

          <Panel title="Unavailable Inputs" kicker={`${unavailableFields.length} tracked`}>
            <div className="grid gap-2">
              {unavailableFields.length ? unavailableFields.slice(0, 8).map((field, index) => (
                <div key={`${field.field}-${index}`} className="rounded-md border border-border bg-background/45 p-2">
                  <p className="font-mono text-xs text-foreground">{field.field}</p>
                  <p className="mt-1 text-[0.68rem] text-muted-foreground">{field.reason}</p>
                </div>
              )) : <EmptyLine title="No unavailable fields" detail="Current module response has no recorded gaps." />}
            </div>
          </Panel>
        </div>
      </ScrollArea>
    </aside>
  )
}

function MainModule(props: {
  module: WorkspaceModule
  data: WorkspaceData
  shell: ShellMeta
  selectedTicker: string
  selectedSlug?: string
  unavailableFields: UnavailableField[]
}) {
  const { module, data } = props
  if (module === 'rotation') return <RotationModule rows={data.rotations ?? []} prices={data.prices ?? []} />
  if (module === 'baskets') return <BasketsModule baskets={data.baskets ?? []} />
  if (module === 'basket-detail') return <BasketDetailModule data={data} />
  if (module === 'positioning') return <PositioningModule rows={data.positioning ?? []} />
  if (module === 'crowding') return <CrowdingModule rows={data.crowding ?? []} />
  if (module === 'daily-note') return <DailyNoteModule note={data.note} />
  if (module === 'validation') return <ValidationModule rows={data.validation ?? []} />
  if (module === 'methodology') return <MethodologyModule />
  if (module === 'korea-defense') return <KoreaDefenseModule data={data} />
  if (module === 'stock-report') return <StockReportModule report={data.report} unavailableFields={props.unavailableFields} />
  return <OverviewModule data={data} selectedTicker={props.selectedTicker} />
}

function OverviewModule({ data, selectedTicker }: { data: WorkspaceData; selectedTicker: string }) {
  const rotations = data.rotations ?? []
  const baskets = data.baskets ?? []
  const crowding = data.crowding ?? []
  const note = data.note
  const topRotations = rotations.slice().sort((a, b) => metricValue(b.return20d) - metricValue(a.return20d)).slice(0, 8)
  const topBaskets = baskets.slice().sort((a, b) => metricValue(b.relativeStrengthVsSpy20d) - metricValue(a.relativeStrengthVsSpy20d)).slice(0, 6)

  return (
    <ModuleFrame title="Market Workstation" kicker="Overview" description="Source-aware rotation, positioning, crowding, and PM work product in one terminal.">
      <div className="grid min-h-0 gap-3 xl:grid-cols-[1.4fr_0.9fr]">
        <Panel title={`${selectedTicker} Price Tape`} kicker="Sourced close series">
          <PriceChart prices={data.prices ?? []} ticker={selectedTicker} />
        </Panel>
        <Panel title="AI Read" kicker={note?.noteStatus ?? 'Generated'}>
          <p className="text-sm leading-6 text-muted-foreground">{note?.body ?? 'No daily note available for current source state.'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(note?.topRotations ?? []).slice(0, 4).map(item => <Badge key={item} variant="outline">{item}</Badge>)}
          </div>
        </Panel>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="Rotation Leaders" kicker="ETF board">
          <DataTable data={topRotations} columns={rotationColumns} />
        </Panel>
        <Panel title="Theme Sponsorship" kicker="Basket board">
          <DataTable data={topBaskets} columns={basketColumns} />
        </Panel>
      </div>
      <Panel title="Crowding Monitor" kicker="Top risk rows">
        <DataTable data={crowding.slice(0, 8)} columns={crowdingColumns} />
      </Panel>
    </ModuleFrame>
  )
}

function RotationModule({ rows, prices }: { rows: RotationRow[]; prices: ChartPricePoint[] }) {
  const leader = maxBy(rows, row => row.relativeStrengthVsSpy20d.value)
  return (
    <ModuleFrame title="Sector Rotation Board" kicker="Rotation" description="ETF-level relative strength, volume confirmation, realized volatility, and trend labels.">
      <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title={leader ? `${leader.ticker} Leadership Chart` : 'Leadership Chart'} kicker="Price close">
          <PriceChart prices={prices} ticker={leader?.ticker ?? rows[0]?.ticker ?? 'SPY'} />
        </Panel>
        <Panel title="Rotation Read" kicker="Interpretation">
          <div className="grid gap-2">
            {rows.slice(0, 5).map(row => (
              <div key={row.ticker} className="grid grid-cols-[1fr_auto] rounded-md border border-border bg-background/45 p-3">
                <div>
                  <p className="font-mono text-sm font-semibold">{row.ticker} / {row.name}</p>
                  <p className="text-xs text-muted-foreground">{row.trendLabel}</p>
                </div>
                <div className="text-right font-mono text-sm">{metricText(row.relativeStrengthVsSpy20d)}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel title="ETF Rotation Table" kicker={`${rows.length} rows`}>
        <DataTable data={rows} columns={rotationColumns} />
      </Panel>
    </ModuleFrame>
  )
}

function BasketsModule({ baskets }: { baskets: BasketSummary[] }) {
  return (
    <ModuleFrame title="Theme Basket Monitor" kicker="Baskets" description="Compare sponsorship, contributors, laggards, crowding, and source coverage.">
      <div className="grid gap-3 xl:grid-cols-3">
        {baskets.slice(0, 9).map(basket => (
          <Card key={basket.slug} className="rounded-md border-border bg-card">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="truncate font-mono text-sm">{basket.name}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{basket.category}</p>
                </div>
                <StatusBadge status={basket.dataStatus} />
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              <p className="line-clamp-3 min-h-[3.75rem] text-sm leading-5 text-muted-foreground">{basket.description}</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <MetricMini label="20D" value={metricText(basket.return20d)} />
                <MetricMini label="RS" value={metricText(basket.relativeStrengthVsSpy20d)} />
                <MetricMini label="Crowd" value={metricText(basket.averageCrowdingScore, { suffix: '' })} />
              </div>
              <Button asChild variant="outline" size="sm" className="font-mono">
                <Link href={`/?module=basket-detail&slug=${basket.slug}`}>Open Basket</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <Panel title="Basket Ranking Table" kicker={`${baskets.length} baskets`}>
        <DataTable data={baskets} columns={basketColumns} />
      </Panel>
    </ModuleFrame>
  )
}

function BasketDetailModule({ data }: { data: WorkspaceData }) {
  const summary = data.basketSummary
  if (!summary) {
    return <ModuleFrame title="Basket Not Found" kicker="Basket detail"><EmptyLine title="Missing basket" detail="No basket matched selected slug." /></ModuleFrame>
  }
  const signals = data.basketSignals ?? []
  const crowding = data.basketCrowding ?? []
  const positioning = data.positioning ?? []
  return (
    <ModuleFrame title={summary.name} kicker={summary.category} description={summary.description}>
      <div className="grid gap-3 md:grid-cols-4">
        <MetricPanel label="5D Return" value={metricText(summary.return5d)} />
        <MetricPanel label="20D Return" value={metricText(summary.return20d)} />
        <MetricPanel label="RS vs SPY" value={metricText(summary.relativeStrengthVsSpy20d)} />
        <MetricPanel label="Crowding" value={metricText(summary.averageCrowdingScore, { suffix: '' })} />
      </div>
      <Panel title="Contributor Evidence" kicker="Signals">
        <DataTable data={signals} columns={rotationColumns} />
      </Panel>
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="Crowding Components" kicker="Basket members">
          <DataTable data={crowding} columns={crowdingColumns} />
        </Panel>
        <Panel title="Positioning Proxy" kicker="Options / short proxy">
          <DataTable data={positioning} columns={positioningColumns} />
        </Panel>
      </div>
    </ModuleFrame>
  )
}

function PositioningModule({ rows }: { rows: PositioningRow[] }) {
  const unavailable = rows.flatMap(row => row.excludedUnavailableInputs.map(field => ({ ticker: row.ticker, field })))
  return (
    <ModuleFrame title="Positioning Proxy Board" kicker="Options / short proxy" description="Public options, short-interest, and FINRA short-sale volume proxies. No proprietary flow claim.">
      <Tabs defaultValue="options" className="min-h-0">
        <TabsList className="mb-3 flex-wrap">
          <TabsTrigger value="options">Options</TabsTrigger>
          <TabsTrigger value="short-interest">Short Interest</TabsTrigger>
          <TabsTrigger value="short-sale">Short Sale</TabsTrigger>
          <TabsTrigger value="unavailable">Unavailable</TabsTrigger>
        </TabsList>
        <TabsContent value="options">
          <Panel title="Options Proxy Table" kicker={`${rows.length} rows`}>
            <DataTable data={rows} columns={positioningColumns} />
          </Panel>
        </TabsContent>
        <TabsContent value="short-interest">
          <Panel title="Short Interest Proxy" kicker="Settlement data">
            <DataTable data={rows} columns={shortInterestColumns} />
          </Panel>
        </TabsContent>
        <TabsContent value="short-sale">
          <Panel title="FINRA Short-Sale Volume" kicker="Flow proxy">
            <DataTable data={rows} columns={shortSaleColumns} />
          </Panel>
        </TabsContent>
        <TabsContent value="unavailable">
          <Panel title="Unavailable Positioning Inputs" kicker={`${unavailable.length} fields`}>
            <DataTable data={unavailable} columns={unavailablePositioningColumns} />
          </Panel>
        </TabsContent>
      </Tabs>
    </ModuleFrame>
  )
}

function CrowdingModule({ rows }: { rows: CrowdingRow[] }) {
  const [selectedTicker, setSelectedTicker] = useState(rows[0]?.ticker ?? '')
  const selected = rows.find(row => row.ticker === selectedTicker) ?? rows[0]
  useEffect(() => {
    if (!selectedTicker && rows[0]) setSelectedTicker(rows[0].ticker)
  }, [rows, selectedTicker])

  return (
    <ModuleFrame title="Crowding Monitor" kicker="Crowding" description="Scores use available sourced components only; missing components stay visible.">
      <div className="grid gap-3 xl:grid-cols-[1.4fr_0.8fr]">
        <Panel title="Crowding Scores" kicker={`${rows.length} rows`}>
          <DataTable
            data={rows}
            columns={[
              ...crowdingColumns,
              {
                id: 'open',
                header: '',
                cell: ({ row }) => <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedTicker(row.original.ticker)}>Inspect</Button>
              }
            ]}
          />
        </Panel>
        <Panel title={selected ? `${selected.ticker} Detail` : 'Detail'} kicker="Component read">
          {selected ? (
            <div className="grid gap-3">
              <p className="text-sm leading-6 text-muted-foreground">{selected.explanation}</p>
              <div className="grid grid-cols-2 gap-2">
                <MetricMini label="Momentum" value={metricText(selected.momentumScore, { suffix: '' })} />
                <MetricMini label="Volume" value={metricText(selected.volumeScore, { suffix: '' })} />
                <MetricMini label="Options" value={metricText(selected.optionsScore, { suffix: '' })} />
                <MetricMini label="Short" value={metricText(selected.shortInterestScore, { suffix: '' })} />
              </div>
              <StatusBadge status={selected.dataStatus} />
            </div>
          ) : <EmptyLine title="No row selected" detail="Crowding rows are unavailable." />}
        </Panel>
      </div>
    </ModuleFrame>
  )
}

function DailyNoteModule({ note }: { note?: DailyNoteDto }) {
  const [draft, setDraft] = useState(note?.body ?? '')
  useEffect(() => setDraft(note?.body ?? ''), [note?.body])
  if (!note) return <ModuleFrame title="Daily Note" kicker="PM output"><EmptyLine title="No note" detail="Daily note data unavailable." /></ModuleFrame>
  return (
    <ModuleFrame title={note.title} kicker="Daily note" description={`${note.marketRegime} / ${note.sourceCoveragePercent}% source coverage`}>
      <div className="grid gap-3 xl:grid-cols-[1fr_0.9fr]">
        <Panel title="PM Note" kicker={note.noteStatus} action={<CopyButton text={note.body} />}>
          <Textarea className="min-h-[360px] font-mono text-xs leading-6" value={draft} onChange={event => setDraft(event.target.value)} />
        </Panel>
        <div className="grid gap-3">
          <ListPanel title="Top Rotations" items={note.topRotations} />
          <ListPanel title="Crowded Longs" items={note.crowdedLongs} />
          <ListPanel title="Reversal Risks" items={note.reversalRisks} />
          <ListPanel title="PM Questions" items={note.pmQuestions} />
        </div>
      </div>
    </ModuleFrame>
  )
}

function ValidationModule({ rows }: { rows: ValidationRow[] }) {
  const insufficient = rows.every(row => row.sampleSize === 0)
  return (
    <ModuleFrame title="Signal Validation Lab" kicker="Validation" description="Shows whether crowding, RS plus volume, and options spikes have sourced historical support.">
      {insufficient ? (
        <Panel title="Insufficient History" kicker="Blocked">
          <p className="text-sm leading-6 text-muted-foreground">No sourced validation sample exists yet. Results stay unavailable instead of showing model confidence.</p>
        </Panel>
      ) : null}
      <div className="grid gap-3 xl:grid-cols-3">
        {rows.map(row => (
          <Card key={row.testName} className="rounded-md border-border bg-card">
            <CardHeader>
              <CardTitle className="font-mono text-sm">{row.testName}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <MetricMini label="Hit Rate" value={metricText(row.hitRate)} />
              <MetricMini label="Avg Fwd Return" value={metricText(row.averageForwardReturn)} />
              <MetricMini label="Sample" value={row.sampleSize.toString()} />
              <p className="text-xs leading-5 text-muted-foreground">{row.caveats}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Panel title="Validation Results" kicker={`${rows.length} tests`}>
        <DataTable data={rows} columns={validationColumns} />
      </Panel>
    </ModuleFrame>
  )
}

function MethodologyModule() {
  const sourceRows = [
    { area: 'Rotation', source: 'Sourced OHLCV / signal snapshots', limit: 'No execution-grade tick data' },
    { area: 'Positioning', source: 'Options, short-interest, FINRA short-sale volume', limit: 'No proprietary fund-flow claim' },
    { area: 'Crowding', source: 'Weighted available components', limit: 'Unavailable components excluded and shown' },
    { area: 'Validation', source: 'Historical sourced samples', limit: 'No result when sample is insufficient' }
  ]
  return (
    <ModuleFrame title="Public-Data Flow Methodology" kicker="Methodology" description="Proxy framework, data limits, signal definitions, provider caveats, and validation discipline.">
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="What This System Does" kicker="Scope">
          <p className="text-sm leading-7 text-muted-foreground">Monitors sector rotation, theme sponsorship, positioning proxies, crowding, reversal risk, and PM-style notes from sourced market data.</p>
        </Panel>
        <Panel title="What This System Does Not Do" kicker="Limits">
          <p className="text-sm leading-7 text-muted-foreground">It does not claim proprietary fund-flow data, execution-grade prices, trade recommendations, or buy/sell signals. Missing provider fields are not imputed.</p>
        </Panel>
      </div>
      <Panel title="Data Sources" kicker="Audit">
        <DataTable data={sourceRows} columns={methodologyColumns} />
      </Panel>
      <div className="grid gap-3 xl:grid-cols-2">
        <Formula title="Signal Formula" body="relative_strength_20d = ticker_return_20d - SPY_return_20d; volume_confirmation = current_volume / 20d_avg_volume" />
        <Formula title="Crowding Score" body="crowding_score = weighted available components only: momentum + volume + options + volatility + short_proxy" />
        <Formula title="Coverage" body="coverage_percent = available_fields / total_expected_fields; unavailable, stale, entitlement-missing, and provider-error fields remain visible" />
        <Formula title="Data Status" body="available | unavailable | partial | stale | entitlement_missing | provider_error" />
      </div>
    </ModuleFrame>
  )
}

function KoreaDefenseModule({ data }: { data: WorkspaceData }) {
  const signals = data.rotations ?? data.basketSignals ?? []
  const crowding = data.crowding ?? data.basketCrowding ?? []
  const events = data.events ?? []
  return (
    <ModuleFrame title="Korea / Indo-Pacific Defense" kicker="Case study" description="Applied case study for defense-linked sponsorship, crowding, catalysts, and invalidation.">
      <div className="grid gap-3 xl:grid-cols-[1fr_0.9fr]">
        <Panel title="Current Flow Read" kicker="Signals">
          <DataTable data={signals} columns={rotationColumns} />
        </Panel>
        <Panel title="Catalyst Tracker" kicker={`${events.length} events`}>
          <div className="grid gap-2">
            {events.slice(0, 8).map(event => (
              <div key={event.id} className="rounded-md border border-border bg-background/45 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-mono text-xs font-semibold">{event.title}</p>
                  <Badge variant={event.verified ? 'secondary' : 'outline'}>{event.verified ? 'Verified' : 'Check'}</Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{event.summary}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel title="Crowding Assessment" kicker="Basket members">
        <DataTable data={crowding} columns={crowdingColumns} />
      </Panel>
      <Panel title="Confirmation / Invalidation" kicker="Decision rules">
        <div className="grid gap-2 md:grid-cols-2">
          <Rule label="Confirm" text="EWY and defense proxies broaden together while crowding stays below reversal-risk band." />
          <Rule label="Invalidate" text="Relative strength rolls over, unavailable positioning fields dominate, or crowding turns into exit risk without fresh catalyst support." />
        </div>
      </Panel>
    </ModuleFrame>
  )
}

function StockReportModule({ report, unavailableFields }: { report?: StockReport; unavailableFields: UnavailableField[] }) {
  const router = useRouter()
  const [ticker, setTicker] = useState(report?.ticker ?? 'NVDA')
  useEffect(() => setTicker(report?.ticker ?? 'NVDA'), [report?.ticker])
  if (!report) return <ModuleFrame title="Stock Report" kicker="Report"><EmptyLine title="No report" detail="Report data unavailable." /></ModuleFrame>
  const activeReport = report

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = ticker.trim().toUpperCase()
    if (value) router.push(`/report/${encodeURIComponent(value)}`)
  }

  function exportMarkdown() {
    const blob = new Blob([activeReport.markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${activeReport.ticker.toLowerCase()}-report.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ModuleFrame title={`${activeReport.ticker} Stock Report`} kicker={activeReport.companyName} description={activeReport.summary}>
      <Panel
        title="Ticker Command"
        kicker="Generate report"
        action={<CopyButton text={activeReport.markdown} label="Copy MD" />}
      >
        <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
          <Input value={ticker} onChange={event => setTicker(event.target.value.toUpperCase())} className="max-w-[180px] font-mono" aria-label="Stock report ticker" />
          <Button type="submit">Generate</Button>
          <Button type="button" variant="outline" onClick={exportMarkdown}>
            <Download className="h-4 w-4" />
            Export .md
          </Button>
        </form>
      </Panel>
      <div className="grid gap-3 xl:grid-cols-[1fr_0.9fr]">
        <Panel title="Variant View" kicker="Report read">
          <p className="text-sm leading-7 text-muted-foreground">{activeReport.variantView}</p>
          <ListPanel title="Risks" items={activeReport.risks} />
          <ListPanel title="Invalidation" items={activeReport.invalidation} />
        </Panel>
        <Panel title="Unavailable Inputs" kicker={`${unavailableFields.length} fields`}>
          <div className="grid gap-2">
            {unavailableFields.slice(0, 8).map((field, index) => (
              <div key={`${field.field}-${index}`} className="rounded-md border border-border bg-background/45 p-2">
                <p className="font-mono text-xs">{field.field}</p>
                <p className="text-[0.68rem] text-muted-foreground">{field.reason}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel title="Evidence Stack" kicker={`${report.evidence.length} sections`}>
        <div className="grid gap-3">
          {[...activeReport.evidence, activeReport.positioning, activeReport.catalysts].map(section => (
            <Card key={section.title} className="rounded-md border-border bg-background/40">
              <CardHeader>
                <CardTitle className="font-mono text-sm">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{section.summary}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {section.metrics.slice(0, 6).map(metric => <MetricMini key={metric.label} label={metric.label} value={metric.displayValue} />)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Panel>
    </ModuleFrame>
  )
}

function PriceChart({ prices, ticker }: { prices: ChartPricePoint[]; ticker: string }) {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const data = useMemo(() => prices
    .filter(point => point.ticker === ticker)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(point => ({ time: point.date, value: point.price })), [prices, ticker])

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return
    const element = chartRef.current
    const chart = createChart(element, {
      width: element.clientWidth,
      height: element.clientHeight,
      layout: {
        background: { color: 'transparent' },
        textColor: 'rgba(255,255,255,0.64)'
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.06)' },
        horzLines: { color: 'rgba(255,255,255,0.08)' }
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false }
    })
    const series = chart.addSeries(LineSeries, {
      color: '#50d2c1',
      lineWidth: 2,
      priceLineVisible: false
    })
    series.setData(data as never)
    chart.timeScale().fitContent()
    const resize = new ResizeObserver(entries => {
      const entry = entries[0]
      if (!entry) return
      chart.applyOptions({
        width: Math.max(1, Math.floor(entry.contentRect.width)),
        height: Math.max(1, Math.floor(entry.contentRect.height))
      })
    })
    resize.observe(element)
    return () => {
      resize.disconnect()
      chart.remove()
    }
  }, [data])

  return (
    <div className="relative h-[360px] min-h-[260px] w-full">
      {data.length === 0 ? (
        <div className="absolute inset-0 grid place-items-center rounded-md border border-dashed border-border bg-background/35">
          <EmptyLine title={`No ${ticker} close series`} detail="Chart stays empty until sourced price rows exist." />
        </div>
      ) : null}
      <div ref={chartRef} className="h-full w-full" />
    </div>
  )
}

function DataTable<T extends object>({ data, columns }: { data: T[]; columns: ColumnDef<T, unknown>[] }) {
  const [sorting, setSorting] = useState<SortingState>([])
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="max-h-[520px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id} className="whitespace-nowrap font-mono text-[0.68rem] uppercase text-muted-foreground">
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1"
                        onClick={header.column.getToggleSortingHandler()}
                        disabled={!header.column.getCanSort()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' ? <ArrowUp className="h-3 w-3" /> : null}
                        {header.column.getIsSorted() === 'desc' ? <ArrowDown className="h-3 w-3" /> : null}
                      </button>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map(row => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id} className="whitespace-nowrap font-mono text-xs">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <EmptyLine title="No rows" detail="Source data unavailable for this module." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

const rotationColumns: ColumnDef<RotationRow, unknown>[] = [
  { accessorKey: 'ticker', header: 'Ticker', cell: ({ row }) => row.original.ticker },
  { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="max-w-[220px] truncate">{row.original.name}</span> },
  { id: 'return20d', header: '20D', accessorFn: row => row.return20d.value ?? -9999, cell: ({ row }) => metricText(row.original.return20d) },
  { id: 'rs', header: 'RS vs SPY', accessorFn: row => row.relativeStrengthVsSpy20d.value ?? -9999, cell: ({ row }) => metricText(row.original.relativeStrengthVsSpy20d) },
  { id: 'volume', header: 'Vol/Avg', accessorFn: row => row.volumeVs20dAvg.value ?? -9999, cell: ({ row }) => metricText(row.original.volumeVs20dAvg, { suffix: 'x', decimals: 2 }) },
  { accessorKey: 'trendLabel', header: 'Trend', cell: ({ row }) => row.original.trendLabel },
  { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.dataStatus} /> }
]

const basketColumns: ColumnDef<BasketSummary, unknown>[] = [
  { accessorKey: 'name', header: 'Basket', cell: ({ row }) => <Link href={`/?module=basket-detail&slug=${row.original.slug}`}>{row.original.name}</Link> },
  { id: 'return20d', header: '20D', accessorFn: row => row.return20d.value ?? -9999, cell: ({ row }) => metricText(row.original.return20d) },
  { id: 'rs', header: 'RS vs SPY', accessorFn: row => row.relativeStrengthVsSpy20d.value ?? -9999, cell: ({ row }) => metricText(row.original.relativeStrengthVsSpy20d) },
  { id: 'crowding', header: 'Crowding', accessorFn: row => row.averageCrowdingScore.value ?? -9999, cell: ({ row }) => metricText(row.original.averageCrowdingScore, { suffix: '' }) },
  { accessorKey: 'basketLabel', header: 'Label', cell: ({ row }) => row.original.basketLabel },
  { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.dataStatus} /> }
]

const positioningColumns: ColumnDef<PositioningRow, unknown>[] = [
  { accessorKey: 'ticker', header: 'Ticker', cell: ({ row }) => row.original.ticker },
  { id: 'optionsVolume', header: 'Opt Vol', accessorFn: row => row.optionsVolume.value ?? -9999, cell: ({ row }) => metricText(row.original.optionsVolume, { suffix: '', decimals: 0 }) },
  { id: 'openInterest', header: 'OI', accessorFn: row => row.openInterest.value ?? -9999, cell: ({ row }) => metricText(row.original.openInterest, { suffix: '', decimals: 0 }) },
  { id: 'putCall', header: 'Put/Call', accessorFn: row => row.putCallRatio.value ?? -9999, cell: ({ row }) => metricText(row.original.putCallRatio, { suffix: 'x', decimals: 2 }) },
  { id: 'iv', header: 'IV', accessorFn: row => row.impliedVolatility.value ?? -9999, cell: ({ row }) => metricText(row.original.impliedVolatility, { suffix: '%', multiplier: 100 }) },
  { id: 'ivRank', header: 'IV Rank', accessorFn: row => row.impliedVolPercentile.value ?? -9999, cell: ({ row }) => metricText(row.original.impliedVolPercentile, { suffix: '' }) },
  { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.dataStatus} /> }
]

const shortInterestColumns: ColumnDef<PositioningRow, unknown>[] = [
  { accessorKey: 'ticker', header: 'Ticker', cell: ({ row }) => row.original.ticker },
  { id: 'shortInterest', header: 'Short Interest', accessorFn: row => row.shortInterest.value ?? -9999, cell: ({ row }) => metricText(row.original.shortInterest, { suffix: '', decimals: 0 }) },
  { id: 'shortChange', header: 'Change', accessorFn: row => row.shortInterestChange.value ?? -9999, cell: ({ row }) => metricText(row.original.shortInterestChange) },
  { accessorKey: 'positioningNotes', header: 'Notes', cell: ({ row }) => <span className="inline-block max-w-[340px] truncate">{row.original.positioningNotes}</span> },
  { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.dataStatus} /> }
]

const shortSaleColumns: ColumnDef<PositioningRow, unknown>[] = [
  { accessorKey: 'ticker', header: 'Ticker', cell: ({ row }) => row.original.ticker },
  { id: 'shortVolumeRatio', header: 'Short Vol Ratio', accessorFn: row => row.shortVolumeRatio.value ?? -9999, cell: ({ row }) => metricText(row.original.shortVolumeRatio, { suffix: 'x', decimals: 2 }) },
  { accessorKey: 'source', header: 'Source', cell: ({ row }) => <span className="inline-block max-w-[280px] truncate">{row.original.source}</span> },
  { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.dataStatus} /> }
]

const unavailablePositioningColumns: ColumnDef<{ ticker: string; field: string }, unknown>[] = [
  { accessorKey: 'ticker', header: 'Ticker', cell: ({ row }) => row.original.ticker },
  { accessorKey: 'field', header: 'Unavailable Field', cell: ({ row }) => row.original.field }
]

const crowdingColumns: ColumnDef<CrowdingRow, unknown>[] = [
  { accessorKey: 'ticker', header: 'Ticker', cell: ({ row }) => row.original.ticker },
  { accessorKey: 'basket', header: 'Basket', cell: ({ row }) => <span className="inline-block max-w-[220px] truncate">{row.original.basket}</span> },
  { id: 'score', header: 'Score', accessorFn: row => row.crowdingScore.value ?? -9999, cell: ({ row }) => metricText(row.original.crowdingScore, { suffix: '' }) },
  { accessorKey: 'crowdingLabel', header: 'Label', cell: ({ row }) => <Badge variant="outline">{row.original.crowdingLabel}</Badge> },
  { id: 'momentum', header: 'Momentum', accessorFn: row => row.momentumScore.value ?? -9999, cell: ({ row }) => metricText(row.original.momentumScore, { suffix: '' }) },
  { id: 'options', header: 'Options', accessorFn: row => row.optionsScore.value ?? -9999, cell: ({ row }) => metricText(row.original.optionsScore, { suffix: '' }) },
  { id: 'short', header: 'Short', accessorFn: row => row.shortInterestScore.value ?? -9999, cell: ({ row }) => metricText(row.original.shortInterestScore, { suffix: '' }) }
]

const validationColumns: ColumnDef<ValidationRow, unknown>[] = [
  { accessorKey: 'testName', header: 'Test', cell: ({ row }) => row.original.testName },
  { id: 'hitRate', header: 'Hit Rate', accessorFn: row => row.hitRate.value ?? -9999, cell: ({ row }) => metricText(row.original.hitRate) },
  { id: 'return', header: 'Avg Fwd Return', accessorFn: row => row.averageForwardReturn.value ?? -9999, cell: ({ row }) => metricText(row.original.averageForwardReturn) },
  { accessorKey: 'sampleSize', header: 'Sample', cell: ({ row }) => row.original.sampleSize },
  { accessorKey: 'coveragePercent', header: 'Coverage', cell: ({ row }) => `${row.original.coveragePercent}%` }
]

const methodologyColumns: ColumnDef<{ area: string; source: string; limit: string }, unknown>[] = [
  { accessorKey: 'area', header: 'Area', cell: ({ row }) => row.original.area },
  { accessorKey: 'source', header: 'Source', cell: ({ row }) => row.original.source },
  { accessorKey: 'limit', header: 'Limit', cell: ({ row }) => row.original.limit }
]

function ModuleFrame({ title, kicker, description, children }: { title: string; kicker: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <div className="border-b border-border bg-card/40 p-3">
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">{kicker}</p>
        <h1 className="mt-1 truncate font-mono text-lg font-semibold">{title}</h1>
        {description ? <p className="mt-1 max-w-5xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="grid gap-3 p-3">{children}</div>
      </ScrollArea>
    </section>
  )
}

function Panel({ title, kicker, action, children }: { title: string; kicker: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card className="rounded-md border-border bg-card shadow-none">
      <CardHeader className="border-b border-border pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">{kicker}</p>
            <CardTitle className="mt-1 truncate font-mono text-sm">{title}</CardTitle>
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  )
}

function MetricPanel({ label, value }: { label: string; value: string }) {
  return (
    <Panel title={value} kicker={label}>
      <div className="h-1 rounded-full bg-primary/50" />
    </Panel>
  )
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/45 p-2">
      <p className="font-mono text-[0.65rem] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-mono text-sm font-semibold">{value}</p>
    </div>
  )
}

function ListPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <Panel title={title} kicker={`${items.length} items`}>
      <ul className="grid gap-2">
        {items.length ? items.map(item => <li key={item} className="rounded-md border border-border bg-background/45 p-2 text-sm leading-6 text-muted-foreground">{item}</li>) : <li className="text-sm text-muted-foreground">No rows.</li>}
      </ul>
    </Panel>
  )
}

function Formula({ title, body }: { title: string; body: string }) {
  return (
    <Panel title={title} kicker="Formula">
      <pre className="whitespace-pre-wrap rounded-md border border-border bg-background/60 p-3 font-mono text-xs leading-6 text-muted-foreground">{body}</pre>
    </Panel>
  )
}

function Rule({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-md border border-border bg-background/45 p-3">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">{label}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  )
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }
  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      <Clipboard className="h-4 w-4" />
      {copied ? 'Copied' : label}
    </Button>
  )
}

function EmptyLine({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="p-4 text-center">
      <p className="font-mono text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
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

function metricText(metric: MetricValue | undefined, options: { suffix?: string; decimals?: number; multiplier?: number } = {}) {
  if (!metric || metric.value === null) return 'N/A'
  const multiplier = options.multiplier ?? 1
  const value = metric.value * multiplier
  const suffix = options.suffix ?? '%'
  const prefix = value > 0 && suffix === '%' ? '+' : ''
  return `${prefix}${value.toFixed(options.decimals ?? 1)}${suffix}`
}

function metricValue(metric: MetricValue | undefined) {
  return metric?.value ?? -Infinity
}

function formatSigned(value: number) {
  if (!Number.isFinite(value)) return 'N/A'
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

function maxBy<T>(rows: T[], value: (row: T) => number | null) {
  return rows.reduce<T | undefined>((best, row) => {
    if (!best) return row
    return (value(row) ?? -Infinity) > (value(best) ?? -Infinity) ? row : best
  }, undefined)
}

type WatchRow = { ticker: string; label: string; value: number }

function buildWatchlist(data: WorkspaceData): WatchRow[] {
  const fromRotations = (data.rotations ?? data.basketSignals ?? []).map(row => ({
    ticker: row.ticker,
    label: row.trendLabel || row.name,
    value: row.return20d.value ?? 0
  }))
  const fromCrowding = (data.crowding ?? data.basketCrowding ?? []).map(row => ({
    ticker: row.ticker,
    label: row.crowdingLabel,
    value: row.crowdingScore.value ?? 0
  }))
  const fromPositioning = (data.positioning ?? []).map(row => ({
    ticker: row.ticker,
    label: row.positioningNotes,
    value: row.impliedVolPercentile.value ?? 0
  }))
  const seen = new Set<string>()
  return [...fromRotations, ...fromCrowding, ...fromPositioning]
    .filter(row => {
      if (seen.has(row.ticker)) return false
      seen.add(row.ticker)
      return true
    })
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
}

function statusLabel(shell: ShellMeta) {
  if (shell.coveragePercent <= 0) return 'NO DATA'
  if (shell.coveragePercent < 50) return 'PARTIAL'
  return 'LIVE'
}

function defaultQuestions(module: WorkspaceModule) {
  const map: Record<WorkspaceModule, string[]> = {
    overview: ['What moved, why, and does source coverage support action?'],
    rotation: ['Is leadership broadening beyond one ETF?', 'Does volume confirm relative strength?'],
    baskets: ['Which baskets show confirmed sponsorship?', 'Which themes have coverage gaps?'],
    'basket-detail': ['Is performance broad across members?', 'Does positioning confirm sponsorship?'],
    positioning: ['Are options rows available or entitlement-blocked?', 'Does short-sale volume differ from short interest?'],
    crowding: ['Which crowded longs are reversal-risk candidates?', 'Which missing components would change score?'],
    'daily-note': ['Does PM note expose all unavailable inputs?'],
    validation: ['Is sample history sufficient for confidence?'],
    methodology: ['Are proxy limits explicit enough for downstream readers?'],
    'korea-defense': ['Is Korea exposure confirming through EWY or only U.S. suppliers?', 'Do unavailable fields weaken the read?'],
    'stock-report': ['Does evidence support variant view?', 'What invalidates setup?']
  }
  return map[module]
}
