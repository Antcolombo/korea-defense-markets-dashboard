import type { ColumnDef } from '@tanstack/react-table'
import { GapHeatmap, ProviderHealthMap } from '@/components/workbench/research-charts'
import { ResearchDataTable } from '@/components/workbench/research-data-table'
import { ModuleFrame } from '@/components/workbench/module-frame'
import { EmptyLine, ListPanel, MetricCard, Panel } from '@/components/workbench/research-surfaces'
import { SourceLadder } from '@/components/workbench/source-ladder'
import type { ShellMeta, UnavailableField } from '@/contracts/provenance'
import type { SourceAudit } from '@/types/sourceAudit'

export function SourceAuditModule({
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
          {providers.length ? <ResearchDataTable data={providers} columns={sourceProviderColumns} /> : <ProviderHealthMap shell={shell} />}
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


type SourceProviderRow = NonNullable<SourceAudit['providers']>[number]

const sourceProviderColumns: ColumnDef<SourceProviderRow, unknown>[] = [
  { accessorKey: 'provider', header: 'Provider' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'records', header: 'Records' },
  { accessorKey: 'freshnessStatus', header: 'Freshness', cell: ({ row }) => row.original.freshnessStatus ?? 'unknown' },
  { accessorKey: 'ageHours', header: 'Age', cell: ({ row }) => row.original.ageHours === null || row.original.ageHours === undefined ? 'N/A' : `${row.original.ageHours.toFixed(1)}h` }
]
