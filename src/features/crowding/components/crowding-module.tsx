import { useEffect, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { ResearchDataTable } from '@/components/workbench/research-data-table'
import { ModuleFrame } from '@/components/workbench/module-frame'
import { EmptyLine, MetricMini, Panel, StatusBadge } from '@/components/workbench/research-surfaces'
import { metricText } from '@/features/workspace/formatters'
import type { CrowdingRow } from '@/types/research'

export function CrowdingModule({ rows }: { rows: CrowdingRow[] }) {
  const [selectedTicker, setSelectedTicker] = useState(rows[0]?.ticker ?? '')
  const selected = rows.find(row => row.ticker === selectedTicker) ?? rows[0]
  useEffect(() => {
    if (!selectedTicker && rows[0]) setSelectedTicker(rows[0].ticker)
  }, [rows, selectedTicker])

  return (
    <ModuleFrame title="Crowding Monitor" kicker="Crowding" description="Crowding tracks sponsorship. Extension risk and catalyst support stay separate so a high score is not automatically a reversal call.">
      <div className="grid gap-3 xl:grid-cols-[1.4fr_0.8fr]">
        <Panel title="Crowding Scores" kicker={`${rows.length} rows`}>
          <ResearchDataTable
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


function crowdingColumnsFor(rows: CrowdingRow[]): ColumnDef<CrowdingRow, unknown>[] {
  const columns: ColumnDef<CrowdingRow, unknown>[] = [
    { accessorKey: 'ticker', header: 'Ticker' },
    { id: 'score', header: 'Crowding', accessorFn: row => row.crowdingScore.value ?? -9999, cell: ({ row }) => metricText(row.original.crowdingScore, { suffix: '' }) },
    { accessorKey: 'setupLabel', header: 'Setup' },
    { id: 'extension', header: 'Extension', accessorFn: row => row.extensionRiskScore.value ?? -9999, cell: ({ row }) => metricText(row.original.extensionRiskScore, { suffix: '' }) },
    { id: 'catalyst', header: 'Catalyst', accessorFn: row => row.catalystSupportScore.value ?? -9999, cell: ({ row }) => metricText(row.original.catalystSupportScore, { suffix: '' }) }
  ]
  if (rows.some(row => row.optionsScore.value !== null)) columns.push({ id: 'options', header: 'Options', accessorFn: row => row.optionsScore.value ?? -9999, cell: ({ row }) => metricText(row.original.optionsScore, { suffix: '' }) })
  if (rows.some(row => row.shortInterestScore.value !== null)) columns.push({ id: 'short', header: 'Short', accessorFn: row => row.shortInterestScore.value ?? -9999, cell: ({ row }) => metricText(row.original.shortInterestScore, { suffix: '' }) })
  return columns
}
