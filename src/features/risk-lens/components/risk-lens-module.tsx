import type { ColumnDef } from '@tanstack/react-table'
import { ResearchDataTable } from '@/components/workbench/research-data-table'
import { ModuleFrame } from '@/components/workbench/module-frame'
import { MetricCard, Panel, Rule } from '@/components/workbench/research-surfaces'
import type { RiskLensRow } from '@/types/riskLens'

export function RiskLensModule({ rows, selectedTicker }: { rows: RiskLensRow[]; selectedTicker: string }) {
  const selected = rows.find(row => row.ticker === selectedTicker) ?? rows[0]
  return (
    <ModuleFrame title="Risk + Vol Regime Lens" kicker="Source-only risk" description="RV20/RV60, ATR/range, gap risk, extension risk, and VIX backdrop from real OHLCV/VIX fields only. No fake gamma or IV.">
      <div className="grid gap-3 md:grid-cols-5">
        <MetricCard label="Focus" value={selected?.ticker ?? 'N/A'} />
        <MetricCard label="RV20" value={selected?.rv20 === null || !selected ? 'N/A' : `${selected.rv20.toFixed(1)}%`} />
        <MetricCard label="RV60" value={selected?.rv60 === null || !selected ? 'N/A' : `${selected.rv60.toFixed(1)}%`} />
        <MetricCard label="ATR20" value={selected?.atr20 === null || !selected ? 'N/A' : selected.atr20.toFixed(2)} />
        <MetricCard label="VIX" value={selected?.vixLevel === null || !selected ? 'N/A' : `${selected.vixLevel.toFixed(1)} ${selected.vixBackdrop}`} />
      </div>
      <div className="grid gap-3 xl:grid-cols-[1fr_0.82fr]">
        <Panel title="Risk Board" kicker={`${rows.length} tickers`}>
          <ResearchDataTable data={rows} columns={riskLensColumns} />
        </Panel>
        <Panel title="Unavailable Means Unavailable" kicker="Honest limits">
          <div className="grid gap-2">
            {(selected?.caveats.length ? selected.caveats : ['Selected ticker has enough sourced fields for displayed metrics.']).map(item => (
              <Rule key={item} label="Caveat" text={item} />
            ))}
          </div>
        </Panel>
      </div>
    </ModuleFrame>
  )
}


const riskLensColumns: ColumnDef<RiskLensRow, unknown>[] = [
  { accessorKey: 'ticker', header: 'Ticker' },
  { id: 'rv20', header: 'RV20', accessorFn: row => row.rv20 ?? -9999, cell: ({ row }) => row.original.rv20 === null ? 'N/A' : `${row.original.rv20.toFixed(1)}%` },
  { id: 'rv60', header: 'RV60', accessorFn: row => row.rv60 ?? -9999, cell: ({ row }) => row.original.rv60 === null ? 'N/A' : `${row.original.rv60.toFixed(1)}%` },
  { id: 'atr20', header: 'ATR20', accessorFn: row => row.atr20 ?? -9999, cell: ({ row }) => row.original.atr20?.toFixed(2) ?? 'N/A' },
  { accessorKey: 'vixBackdrop', header: 'VIX' }
]
