import type { ColumnDef } from '@tanstack/react-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResearchDataTable } from '@/components/workbench/research-data-table'
import { ModuleFrame } from '@/components/workbench/module-frame'
import { DeferredPanel, MetricMini, Panel } from '@/components/workbench/research-surfaces'
import { metricText } from '@/features/workspace/formatters'
import type { ValidationRow } from '@/types/research'

export function ValidationModule({ rows }: { rows: ValidationRow[] }) {
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
          <ResearchDataTable data={rows} columns={validationColumns} />
        </Panel>
      ) : null}
      {!insufficient ? (
        <Panel title="Row Drilldown" kicker="Forward windows">
          <ResearchDataTable data={rows.flatMap(row => (row.resultRows ?? []).map(sample => ({ testName: row.testName, ...sample })))} columns={validationSampleColumns} />
        </Panel>
      ) : null}
    </ModuleFrame>
  )
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
  { accessorKey: 'testName', header: 'Test' },
  { accessorKey: 'ticker', header: 'Ticker', cell: ({ row }) => row.original.ticker ?? 'N/A' },
  { accessorKey: 'signalDate', header: 'Date', cell: ({ row }) => row.original.signalDate ?? 'N/A' },
  { id: 'hit', header: 'Hit', accessorFn: row => row.hit ? 1 : 0, cell: ({ row }) => row.original.hit ? 'yes' : 'no' },
  { id: 'forwardReturn', header: 'Fwd Return', accessorFn: row => row.forwardReturn, cell: ({ row }) => `${row.original.forwardReturn.toFixed(1)}%` },
  { id: 'signalValue', header: 'Signal', accessorFn: row => row.signalValue ?? -9999, cell: ({ row }) => row.original.signalValue === null || row.original.signalValue === undefined ? 'N/A' : row.original.signalValue.toFixed(2) }
]
