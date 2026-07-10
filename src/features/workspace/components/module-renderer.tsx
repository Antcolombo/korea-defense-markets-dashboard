import Link from 'next/link'
import { useRouter } from 'next/router'
import { useQueryState, parseAsString } from 'nuqs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { GapHeatmap, ProviderHealthMap } from '@/components/workbench/research-charts'
import { EmptyLine, Panel } from '@/components/workbench/research-surfaces'
import { SourceLadder } from '@/components/workbench/source-ladder'
import { StockPitchModule } from '@/features/pitches/components/pitch-module'
import { DecisionLogModule } from '@/features/decisions/components/decision-module'
import { formatSigned } from '@/features/workspace/formatters'
import { MethodologyModule } from '@/features/methodology/components/methodology-module'
import { ValidationModule } from '@/features/validation/components/validation-module'
import { SourceAuditModule } from '@/features/source-audit/components/source-audit-module'
import { KoreaDefenseModule } from '@/features/korea-defense/components/korea-defense-module'
import { StockReportModule } from '@/features/stock-report/components/stock-report-module'
import { RotationModule } from '@/features/rotation/components/rotation-module'
import { BasketDetailModule, BasketsModule } from '@/features/baskets/components/baskets-module'
import { PositioningModule } from '@/features/positioning/components/positioning-module'
import { CrowdingModule } from '@/features/crowding/components/crowding-module'
import { RiskLensModule } from '@/features/risk-lens/components/risk-lens-module'
import { OverviewModule } from '@/features/overview/components/overview-module'
import { EventStudyModule } from '@/features/event-study/components/event-study-module'
import { PaperBookModule } from '@/features/pm-engine/components/pm-engine-module'
import { qualityBadgeClass } from '@/components/workbench/terminal-quality'
import type { ShellMeta, UnavailableField } from '@/contracts/provenance'
import type { ChartPricePoint, ModuleMeta, TerminalWorkspaceProps, WorkspaceData, WorkspaceModule } from '@/contracts/workspace'
import { moduleMeta, visibleWorkspaceModules } from '@/features/workspace/components/module-registry'
import { basketDetailHref, buildWatchlist, defaultQuestions, isModuleActive, watchlistHref, type WatchRow } from '@/features/workspace/domain/selectors'

export type { ChartPricePoint, ModuleMeta, TerminalWorkspaceProps, WorkspaceData, WorkspaceModule } from '@/contracts/workspace'

export function MobileModuleSelect({ module }: { module: WorkspaceModule }) {
  const router = useRouter()
  const [, setModuleQuery] = useQueryState('module', parseAsString.withDefault(module))
  const selectedModule = visibleWorkspaceModules.some(item => item.id === module) ? module : 'overview'
  return (
    <Select
      value={selectedModule}
      onValueChange={value => {
        const next = visibleWorkspaceModules.find(item => item.id === value)
        if (next) {
          void setModuleQuery(next.id, { history: 'push', shallow: true })
          router.push(next.href)
        }
      }}
    >
        <SelectTrigger className="min-w-0 max-w-full font-medium">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {visibleWorkspaceModules.map(item => (
          <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function LeftRail({
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
  const activeLabel = moduleMeta(active).label
  return (
    <aside className={`flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden border-r border-border bg-card/45 ${compact ? 'rounded-md border' : ''}`}>
      <div className="border-b border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[0.68rem] font-medium tracking-[0.04em] text-muted-foreground">Workspace</p>
            <h2 className="text-sm font-semibold">Module Rail</h2>
          </div>
          <Badge variant="outline" className="font-mono">{activeLabel}</Badge>
        </div>
      </div>
      <ScrollArea className="min-h-0 w-full flex-1">
        <div className="grid gap-3 p-2">
          <div className="grid gap-1">
            {visibleWorkspaceModules.map(item => {
              const Icon = item.icon
              return (
                <Button key={item.id} asChild variant={isModuleActive(item.id, active) ? 'secondary' : 'ghost'} className="w-full min-w-0 justify-start overflow-hidden text-xs font-medium">
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

export function RightRail({
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
        <p className="text-[0.68rem] font-medium tracking-[0.04em] text-muted-foreground">Source / Risk</p>
        <h2 className="mt-1 text-sm font-semibold">{active.label}</h2>
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

export function MainModule(props: {
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
  if (module === 'stock-report') return <StockReportModule report={data.report} prices={data.prices ?? []} unavailableFields={props.unavailableFields} deferredUnavailableFields={props.deferredUnavailableFields} />
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
