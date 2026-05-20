import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/ui/Section'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { RegimeBoardCard } from '@/components/dashboard/RegimeBoardCard'
import { TopEventsTable } from '@/components/dashboard/TopEventsTable'
import { getAssets } from '@/lib/data/getAssets'
import { getEvents } from '@/lib/data/getEvents'
import { getMarketTape } from '@/lib/data/getResearchOs'
import { buildRegimeSignals } from '@/lib/regimeBoard'
import { formatAssetMove } from '@/lib/returns'

export function RegimeBoardPage() {
  const assets = getAssets()
  const events = getEvents()
  const marketTape = getMarketTape()[0] ?? null
  const signals = buildRegimeSignals(assets, marketTape)
  const sourcedAssets = assets.filter(asset => asset.dataQuality === 'source')
  const unavailableAssets = assets.filter(asset => asset.dataQuality === 'unavailable')
  const semis = assets.filter(asset => ['SOXX', 'SMH', 'NVDA', 'TSM', 'MU', '005930.KS', '000660.KS'].includes(asset.ticker))

  return (
    <>
      <PageHeader
        eyebrow="Regime board"
        title="Market Regime Board"
        description="A price-first view of FX, rates, equity, semis, defense, and source coverage. Event tape is context, not a numeric signal."
      />
      <Section>
        <RegimeBoardCard assets={assets} marketTape={marketTape} />
      </Section>
      <Section className="pt-0">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Sourced assets" value={`${sourcedAssets.length}/${assets.length}`} detail="Current provider-backed instruments" tone="positive" />
          <StatCard label="Source backlog" value={`${marketTape?.sourceBacklog.length ?? 0}`} detail="Explicitly unavailable inputs" tone="warning" />
          <StatCard label="Event tape" value={`${events.length}`} detail="Source discovery layer, not price truth" />
        </div>
      </Section>
      <Section className="pt-0">
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardHeader title="Regime Signals" eyebrow="Market-derived" />
            <CardBody className="grid gap-3">
              {signals.map(signal => (
                <div key={signal.label} className="workbench-panel p-3">
                  <p className="workbench-kicker">{signal.label}</p>
                  <p className="mt-2 text-lg font-semibold text-ink">{signal.value}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">{signal.detail}</p>
                </div>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Semis Confirmation Tape" eyebrow="5D sourced moves" />
            <CardBody className="grid gap-2">
              {semis.map(asset => (
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
        </div>
      </Section>
      <Section className="pt-0">
        <Card>
          <CardHeader title="Latest Event Tape" eyebrow="Context only" />
          <TopEventsTable events={[...events].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)} />
        </Card>
      </Section>
      <Section className="pt-0">
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-ink">Source Backlog</h2>
          <div className="mt-4 grid gap-3">
            {marketTape?.sourceBacklog.map(item => (
              <div key={item.name} className="workbench-panel p-3">
                <p className="font-semibold text-ink">{item.name}</p>
                <p className="mt-1 text-sm text-muted">{item.providerTarget}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{item.reasonBlocked}</p>
              </div>
            ))}
          </div>
          {unavailableAssets.length > 0 ? (
            <p className="mt-4 text-sm leading-7 text-muted">
              Unavailable assets are visible on purpose and excluded from readiness counts until a real provider is wired.
            </p>
          ) : null}
        </Card>
      </Section>
    </>
  )
}

export default RegimeBoardPage
