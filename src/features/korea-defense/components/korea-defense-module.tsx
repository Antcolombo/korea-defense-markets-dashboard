import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { ResearchDataTable } from '@/components/workbench/research-data-table'
import { ModuleFrame } from '@/components/workbench/module-frame'
import { Panel, ProvenanceWarning, Rule } from '@/components/workbench/research-surfaces'
import type { WorkspaceData } from '@/contracts/workspace'
import { PriceChart } from '@/features/stock-report/components/stock-report-module'
import { metricText } from '@/features/workspace/formatters'
import type { CrowdingRow, RotationRow } from '@/types/research'

export function KoreaDefenseModule({ data }: { data: WorkspaceData }) {
  const signals = data.rotations ?? data.basketSignals ?? []
  const crowding = data.crowding ?? data.basketCrowding ?? []
  const events = data.events ?? []
  const priceTicker = data.prices?.find(row => row.ticker === 'EWY')?.ticker ?? data.prices?.[0]?.ticker ?? 'EWY'
  const latestAsOf = signals.map(row => row.asOfDate).filter((value): value is string => Boolean(value)).sort().at(-1)?.slice(0, 10) ?? 'unavailable'
  return (
    <ModuleFrame title="Korea / Indo-Pacific Defense" kicker="Market intelligence case study" description="Trace a public catalyst through Korea beta, U.S. defense suppliers, price confirmation, crowding, and explicit invalidation.">
      <ProvenanceWarning
        title={`Frozen sourced demo / as of ${latestAsOf}`}
        detail="Interview mode reads committed provider snapshots. Returns and risk measures are derived from sourced closes; unavailable options and short-interest fields remain excluded."
      />
      <Panel title="Catalyst → Market → Decision" kicker="Five-minute walkthrough">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <Rule label="1 / CATALYST" text="Start with verified public defense, alliance, procurement, and export-control events." />
          <Rule label="2 / KOREA BETA" text="Check EWY and USD/KRW direction before treating headlines as tradable Korea confirmation." />
          <Rule label="3 / SUPPLIERS" text="Test breadth through ITA, XAR, and liquid U.S. primes rather than relying on one security." />
          <Rule label="4 / DECISION" text="Promote only when price, breadth, source quality, and invalidation rules support action." />
        </div>
      </Panel>
      <Panel title={`${priceTicker} Korea Beta Tape`} kicker="Sourced daily close">
        <PriceChart prices={data.prices ?? []} ticker={priceTicker} />
      </Panel>
      <div className="grid gap-3 xl:grid-cols-[1fr_0.9fr]">
        <Panel title="Current Flow Read" kicker="Signals">
          <ResearchDataTable data={signals} columns={rotationColumns} />
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
        <ResearchDataTable data={crowding} columns={crowdingColumns} />
      </Panel>
      <Panel title="Confirmation / Invalidation" kicker="Decision rules">
        <div className="grid gap-2 md:grid-cols-2">
          <Rule label="CONFIRM" text="EWY and defense proxies broaden together; supplier relative strength and sourced volume confirm the catalyst." />
          <Rule label="INVALIDATE" text="EWY relative strength rolls over, USD/KRW stress dominates, breadth narrows, or extension rises without fresh catalyst support." />
        </div>
      </Panel>
    </ModuleFrame>
  )
}


const rotationColumns: ColumnDef<RotationRow, unknown>[] = [
  { accessorKey: 'ticker', header: 'Ticker' },
  { accessorKey: 'name', header: 'Name' },
  { id: 'return20d', header: '20D', accessorFn: row => row.return20d.value ?? -9999, cell: ({ row }) => metricText(row.original.return20d) },
  { id: 'rs', header: 'RS vs SPY', accessorFn: row => row.relativeStrengthVsSpy20d.value ?? -9999, cell: ({ row }) => metricText(row.original.relativeStrengthVsSpy20d) },
  { id: 'volume', header: 'Vol/Avg', accessorFn: row => row.volumeVs20dAvg.value ?? -9999, cell: ({ row }) => metricText(row.original.volumeVs20dAvg, { suffix: 'x', decimals: 2 }) }
]

const crowdingColumns: ColumnDef<CrowdingRow, unknown>[] = [
  { accessorKey: 'ticker', header: 'Ticker' },
  { id: 'crowding', header: 'Crowding', accessorFn: row => row.crowdingScore.value ?? -9999, cell: ({ row }) => metricText(row.original.crowdingScore, { suffix: '' }) },
  { accessorKey: 'setupLabel', header: 'Setup' },
  { id: 'extension', header: 'Extension', accessorFn: row => row.extensionRiskScore.value ?? -9999, cell: ({ row }) => metricText(row.original.extensionRiskScore, { suffix: '' }) },
  { id: 'catalyst', header: 'Catalyst', accessorFn: row => row.catalystSupportScore.value ?? -9999, cell: ({ row }) => metricText(row.original.catalystSupportScore, { suffix: '' }) }
]
