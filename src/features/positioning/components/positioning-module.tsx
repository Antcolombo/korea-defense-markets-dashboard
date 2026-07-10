import type { ColumnDef } from '@tanstack/react-table'
import { parseAsString, useQueryState } from 'nuqs'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ResearchDataTable } from '@/components/workbench/research-data-table'
import { ModuleFrame } from '@/components/workbench/module-frame'
import { DeferredPanel, Panel } from '@/components/workbench/research-surfaces'
import { metricText } from '@/features/workspace/formatters'
import type { PositioningRow } from '@/types/research'

export function PositioningModule({ rows }: { rows: PositioningRow[] }) {
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
            <ResearchDataTable data={rows} columns={positioningColumns} />
          </Panel>
        </TabsContent>
        <TabsContent value="short-interest">
          <Panel title="Short Interest Proxy" kicker="Settlement data">
            <ResearchDataTable data={rows} columns={shortInterestColumns} />
          </Panel>
        </TabsContent>
        <TabsContent value="short-sale">
          <Panel title="FINRA Short-Sale Volume" kicker="Flow proxy">
            <ResearchDataTable data={rows} columns={shortSaleColumns} />
          </Panel>
        </TabsContent>
      </Tabs>
    </ModuleFrame>
  )
}


function hasPositioningData(row: PositioningRow) {
  return [row.optionsVolume, row.openInterest, row.putCallRatio, row.impliedVolatility, row.impliedVolPercentile, row.shortInterest, row.shortInterestChange, row.shortVolumeRatio].some(metric => metric.value !== null)
}

function validPositioningTab(value: string | null) {
  if (value === 'short-interest' || value === 'short-sale') return value
  return 'options'
}

const positioningColumns: ColumnDef<PositioningRow, unknown>[] = [
  { accessorKey: 'ticker', header: 'Ticker' },
  { id: 'optionsVolume', header: 'Options Vol', accessorFn: row => row.optionsVolume.value ?? -9999, cell: ({ row }) => metricText(row.original.optionsVolume, { suffix: '', decimals: 0 }) },
  { id: 'putCall', header: 'Put/Call', accessorFn: row => row.putCallRatio.value ?? -9999, cell: ({ row }) => metricText(row.original.putCallRatio, { suffix: '', decimals: 2 }) },
  { id: 'iv', header: 'IV', accessorFn: row => row.impliedVolatility.value ?? -9999, cell: ({ row }) => metricText(row.original.impliedVolatility) }
]

const shortInterestColumns: ColumnDef<PositioningRow, unknown>[] = [
  { accessorKey: 'ticker', header: 'Ticker' },
  { id: 'shortInterest', header: 'Short Interest', accessorFn: row => row.shortInterest.value ?? -9999, cell: ({ row }) => metricText(row.original.shortInterest) },
  { id: 'change', header: 'Change', accessorFn: row => row.shortInterestChange.value ?? -9999, cell: ({ row }) => metricText(row.original.shortInterestChange) }
]

const shortSaleColumns: ColumnDef<PositioningRow, unknown>[] = [
  { accessorKey: 'ticker', header: 'Ticker' },
  { id: 'ratio', header: 'Short Volume Ratio', accessorFn: row => row.shortVolumeRatio.value ?? -9999, cell: ({ row }) => metricText(row.original.shortVolumeRatio) },
  { accessorKey: 'positioningNotes', header: 'Notes' }
]
