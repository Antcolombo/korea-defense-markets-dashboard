import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { ResearchDataTable } from '@/components/workbench/research-data-table'
import { ModuleFrame } from '@/components/workbench/module-frame'
import { Panel, ProvenanceWarning, Rule } from '@/components/workbench/research-surfaces'
import type { WorkspaceData } from '@/contracts/workspace'
import { metricText } from '@/features/workspace/formatters'
import type { CrowdingRow, RotationRow } from '@/types/research'

export function KoreaDefenseModule({ data }: { data: WorkspaceData }) {
  const signals = data.rotations ?? data.basketSignals ?? []
  const crowding = data.crowding ?? data.basketCrowding ?? []
  const events = data.events ?? []
  return (
    <ModuleFrame title="Korea / Indo-Pacific Defense" kicker="Case study" description="Applied case study for defense-linked sponsorship, crowding, catalysts, and invalidation.">
      <ProvenanceWarning
        title="Case-study events"
        detail="Catalyst cards here come from static event fixtures. Rotation and crowding rows remain sourced through the terminal data layer."
      />
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
          <Rule label="Confirm" text="EWY and defense proxies broaden together while extension risk stays confirmed by fresh catalyst support." />
          <Rule label="Invalidate" text="Relative strength rolls over, crowding turns into exit risk, or fresh catalyst support fails to confirm the move." />
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
