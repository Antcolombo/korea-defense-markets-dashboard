import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/ui/Section'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { RegimeBoardCard } from '@/components/dashboard/RegimeBoardCard'
import { TopEventsTable } from '@/components/dashboard/TopEventsTable'
import { AssetHeatmap } from '@/components/dashboard/AssetHeatmap'
import { ThemeSnapshot } from '@/components/dashboard/ThemeSnapshot'
import { WeeklyMarketRead } from '@/components/dashboard/WeeklyMarketRead'
import { getMarketTape } from '@/lib/data/getResearchOs'
import { getEvents } from '@/lib/data/getEvents'
import { getAssets } from '@/lib/data/getAssets'
import { getThemes } from '@/lib/data/getThemes'
import { DataBuildFailure } from '@/components/ui/DataBuildFailure'
import { formatAssetMove } from '@/lib/returns'

function MiniAssetTable({ title, assets }: { title: string; assets: ReturnType<typeof getAssets> }) {
  return (
    <Card>
      <CardHeader title={title} eyebrow="5D sourced move" />
      <CardBody className="grid gap-2">
        {assets.slice(0, 6).map(asset => (
          <div key={asset.ticker} className="flex items-start justify-between gap-3 border-b border-line pb-2 text-sm last:border-b-0">
            <div className="min-w-0">
              <p className="font-semibold text-ink">{asset.ticker}</p>
              <p className="truncate text-xs text-muted">{asset.name}</p>
            </div>
            <p className="whitespace-nowrap font-mono text-ink">{formatAssetMove(asset, asset.return5d)}</p>
          </div>
        ))}
      </CardBody>
    </Card>
  )
}

export function DashboardPage() {
  const events = getEvents()
  const assets = getAssets()
  const themes = getThemes()
  const latestTape = getMarketTape()[0] ?? null
  const topTheme = themes.find(theme => theme.currentRiskLevel === 'High') ?? themes[0]
  const usdkrw = assets.find(asset => asset.ticker === 'USDKRW')
  const ewy = assets.find(asset => asset.ticker === 'EWY')
  const koreaMacro = assets.filter(asset => asset.sleeve === 'Korea macro' || asset.sleeve === 'U.S.-listed Korea beta')
  const usExpressions = assets.filter(asset => asset.sleeve === 'U.S. trade expression').sort((a, b) => (b.return5d ?? -Infinity) - (a.return5d ?? -Infinity))
  const topExpression = usExpressions[0]
  const localEvidence = assets.filter(asset => asset.sleeve === 'Korea local evidence')
  const globalOverlay = assets.filter(asset => asset.sleeve === 'Global overlay')

  if (!latestTape || events.length === 0 || assets.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow="Market monitor"
          title="Market Monitor"
          description="Strict source mode requires successful provider ingestion before dashboard publication."
        />
        <Section><DataBuildFailure /></Section>
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Market monitor"
        title="Market Monitor"
        description="A trade-decision screen for USD/KRW, Korea beta, liquid U.S. expressions, event tape pressure, and source-backed market evidence."
      />
      <Section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="md:col-span-2 xl:col-span-3"><RegimeBoardCard assets={assets} marketTape={latestTape} /></div>
          <StatCard label="USD/KRW 5D" value={formatAssetMove(usdkrw, usdkrw?.return5d)} detail="FRED macro level move" tone="warning" />
          <StatCard label="EWY 5D" value={formatAssetMove(ewy, ewy?.return5d)} detail="U.S.-listed Korea beta" />
          <StatCard label="Best U.S. expression" value={topExpression?.ticker ?? 'Unavailable'} detail={topExpression?.return5d === null || topExpression?.return5d === undefined ? 'Provider data unavailable' : `${formatAssetMove(topExpression, topExpression.return5d)} 5D move`} tone="positive" />
          <StatCard label="Source backlog" value={`${latestTape?.sourceBacklog.length ?? 0}`} detail="Explicit gaps; never counted as ready data" tone="warning" />
        </div>
      </Section>
      <Section className="pt-0">
        <div className="grid gap-6 xl:grid-cols-3">
          <MiniAssetTable title="Korea macro / beta" assets={koreaMacro} />
          <MiniAssetTable title="Liquid U.S. expressions" assets={usExpressions} />
          <MiniAssetTable title="Global overlays" assets={globalOverlay} />
        </div>
      </Section>
      <Section className="pt-0">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader title="Price Board Heatmap" eyebrow="5D sourced moves" />
            <CardBody><AssetHeatmap assets={assets} /></CardBody>
          </Card>
          <Card>
            <CardHeader title="Event Tape Context" eyebrow="Sourced news, not a price signal" />
            <CardBody>
              <p className="text-sm leading-7 text-muted">
                Event metadata is useful for context and source discovery. It should only matter when market tape, company fundamentals, or filings confirm that the event changed the setup.
              </p>
              <p className="mt-4 workbench-code text-sm">{topTheme?.name ?? 'No active theme'} is a taxonomy bucket, not a buy/sell score.</p>
            </CardBody>
          </Card>
        </div>
      </Section>
      <Section className="pt-0">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader title="Event Tape" eyebrow="Latest sourced context" />
            <TopEventsTable events={[...events].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6)} />
          </Card>
          <MiniAssetTable title="Korea local evidence" assets={localEvidence} />
        </div>
      </Section>
      <Section className="pt-0">
        <ThemeSnapshot themes={themes} />
      </Section>
      <Section className="pt-0">
        <WeeklyMarketRead />
      </Section>
    </>
  )
}

export default DashboardPage
