import type { ColumnDef } from '@tanstack/react-table'
import { ResearchDataTable } from '@/components/workbench/research-data-table'
import { ModuleFrame } from '@/components/workbench/module-frame'
import { Panel } from '@/components/workbench/research-surfaces'
import type { ChartPricePoint } from '@/contracts/workspace'
import { PriceChart } from '@/features/stock-report/components/stock-report-module'
import { maxBy, metricText } from '@/features/workspace/formatters'
import type { RotationRow } from '@/types/research'

export function RotationModule({ rows, prices }: { rows: RotationRow[]; prices: ChartPricePoint[] }) {
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
        <ResearchDataTable data={rows} columns={rotationColumns} />
      </Panel>
    </ModuleFrame>
  )
}


const rotationColumns: ColumnDef<RotationRow, unknown>[] = [
  { accessorKey: 'ticker', header: 'Ticker' },
  { accessorKey: 'name', header: 'Name' },
  { id: 'return20d', header: '20D', accessorFn: row => row.return20d.value ?? -9999, cell: ({ row }) => metricText(row.original.return20d) },
  { id: 'rs', header: 'RS vs SPY', accessorFn: row => row.relativeStrengthVsSpy20d.value ?? -9999, cell: ({ row }) => metricText(row.original.relativeStrengthVsSpy20d) },
  { id: 'volume', header: 'Vol/Avg', accessorFn: row => row.volumeVs20dAvg.value ?? -9999, cell: ({ row }) => metricText(row.original.volumeVs20dAvg, { suffix: 'x', decimals: 2 }) },
  { accessorKey: 'trendLabel', header: 'Trend' }
]
