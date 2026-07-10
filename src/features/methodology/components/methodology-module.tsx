import type { ColumnDef } from '@tanstack/react-table'
import { ModuleFrame } from '@/components/workbench/module-frame'
import { Formula, Panel } from '@/components/workbench/research-surfaces'
import { ResearchDataTable } from '@/components/workbench/research-data-table'

export function MethodologyModule() {
  const sourceRows = [
    { area: 'Rotation', source: 'Sourced OHLCV / signal snapshots', limit: 'No execution-grade tick data' },
    { area: 'Positioning', source: 'Options, short-interest, FINRA short-sale volume', limit: 'Deferred until needed for active workflow' },
    { area: 'Crowding', source: 'Weighted available components', limit: 'Core components visible; deferred feeds hidden' },
    { area: 'Validation', source: 'Historical sourced samples', limit: 'Deferred until enough history exists' }
  ]
  return (
    <ModuleFrame title="Public-Data Flow Methodology" kicker="Methodology" description="Proxy framework, data limits, signal definitions, provider caveats, and validation discipline.">
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="What This System Does" kicker="Scope">
          <p className="text-sm leading-7 text-muted-foreground">Monitors sector rotation, theme sponsorship, positioning proxies, crowding, extension risk, catalysts, and PM-style notes from sourced market data.</p>
        </Panel>
        <Panel title="What This System Does Not Do" kicker="Limits">
          <p className="text-sm leading-7 text-muted-foreground">It does not claim proprietary fund-flow data, execution-grade prices, trade recommendations, or buy/sell signals. Missing provider fields are not imputed.</p>
        </Panel>
      </div>
      <Panel title="Data Sources" kicker="Audit">
        <ResearchDataTable data={sourceRows} columns={methodologyColumns} />
      </Panel>
      <div className="grid gap-3 xl:grid-cols-2">
        <Formula title="Signal Formula" body="relative_strength_20d = ticker_return_20d - SPY_return_20d; volume_confirmation = current_volume / 20d_avg_volume" />
        <Formula title="Crowding / Setup" body="crowding_score = sponsorship components only: momentum + volume + optional positioning; extension_risk_score = volatility + moving-average extension; setup_label = crowding + extension + catalyst_support" />
        <Formula title="Coverage" body="coverage_percent = available_active_fields / total_active_fields; deferred feeds do not reduce active coverage" />
        <Formula title="Data Status" body="available | unavailable | partial | stale | entitlement_missing | provider_error" />
      </div>
    </ModuleFrame>
  )
}


const methodologyColumns: ColumnDef<{ area: string; source: string; limit: string }, unknown>[] = [
  { accessorKey: 'area', header: 'Area' },
  { accessorKey: 'source', header: 'Source' },
  { accessorKey: 'limit', header: 'Limit' }
]
