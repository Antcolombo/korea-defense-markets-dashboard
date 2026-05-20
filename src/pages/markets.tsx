import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/ui/Section'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { AssetGroupTabs } from '@/components/markets/AssetGroupTabs'
import { WatchlistTable } from '@/components/markets/WatchlistTable'
import { AssetPerformanceChart } from '@/components/markets/AssetPerformanceChart'
import { getAssets } from '@/lib/data/getAssets'
import { formatAssetMove } from '@/lib/returns'

export function MarketsPage() {
  const allAssets = getAssets()
  const groups = useMemo(() => ['All', ...Array.from(new Set(allAssets.map(asset => asset.sleeve))).sort()], [allAssets])
  const [activeGroup, setActiveGroup] = useState('All')
  const assets = activeGroup === 'All' ? allAssets : allAssets.filter(asset => asset.sleeve === activeGroup)
  const best = [...assets].sort((a, b) => (b.return5d ?? -Infinity) - (a.return5d ?? -Infinity))[0]
  const worst = [...assets].sort((a, b) => (a.return5d ?? Infinity) - (b.return5d ?? Infinity))[0]

  return (
    <>
      <PageHeader
        eyebrow="Price board"
        title="Korea Macro And Trade Expression Price Board"
        description="Sourced price and macro coverage split into Korea macro, U.S.-listed Korea beta, liquid U.S. trade expressions, Korean local evidence, and global overlays."
      />
      <Section><AssetGroupTabs groups={groups} activeGroup={activeGroup} onChange={setActiveGroup} /></Section>
      <Section className="pt-0">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Best 5D expression" value={best?.ticker ?? 'N/A'} detail={best?.return5d === null || best?.return5d === undefined ? 'Provider data unavailable' : `${formatAssetMove(best, best.return5d)} sourced move`} tone="positive" />
          <StatCard label="Worst 5D expression" value={worst?.ticker ?? 'N/A'} detail={worst?.return5d === null || worst?.return5d === undefined ? 'Provider data unavailable' : `${formatAssetMove(worst, worst.return5d)} sourced move`} tone="negative" />
          <StatCard label="Instruments shown" value={`${assets.length}`} detail={activeGroup === 'All' ? 'All research sleeves' : activeGroup} />
        </div>
      </Section>
      <Section className="pt-0">
        <Card>
          <CardHeader title="Market Data Quality" eyebrow="Coverage reality" />
          <CardBody>
            <div className="grid gap-3 text-sm leading-6 text-muted md:grid-cols-3">
              <div className="workbench-panel p-3">
                <p className="font-semibold text-ink">U.S. listed prices</p>
                <p className="mt-1">Public daily historical quote coverage. Not intraday, not consolidated tape, not execution-grade.</p>
              </div>
              <div className="workbench-panel p-3">
                <p className="font-semibold text-ink">Macro series</p>
                <p className="mt-1">FRED observations are sourced levels. FX/rates/commodities show level changes, not equity-style returns.</p>
              </div>
              <div className="workbench-panel p-3">
                <p className="font-semibold text-ink">Korean local assets</p>
                <p className="mt-1">Disclosures and watchlist evidence only until a decision-grade KRX/global market data feed is added.</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </Section>
      <Section className="pt-0">
        <Card>
          <CardHeader title="Instrument Performance Chart" eyebrow="Sourced moves" />
          <CardBody><AssetPerformanceChart assets={assets} /></CardBody>
        </Card>
      </Section>
      <Section className="pt-0">
        <WatchlistTable assets={assets} />
      </Section>
    </>
  )
}

export default MarketsPage
