import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResearchDataTable } from '@/components/workbench/research-data-table'
import { ModuleFrame } from '@/components/workbench/module-frame'
import { DeferredPanel, EmptyLine, MetricMini, MetricPanel, Panel, StatusBadge } from '@/components/workbench/research-surfaces'
import type { WorkspaceData } from '@/contracts/workspace'
import { basketDetailHref } from '@/features/workspace/domain/selectors'
import { metricText } from '@/features/workspace/formatters'
import type { BasketSummary, CrowdingRow, PositioningRow, RotationRow } from '@/types/research'

export function BasketsModule({ baskets }: { baskets: BasketSummary[] }) {
  return (
    <ModuleFrame title="Theme Basket Monitor" kicker="Baskets" description="Compare sponsorship, contributors, laggards, crowding, and source coverage.">
      <div className="grid gap-3 xl:grid-cols-3">
        {baskets.slice(0, 9).map(basket => (
          <Card key={basket.slug} className="rounded-md border-border bg-card">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="truncate font-mono text-sm">{basket.name}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{basket.category}</p>
                </div>
                <StatusBadge status={basket.dataStatus} />
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              <p className="line-clamp-3 min-h-[3.75rem] text-sm leading-5 text-muted-foreground">{basket.description}</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <MetricMini label="20D" value={metricText(basket.return20d)} />
                <MetricMini label="RS" value={metricText(basket.relativeStrengthVsSpy20d)} />
                <MetricMini label="Crowd" value={metricText(basket.averageCrowdingScore, { suffix: '' })} />
              </div>
              <Button asChild variant="outline" size="sm" className="font-mono">
                <Link href={basketDetailHref(basket.slug)}>Open Basket</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <Panel title="Basket Ranking Table" kicker={`${baskets.length} baskets`}>
        <ResearchDataTable data={baskets} columns={basketColumns} />
      </Panel>
    </ModuleFrame>
  )
}

export function BasketDetailModule({ data }: { data: WorkspaceData }) {
  const summary = data.basketSummary
  if (!summary) {
    return <ModuleFrame title="Basket Not Found" kicker="Basket detail"><EmptyLine title="Missing basket" detail="No basket matched selected slug." /></ModuleFrame>
  }
  const signals = data.basketSignals ?? []
  const crowding = data.basketCrowding ?? []
  const positioning = data.positioning ?? []
  const hasPositioning = positioning.some(hasPositioningData)
  return (
    <ModuleFrame title={summary.name} kicker={summary.category} description={summary.description}>
      <div className="grid gap-3 md:grid-cols-4">
        <MetricPanel label="5D Return" value={metricText(summary.return5d)} />
        <MetricPanel label="20D Return" value={metricText(summary.return20d)} />
        <MetricPanel label="RS vs SPY" value={metricText(summary.relativeStrengthVsSpy20d)} />
        <MetricPanel label="Crowding" value={metricText(summary.averageCrowdingScore, { suffix: '' })} />
      </div>
      <Panel title="Contributor Evidence" kicker="Signals">
        <ResearchDataTable data={signals} columns={rotationColumns} />
      </Panel>
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="Crowding Components" kicker="Basket members">
          <ResearchDataTable data={crowding} columns={crowdingColumns} />
        </Panel>
        {hasPositioning ? (
          <Panel title="Positioning Proxy" kicker="Options / short proxy">
            <ResearchDataTable data={positioning} columns={positioningColumns} />
          </Panel>
        ) : (
          <DeferredPanel />
        )}
      </div>
    </ModuleFrame>
  )
}


function hasPositioningData(row: PositioningRow) {
  return [row.optionsVolume, row.openInterest, row.putCallRatio, row.impliedVolatility, row.impliedVolPercentile, row.shortInterest, row.shortInterestChange, row.shortVolumeRatio]
    .some(metric => metric.value !== null)
}

const basketColumns: ColumnDef<BasketSummary, unknown>[] = [
  { accessorKey: 'name', header: 'Basket' },
  { id: 'return20d', header: '20D', accessorFn: row => row.return20d.value ?? -9999, cell: ({ row }) => metricText(row.original.return20d) },
  { id: 'rs', header: 'RS', accessorFn: row => row.relativeStrengthVsSpy20d.value ?? -9999, cell: ({ row }) => metricText(row.original.relativeStrengthVsSpy20d) },
  { id: 'crowding', header: 'Crowding', accessorFn: row => row.averageCrowdingScore.value ?? -9999, cell: ({ row }) => metricText(row.original.averageCrowdingScore, { suffix: '' }) }
]

const rotationColumns: ColumnDef<RotationRow, unknown>[] = [
  { accessorKey: 'ticker', header: 'Ticker' },
  { id: 'return20d', header: '20D', accessorFn: row => row.return20d.value ?? -9999, cell: ({ row }) => metricText(row.original.return20d) },
  { id: 'rs', header: 'RS', accessorFn: row => row.relativeStrengthVsSpy20d.value ?? -9999, cell: ({ row }) => metricText(row.original.relativeStrengthVsSpy20d) },
  { accessorKey: 'trendLabel', header: 'Trend' }
]

const crowdingColumns: ColumnDef<CrowdingRow, unknown>[] = [
  { accessorKey: 'ticker', header: 'Ticker' },
  { id: 'score', header: 'Score', accessorFn: row => row.crowdingScore.value ?? -9999, cell: ({ row }) => metricText(row.original.crowdingScore, { suffix: '' }) },
  { accessorKey: 'setupLabel', header: 'Setup' }
]

const positioningColumns: ColumnDef<PositioningRow, unknown>[] = [
  { accessorKey: 'ticker', header: 'Ticker' },
  { id: 'options', header: 'Options', accessorFn: row => row.optionsVolume.value ?? -9999, cell: ({ row }) => metricText(row.original.optionsVolume, { suffix: '', decimals: 0 }) },
  { id: 'putCall', header: 'Put/Call', accessorFn: row => row.putCallRatio.value ?? -9999, cell: ({ row }) => metricText(row.original.putCallRatio, { suffix: '', decimals: 2 }) },
  { id: 'short', header: 'Short Vol', accessorFn: row => row.shortVolumeRatio.value ?? -9999, cell: ({ row }) => metricText(row.original.shortVolumeRatio) }
]
