import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { MathTraceGrid } from '@/components/workbench/research-charts'
import { ResearchDataTable } from '@/components/workbench/research-data-table'
import { ModuleFrame } from '@/components/workbench/module-frame'
import { EmptyLine, MetricCard, MetricMini, Panel, Rule } from '@/components/workbench/research-surfaces'
import type { InvestmentDecisionRecord } from '@/types/decision'
import type { PmBacktestSummary, PmDecisionOverlay, PmEngineView, PmFactorHeatmapRow, PmLiquidityExit, PmRiskContribution, PmScenario, PmSectorExposure, PmSourceLight, PmStressScenario, PmWaterfallStep } from '@/types/pm'

export function PaperBookModule({ decisions, pmEngine }: { decisions: InvestmentDecisionRecord[]; pmEngine?: PmEngineView }) {
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
          <ResearchDataTable data={book.rows} columns={paperBookColumns} />
        </Panel>
        <Panel title="Exposure By Driver" kicker={`${book.themeRows.length} buckets`}>
          <ResearchDataTable data={book.themeRows} columns={themeExposureColumns} />
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

export function PmEngineModule({ pmEngine }: { pmEngine: PmEngineView }) {
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
          <ResearchDataTable data={pmEngine.decisions} columns={pmDecisionColumns} />
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
          <ResearchDataTable data={portfolio.sectorExposure} columns={pmSectorColumns} />
        </Panel>
        <Panel title="Optimizer Ledger" kicker={`${portfolio.optimizerLedger.length} decisions`}>
          <ResearchDataTable data={portfolio.optimizerLedger} columns={pmOptimizerColumns} />
        </Panel>
        <Panel title="Liquidity Exit Ladder" kicker="ADV / cost">
          <ResearchDataTable data={portfolio.liquidityExit} columns={pmLiquidityColumns} />
        </Panel>
      </div>

      <Panel title="Portfolio Backtest Evidence" kicker={`Grade ${portfolio.backtest.grade}`}>
        <BacktestStrip backtest={portfolio.backtest} />
      </Panel>
    </ModuleFrame>
  )
}

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
      <MathTraceGrid items={steps.slice(0, 6).map(step => ({
        label: step.label,
        raw: `${step.valuePct.toFixed(1)}% cap`,
        normalized: `${Math.round((step.valuePct / max) * 100)} normalized`,
        confidence: step.active ? 'active constraint' : 'available cap',
        result: step.reason,
        tone: step.active ? 'warn' : 'neutral'
      }))} />
    </div>
  )
}

function FactorHeatmap({ rows }: { rows: PmFactorHeatmapRow[] }) {
  const factors = [...new Set(rows.flatMap(row => Object.keys(row.exposures)))].slice(0, 12)
  if (!rows.length || !factors.length) return <EmptyLine title="No factor cells" detail="Factor model needs aligned price history." />
  const traceRows = rows.slice(0, 4).flatMap(row => factors.slice(0, 3).map(factor => {
    const value = row.exposures[factor] ?? 0
    return {
      label: `${row.ticker} ${factor}`,
      raw: value.toFixed(2),
      normalized: `${Math.round(Math.min(1, Math.abs(value) / 1.5) * 100)} intensity`,
      confidence: 'factor model',
      result: value >= 0 ? 'positive exposure' : 'negative exposure',
      tone: Math.abs(value) >= 1 ? 'danger' as const : Math.abs(value) >= 0.5 ? 'warn' as const : 'neutral' as const
    }
  }))
  return (
    <div className="grid gap-3">
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
      <MathTraceGrid items={traceRows} />
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
