import type { FormEvent } from 'react'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { FileText, Search, Shield, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { CrowdingRiskMap, RotationQuadrantChart } from '@/components/workbench/research-charts'
import { ResearchDataTable } from '@/components/workbench/research-data-table'
import { ModuleFrame } from '@/components/workbench/module-frame'
import { Panel } from '@/components/workbench/research-surfaces'
import type { WorkspaceData } from '@/contracts/workspace'
import { PriceChart } from '@/features/stock-report/components/stock-report-module'
import { metricText, metricValue } from '@/features/workspace/formatters'
import type { BasketSummary, CrowdingRow, RotationRow } from '@/types/research'

export function OverviewModule({
  data,
  selectedTicker,
  sourceSummary,
  onTickerChange,
  onOpenReport,
  onOpenDecision,
}: {
  data: WorkspaceData
  selectedTicker: string
  sourceSummary: string
  onTickerChange: (value: string) => void
  onOpenReport: (value: string) => void
  onOpenDecision: (value: string) => void
}) {
  const rotations = data.rotations ?? []
  const baskets = data.baskets ?? []
  const crowding = data.crowding ?? []
  const topRotations = rotations.slice().sort((a, b) => metricValue(b.return20d) - metricValue(a.return20d)).slice(0, 8)
  const topBaskets = baskets.slice().sort((a, b) => metricValue(b.relativeStrengthVsSpy20d) - metricValue(a.relativeStrengthVsSpy20d)).slice(0, 6)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onOpenDecision(selectedTicker)
  }

  return (
    <ModuleFrame title="Build Investment Decision Record" kicker="Overview" description="Force every idea through variant view, three drivers, invalidation, risk, source quality, and post-mortem.">
      <Panel title="Build investment decision record" kicker="First path">
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(180px,260px)_auto_auto_auto] lg:items-center">
            <InputGroup className="min-w-0">
              <InputGroupAddon>
                <Search className="h-3.5 w-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                value={selectedTicker}
                onChange={event => onTickerChange(event.target.value)}
                className="font-mono"
                aria-label="Home ticker"
                placeholder="NVDA"
              />
            </InputGroup>
            <Button type="submit" variant="secondary">
              <FileText className="h-4 w-4" />
              New Decision
            </Button>
            <Button asChild type="button" variant="outline">
              <Link href="/?module=decision-log&status=open">
                <Target className="h-4 w-4" />
                Review Open Ideas
              </Link>
            </Button>
            <Button asChild type="button" variant="outline">
              <Link href="/?module=decision-log&status=closed">
                <Shield className="h-4 w-4" />
                Post-Mortem Closed Ideas
              </Link>
            </Button>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{sourceSummary}</p>
        </form>
      </Panel>
      <div className="grid min-h-0 gap-3">
        <Panel title={`${selectedTicker} Price Tape`} kicker="Sourced close series">
          <PriceChart prices={data.prices ?? []} ticker={selectedTicker} />
        </Panel>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="Rotation Leaders" kicker="ETF board">
          <ResearchDataTable data={topRotations} columns={rotationColumns} />
        </Panel>
        <Panel title="Rotation Quadrant" kicker="RS x return x volume">
          <RotationQuadrantChart rows={topRotations} />
        </Panel>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="Theme Sponsorship" kicker="Basket board">
          <ResearchDataTable data={topBaskets} columns={basketColumns} />
        </Panel>
        <Panel title="Crowding Risk Map" kicker="Crowding x extension">
          <CrowdingRiskMap rows={crowding.slice(0, 12)} />
        </Panel>
      </div>
      <Panel title="Crowding Monitor" kicker="Top risk rows">
        <ResearchDataTable data={crowding.slice(0, 8)} columns={crowdingColumns} />
      </Panel>
    </ModuleFrame>
  )
}


const rotationColumns: ColumnDef<RotationRow, unknown>[] = [
  { accessorKey: 'ticker', header: 'Ticker' },
  { id: 'return20d', header: '20D', accessorFn: row => row.return20d.value ?? -9999, cell: ({ row }) => metricText(row.original.return20d) },
  { id: 'rs', header: 'RS', accessorFn: row => row.relativeStrengthVsSpy20d.value ?? -9999, cell: ({ row }) => metricText(row.original.relativeStrengthVsSpy20d) },
  { accessorKey: 'trendLabel', header: 'Trend' }
]

const basketColumns: ColumnDef<BasketSummary, unknown>[] = [
  { accessorKey: 'name', header: 'Basket' },
  { id: 'return20d', header: '20D', accessorFn: row => row.return20d.value ?? -9999, cell: ({ row }) => metricText(row.original.return20d) },
  { id: 'rs', header: 'RS', accessorFn: row => row.relativeStrengthVsSpy20d.value ?? -9999, cell: ({ row }) => metricText(row.original.relativeStrengthVsSpy20d) },
  { accessorKey: 'basketLabel', header: 'Label' }
]

const crowdingColumns: ColumnDef<CrowdingRow, unknown>[] = [
  { accessorKey: 'ticker', header: 'Ticker' },
  { id: 'score', header: 'Crowding', accessorFn: row => row.crowdingScore.value ?? -9999, cell: ({ row }) => metricText(row.original.crowdingScore, { suffix: '' }) },
  { accessorKey: 'setupLabel', header: 'Setup' },
  { id: 'extension', header: 'Extension', accessorFn: row => row.extensionRiskScore.value ?? -9999, cell: ({ row }) => metricText(row.original.extensionRiskScore, { suffix: '' }) }
]
