import type { Theme } from '@/types/theme'
import { Card } from '@/components/ui/Card'
import { RiskBadge } from '@/components/ui/Badge'

export function ThemeCard({ theme }: { theme: Theme }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">{theme.name}</h2>
        <RiskBadge level={theme.currentRiskLevel} />
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">{theme.description}</p>
      <div className="mt-5 grid gap-4 text-sm md:grid-cols-2">
        <div>
          <p className="font-semibold text-ink">Market channels</p>
          <p className="mt-1 text-muted">{theme.marketChannels.join(', ')}</p>
        </div>
        <div>
          <p className="font-semibold text-ink">Related assets</p>
          <p className="mt-1 text-muted">{theme.relatedAssets.join(', ')}</p>
        </div>
        <div>
          <p className="font-semibold text-ink">Key catalysts</p>
          <p className="mt-1 text-muted">{theme.keyCatalysts?.join(', ')}</p>
        </div>
        <div>
          <p className="font-semibold text-ink">Key risks</p>
          <p className="mt-1 text-muted">{theme.keyRisks?.join(', ')}</p>
        </div>
      </div>
      <p className="mt-5 border-t border-line pt-4 text-sm leading-6 text-steel">{theme.investmentImplication}</p>
    </Card>
  )
}
