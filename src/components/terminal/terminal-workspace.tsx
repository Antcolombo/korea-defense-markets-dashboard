import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useQueryState, parseAsString } from 'nuqs'
import { toPng } from 'html-to-image'
import { type ColumnDef } from '@tanstack/react-table'
import { createChart, LineSeries } from 'lightweight-charts'
import {
  Activity,
  BarChart3,
  Clipboard,
  Database,
  Download,
  FileText,
  FlaskConical,
  Gauge,
  Layers3,
  LineChart,
  ListFilter,
  PenLine,
  Search,
  Shield,
  SlidersHorizontal,
  Table2,
  Target,
  Terminal,
  TrendingUp,
  Zap
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { TerminalActionMenu } from '@/components/terminal/action-menu'
import { AssumptionDialog } from '@/components/terminal/assumption-dialog'
import { DecisionWorkbench } from '@/components/decision/decision-workbench'
import { TerminalCommandPalette } from '@/components/terminal/command-palette'
import { MemoEditor } from '@/components/terminal/memo-editor'
import {
  CrowdingRiskMap,
  GapHeatmap,
  ProviderHealthMap,
  ReportSignalRadar,
  ReturnRibbonChart,
  RotationQuadrantChart,
  ScenarioLineChart
} from '@/components/terminal/research-charts'
import { ResearchDataTable } from '@/components/terminal/research-data-table'
import { SourceSheet } from '@/components/terminal/source-sheet'
import { TerminalMetrics } from '@/components/terminal/terminal-metrics'
import { qualityBadgeClass, statusLabel } from '@/components/terminal/terminal-quality'
import { useTerminalStore, type PanelLayoutMode } from '@/components/terminal/terminal-store'
import { PitchWorkbench } from '@/components/pitch/pitch-workbench'
import type { ShellMeta, UnavailableField } from '@/lib/research/api'
import type { SourceAudit } from '@/lib/data/getSourceAudit'
import { downloadStockReportPdf } from '@/lib/research/export'
import { useStockReportQuery } from '@/lib/research/hooks'
import type { RiskLensRow } from '@/lib/research/riskLens'
import type {
  BasketSummary,
  CrowdingRow,
  MetricValue,
  PositioningRow,
  RotationRow,
  StockReport,
  ValidationRow
} from '@/lib/research/types'
import type { Asset } from '@/types/asset'
import type { Event } from '@/types/event'
import type { EventReturn, PricePoint } from '@/types/market'
import type { InvestmentDecisionRecord, InvestmentDecisionSummary } from '@/types/decision'
import type { PmBacktestSummary, PmDecisionOverlay, PmEngineView, PmFactorHeatmapRow, PmLiquidityExit, PmRiskContribution, PmScenario, PmSectorExposure, PmSourceLight, PmStressScenario, PmWaterfallStep } from '@/types/pm'
import type { PitchSourceSnapshot, StockPitchRecord, StockPitchSummary } from '@/types/pitch'

type ChartPricePoint = Pick<PricePoint, 'date' | 'ticker' | 'price'> & {
  open?: number | null
  high?: number | null
  low?: number | null
  volume?: number | null
}

export type WorkspaceModule =
  | 'overview'
  | 'rotation'
  | 'baskets'
  | 'basket-detail'
  | 'positioning'
  | 'crowding'
  | 'validation'
  | 'methodology'
  | 'korea-defense'
  | 'stock-report'
  | 'decision-log'
  | 'stock-pitch'
  | 'event-study'
  | 'paper-book'
  | 'risk-lens'
  | 'source-audit'

export type WorkspaceData = {
  rotations?: RotationRow[]
  baskets?: BasketSummary[]
  basketSummary?: BasketSummary | null
  basketSignals?: RotationRow[]
  basketCrowding?: CrowdingRow[]
  positioning?: PositioningRow[]
  crowding?: CrowdingRow[]
  validation?: ValidationRow[]
  report?: StockReport
  decision?: InvestmentDecisionRecord
  decisions?: InvestmentDecisionSummary[]
  pitch?: StockPitchRecord
  pitches?: StockPitchSummary[]
  pitchSource?: PitchSourceSnapshot
  pitchCreateTicker?: string
  events?: Event[]
  eventReturns?: EventReturn[]
  assets?: Asset[]
  portfolioDecisions?: InvestmentDecisionRecord[]
  pmEngine?: PmEngineView
  riskLens?: RiskLensRow[]
  sourceAudit?: SourceAudit
  prices?: ChartPricePoint[]
}

export type TerminalWorkspaceProps = {
  module: WorkspaceModule
  data: WorkspaceData
  shell: ShellMeta
  unavailableFields: UnavailableField[]
  deferredUnavailableFields?: UnavailableField[]
  selectedTicker?: string
  selectedSlug?: string
}

export type ModuleMeta = {
  id: WorkspaceModule
  label: string
  short: string
  href: string
  icon: typeof Activity
}

const modules: ModuleMeta[] = [
  { id: 'overview', label: 'Overview', short: 'Overview', href: '/?module=overview', icon: Terminal },
  { id: 'rotation', label: 'Rotation', short: 'Rotation', href: '/?module=rotation', icon: LineChart },
  { id: 'baskets', label: 'Baskets', short: 'Baskets', href: '/?module=baskets', icon: Layers3 },
  { id: 'positioning', label: 'Positioning', short: 'Positioning', href: '/?module=positioning', icon: SlidersHorizontal },
  { id: 'crowding', label: 'Crowding', short: 'Crowding', href: '/?module=crowding', icon: Gauge },
  { id: 'validation', label: 'Signal Validation Lab', short: 'Signal Lab', href: '/?module=validation', icon: FlaskConical },
  { id: 'methodology', label: 'Methodology', short: 'Method', href: '/?module=methodology', icon: ListFilter },
  { id: 'korea-defense', label: 'Korea Defense', short: 'Korea', href: '/?module=korea-defense', icon: Shield },
  { id: 'stock-report', label: 'Stock Report', short: 'Report', href: '/?module=stock-report&ticker=NVDA', icon: BarChart3 },
  { id: 'stock-pitch', label: 'Stock Pitch', short: 'Pitch', href: '/?module=stock-pitch', icon: PenLine },
  { id: 'decision-log', label: 'Decision Journal', short: 'Journal', href: '/?module=decision-log', icon: Clipboard },
  { id: 'event-study', label: 'Event Study Lab', short: 'Event Lab', href: '/?module=event-study', icon: Activity },
  { id: 'paper-book', label: 'PM Engine', short: 'PM Engine', href: '/?module=paper-book', icon: TrendingUp },
  { id: 'risk-lens', label: 'Risk + Vol Regime', short: 'Risk Lens', href: '/?module=risk-lens', icon: Shield },
  { id: 'source-audit', label: 'Data Quality / Source Audit', short: 'Source Audit', href: '/?module=source-audit', icon: Database }
]

const basketDetailMeta: ModuleMeta = { id: 'basket-detail', label: 'Basket Detail', short: 'Baskets', href: '/?module=baskets', icon: Layers3 }
const hiddenModuleIds = new Set<WorkspaceModule>(['positioning'])
const visibleModules = modules.filter(item => !hiddenModuleIds.has(item.id))

export function TerminalWorkspace({
  module,
  data,
  shell,
  unavailableFields,
  deferredUnavailableFields = [],
  selectedTicker,
  selectedSlug
}: TerminalWorkspaceProps) {
  const router = useRouter()
  const workspaceRef = useRef<HTMLElement | null>(null)
  const activeMeta = module === 'basket-detail' ? basketDetailMeta : modules.find(item => item.id === module) ?? modules[0]
  const watchlist = buildWatchlist(data)
  const defaultTicker = selectedTicker ?? data.report?.ticker ?? watchlist[0]?.ticker ?? 'NVDA'
  const [, setTickerQuery] = useQueryState('ticker', parseAsString.withDefault(defaultTicker))
  const commandOpen = useTerminalStore(state => state.commandOpen)
  const setCommandOpen = useTerminalStore(state => state.setCommandOpen)
  const openCommand = useTerminalStore(state => state.openCommand)
  const sourceSheetOpen = useTerminalStore(state => state.sourceSheetOpen)
  const setSourceSheetOpen = useTerminalStore(state => state.setSourceSheetOpen)
  const layoutMode = useTerminalStore(state => state.layoutMode)
  const setLayoutMode = useTerminalStore(state => state.setLayoutMode)
  const setActiveTickerDraft = useTerminalStore(state => state.setActiveTickerDraft)
  const [ticker, setTicker] = useState(defaultTicker)
  const focusedTicker = ticker || defaultTicker
  const panelSizes = panelLayoutSizes(layoutMode)

  useEffect(() => {
    setTicker(defaultTicker)
    setActiveTickerDraft(defaultTicker)
  }, [defaultTicker, setActiveTickerDraft])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        openCommand()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openCommand])

  function updateTicker(value: string) {
    const next = value.toUpperCase()
    setTicker(next)
    setActiveTickerDraft(next)
    void setTickerQuery(next || null, { history: 'replace', shallow: true })
  }

  function submitTicker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    openReportTicker(ticker)
  }

  function normalizedTicker(value: string) {
    return value.trim().toUpperCase() || 'NVDA'
  }

  function openReportTicker(value: string) {
    const next = normalizedTicker(value)
    updateTicker(next)
    void router.push(`/report/${encodeURIComponent(next)}`)
  }

  function openDecisionTicker(value: string) {
    const next = normalizedTicker(value)
    updateTicker(next)
    void router.push(`/?module=decision-log&ticker=${encodeURIComponent(next)}&new=1`)
  }

  async function copyReportMarkdown() {
    if (!data.report) return
    await copyText(data.report.markdown)
  }

  function exportMarkdown() {
    if (!data.report) return
    const blob = new Blob([data.report.markdown], { type: 'text/markdown;charset=utf-8' })
    downloadBlob(blob, `${data.report.ticker.toLowerCase()}-report.md`)
  }

  async function exportSnapshot() {
    if (!workspaceRef.current) return
    const dataUrl = await toPng(workspaceRef.current, {
      cacheBust: true,
      pixelRatio: 1.5,
      filter: node => !(node instanceof HTMLElement && node.dataset.exportSkip === 'true')
    })
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `liquidchain-${module}.png`
    link.click()
  }

  function changeLayout(mode: PanelLayoutMode) {
    setLayoutMode(mode)
  }

  const mainPanel = (
    <MainModule
      module={module}
      data={data}
      shell={shell}
      selectedTicker={focusedTicker}
      selectedSlug={selectedSlug}
      onTickerChange={updateTicker}
      onOpenReport={openReportTicker}
      onOpenDecision={openDecisionTicker}
      unavailableFields={unavailableFields}
      deferredUnavailableFields={deferredUnavailableFields}
    />
  )

  return (
    <TooltipProvider>
      <main ref={workspaceRef} className="terminal-v2 flex h-screen min-h-screen flex-col overflow-hidden bg-background text-foreground">
        <header className="terminal-command-bar border-b border-border bg-card/80 px-3 py-2 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex min-w-[150px] items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/40 bg-primary/15 text-primary">
                <Terminal className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-bold tracking-[0.2em] text-foreground">LIQUIDCHAIN</p>
              </div>
            </div>

            <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto lg:flex" aria-label="Workspace modules">
              {visibleModules.map(item => {
                const Icon = item.icon
                return (
                  <Button key={item.id} asChild variant={isModuleActive(item.id, module) ? 'secondary' : 'ghost'} size="sm" className="font-mono text-[0.72rem]">
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
            <InputGroup className="min-w-[190px] flex-1 lg:w-[320px] lg:flex-none">
              <InputGroupAddon>
                <Search className="h-3.5 w-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                value={ticker}
                onChange={event => updateTicker(event.target.value)}
                className="font-mono text-xs"
                aria-label="Ticker command"
                placeholder="/report NVDA"
              />
            </InputGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="submit" size="sm" variant="secondary" aria-label="Open stock report" className="px-2 sm:px-3">
                  <Zap className="h-4 w-4" />
                  <span className="hidden sm:inline">Open Report</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open stock report</TooltipContent>
            </Tooltip>
            <Badge variant="outline" className={`hidden font-mono sm:inline-flex ${qualityBadgeClass(shell)}`}>{statusLabel(shell)}</Badge>
            <TerminalActionMenu
              report={data.report}
              layoutMode={layoutMode}
              onOpenCommand={openCommand}
              onOpenSourceSheet={() => setSourceSheetOpen(true)}
              onCopyMarkdown={copyReportMarkdown}
              onExportMarkdown={exportMarkdown}
              onSnapshot={() => void exportSnapshot()}
              onSetLayout={changeLayout}
            />
          </form>
        </header>

        <TerminalMetrics data={data} shell={shell} active={activeMeta} />

        <section className="hidden min-h-0 flex-1 lg:block">
          <ResizablePanelGroup key={layoutMode} direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={panelSizes.left} minSize={14}>
              <LeftRail active={module} watchlist={watchlist} data={data} />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={panelSizes.center} minSize={42}>
              {mainPanel}
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={panelSizes.right} minSize={18}>
              <RightRail shell={shell} data={data} unavailableFields={unavailableFields} deferredUnavailableFields={deferredUnavailableFields} active={activeMeta} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </section>

        <section className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden lg:hidden">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 p-3">
            <MobileModuleSelect module={module === 'basket-detail' ? 'baskets' : module} />
            {mainPanel}
            <LeftRail active={module} watchlist={watchlist} data={data} compact />
            <RightRail shell={shell} data={data} unavailableFields={unavailableFields} deferredUnavailableFields={deferredUnavailableFields} active={activeMeta} />
          </div>
        </section>
      </main>
      <SourceSheet open={sourceSheetOpen} onOpenChange={setSourceSheetOpen} shell={shell} unavailableFields={unavailableFields} deferredUnavailableFields={deferredUnavailableFields} />
      <TerminalCommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        modules={visibleModules}
        ticker={focusedTicker}
        report={data.report}
        shell={shell}
        unavailableFields={unavailableFields}
        onOpenSourceSheet={() => setSourceSheetOpen(true)}
        onSnapshot={() => void exportSnapshot()}
        onCopyMarkdown={copyReportMarkdown}
        onSetLayout={changeLayout}
      />
    </TooltipProvider>
  )
}

function MobileModuleSelect({ module }: { module: WorkspaceModule }) {
  const router = useRouter()
  const [, setModuleQuery] = useQueryState('module', parseAsString.withDefault(module))
  const selectedModule = visibleModules.some(item => item.id === module) ? module : 'overview'
  return (
    <Select
      value={selectedModule}
      onValueChange={value => {
        const next = visibleModules.find(item => item.id === value)
        if (next) {
          void setModuleQuery(next.id, { history: 'push', shallow: true })
          router.push(next.href)
        }
      }}
    >
      <SelectTrigger className="min-w-0 max-w-full font-mono">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {visibleModules.map(item => (
          <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
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
  const activeLabel = (modules.find(item => isModuleActive(item.id, active)) ?? basketDetailMeta).label
  return (
    <aside className={`flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden border-r border-border bg-card/45 ${compact ? 'rounded-md border' : ''}`}>
      <div className="border-b border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[0.68rem] tracking-[0.04em] text-muted-foreground">Workspace</p>
            <h2 className="font-mono text-sm font-semibold">Module Rail</h2>
          </div>
          <Badge variant="outline" className="font-mono">{activeLabel}</Badge>
        </div>
      </div>
      <ScrollArea className="min-h-0 w-full flex-1">
        <div className="grid gap-3 p-2">
          <div className="grid gap-1">
            {visibleModules.map(item => {
              const Icon = item.icon
              return (
                <Button key={item.id} asChild variant={isModuleActive(item.id, active) ? 'secondary' : 'ghost'} className="w-full min-w-0 justify-start overflow-hidden font-mono text-xs">
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
            <p className="mb-2 px-1 font-mono text-[0.68rem] tracking-[0.04em] text-muted-foreground">Watchlist</p>
            <div className="grid gap-1">
              {watchlist.length ? watchlist.slice(0, 14).map(row => (
                <Link
                  key={`${row.ticker}-${row.label}`}
                  href={watchlistHref(active, row.ticker)}
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
                <p className="mb-2 px-1 font-mono text-[0.68rem] tracking-[0.04em] text-muted-foreground">Theme Tape</p>
                <div className="grid gap-1">
                  {data.baskets.slice(0, 8).map(basket => (
                    <Link key={basket.slug} href={basketDetailHref(basket.slug)} className="block min-w-0 rounded-md px-2 py-2 no-underline hover:bg-muted/50">
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
  deferredUnavailableFields,
  active
}: {
  shell: ShellMeta
  data: WorkspaceData
  unavailableFields: UnavailableField[]
  deferredUnavailableFields: UnavailableField[]
  active: ModuleMeta
}) {
  const questions = data.report?.pmQuestions ?? data.pitch?.pitch.aiScan?.payload?.pmQuestions ?? defaultQuestions(active.id)
  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-border bg-card/45">
      <div className="border-b border-border p-3">
        <p className="font-mono text-[0.68rem] tracking-[0.04em] text-muted-foreground">Source / Risk</p>
        <h2 className="mt-1 font-mono text-sm font-semibold">{active.label}</h2>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="grid gap-3 p-2">
          <Panel title="Provider Health" kicker={shell.qualityLabel} action={<Badge variant="outline" className={qualityBadgeClass(shell)}>{shell.coveragePercent}%</Badge>}>
            <p className="mb-3 text-xs leading-5 text-muted-foreground">{shell.sourceSummary}</p>
            <ProviderHealthMap shell={shell} />
          </Panel>

          <Panel title="PM Questions" kicker="Decision queue">
            <ol className="grid gap-2">
              {questions.slice(0, 5).map(question => (
                <li key={question} className="rounded-md border border-border bg-background/45 p-2 text-xs leading-5 text-muted-foreground">{question}</li>
              ))}
            </ol>
          </Panel>

          <Panel title="Required Gaps" kicker={`${unavailableFields.length} tracked`}>
            {unavailableFields.length
              ? <GapHeatmap fields={unavailableFields} />
              : <EmptyLine title="No active gaps" detail={shell.deferredUnavailableCount ? `${shell.deferredUnavailableCount} deferred feeds hidden from active coverage.` : 'Current module response has no recorded gaps.'} />}
          </Panel>

          <Panel title="Deferred Gaps" kicker={`${deferredUnavailableFields.length} optional`}>
            <SourceLadder fields={deferredUnavailableFields} />
          </Panel>
        </div>
      </ScrollArea>
    </aside>
  )
}

function SourceLadder({ fields }: { fields: UnavailableField[] }) {
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

function MainModule(props: {
  module: WorkspaceModule
  data: WorkspaceData
  shell: ShellMeta
  selectedTicker: string
  selectedSlug?: string
  onTickerChange: (value: string) => void
  onOpenReport: (value: string) => void
  onOpenDecision: (value: string) => void
  unavailableFields: UnavailableField[]
  deferredUnavailableFields: UnavailableField[]
}) {
  const { module, data } = props
  if (module === 'rotation') return <RotationModule rows={data.rotations ?? []} prices={data.prices ?? []} />
  if (module === 'baskets') return <BasketsModule baskets={data.baskets ?? []} />
  if (module === 'basket-detail') return <BasketDetailModule data={data} />
  if (module === 'positioning') return <PositioningModule rows={data.positioning ?? []} />
  if (module === 'crowding') return <CrowdingModule rows={data.crowding ?? []} />
  if (module === 'validation') return <ValidationModule rows={data.validation ?? []} />
  if (module === 'event-study') return <EventStudyModule data={data} />
  if (module === 'paper-book') return <PaperBookModule decisions={data.portfolioDecisions ?? []} pmEngine={data.pmEngine} />
  if (module === 'risk-lens') return <RiskLensModule rows={data.riskLens ?? []} selectedTicker={props.selectedTicker} />
  if (module === 'source-audit') return <SourceAuditModule audit={data.sourceAudit} shell={props.shell} unavailableFields={props.unavailableFields} deferredUnavailableFields={props.deferredUnavailableFields} />
  if (module === 'methodology') return <MethodologyModule />
  if (module === 'korea-defense') return <KoreaDefenseModule data={data} />
  if (module === 'stock-report') return <StockReportModule report={data.report} unavailableFields={props.unavailableFields} deferredUnavailableFields={props.deferredUnavailableFields} />
  if (module === 'decision-log') return <DecisionLogModule data={data} selectedTicker={props.selectedTicker} sourceSummary={props.shell.sourceSummary} />
  if (module === 'stock-pitch') return <StockPitchModule data={data} />
  return (
    <OverviewModule
      data={data}
      selectedTicker={props.selectedTicker}
      sourceSummary={props.shell.sourceSummary}
      onTickerChange={props.onTickerChange}
      onOpenReport={props.onOpenReport}
      onOpenDecision={props.onOpenDecision}
    />
  )
}

function OverviewModule({
  data,
  selectedTicker,
  sourceSummary,
  onTickerChange,
  onOpenReport,
  onOpenDecision,
}: {
  data: WorkspaceData
  selectedTicker: string
  sourceSummary: string
  onTickerChange: (value: string) => void
  onOpenReport: (value: string) => void
  onOpenDecision: (value: string) => void
}) {
  const rotations = data.rotations ?? []
  const baskets = data.baskets ?? []
  const crowding = data.crowding ?? []
  const topRotations = rotations.slice().sort((a, b) => metricValue(b.return20d) - metricValue(a.return20d)).slice(0, 8)
  const topBaskets = baskets.slice().sort((a, b) => metricValue(b.relativeStrengthVsSpy20d) - metricValue(a.relativeStrengthVsSpy20d)).slice(0, 6)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onOpenDecision(selectedTicker)
  }

  return (
    <ModuleFrame title="Build Investment Decision Record" kicker="Overview" description="Force every idea through variant view, three drivers, invalidation, risk, source quality, and post-mortem.">
      <Panel title="Build investment decision record" kicker="First path">
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(180px,260px)_auto_auto_auto] lg:items-center">
            <InputGroup className="min-w-0">
              <InputGroupAddon>
                <Search className="h-3.5 w-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                value={selectedTicker}
                onChange={event => onTickerChange(event.target.value)}
                className="font-mono"
                aria-label="Home ticker"
                placeholder="NVDA"
              />
            </InputGroup>
            <Button type="submit" variant="secondary">
              <FileText className="h-4 w-4" />
              New Decision
            </Button>
            <Button asChild type="button" variant="outline">
              <Link href="/?module=decision-log&status=open">
                <Target className="h-4 w-4" />
                Review Open Ideas
              </Link>
            </Button>
            <Button asChild type="button" variant="outline">
              <Link href="/?module=decision-log&status=closed">
                <Shield className="h-4 w-4" />
                Post-Mortem Closed Ideas
              </Link>
            </Button>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{sourceSummary}</p>
        </form>
      </Panel>
      <div className="grid min-h-0 gap-3">
        <Panel title={`${selectedTicker} Price Tape`} kicker="Sourced close series">
          <PriceChart prices={data.prices ?? []} ticker={selectedTicker} />
        </Panel>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="Rotation Leaders" kicker="ETF board">
          <DataTable data={topRotations} columns={rotationColumns} />
        </Panel>
        <Panel title="Rotation Quadrant" kicker="RS x return x volume">
          <RotationQuadrantChart rows={topRotations} />
        </Panel>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="Theme Sponsorship" kicker="Basket board">
          <DataTable data={topBaskets} columns={basketColumns} />
        </Panel>
        <Panel title="Crowding Risk Map" kicker="Crowding x extension">
          <CrowdingRiskMap rows={crowding.slice(0, 12)} />
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
                <Link href={basketDetailHref(basket.slug)}>Open Basket</Link>
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
  const hasPositioning = positioning.some(hasPositioningData)
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
        {hasPositioning ? (
          <Panel title="Positioning Proxy" kicker="Options / short proxy">
            <DataTable data={positioning} columns={positioningColumns} />
          </Panel>
        ) : (
          <DeferredPanel />
        )}
      </div>
    </ModuleFrame>
  )
}

function PositioningModule({ rows }: { rows: PositioningRow[] }) {
  const [activeTab, setActiveTab] = useQueryState('tab', parseAsString.withDefault('options'))
  const sourcedRows = rows.filter(hasPositioningData)
  const enoughSourcedRows = sourcedRows.length >= Math.max(3, Math.ceil(rows.length * 0.15))
  if (!enoughSourcedRows) {
    return (
      <ModuleFrame title="Positioning Proxy Board" kicker="Not enough sourced data yet" description="Options and FINRA feeds are hidden from active workflow until enough rows are present to avoid a mostly-empty table.">
        <DeferredPanel title="Not enough sourced data yet" detail={`${sourcedRows.length}/${rows.length || 0} positioning rows have usable options or short-sale fields.`} />
      </ModuleFrame>
    )
  }

  return (
    <ModuleFrame title="Positioning Proxy Board" kicker="Options / short proxy" description="Public options, short-interest, and FINRA short-sale volume proxies. No proprietary flow claim.">
      <Tabs value={validPositioningTab(activeTab)} onValueChange={value => void setActiveTab(value, { history: 'replace', shallow: true })} className="min-h-0">
        <TabsList className="mb-3 flex-wrap">
          <TabsTrigger value="options">Options</TabsTrigger>
          <TabsTrigger value="short-interest">Short Interest</TabsTrigger>
          <TabsTrigger value="short-sale">Short Sale</TabsTrigger>
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
    <ModuleFrame title="Crowding Monitor" kicker="Crowding" description="Crowding tracks sponsorship. Extension risk and catalyst support stay separate so a high score is not automatically a reversal call.">
      <div className="grid gap-3 xl:grid-cols-[1.4fr_0.8fr]">
        <Panel title="Crowding Scores" kicker={`${rows.length} rows`}>
          <DataTable
            data={rows}
            columns={[
              ...crowdingColumnsFor(rows),
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
                <MetricMini label="Setup" value={selected.setupLabel} />
                <MetricMini label="Extension" value={metricText(selected.extensionRiskScore, { suffix: '' })} />
                <MetricMini label="Catalyst" value={metricText(selected.catalystSupportScore, { suffix: '' })} />
                <MetricMini label="Momentum" value={metricText(selected.momentumScore, { suffix: '' })} />
                <MetricMini label="Volume" value={metricText(selected.volumeScore, { suffix: '' })} />
                {selected.optionsScore.value !== null ? <MetricMini label="Options" value={metricText(selected.optionsScore, { suffix: '' })} /> : null}
                {selected.shortInterestScore.value !== null ? <MetricMini label="Short" value={metricText(selected.shortInterestScore, { suffix: '' })} /> : null}
              </div>
              <StatusBadge status={selected.dataStatus} />
            </div>
          ) : <EmptyLine title="No row selected" detail="Crowding rows are unavailable." />}
        </Panel>
      </div>
    </ModuleFrame>
  )
}

function ValidationModule({ rows }: { rows: ValidationRow[] }) {
  const insufficient = rows.every(row => row.sampleSize === 0)
  return (
    <ModuleFrame title="Signal Validation Lab" kicker="Validation" description="Shows whether crowding, RS plus volume, and options spikes have sourced historical support.">
      {insufficient ? (
        <DeferredPanel title="Not enough sourced data yet" detail="Historical sample lab stays hidden until enough sourced forward-return rows exist." />
      ) : null}
      {!insufficient ? <div className="grid gap-3 xl:grid-cols-3">
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
      </div> : null}
      {!insufficient ? (
        <Panel title="Validation Results" kicker={`${rows.length} tests`}>
          <DataTable data={rows} columns={validationColumns} />
        </Panel>
      ) : null}
      {!insufficient ? (
        <Panel title="Row Drilldown" kicker="Forward windows">
          <DataTable data={rows.flatMap(row => (row.resultRows ?? []).map(sample => ({ testName: row.testName, ...sample })))} columns={validationSampleColumns} />
        </Panel>
      ) : null}
    </ModuleFrame>
  )
}

type EventStudyRow = {
  eventId: string
  title: string
  date: string
  ticker: string
  category: string
  pre5d: number | null
  post1d: number
  post5d: number
  post20d: number
  volumeChange: number | null
  volChange: number | null
  caveat: string
}

function EventStudyModule({ data }: { data: WorkspaceData }) {
  const rows = buildEventStudyRows(data.events ?? [], data.eventReturns ?? [], data.prices ?? [])
  const summary = summarizeEventStudy(rows)
  const categoryRows = summarizeEventStudyByCategory(rows)
  return (
    <ModuleFrame title="Event Study Lab" kicker="Catalyst tests" description="Defense contracts, earnings, export controls, and geopolitical shocks mapped to sourced return windows. Correlation only; no causality claim.">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Samples" value={summary.samples.toString()} />
        <MetricCard label="Hit Rate 20D" value={summary.hitRate === null ? 'N/A' : `${summary.hitRate.toFixed(1)}%`} />
        <MetricCard label="Avg 20D" value={summary.average20d === null ? 'N/A' : `${summary.average20d.toFixed(1)}%`} />
        <MetricCard label="Vol Rows" value={rows.filter(row => row.volChange !== null).length.toString()} />
      </div>
      <div className="grid gap-3 xl:grid-cols-[1fr_0.8fr]">
        <Panel title="Category Hit Rates" kicker={`${categoryRows.length} groups`}>
          <DataTable data={categoryRows} columns={eventCategoryColumns} />
        </Panel>
        <Panel title="Source Caveats" kicker="No hallucinated data">
          <div className="grid gap-2">
            <Rule label="Volume" text="Shown only when generated/DB price rows carry sourced volume. Otherwise unavailable." />
            <Rule label="Volatility" text="Pre/post realized vol uses close-to-close daily rows; intraday shocks are out of scope." />
            <Rule label="Recent events" text="Some generated event windows may use available trailing windows until forward data matures." />
          </div>
        </Panel>
      </div>
      <Panel title="Event Return Tape" kicker={`${rows.length} rows`}>
        <DataTable data={rows} columns={eventStudyColumns} />
      </Panel>
    </ModuleFrame>
  )
}

function PaperBookModule({ decisions, pmEngine }: { decisions: InvestmentDecisionRecord[]; pmEngine?: PmEngineView }) {
  if (pmEngine) return <PmEngineModule pmEngine={pmEngine} />
  const book = buildPaperBook(decisions)
  return (
    <ModuleFrame title="Portfolio / Paper Book" kicker="Book construction" description="Open ideas, long/short watchlist, exposure, drawdown, attribution, and win/loss from decision journal records.">
      <div className="grid gap-3 md:grid-cols-5">
        <MetricCard label="Open Ideas" value={book.openCount.toString()} />
        <MetricCard label="Gross" value={`${book.gross.toFixed(1)}%`} />
        <MetricCard label="Net" value={`${book.net.toFixed(1)}%`} />
        <MetricCard label="Win/Loss" value={`${book.wins}/${book.losses}`} />
        <MetricCard label="Max Loss" value={book.maxLoss === null ? 'N/A' : `${book.maxLoss.toFixed(1)}%`} />
      </div>
      <div className="grid gap-3 xl:grid-cols-[1fr_0.85fr]">
        <Panel title="Open / Closed Ideas" kicker={`${book.rows.length} records`}>
          <DataTable data={book.rows} columns={paperBookColumns} />
        </Panel>
        <Panel title="Exposure By Driver" kicker={`${book.themeRows.length} buckets`}>
          <DataTable data={book.themeRows} columns={themeExposureColumns} />
        </Panel>
      </div>
      <Panel title="Book Discipline" kicker="Rules">
        <div className="grid gap-2 md:grid-cols-3">
          <Rule label="Gross" text="Sum of absolute position size % across open long/short decisions." />
          <Rule label="Net" text="Long size minus short size. Watch/pass ideas carry zero exposure." />
          <Rule label="Attribution" text="Outcome return times position size when both are recorded; pending ideas stay marked pending." />
        </div>
      </Panel>
    </ModuleFrame>
  )
}

function PmEngineModule({ pmEngine }: { pmEngine: PmEngineView }) {
  const portfolio = pmEngine.portfolio
  const focus = pmEngine.decisions[0]
  return (
    <ModuleFrame title="PM Engine / Portfolio Construction" kicker="Decision overlay" description="Human decision log stays source of truth; PM engine adds EV, sizing, factor risk, liquidity, costs, optimizer output, and backtest evidence.">
      <div className="grid gap-3 md:grid-cols-2">
        <MetricCard label="PM-ready" value={`${portfolio.pmReadyCount}/${pmEngine.decisions.length}`} />
        <MetricCard label="Gross / Net" value={`${portfolio.grossPct.toFixed(1)}% / ${portfolio.netPct.toFixed(1)}%`} />
        <MetricCard label="Beta" value={portfolio.portfolioBeta.toFixed(2)} />
        <MetricCard label="Ann Risk" value={`${portfolio.annualizedRiskPct.toFixed(1)}%`} />
        <MetricCard label="VaR 95 / 99" value={`${portfolio.valueAtRisk95Pct.toFixed(1)}% / ${portfolio.valueAtRisk99Pct.toFixed(1)}%`} />
        <MetricCard label="ES" value={`${portfolio.expectedShortfallPct.toFixed(1)}%`} />
        <MetricCard label="Cost-adj EV" value={`${portfolio.costAdjustedEvPct >= 0 ? '+' : ''}${portfolio.costAdjustedEvPct.toFixed(2)}%`} />
        <MetricCard label="Liquidity" value={portfolio.liquidityDays >= 999 ? 'No ADV' : `${portfolio.liquidityDays.toFixed(1)}d`} />
      </div>

      <div className="grid gap-3 2xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <Panel title="Decision PM Table" kicker={`${pmEngine.decisions.length} overlays`} action={<Badge variant="outline" className="font-mono">{pmEngine.dataStatus}</Badge>}>
          <DataTable data={pmEngine.decisions} columns={pmDecisionColumns} />
        </Panel>
        <Panel title="PM-ready Gate" kicker={`${pmEngine.gaps.length} source gaps`}>
          {focus ? <SourceLightGrid lights={focus.sourceLights} /> : <EmptyLine title="No PM overlays" detail="Create or accept decisions first." />}
          {pmEngine.gaps.length ? (
            <div className="mt-3 grid gap-1">
              {pmEngine.gaps.slice(0, 6).map(gap => <p key={gap} className="rounded-md border border-border bg-background/45 px-2 py-1 text-xs text-muted-foreground">{gap}</p>)}
            </div>
          ) : null}
        </Panel>
      </div>

      {focus ? (
        <div className="grid gap-3 2xl:grid-cols-2">
          <Panel title={`${focus.ticker} Scenario / EV`} kicker="Bear base bull">
            <ScenarioCards scenarios={focus.scenarios} />
          </Panel>
          <Panel title={`${focus.ticker} Sizing Waterfall`} kicker={focus.activeCapReason}>
            <SizingWaterfall steps={focus.sizingWaterfall} />
          </Panel>
          <Panel title={`${focus.ticker} Factor Heatmap`} kicker="Risk model">
            <FactorHeatmap rows={[{ ticker: focus.ticker, exposures: Object.fromEntries(focus.factorExposures.map(item => [item.factor, item.exposure])) }]} />
          </Panel>
          <Panel title={`${focus.ticker} Stress Ladder`} kicker="VaR / shocks">
            <StressLadder rows={focus.stressScenarios} />
          </Panel>
          <Panel title={`${focus.ticker} Backtest Strip`} kicker={focus.backtest.grade}>
            <BacktestStrip backtest={focus.backtest} />
          </Panel>
          <Panel title={`${focus.ticker} Human vs Engine`} kicker={focus.optimizerAction}>
            <div className="grid gap-2 md:grid-cols-3">
              <MetricMini label="Human Size" value={`${focus.humanSizePct.toFixed(1)}%`} />
              <MetricMini label="Engine Size" value={`${focus.suggestedSizePct.toFixed(1)}%`} />
              <MetricMini label="Delta" value={`${focus.sizeDeltaPct >= 0 ? '+' : ''}${focus.sizeDeltaPct.toFixed(1)}%`} />
            </div>
            <p className="mt-3 rounded-md border border-border bg-background/45 p-2 text-xs leading-5 text-muted-foreground">{focus.optimizerReason}</p>
          </Panel>
        </div>
      ) : null}

      <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.75fr)]">
        <Panel title="Portfolio Factor Heatmap" kicker={`${portfolio.factorHeatmap.length} names`}>
          <FactorHeatmap rows={portfolio.factorHeatmap} />
        </Panel>
        <Panel title="Risk Contribution" kicker="Vol budget">
          <RiskContributionBars rows={portfolio.riskContribution} />
        </Panel>
      </div>

      <div className="grid gap-3 2xl:grid-cols-3">
        <Panel title="Sector Gross / Net" kicker={`${portfolio.sectorExposure.length} sectors`}>
          <DataTable data={portfolio.sectorExposure} columns={pmSectorColumns} />
        </Panel>
        <Panel title="Optimizer Ledger" kicker={`${portfolio.optimizerLedger.length} decisions`}>
          <DataTable data={portfolio.optimizerLedger} columns={pmOptimizerColumns} />
        </Panel>
        <Panel title="Liquidity Exit Ladder" kicker="ADV / cost">
          <DataTable data={portfolio.liquidityExit} columns={pmLiquidityColumns} />
        </Panel>
      </div>

      <Panel title="Portfolio Backtest Evidence" kicker={`Grade ${portfolio.backtest.grade}`}>
        <BacktestStrip backtest={portfolio.backtest} />
      </Panel>
    </ModuleFrame>
  )
}

function RiskLensModule({ rows, selectedTicker }: { rows: RiskLensRow[]; selectedTicker: string }) {
  const selected = rows.find(row => row.ticker === selectedTicker) ?? rows[0]
  return (
    <ModuleFrame title="Risk + Vol Regime Lens" kicker="Source-only risk" description="RV20/RV60, ATR/range, gap risk, extension risk, and VIX backdrop from real OHLCV/VIX fields only. No fake gamma or IV.">
      <div className="grid gap-3 md:grid-cols-5">
        <MetricCard label="Focus" value={selected?.ticker ?? 'N/A'} />
        <MetricCard label="RV20" value={selected?.rv20 === null || !selected ? 'N/A' : `${selected.rv20.toFixed(1)}%`} />
        <MetricCard label="RV60" value={selected?.rv60 === null || !selected ? 'N/A' : `${selected.rv60.toFixed(1)}%`} />
        <MetricCard label="ATR20" value={selected?.atr20 === null || !selected ? 'N/A' : selected.atr20.toFixed(2)} />
        <MetricCard label="VIX" value={selected?.vixLevel === null || !selected ? 'N/A' : `${selected.vixLevel.toFixed(1)} ${selected.vixBackdrop}`} />
      </div>
      <div className="grid gap-3 xl:grid-cols-[1fr_0.82fr]">
        <Panel title="Risk Board" kicker={`${rows.length} tickers`}>
          <DataTable data={rows} columns={riskLensColumns} />
        </Panel>
        <Panel title="Unavailable Means Unavailable" kicker="Honest limits">
          <div className="grid gap-2">
            {(selected?.caveats.length ? selected.caveats : ['Selected ticker has enough sourced fields for displayed metrics.']).map(item => (
              <Rule key={item} label="Caveat" text={item} />
            ))}
          </div>
        </Panel>
      </div>
    </ModuleFrame>
  )
}

function SourceAuditModule({
  audit,
  shell,
  unavailableFields,
  deferredUnavailableFields
}: {
  audit?: SourceAudit
  shell: ShellMeta
  unavailableFields: UnavailableField[]
  deferredUnavailableFields: UnavailableField[]
}) {
  const providers = audit?.providers ?? []
  const failures = [...(audit?.readinessFailures ?? []), ...(audit?.freshnessWarnings ?? []), ...(audit?.missingProvenance ?? [])]
  return (
    <ModuleFrame title="Data Quality / Source Audit" kicker="Provider truth" description="Provider health, missing fields, stale data, entitlement gaps, source links, and active vs deferred gaps.">
      <div className="grid gap-3 md:grid-cols-5">
        <MetricCard label="Audit Status" value={audit?.status ?? shell.qualityLabel} />
        <MetricCard label="Records" value={(audit?.recordsChecked ?? 0).toString()} />
        <MetricCard label="Active Coverage" value={`${shell.coveragePercent}%`} />
        <MetricCard label="Active Gaps" value={unavailableFields.length.toString()} />
        <MetricCard label="Deferred" value={deferredUnavailableFields.length.toString()} />
      </div>
      <div className="grid gap-3 xl:grid-cols-[1fr_0.85fr]">
        <Panel title="Provider Health" kicker={`${providers.length || shell.providerHealth.length} providers`}>
          {providers.length ? <DataTable data={providers} columns={sourceProviderColumns} /> : <ProviderHealthMap shell={shell} />}
        </Panel>
        <Panel title="Failures / Warnings" kicker={`${failures.length} rows`}>
          {failures.length ? <ListPanel title="Audit Findings" items={failures.slice(0, 12)} /> : <EmptyLine title="No audit failures" detail="Current source audit has no readiness failures or freshness warnings." />}
        </Panel>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="Required Gaps" kicker={`${unavailableFields.length} active`}>
          {unavailableFields.length ? <GapHeatmap fields={unavailableFields} /> : <EmptyLine title="No active gaps" detail="Required fields present in current response." />}
        </Panel>
        <Panel title="Deferred / Entitlement Gaps" kicker={`${deferredUnavailableFields.length} optional`}>
          <SourceLadder fields={deferredUnavailableFields} />
        </Panel>
      </div>
    </ModuleFrame>
  )
}

function MethodologyModule() {
  const sourceRows = [
    { area: 'Rotation', source: 'Sourced OHLCV / signal snapshots', limit: 'No execution-grade tick data' },
    { area: 'Positioning', source: 'Options, short-interest, FINRA short-sale volume', limit: 'Deferred until needed for active workflow' },
    { area: 'Crowding', source: 'Weighted available components', limit: 'Core components visible; deferred feeds hidden' },
    { area: 'Validation', source: 'Historical sourced samples', limit: 'Deferred until enough history exists' }
  ]
  return (
    <ModuleFrame title="Public-Data Flow Methodology" kicker="Methodology" description="Proxy framework, data limits, signal definitions, provider caveats, and validation discipline.">
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="What This System Does" kicker="Scope">
          <p className="text-sm leading-7 text-muted-foreground">Monitors sector rotation, theme sponsorship, positioning proxies, crowding, extension risk, catalysts, and PM-style notes from sourced market data.</p>
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
        <Formula title="Crowding / Setup" body="crowding_score = sponsorship components only: momentum + volume + optional positioning; extension_risk_score = volatility + moving-average extension; setup_label = crowding + extension + catalyst_support" />
        <Formula title="Coverage" body="coverage_percent = available_active_fields / total_active_fields; deferred feeds do not reduce active coverage" />
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
          <Rule label="Confirm" text="EWY and defense proxies broaden together while extension risk stays confirmed by fresh catalyst support." />
          <Rule label="Invalidate" text="Relative strength rolls over, crowding turns into exit risk, or fresh catalyst support fails to confirm the move." />
        </div>
      </Panel>
    </ModuleFrame>
  )
}

function StockReportModule({
  report,
  unavailableFields,
  deferredUnavailableFields
}: {
  report?: StockReport
  unavailableFields: UnavailableField[]
  deferredUnavailableFields: UnavailableField[]
}) {
  const reportQuery = useStockReportQuery(report?.ticker ?? 'NVDA', false)
  const activeReport = reportQuery.data?.data ?? report
  const memoKey = activeReport ? `stock-report:${activeReport.ticker}` : 'stock-report'
  const memoDraft = useTerminalStore(state => state.memoDrafts[memoKey])
  const setMemoDraft = useTerminalStore(state => state.setMemoDraft)
  const [assumptions, setAssumptions] = useState<string[]>([])

  useEffect(() => {
    if (activeReport && memoDraft === undefined) setMemoDraft(memoKey, activeReport.markdown)
  }, [activeReport, memoDraft, memoKey, setMemoDraft])

  if (!activeReport) return <ModuleFrame title="Stock Report" kicker="Report"><EmptyLine title="No report" detail="Report data unavailable." /></ModuleFrame>
  const draftMarkdown = memoDraft ?? activeReport.markdown
  const reportTicker = activeReport.ticker

  function exportMarkdown() {
    const blob = new Blob([draftMarkdown], { type: 'text/markdown;charset=utf-8' })
    downloadBlob(blob, `${reportTicker.toLowerCase()}-report.md`)
  }

  return (
    <ModuleFrame title={`${activeReport.ticker} Stock Report`} kicker={activeReport.companyName} description={activeReport.summary}>
      <Panel
        title="Report Tools"
        kicker={reportQuery.isFetching ? 'Refreshing sources' : 'Report actions'}
        action={
          <div className="flex flex-wrap gap-2">
            <CopyButton text={draftMarkdown} label="Copy MD" />
            <AssumptionDialog
              ticker={activeReport.ticker}
              onSubmit={values => setAssumptions(current => [
                `${values.scenario.toUpperCase()} ${values.ticker}: growth ${values.revenueGrowth}%, margin ${values.margin}%, multiple ${values.terminalMultiple}x`,
                ...current
              ].slice(0, 4))}
            />
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => void reportQuery.refetch()}>
            Refresh Sources
          </Button>
          <Button type="button" variant="outline" onClick={exportMarkdown}>
            <Download className="h-4 w-4" />
            Export .md
          </Button>
          <Button type="button" variant="outline" onClick={() => void downloadStockReportPdf(activeReport)}>
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </Panel>
      <div className="grid gap-3 xl:grid-cols-[1fr_0.85fr]">
        <Panel title="Variant Lens / Originality Gate" kicker="Report read">
          <p className="text-sm leading-7 text-muted-foreground">{activeReport.variantView}</p>
          <ListPanel title="Risks" items={activeReport.risks} />
          <ListPanel title="Invalidation" items={activeReport.invalidation} />
        </Panel>
        <div className="grid gap-3">
          <Panel title="Required Gaps" kicker={`${unavailableFields.length} fields`}>
            {unavailableFields.length
              ? <GapHeatmap fields={unavailableFields} />
              : <EmptyLine title="Required fields present" detail={deferredUnavailableFields.length ? `${deferredUnavailableFields.length} optional/deferred sources remain outside active coverage.` : 'No source gaps recorded.'} />}
          </Panel>
          {deferredUnavailableFields.length ? (
            <Panel title="Deferred Source Gaps" kicker={`${deferredUnavailableFields.length} optional fields`}>
              <SourceLadder fields={deferredUnavailableFields} />
            </Panel>
          ) : null}
        </div>
      </div>
      <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Evidence Radar" kicker="Sourced axes">
          <ReportSignalRadar report={activeReport} />
        </Panel>
        <div className="grid gap-3">
          <Panel title="Return Ribbon" kicker="1D / 5D / 20D / 60D">
            <ReturnRibbonChart report={activeReport} />
          </Panel>
          <Panel title="Metric Trace" kicker="Report evidence">
            <ScenarioLineChart metrics={activeReport.evidence.flatMap(section => section.metrics)} />
          </Panel>
        </div>
      </div>
      <div className="grid gap-3 xl:grid-cols-[1fr_0.8fr]">
        <Panel title="Memo Draft" kicker="MDXEditor">
          <MemoEditor markdown={draftMarkdown} onChange={value => setMemoDraft(memoKey, value)} />
        </Panel>
        <div className="grid gap-3">
          <Panel title="Assumption Drafts" kicker={`${assumptions.length} local`}>
            <div className="grid gap-2">
              {assumptions.length ? assumptions.map(item => (
                <div key={item} className="rounded-md border border-border bg-background/45 p-2 font-mono text-xs text-muted-foreground">{item}</div>
              )) : <EmptyLine title="No local assumptions" detail="Use Edit Assumptions to add scenario inputs." />}
            </div>
          </Panel>
        </div>
      </div>
      <Panel title="Evidence Stack" kicker={`${activeReport.evidence.length} sections`}>
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

function StockPitchModule({ data }: { data: WorkspaceData }) {
  return (
    <ModuleFrame
      title={data.pitch ? `${data.pitch.ticker} Stock Pitch` : 'Stock Pitch Workbench'}
      kicker="Pitch"
      description={data.pitch?.oneLineThesis ?? 'Create, edit, share, and export structured StockPitch memos from one DB object.'}
    >
      <PitchWorkbench record={data.pitch} pitches={data.pitches ?? []} prices={data.prices ?? []} sourceSnapshot={data.pitchSource} initialTicker={data.pitchCreateTicker} />
    </ModuleFrame>
  )
}

function DecisionLogModule({ data, selectedTicker, sourceSummary }: { data: WorkspaceData; selectedTicker: string; sourceSummary: string }) {
  return (
    <ModuleFrame
      title="Investment Decision Audit Trail"
      kicker="Decision Log"
      description="Separate evidence from narrative, force risk framing, and track post-mortems."
    >
      <DecisionWorkbench
        decisions={data.decisions ?? []}
        activeDecision={data.decision}
        initialTicker={selectedTicker}
        sourceSummary={sourceSummary}
      />
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
  return <ResearchDataTable data={data} columns={columns} />
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
  { accessorKey: 'name', header: 'Basket', cell: ({ row }) => <Link href={basketDetailHref(row.original.slug)}>{row.original.name}</Link> },
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

const crowdingColumns: ColumnDef<CrowdingRow, unknown>[] = [
  { accessorKey: 'ticker', header: 'Ticker', cell: ({ row }) => row.original.ticker },
  { accessorKey: 'basket', header: 'Basket', cell: ({ row }) => <span className="inline-block max-w-[220px] truncate">{row.original.basket}</span> },
  { id: 'score', header: 'Crowd', accessorFn: row => row.crowdingScore.value ?? -9999, cell: ({ row }) => metricText(row.original.crowdingScore, { suffix: '' }) },
  { id: 'extensionRisk', header: 'Extension', accessorFn: row => row.extensionRiskScore.value ?? -9999, cell: ({ row }) => metricText(row.original.extensionRiskScore, { suffix: '' }) },
  { accessorKey: 'setupLabel', header: 'Setup', cell: ({ row }) => <Badge variant="outline">{row.original.setupLabel}</Badge> },
  { id: 'momentum', header: 'Momentum', accessorFn: row => row.momentumScore.value ?? -9999, cell: ({ row }) => metricText(row.original.momentumScore, { suffix: '' }) },
  { id: 'volume', header: 'Volume', accessorFn: row => row.volumeScore.value ?? -9999, cell: ({ row }) => metricText(row.original.volumeScore, { suffix: '' }) }
]

const optionalCrowdingColumns: ColumnDef<CrowdingRow, unknown>[] = [
  { id: 'catalystSupport', header: 'Catalyst', accessorFn: row => row.catalystSupportScore.value ?? -9999, cell: ({ row }) => metricText(row.original.catalystSupportScore, { suffix: '' }) },
  { id: 'options', header: 'Options', accessorFn: row => row.optionsScore.value ?? -9999, cell: ({ row }) => metricText(row.original.optionsScore, { suffix: '' }) },
  { id: 'short', header: 'Short', accessorFn: row => row.shortInterestScore.value ?? -9999, cell: ({ row }) => metricText(row.original.shortInterestScore, { suffix: '' }) }
]

function crowdingColumnsFor(rows: CrowdingRow[]) {
  return [
    ...crowdingColumns,
    ...(rows.some(row => row.catalystSupportScore.value !== null) ? [optionalCrowdingColumns[0]] : []),
    ...(rows.some(row => row.optionsScore.value !== null) ? [optionalCrowdingColumns[1]] : []),
    ...(rows.some(row => row.shortInterestScore.value !== null) ? [optionalCrowdingColumns[2]] : [])
  ]
}

const validationColumns: ColumnDef<ValidationRow, unknown>[] = [
  { accessorKey: 'testName', header: 'Test', cell: ({ row }) => row.original.testName },
  { id: 'hitRate', header: 'Hit Rate', accessorFn: row => row.hitRate.value ?? -9999, cell: ({ row }) => metricText(row.original.hitRate) },
  { id: 'return', header: 'Avg Fwd Return', accessorFn: row => row.averageForwardReturn.value ?? -9999, cell: ({ row }) => metricText(row.original.averageForwardReturn) },
  { accessorKey: 'sampleSize', header: 'Sample', cell: ({ row }) => row.original.sampleSize },
  { accessorKey: 'coveragePercent', header: 'Coverage', cell: ({ row }) => `${row.original.coveragePercent}%` }
]

type ValidationSampleTableRow = {
  testName: string
  ticker?: string
  signalDate?: string
  signalValue?: number | null
  hit: boolean
  forwardReturn: number
  trailingVol?: number | null
  forwardVol?: number | null
}

const validationSampleColumns: ColumnDef<ValidationSampleTableRow, unknown>[] = [
  { accessorKey: 'testName', header: 'Test', cell: ({ row }) => <span className="max-w-[240px] truncate">{row.original.testName}</span> },
  { accessorKey: 'ticker', header: 'Ticker', cell: ({ row }) => row.original.ticker ?? 'N/A' },
  { accessorKey: 'signalDate', header: 'Date', cell: ({ row }) => row.original.signalDate ?? 'N/A' },
  { id: 'hit', header: 'Hit', accessorFn: row => row.hit ? 1 : 0, cell: ({ row }) => row.original.hit ? 'yes' : 'no' },
  { id: 'forwardReturn', header: 'Fwd Return', accessorFn: row => row.forwardReturn, cell: ({ row }) => `${row.original.forwardReturn.toFixed(1)}%` },
  { id: 'signalValue', header: 'Signal', accessorFn: row => row.signalValue ?? -9999, cell: ({ row }) => row.original.signalValue === null || row.original.signalValue === undefined ? 'N/A' : row.original.signalValue.toFixed(2) }
]

const eventStudyColumns: ColumnDef<EventStudyRow, unknown>[] = [
  { accessorKey: 'date', header: 'Date', cell: ({ row }) => row.original.date },
  { accessorKey: 'ticker', header: 'Ticker', cell: ({ row }) => row.original.ticker },
  { accessorKey: 'category', header: 'Category', cell: ({ row }) => <span className="max-w-[180px] truncate">{row.original.category}</span> },
  { id: 'pre5d', header: 'Pre 5D', accessorFn: row => row.pre5d ?? -9999, cell: ({ row }) => formatMaybePct(row.original.pre5d) },
  { id: 'post1d', header: 'Post 1D', accessorFn: row => row.post1d, cell: ({ row }) => formatMaybePct(row.original.post1d) },
  { id: 'post5d', header: 'Post 5D', accessorFn: row => row.post5d, cell: ({ row }) => formatMaybePct(row.original.post5d) },
  { id: 'post20d', header: 'Post 20D', accessorFn: row => row.post20d, cell: ({ row }) => formatMaybePct(row.original.post20d) },
  { id: 'volume', header: 'Volume Chg', accessorFn: row => row.volumeChange ?? -9999, cell: ({ row }) => formatMaybePct(row.original.volumeChange) },
  { id: 'vol', header: 'Vol Chg', accessorFn: row => row.volChange ?? -9999, cell: ({ row }) => formatMaybePct(row.original.volChange) },
  { accessorKey: 'title', header: 'Event', cell: ({ row }) => <span className="max-w-[320px] truncate">{row.original.title}</span> }
]

type EventCategoryRow = {
  category: string
  samples: number
  hitRate: number | null
  average20d: number | null
}

const eventCategoryColumns: ColumnDef<EventCategoryRow, unknown>[] = [
  { accessorKey: 'category', header: 'Category', cell: ({ row }) => row.original.category },
  { accessorKey: 'samples', header: 'Samples', cell: ({ row }) => row.original.samples },
  { id: 'hitRate', header: 'Hit Rate', accessorFn: row => row.hitRate ?? -9999, cell: ({ row }) => formatMaybePct(row.original.hitRate) },
  { id: 'avg20d', header: 'Avg 20D', accessorFn: row => row.average20d ?? -9999, cell: ({ row }) => formatMaybePct(row.original.average20d) }
]

type PaperBookRow = {
  ticker: string
  status: string
  side: string
  sizePct: number
  confidence: number | null
  entryPrice: number | null
  targetPrice: number | null
  stopPrice: number | null
  outcomeReturn: number | null
  attribution: number | null
  driver: string
  thesis: string
}

type ThemeExposureRow = {
  driver: string
  gross: number
  net: number
  count: number
}

const paperBookColumns: ColumnDef<PaperBookRow, unknown>[] = [
  { accessorKey: 'ticker', header: 'Ticker', cell: ({ row }) => row.original.ticker },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => row.original.status },
  { accessorKey: 'side', header: 'Side', cell: ({ row }) => row.original.side },
  { id: 'size', header: 'Size', accessorFn: row => row.sizePct, cell: ({ row }) => `${row.original.sizePct.toFixed(1)}%` },
  { id: 'confidence', header: 'Conf', accessorFn: row => row.confidence ?? -9999, cell: ({ row }) => row.original.confidence === null ? 'N/A' : row.original.confidence.toFixed(0) },
  { id: 'target', header: 'Target', accessorFn: row => row.targetPrice ?? -9999, cell: ({ row }) => formatMaybeNumber(row.original.targetPrice) },
  { id: 'stop', header: 'Stop', accessorFn: row => row.stopPrice ?? -9999, cell: ({ row }) => formatMaybeNumber(row.original.stopPrice) },
  { id: 'outcome', header: 'Outcome', accessorFn: row => row.outcomeReturn ?? -9999, cell: ({ row }) => formatMaybePct(row.original.outcomeReturn) },
  { id: 'attribution', header: 'Attrib', accessorFn: row => row.attribution ?? -9999, cell: ({ row }) => formatMaybePct(row.original.attribution) },
  { accessorKey: 'thesis', header: 'Thesis', cell: ({ row }) => <span className="max-w-[280px] truncate">{row.original.thesis}</span> }
]

const pmDecisionColumns: ColumnDef<PmDecisionOverlay, unknown>[] = [
  { accessorKey: 'ticker', header: 'Ticker', cell: ({ row }) => <span className="font-mono font-semibold">{row.original.ticker}</span> },
  { accessorKey: 'side', header: 'Side', cell: ({ row }) => row.original.side },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => row.original.status },
  { id: 'humanSize', header: 'Human', accessorFn: row => row.humanSizePct, cell: ({ row }) => `${row.original.humanSizePct.toFixed(1)}%` },
  { id: 'engineSize', header: 'Engine', accessorFn: row => row.suggestedSizePct, cell: ({ row }) => `${row.original.suggestedSizePct.toFixed(1)}%` },
  { id: 'ev', header: 'EV', accessorFn: row => row.expectedValuePct, cell: ({ row }) => formatMaybePct(row.original.expectedValuePct) },
  { id: 'costEv', header: 'Net EV', accessorFn: row => row.costAdjustedEvPct, cell: ({ row }) => formatMaybePct(row.original.costAdjustedEvPct) },
  { id: 'raw', header: 'Raw', accessorFn: row => row.rawStopSizePct, cell: ({ row }) => `${row.original.rawStopSizePct.toFixed(1)}%` },
  { accessorKey: 'activeCapReason', header: 'Cap', cell: ({ row }) => <Badge variant="outline" className="font-mono">{row.original.activeCapReason}</Badge> },
  { id: 'beta', header: 'Beta', accessorFn: row => row.beta, cell: ({ row }) => row.original.beta.toFixed(2) },
  { id: 'liquidity', header: 'Liq', accessorFn: row => row.liquidityDays, cell: ({ row }) => row.original.liquidityDays >= 999 ? 'No ADV' : `${row.original.liquidityDays.toFixed(1)}d` },
  { id: 'grade', header: 'BT', accessorFn: row => row.backtest.grade, cell: ({ row }) => row.original.backtest.grade }
]

const pmSectorColumns: ColumnDef<PmSectorExposure, unknown>[] = [
  { accessorKey: 'sector', header: 'Sector', cell: ({ row }) => row.original.sector },
  { id: 'gross', header: 'Gross', accessorFn: row => row.grossPct, cell: ({ row }) => `${row.original.grossPct.toFixed(1)}%` },
  { id: 'net', header: 'Net', accessorFn: row => row.netPct, cell: ({ row }) => `${row.original.netPct.toFixed(1)}%` },
  { accessorKey: 'count', header: 'Names', cell: ({ row }) => row.original.count }
]

const pmOptimizerColumns: ColumnDef<PmEngineView['portfolio']['optimizerLedger'][number], unknown>[] = [
  { accessorKey: 'ticker', header: 'Ticker', cell: ({ row }) => row.original.ticker },
  { accessorKey: 'action', header: 'Action', cell: ({ row }) => <Badge variant={row.original.action === 'accepted' ? 'secondary' : 'outline'} className="font-mono">{row.original.action}</Badge> },
  { accessorKey: 'reason', header: 'Reason', cell: ({ row }) => row.original.reason },
  { id: 'size', header: 'Size', accessorFn: row => row.suggestedSizePct, cell: ({ row }) => `${row.original.suggestedSizePct.toFixed(1)}%` }
]

const pmLiquidityColumns: ColumnDef<PmLiquidityExit, unknown>[] = [
  { accessorKey: 'ticker', header: 'Ticker', cell: ({ row }) => row.original.ticker },
  { id: 'days', header: 'Days', accessorFn: row => row.daysToExit, cell: ({ row }) => row.original.daysToExit >= 999 ? 'No ADV' : row.original.daysToExit.toFixed(1) },
  { id: 'adv', header: 'ADV %', accessorFn: row => row.advParticipationPct, cell: ({ row }) => `${row.original.advParticipationPct.toFixed(1)}%` },
  { id: 'cost', header: 'Cost', accessorFn: row => row.estimatedCostPct, cell: ({ row }) => `${row.original.estimatedCostPct.toFixed(2)}%` }
]

const themeExposureColumns: ColumnDef<ThemeExposureRow, unknown>[] = [
  { accessorKey: 'driver', header: 'Driver', cell: ({ row }) => row.original.driver },
  { id: 'gross', header: 'Gross', accessorFn: row => row.gross, cell: ({ row }) => `${row.original.gross.toFixed(1)}%` },
  { id: 'net', header: 'Net', accessorFn: row => row.net, cell: ({ row }) => `${row.original.net.toFixed(1)}%` },
  { accessorKey: 'count', header: 'Ideas', cell: ({ row }) => row.original.count }
]

const riskLensColumns: ColumnDef<RiskLensRow, unknown>[] = [
  { accessorKey: 'ticker', header: 'Ticker', cell: ({ row }) => row.original.ticker },
  { accessorKey: 'asOfDate', header: 'As Of', cell: ({ row }) => row.original.asOfDate || 'N/A' },
  { id: 'rv20', header: 'RV20', accessorFn: row => row.rv20 ?? -9999, cell: ({ row }) => formatMaybePct(row.original.rv20) },
  { id: 'rv60', header: 'RV60', accessorFn: row => row.rv60 ?? -9999, cell: ({ row }) => formatMaybePct(row.original.rv60) },
  { id: 'atr20', header: 'ATR20', accessorFn: row => row.atr20 ?? -9999, cell: ({ row }) => formatMaybeNumber(row.original.atr20) },
  { id: 'range', header: 'Range', accessorFn: row => row.range20Pct ?? -9999, cell: ({ row }) => formatMaybePct(row.original.range20Pct) },
  { id: 'gap', header: 'Gap', accessorFn: row => row.gapPct ?? -9999, cell: ({ row }) => formatMaybePct(row.original.gapPct) },
  { id: 'extension', header: 'Extension', accessorFn: row => row.extensionRisk ?? -9999, cell: ({ row }) => formatMaybePct(row.original.extensionRisk) },
  { accessorKey: 'vixBackdrop', header: 'VIX', cell: ({ row }) => row.original.vixLevel === null ? row.original.vixBackdrop : `${row.original.vixLevel.toFixed(1)} ${row.original.vixBackdrop}` }
]

type SourceProviderRow = NonNullable<SourceAudit['providers']>[number]

const sourceProviderColumns: ColumnDef<SourceProviderRow, unknown>[] = [
  { accessorKey: 'provider', header: 'Provider', cell: ({ row }) => row.original.provider },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => row.original.status },
  { accessorKey: 'records', header: 'Records', cell: ({ row }) => row.original.records },
  { accessorKey: 'freshnessStatus', header: 'Freshness', cell: ({ row }) => row.original.freshnessStatus ?? 'unknown' },
  { accessorKey: 'ageHours', header: 'Age', cell: ({ row }) => row.original.ageHours === null || row.original.ageHours === undefined ? 'N/A' : `${row.original.ageHours.toFixed(1)}h` }
]

const methodologyColumns: ColumnDef<{ area: string; source: string; limit: string }, unknown>[] = [
  { accessorKey: 'area', header: 'Area', cell: ({ row }) => row.original.area },
  { accessorKey: 'source', header: 'Source', cell: ({ row }) => row.original.source },
  { accessorKey: 'limit', header: 'Limit', cell: ({ row }) => row.original.limit }
]

function buildEventStudyRows(events: Event[], eventReturns: EventReturn[], prices: ChartPricePoint[]): EventStudyRow[] {
  const eventById = new Map(events.map(event => [event.id, event]))
  const pricesByTicker = groupPricePoints(prices)
  return eventReturns.map(row => {
    const event = eventById.get(row.eventId)
    const tape = pricesByTicker.get(row.ticker) ?? []
    const pre5d = windowReturnBefore(tape, event?.date ?? '', 5)
    const volumeChange = volumeChangeAround(tape, event?.date ?? '', 5)
    const volChange = realizedVolChangeAround(tape, event?.date ?? '', 20)
    return {
      eventId: row.eventId,
      title: event?.title ?? row.eventId,
      date: event?.date ?? '',
      ticker: row.ticker,
      category: row.eventCategory,
      pre5d,
      post1d: row.return1d,
      post5d: row.return5d,
      post20d: row.return20d,
      volumeChange,
      volChange,
      caveat: row.interpretation
    }
  }).sort((a, b) => b.date.localeCompare(a.date))
}

function summarizeEventStudy(rows: EventStudyRow[]) {
  const values = rows.map(row => row.post20d).filter(Number.isFinite)
  return {
    samples: values.length,
    hitRate: values.length ? (values.filter(value => value > 0).length / values.length) * 100 : null,
    average20d: values.length ? average(values) : null
  }
}

function summarizeEventStudyByCategory(rows: EventStudyRow[]): EventCategoryRow[] {
  const map = new Map<string, EventStudyRow[]>()
  for (const row of rows) {
    const list = map.get(row.category) ?? []
    list.push(row)
    map.set(row.category, list)
  }
  return Array.from(map.entries()).map(([category, items]) => {
    const values = items.map(item => item.post20d)
    return {
      category,
      samples: values.length,
      hitRate: values.length ? (values.filter(value => value > 0).length / values.length) * 100 : null,
      average20d: values.length ? average(values) : null
    }
  }).sort((a, b) => b.samples - a.samples)
}

function buildPaperBook(decisions: InvestmentDecisionRecord[]) {
  const rows: PaperBookRow[] = decisions.map(decision => {
    const sizePct = decision.decision === 'long' || decision.decision === 'short' ? decision.risk.positionSizePct ?? 0 : 0
    const attribution = decision.outcomeReturn === null ? null : (decision.outcomeReturn * sizePct) / 100
    return {
      ticker: decision.ticker,
      status: decision.status,
      side: decision.decision,
      sizePct,
      confidence: decision.risk.confidence,
      entryPrice: decision.risk.entryPrice,
      targetPrice: decision.risk.targetPrice,
      stopPrice: decision.risk.stopPrice,
      outcomeReturn: decision.outcomeReturn,
      attribution,
      driver: decision.evidence[0]?.driver || 'Unclassified',
      thesis: decision.risk.thesis || decision.variantView || 'Thesis pending.'
    }
  })
  const exposed = rows.filter(row => row.status !== 'closed' && (row.side === 'long' || row.side === 'short'))
  const gross = exposed.reduce((sum, row) => sum + Math.abs(row.sizePct), 0)
  const net = exposed.reduce((sum, row) => sum + (row.side === 'short' ? -row.sizePct : row.sizePct), 0)
  const closed = rows.filter(row => row.outcomeReturn !== null)
  const wins = closed.filter(row => (row.outcomeReturn ?? 0) > 0).length
  const losses = closed.filter(row => (row.outcomeReturn ?? 0) < 0).length
  const maxLoss = closed.length ? Math.min(...closed.map(row => row.outcomeReturn ?? 0)) : null
  const themeRows = aggregateThemeExposure(exposed)
  return { rows, openCount: exposed.length, gross, net, wins, losses, maxLoss, themeRows }
}

function aggregateThemeExposure(rows: PaperBookRow[]): ThemeExposureRow[] {
  const map = new Map<string, ThemeExposureRow>()
  for (const row of rows) {
    const current = map.get(row.driver) ?? { driver: row.driver, gross: 0, net: 0, count: 0 }
    current.gross += Math.abs(row.sizePct)
    current.net += row.side === 'short' ? -row.sizePct : row.sizePct
    current.count += 1
    map.set(row.driver, current)
  }
  return Array.from(map.values()).sort((a, b) => b.gross - a.gross)
}

function groupPricePoints(prices: ChartPricePoint[]) {
  const map = new Map<string, ChartPricePoint[]>()
  for (const point of prices) {
    const list = map.get(point.ticker) ?? []
    list.push(point)
    map.set(point.ticker, list)
  }
  for (const [ticker, rows] of map) {
    map.set(ticker, rows.sort((a, b) => a.date.localeCompare(b.date)))
  }
  return map
}

function windowReturnBefore(rows: ChartPricePoint[], date: string, days: number) {
  const index = rows.findIndex(row => row.date >= date)
  if (index < days || index < 0) return null
  const start = rows[index - days]
  const end = rows[index]
  return start.price > 0 ? round(((end.price - start.price) / start.price) * 100, 1) : null
}

function volumeChangeAround(rows: ChartPricePoint[], date: string, days: number) {
  const index = rows.findIndex(row => row.date >= date)
  if (index < days || index < 0 || index + days >= rows.length) return null
  const before = average(rows.slice(index - days, index).map(row => row.volume ?? NaN).filter(Number.isFinite))
  const after = average(rows.slice(index, index + days).map(row => row.volume ?? NaN).filter(Number.isFinite))
  if (!Number.isFinite(before) || before <= 0 || !Number.isFinite(after)) return null
  return round(((after - before) / before) * 100, 1)
}

function realizedVolChangeAround(rows: ChartPricePoint[], date: string, days: number) {
  const index = rows.findIndex(row => row.date >= date)
  if (index < days || index < 0 || index + days >= rows.length) return null
  const before = realizedVolFromPrices(rows.slice(index - days, index + 1))
  const after = realizedVolFromPrices(rows.slice(index, index + days + 1))
  if (before === null || after === null) return null
  return round(after - before, 1)
}

function realizedVolFromPrices(rows: ChartPricePoint[]) {
  if (rows.length < 2) return null
  const returns = rows.slice(1).map((row, index) => rows[index].price > 0 ? Math.log(row.price / rows[index].price) : 0)
  const mean = average(returns)
  const variance = average(returns.map(value => Math.pow(value - mean, 2)))
  return Math.sqrt(variance) * Math.sqrt(252) * 100
}

function average(values: number[]) {
  if (!values.length) return NaN
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function formatMaybePct(value: number | null | undefined) {
  return value === null || value === undefined || !Number.isFinite(value) ? 'N/A' : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

function formatMaybeNumber(value: number | null | undefined) {
  return value === null || value === undefined || !Number.isFinite(value) ? 'N/A' : value.toFixed(Math.abs(value) >= 100 ? 0 : 2)
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function SourceLightGrid({ lights }: { lights: PmSourceLight[] }) {
  return (
    <div className="grid gap-2">
      {lights.map(light => (
        <div key={light.label} className="rounded-md border border-border bg-background/45 p-2">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${light.status === 'available' ? 'bg-emerald-300' : light.status === 'partial' ? 'bg-amber' : 'bg-red-300'}`} />
            <p className="font-mono text-xs font-semibold">{light.label}</p>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{light.detail}</p>
        </div>
      ))}
    </div>
  )
}

function ScenarioCards({ scenarios }: { scenarios: PmScenario[] }) {
  return (
    <div className="grid gap-2 md:grid-cols-3">
      {scenarios.map(scenario => (
        <div key={scenario.name} className="rounded-md border border-border bg-background/45 p-3">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.08em] text-muted-foreground">{scenario.name}</p>
          <p className={`mt-2 font-mono text-lg font-semibold ${scenario.returnPct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{formatMaybePct(scenario.returnPct)}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <MetricMini label="Prob" value={`${scenario.probability.toFixed(0)}%`} />
            <MetricMini label="EV" value={formatMaybePct(scenario.contributionPct)} />
          </div>
        </div>
      ))}
    </div>
  )
}

function SizingWaterfall({ steps }: { steps: PmWaterfallStep[] }) {
  const max = Math.max(1, ...steps.map(step => step.valuePct))
  return (
    <div className="grid gap-2">
      {steps.map(step => (
        <div key={step.label} className="grid gap-1">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-xs text-muted-foreground">{step.label}</span>
            <span className={`font-mono text-xs ${step.active ? 'text-amber' : 'text-foreground'}`}>{step.valuePct.toFixed(1)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${step.active ? 'bg-amber' : 'bg-primary'}`} style={{ width: `${Math.max(2, Math.min(100, (step.valuePct / max) * 100))}%` }} />
          </div>
          <p className="text-[0.68rem] leading-4 text-muted-foreground">{step.reason}</p>
        </div>
      ))}
    </div>
  )
}

function FactorHeatmap({ rows }: { rows: PmFactorHeatmapRow[] }) {
  const factors = [...new Set(rows.flatMap(row => Object.keys(row.exposures)))].slice(0, 12)
  if (!rows.length || !factors.length) return <EmptyLine title="No factor cells" detail="Factor model needs aligned price history." />
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[620px]">
        <div className="grid gap-1" style={{ gridTemplateColumns: `90px repeat(${factors.length}, minmax(44px, 1fr))` }}>
          <div className="font-mono text-[0.65rem] text-muted-foreground">Ticker</div>
          {factors.map(factor => <div key={factor} className="text-center font-mono text-[0.65rem] text-muted-foreground">{factor}</div>)}
          {rows.map(row => (
            <div key={row.ticker} className="contents">
              <div className="truncate rounded-md border border-border bg-background/45 px-2 py-1 font-mono text-xs font-semibold">{row.ticker}</div>
              {factors.map(factor => {
                const value = row.exposures[factor] ?? 0
                return (
                  <div key={`${row.ticker}-${factor}`} className="rounded-md px-1 py-1 text-center font-mono text-[0.68rem] text-foreground" style={{ backgroundColor: heatColor(value) }}>
                    {value.toFixed(2)}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StressLadder({ rows }: { rows: PmStressScenario[] }) {
  const max = Math.max(1, ...rows.map(row => row.lossPct))
  return (
    <div className="grid gap-2">
      {rows.map(row => (
        <div key={row.label} className="rounded-md border border-border bg-background/45 p-2">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-xs font-semibold">{row.label}</p>
            <p className="font-mono text-xs text-red-300">-{row.lossPct.toFixed(1)}%</p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-red-300" style={{ width: `${Math.max(2, Math.min(100, (row.lossPct / max) * 100))}%` }} />
          </div>
          <p className="mt-2 text-[0.68rem] leading-4 text-muted-foreground">{row.detail}</p>
        </div>
      ))}
    </div>
  )
}

function BacktestStrip({ backtest }: { backtest: PmBacktestSummary }) {
  const items = [
    ['Grade', backtest.grade],
    ['Hit', backtest.hitRate === null ? 'N/A' : `${backtest.hitRate.toFixed(1)}%`],
    ['IC', backtest.informationCoefficient === null ? 'N/A' : backtest.informationCoefficient.toFixed(3)],
    ['Decay', backtest.decay === null ? 'N/A' : `${backtest.decay.toFixed(1)}%`],
    ['Turnover', backtest.turnover === null ? 'N/A' : `${backtest.turnover.toFixed(1)}%`],
    ['Capacity', backtest.capacity === null ? 'N/A' : `${backtest.capacity.toFixed(1)}%`],
    ['Gross', backtest.grossReturn === null ? 'N/A' : formatMaybePct(backtest.grossReturn)],
    ['Net', backtest.netReturn === null ? 'N/A' : formatMaybePct(backtest.netReturn)]
  ]
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      {items.map(([label, value]) => <MetricMini key={label} label={label} value={value} />)}
    </div>
  )
}

function RiskContributionBars({ rows }: { rows: PmRiskContribution[] }) {
  if (!rows.length) return <EmptyLine title="No active risk" detail="Optimizer has no accepted exposures." />
  return (
    <div className="grid gap-2">
      {rows.slice(0, 12).map(row => (
        <div key={row.ticker} className="grid gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-semibold">{row.ticker}</span>
            <span className="font-mono text-xs text-muted-foreground">{row.riskPct.toFixed(1)}% risk / {row.sizePct.toFixed(1)}% size</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, Math.min(100, row.riskPct))}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function heatColor(value: number) {
  const magnitude = Math.min(1, Math.abs(value) / 1.5)
  if (value >= 0) return `rgba(80, 210, 193, ${0.12 + magnitude * 0.58})`
  return `rgba(248, 113, 113, ${0.12 + magnitude * 0.58})`
}

function ModuleFrame({ title, kicker, description, children }: { title: string; kicker: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <div className="border-b border-border bg-card/40 p-3">
        <p className="font-mono text-[0.68rem] tracking-[0.04em] text-muted-foreground">{kicker}</p>
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
            <p className="font-mono text-[0.65rem] tracking-[0.04em] text-muted-foreground">{kicker}</p>
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
      <p className="font-mono text-[0.65rem] tracking-[0.04em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-mono text-sm font-semibold">{value}</p>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="font-mono text-[0.65rem] tracking-[0.04em] text-muted-foreground">{label}</p>
      <p className="mt-2 truncate font-mono text-lg font-semibold">{value}</p>
    </div>
  )
}

function DeferredPanel({
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
      <p className="font-mono text-xs font-semibold tracking-[0.06em] text-primary">{label}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  )
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
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

function fallbackCopy(text: string) {
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

function reportMetric(report: StockReport | undefined, label: string) {
  if (!report) return undefined
  const sections = [...report.evidence, report.positioning, report.catalysts]
  return sections.flatMap(section => section.metrics).find(metric => metric.label === label)
}

function setupFromReport(report: StockReport) {
  const setupMetric = reportMetric(report, 'Setup')
  if (setupMetric?.displayValue && setupMetric.displayValue !== 'Unavailable') return setupMetric.displayValue
  const setupMatch = report.summary.match(/setup label is ([^.]+)\./i)
  return setupMatch?.[1]?.trim() ?? null
}

function metricValue(metric: MetricValue | undefined) {
  return metric?.value ?? -Infinity
}

function hasPositioningData(row: PositioningRow) {
  return [
    row.optionsVolume,
    row.openInterest,
    row.putCallRatio,
    row.impliedVolatility,
    row.impliedVolPercentile,
    row.shortInterest,
    row.shortInterestChange,
    row.shortVolumeRatio
  ].some(metric => metric.value !== null)
}

function validPositioningTab(value: string | null) {
  if (value === 'short-interest' || value === 'short-sale') return value
  return 'options'
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
  const fromReport = data.report ? [{
    ticker: data.report.ticker,
    label: setupFromReport(data.report) ?? data.report.companyName,
    value: reportMetric(data.report, '20D return')?.value ?? 0
  }] : []
  const fromRotations = (data.rotations ?? data.basketSignals ?? []).map(row => ({
    ticker: row.ticker,
    label: row.trendLabel || row.name,
    value: row.return20d.value ?? 0
  }))
  const fromCrowding = (data.crowding ?? data.basketCrowding ?? []).map(row => ({
    ticker: row.ticker,
    label: row.setupLabel,
    value: row.crowdingScore.value ?? 0
  }))
  const fromPositioning = (data.positioning ?? []).map(row => ({
    ticker: row.ticker,
    label: row.positioningNotes,
    value: row.impliedVolPercentile.value ?? 0
  }))
  const fromPitches = (data.pitches ?? []).map(row => ({
    ticker: row.ticker,
    label: row.recommendation,
    value: row.expectedReturn ?? 0
  }))
  const fromDecisions = (data.decisions ?? []).map(row => ({
    ticker: row.ticker,
    label: row.status,
    value: row.outcomeReturn ?? row.expectedReturn ?? 0
  }))
  const seen = new Set<string>()
  return [...fromReport, ...fromRotations, ...fromCrowding, ...fromPositioning, ...fromDecisions, ...fromPitches]
    .filter(row => {
      if (seen.has(row.ticker)) return false
      seen.add(row.ticker)
      return true
    })
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
}

function isModuleActive(item: WorkspaceModule, active: WorkspaceModule) {
  return active === item || (active === 'basket-detail' && item === 'baskets')
}

function watchlistHref(active: WorkspaceModule, ticker: string) {
  const symbol = encodeURIComponent(ticker)
  if (active === 'decision-log') return `/?module=decision-log&ticker=${symbol}`
  if (active === 'stock-pitch') return `/?module=stock-pitch&ticker=${symbol}`
  if (active === 'risk-lens') return `/?module=risk-lens&ticker=${symbol}`
  if (active === 'stock-report') return `/?module=stock-report&ticker=${symbol}`
  return `/?module=stock-report&ticker=${symbol}`
}

function basketDetailHref(slug: string) {
  return `/?module=baskets&slug=${slug}`
}

function defaultQuestions(module: WorkspaceModule) {
  const map: Record<WorkspaceModule, string[]> = {
    overview: ['What moved, why, and does source coverage support action?'],
    rotation: ['Is leadership broadening beyond one ETF?', 'Does volume confirm relative strength?'],
    baskets: ['Which baskets show confirmed sponsorship?', 'Which themes have coverage gaps?'],
    'basket-detail': ['Is performance broad across members?', 'Does positioning confirm sponsorship?'],
    positioning: ['Are options rows available or entitlement-blocked?', 'Does short-sale volume differ from short interest?'],
    crowding: ['Which high-crowding longs also have high extension risk?', 'Which deferred components would change setup label?'],
    validation: ['Is sample history sufficient for confidence?'],
    methodology: ['Are proxy limits explicit enough for downstream readers?'],
    'korea-defense': ['Is Korea exposure confirming through EWY or only U.S. suppliers?', 'Do deferred fields weaken the read?'],
    'stock-report': ['Does evidence support variant view?', 'What invalidates setup?'],
    'decision-log': ['Is market belief separated from variant view?', 'Are three drivers, invalidation, and post-mortem written?'],
    'stock-pitch': ['Is variant view sharp enough for a fund reader?', 'Can the print memo and live tool tell the same story?'],
    'event-study': ['Is sample size enough to trust catalyst read?', 'Do pre/post returns contradict narrative?'],
    'paper-book': ['Which cap sets final engine size?', 'Is cost-adjusted EV positive after risk, liquidity, and factor constraints?'],
    'risk-lens': ['Is RV rising faster than thesis confidence?', 'Are ATR/gap fields sourced or unavailable?'],
    'source-audit': ['Which missing fields are active blockers?', 'Which gaps are entitlement/deferred, not hallucination targets?']
  }
  return map[module]
}

function panelLayoutSizes(mode: PanelLayoutMode) {
  if (mode === 'memo-heavy') return { left: 14, center: 64, right: 22 }
  if (mode === 'data-heavy') return { left: 20, center: 48, right: 32 }
  return { left: 18, center: 58, right: 24 }
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
