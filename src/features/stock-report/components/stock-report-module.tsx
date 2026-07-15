import { useEffect, useMemo, useRef, useState } from 'react'
import { createChart, LineSeries, LineStyle } from 'lightweight-charts'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AssumptionDialog } from '@/components/workbench/assumption-dialog'
import { MemoEditor } from '@/components/workbench/memo-editor'
import { GapHeatmap, ReportSignalRadar, ReturnRibbonChart, ScenarioLineChart, chartTheme } from '@/components/workbench/research-charts'
import { ModuleFrame } from '@/components/workbench/module-frame'
import { CopyButton, EmptyLine, ListPanel, MetricMini, Panel } from '@/components/workbench/research-surfaces'
import { SourceLadder } from '@/components/workbench/source-ladder'
import type { UnavailableField } from '@/contracts/provenance'
import type { ChartPricePoint } from '@/contracts/workspace'
import { downloadStockReportPdf } from '@/lib/research/export'
import { useStockReportQuery } from '@/lib/research/hooks'
import { useTerminalStore } from '@/features/workspace/components/workspace-store'
import { sectorBenchmarkForTicker } from '@/features/stock-report/domain/benchmark'
import type { StockReport } from '@/types/research'

export function StockReportModule({
  report,
  prices,
  unavailableFields,
  deferredUnavailableFields
}: {
  report?: StockReport
  prices: ChartPricePoint[]
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
      <Panel title={`${activeReport.ticker} Price Tape`} kicker="Close / benchmark / indexed modes">
        <PriceChart prices={prices} ticker={activeReport.ticker} />
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

type PriceChartRange = '1M' | '3M' | '6M' | '1Y'
type PriceViewMode = 'price' | 'indexed'
type BenchmarkKey = 'spy' | 'sector'

type PriceChartEventMarker = {
  date: string
  title: string
  tone?: 'good' | 'warn' | 'danger' | 'neutral'
}

type PriceChartRail = {
  label: string
  price: number
  tone?: 'good' | 'warn' | 'danger' | 'neutral'
}

const priceChartRanges: PriceChartRange[] = ['1M', '3M', '6M', '1Y']

export function PriceChart({
  prices,
  ticker,
  sector,
  eventMarkers = [],
  rails = []
}: {
  prices: ChartPricePoint[]
  ticker: string
  sector?: string
  eventMarkers?: PriceChartEventMarker[]
  rails?: PriceChartRail[]
}) {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const [range, setRange] = useState<PriceChartRange>('6M')
  const [mode, setMode] = useState<PriceViewMode>('price')
  const [benchmarks, setBenchmarks] = useState<Record<BenchmarkKey, boolean>>({ spy: true, sector: false })
  const [hover, setHover] = useState<{ date: string; price: number | null; returnValue: number | null; volume: number | null; indexed: number | null } | null>(null)
  const tickerRows = useMemo(() => priceRowsForTicker(prices, ticker), [prices, ticker])
  const startDate = rangeStartDate(tickerRows, range)
  const visibleRows = useMemo(() => filterPriceRows(tickerRows, startDate), [tickerRows, startDate])
  const sectorSymbol = sectorBenchmarkForTicker(ticker, sector)
  const spyRows = useMemo(() => filterPriceRows(priceRowsForTicker(prices, 'SPY'), startDate), [prices, startDate])
  const sectorRows = useMemo(() => filterPriceRows(priceRowsForTicker(prices, sectorSymbol), startDate), [prices, sectorSymbol, startDate])
  const primaryData = useMemo(() => chartLineData(visibleRows, mode), [visibleRows, mode])
  const benchmarkData = useMemo(() => {
    if (mode !== 'indexed') return []
    const rows: { key: BenchmarkKey; label: string; color: string; data: { time: string; value: number }[] }[] = []
    if (benchmarks.spy && ticker !== 'SPY' && spyRows.length) {
      rows.push({ key: 'spy', label: 'SPY', color: chartTheme.colors.accent, data: chartLineData(spyRows, 'indexed') })
    }
    if (benchmarks.sector && sectorSymbol !== ticker && sectorSymbol !== 'SPY' && sectorRows.length) {
      rows.push({ key: 'sector', label: sectorSymbol, color: chartTheme.colors.warn, data: chartLineData(sectorRows, 'indexed') })
    }
    return rows
  }, [benchmarks, mode, sectorRows, sectorSymbol, spyRows, ticker])
  const latest = visibleRows.at(-1)
  const first = visibleRows[0]
  const indexedReturn = first && latest ? ((latest.price / first.price) - 1) * 100 : null

  useEffect(() => {
    if (!chartRef.current || primaryData.length === 0) return
    const element = chartRef.current
    let active = true
    const chart = createChart(element, {
      width: element.clientWidth,
      height: element.clientHeight,
      layout: {
        background: { color: 'transparent' },
        textColor: chartTheme.colors.muted
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.055)' },
        horzLines: { color: chartTheme.colors.grid }
      },
      crosshair: {
        vertLine: { color: 'rgba(116,242,206,0.45)', labelBackgroundColor: '#1f6f69' },
        horzLine: { color: 'rgba(116,242,206,0.35)', labelBackgroundColor: '#1f6f69' }
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, rightOffset: 4 }
    })
    const series = chart.addSeries(LineSeries, {
      color: chartTheme.colors.good,
      lineWidth: 2,
      priceLineVisible: false
    })
    series.setData(primaryData as never)
    for (const row of benchmarkData) {
      const benchmarkSeries = chart.addSeries(LineSeries, {
        color: row.color,
        lineWidth: 1,
        priceLineVisible: false
      })
      benchmarkSeries.setData(row.data as never)
    }
    const basePrice = visibleRows[0]?.price ?? null
    for (const rail of rails) {
      const price = mode === 'indexed' && basePrice ? (rail.price / basePrice) * 100 : rail.price
      series.createPriceLine({
        price,
        title: rail.label,
        color: chartTheme.colors[rail.tone ?? 'neutral'],
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true
      })
    }
    chart.subscribeCrosshairMove(param => {
      if (!active) return
      if (!param.time) {
        setHover(null)
        return
      }
      const date = String(param.time)
      const point = visibleRows.find(row => row.date === date)
      const primaryPoint = param.seriesData.get(series) as { value?: number } | undefined
      setHover({
        date,
        price: point?.price ?? null,
        returnValue: point?.returnValue ?? null,
        volume: point?.volume ?? null,
        indexed: typeof primaryPoint?.value === 'number' ? primaryPoint.value : null
      })
    })
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
      active = false
      resize.disconnect()
      chart.remove()
    }
  }, [benchmarkData, mode, primaryData, rails, visibleRows])

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {priceChartRanges.map(option => (
            <Button key={option} type="button" size="sm" variant={range === option ? 'secondary' : 'outline'} className="h-8 px-2 font-mono text-xs" onClick={() => setRange(option)}>
              {option}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          <Button type="button" size="sm" variant={mode === 'price' ? 'secondary' : 'outline'} className="h-8 px-2 font-mono text-xs" onClick={() => setMode('price')}>
            Price
          </Button>
          <Button type="button" size="sm" variant={mode === 'indexed' ? 'secondary' : 'outline'} className="h-8 px-2 font-mono text-xs" onClick={() => setMode('indexed')}>
            Indexed
          </Button>
          <Button type="button" size="sm" variant={mode === 'indexed' && benchmarks.spy ? 'secondary' : 'outline'} className="h-8 px-2 font-mono text-xs" disabled={mode !== 'indexed' || ticker === 'SPY' || !spyRows.length} onClick={() => setBenchmarks(current => ({ ...current, spy: !current.spy }))}>
            SPY
          </Button>
          {sectorSymbol !== ticker && sectorSymbol !== 'SPY' ? (
            <Button type="button" size="sm" variant={mode === 'indexed' && benchmarks.sector ? 'secondary' : 'outline'} className="h-8 px-2 font-mono text-xs" disabled={mode !== 'indexed' || !sectorRows.length} onClick={() => setBenchmarks(current => ({ ...current, sector: !current.sector }))}>
              {sectorSymbol}
            </Button>
          ) : null}
        </div>
      </div>
      <div className="relative h-[360px] min-h-[260px] w-full overflow-hidden rounded-md border border-border bg-background/35">
        {primaryData.length === 0 ? (
          <div className="absolute inset-0 z-10 grid place-items-center">
            <EmptyLine title={`No ${ticker} close series`} detail="Chart stays empty until sourced price rows exist." />
          </div>
        ) : null}
        <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md border border-border bg-card/90 px-3 py-2 backdrop-blur">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">{mode === 'indexed' ? 'Indexed read' : 'Hover read'}</p>
          <p className="mt-1 font-mono text-sm font-semibold">{hover ? `${hover.date} / ${formatMaybeNumber(hover.price)}` : latest ? `${latest.date} / ${formatMaybeNumber(latest.price)}` : ticker}</p>
          <div className="mt-2 grid gap-1 text-[0.68rem] text-muted-foreground sm:grid-cols-3">
            <span>1D {formatMaybePct(hover?.returnValue ?? latest?.returnValue ?? null)}</span>
            <span>Vol {formatVolume(hover?.volume ?? latest?.volume ?? null)}</span>
            <span>Idx {formatMaybeNumber(hover?.indexed ?? (mode === 'indexed' ? 100 + (indexedReturn ?? 0) : null))}</span>
          </div>
        </div>
        {eventMarkers.length ? (
          <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex max-w-[70%] flex-wrap gap-1">
            {eventMarkers.slice(0, 4).map(marker => (
              <span key={`${marker.date}-${marker.title}`} className="rounded border border-border bg-card/85 px-2 py-1 font-mono text-[0.6rem] text-muted-foreground backdrop-blur">{marker.date} {marker.title}</span>
            ))}
          </div>
        ) : null}
        <div ref={chartRef} className="h-full w-full" />
      </div>
      {mode === 'indexed' ? (
        <div className="flex flex-wrap gap-2 text-[0.68rem] text-muted-foreground">
          <span className="rounded border border-border bg-background/45 px-2 py-1 font-mono text-foreground">{ticker}</span>
          {benchmarkData.map(row => <span key={row.key} className="rounded border border-border bg-background/45 px-2 py-1 font-mono" style={{ color: row.color }}>{row.label}</span>)}
        </div>
      ) : null}
    </div>
  )
}

function priceRowsForTicker(prices: ChartPricePoint[], ticker: string) {
  return prices
    .filter(point => point.ticker === ticker)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
}

function rangeStartDate(rows: ChartPricePoint[], range: PriceChartRange) {
  if (!rows.length) return null
  const daysByRange: Record<PriceChartRange, number> = { '1M': 22, '3M': 66, '6M': 132, '1Y': 252 }
  return rows.slice(-daysByRange[range])[0]?.date ?? rows[0]?.date ?? null
}

function filterPriceRows(rows: ChartPricePoint[], startDate: string | null) {
  if (!startDate) return rows
  return rows.filter(row => row.date >= startDate)
}

function chartLineData(rows: ChartPricePoint[], mode: PriceViewMode) {
  if (mode === 'price') return rows.map(row => ({ time: row.date, value: row.price }))
  const base = rows[0]?.price
  if (!base) return []
  return rows.map(row => ({ time: row.date, value: (row.price / base) * 100 }))
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function formatMaybePct(value: number | null | undefined) {
  return value === null || value === undefined || !Number.isFinite(value) ? 'N/A' : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

function formatMaybeNumber(value: number | null | undefined) {
  return value === null || value === undefined || !Number.isFinite(value) ? 'N/A' : value.toFixed(Math.abs(value) >= 100 ? 0 : 2)
}

function formatVolume(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A'
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toFixed(0)
}
