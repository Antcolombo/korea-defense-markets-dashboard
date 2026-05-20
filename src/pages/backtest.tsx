import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/ui/Section'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { BacktestControls } from '@/components/backtest/BacktestControls'
import { BacktestResultsTable } from '@/components/backtest/BacktestResultsTable'
import { ReturnDistributionChart } from '@/components/backtest/ReturnDistributionChart'
import { getAssets } from '@/lib/data/getAssets'
import { getEvents } from '@/lib/data/getEvents'
import { getEventReturns } from '@/lib/data/getEventReturns'
import { formatReturn } from '@/lib/returns'
import { runEventBacktest, type BacktestFilters } from '@/lib/backtest'

export function BacktestPage() {
  const assets = getAssets()
  const events = getEvents()
  const eventReturns = getEventReturns()
  const groups = useMemo(() => Array.from(new Set(assets.map(asset => asset.sleeve))).sort(), [assets])
  const [filters, setFilters] = useState<BacktestFilters>({
    eventCategory: 'All',
    assetGroup: 'All',
    returnWindow: '5D'
  })
  const result = runEventBacktest(events, assets, eventReturns, filters)

  return (
    <>
      <PageHeader
        eyebrow="Return study"
        title="Event-To-Market Return Study"
        description="Study sourced event windows by category, research sleeve, and return window. This is context for trade setup work, not a predictive model."
      />
      <Section><BacktestControls filters={filters} groups={groups} onChange={setFilters} /></Section>
      <Section className="pt-0">
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Average move" value={formatReturn(result.averageReturn)} />
          <StatCard label="Median move" value={formatReturn(result.medianReturn)} />
          <StatCard label="Hit rate" value={`${result.hitRate.toFixed(0)}%`} />
          <StatCard label="Best performer" value={result.bestPerformer?.ticker ?? 'N/A'} detail={result.bestPerformer ? formatReturn(result.bestPerformer.selectedReturn) : ''} tone="positive" />
          <StatCard label="Worst performer" value={result.worstPerformer?.ticker ?? 'N/A'} detail={result.worstPerformer ? formatReturn(result.worstPerformer.selectedReturn) : ''} tone="negative" />
          <StatCard label="Events" value={`${result.eventCount}`} detail="Matched sourced events" />
        </div>
      </Section>
      <Section className="pt-0">
        <Card>
          <CardHeader title="Average Returns By Asset" eyebrow={`${filters.returnWindow} window`} />
          <CardBody><ReturnDistributionChart rows={result.rows} /></CardBody>
        </Card>
      </Section>
      <Section className="pt-0">
        <BacktestResultsTable rows={result.rows} />
      </Section>
      <Section className="pt-0">
        <Card className="p-5">
          <p className="text-sm leading-7 text-muted">Return-window analysis is supporting evidence for a trade note. It should be combined with price action, macro context, liquidity, and explicit invalidation before any decision.</p>
        </Card>
      </Section>
    </>
  )
}

export default BacktestPage
