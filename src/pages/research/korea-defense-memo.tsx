import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { DataBuildFailure } from '@/components/ui/DataBuildFailure'
import { getMemos } from '@/lib/data/getMemos'
import { getEvents } from '@/lib/data/getEvents'
import { getAssets } from '@/lib/data/getAssets'
import { DISCLAIMER } from '@/lib/constants'
import { formatCategory } from '@/lib/formatters'
import { formatAssetMove } from '@/lib/returns'

export function KoreaDefenseMemoPage() {
  const memo = getMemos()[0] ?? null
  const events = getEvents()
  const assets = getAssets()
  const topEvents = events.slice(0, 5)
  const watchlistAssets = assets.filter(asset => memo?.watchlist.includes(asset.ticker)).slice(0, 8)

  return (
    <>
      <PageHeader
        eyebrow="Trade note"
        title="Korea Macro Trade Note"
        description="A sourced trade-decision note: setup, evidence, best expression, invalidation, risks, and what to monitor next."
      >
        {memo ? <Badge tone="watch">{memo.riskLevel} research state</Badge> : null}
      </PageHeader>
      <Section>
        <Card className="p-5">
          {!memo ? (
            <DataBuildFailure title="No sourced memo passed strict source mode" />
          ) : (
          <>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
            <div>
              <p className="workbench-kicker">{memo.date}</p>
              <h2 className="mt-2 text-3xl font-semibold text-ink">{memo.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                Public event tape, macro series, market prices, and disclosures converted into a decision-support note. This is not automated trading advice.
              </p>
            </div>
            <Badge tone="watch">Price confirmation required</Badge>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <h3 className="font-semibold text-ink">Setup</h3>
              <p className="mt-2 text-sm leading-7 text-muted">
                Start with the Korea macro setup: USD/KRW, EWY/Korea beta, semis, A&D, VIX, oil, and rates. The point is to select the cleanest liquid expression, not force every Korea event into a trade.
              </p>
              <h3 className="mt-6 font-semibold text-ink">Best expressions to check</h3>
              <div className="mt-3 grid gap-2">
                {watchlistAssets.map(asset => (
                  <div key={asset.ticker} className="flex items-start justify-between gap-3 border-b border-line pb-2 text-sm last:border-b-0">
                    <div>
                      <p className="font-semibold text-ink">{asset.ticker}</p>
                      <p className="text-muted">{asset.sleeve} / {asset.themes.slice(0, 2).join(', ')}</p>
                    </div>
                    <p className="whitespace-nowrap text-muted">{formatAssetMove(asset, asset.return5d)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-5 text-sm leading-7 text-muted">
              <div>
                <h3 className="font-semibold text-ink">Evidence</h3>
                <div className="mt-2 grid gap-3">
                  {topEvents.map(event => (
                    <a key={event.id} href={event.sourceUrl} target="_blank" rel="noreferrer" className="workbench-panel block p-3 hover:border-steel">
                      <p className="font-semibold text-ink">{event.title}</p>
                      <p className="mt-1 text-xs text-muted">{event.date} / {formatCategory(event.category)} / source context only</p>
                    </a>
                  ))}
                </div>
              </div>
              <div><h3 className="font-semibold text-ink">Best expression</h3><p className="mt-2">{memo.marketReaction}</p></div>
              <div><h3 className="font-semibold text-ink">Entry / exit framework</h3><p className="mt-2">{memo.investmentImplication}</p></div>
              <div><h3 className="font-semibold text-ink">Invalidation</h3><p className="mt-2">The setup weakens if USD/KRW, EWY, semis, A&D, and volatility fail to confirm the event tape, or if new filings/disclosures contradict the implied channel.</p></div>
              <div><h3 className="font-semibold text-ink">Risks</h3><p className="mt-2">Liquidity, timing, false event salience, provider coverage gaps, crowded U.S. expressions, and macro shocks unrelated to Korea can dominate the setup.</p></div>
              <div><h3 className="font-semibold text-ink">Public-source citations</h3><p className="mt-2">{memo.sources.slice(0, 5).join(', ')}</p></div>
            </div>
          </div>
          </>
          )}
        </Card>
      </Section>
      <Section className="pt-0">
        <Card className="p-5">
          <p className="text-sm leading-7 text-muted">{DISCLAIMER}</p>
        </Card>
      </Section>
    </>
  )
}

export default KoreaDefenseMemoPage
