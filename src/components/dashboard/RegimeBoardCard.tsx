import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { buildRegimeSignals } from '@/lib/regimeBoard'
import type { Asset } from '@/types/asset'
import type { MarketTapeRecord } from '@/types/researchOs'

function toneForBadge(tone: 'default' | 'positive' | 'negative' | 'warning') {
  if (tone === 'positive') return 'source'
  if (tone === 'negative') return 'crisis'
  if (tone === 'warning') return 'elevated'
  return 'default'
}

export function RegimeBoardCard({ assets, marketTape }: { assets: Asset[]; marketTape: MarketTapeRecord | null }) {
  const signals = buildRegimeSignals(assets, marketTape)

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="workbench-kicker">Market-derived regime board</p>
          <h2 className="mt-2 text-xl font-bold text-ink">Price First, Events Second</h2>
        </div>
        <Badge tone="watch">No event score</Badge>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {signals.map(signal => (
          <div key={signal.label} className="workbench-panel p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="workbench-kicker">{signal.label}</p>
              <Badge tone={toneForBadge(signal.tone)}>{signal.value}</Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">{signal.detail}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-6 text-muted">
        This board starts with sourced market moves. News/event tape can explain or challenge a regime, but it does not become a numeric trade signal.
      </p>
    </Card>
  )
}
