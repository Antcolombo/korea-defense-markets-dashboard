import type { Theme } from '@/types/theme'
import { Card } from '@/components/ui/Card'
import { RiskBadge } from '@/components/ui/Badge'

export function ThemeSnapshot({ themes }: { themes: Theme[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {themes.slice(0, 4).map(theme => (
        <Card key={theme.id} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-ink">{theme.name}</h3>
            <RiskBadge level={theme.currentRiskLevel} />
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">{theme.description}</p>
          <p className="mt-4 text-sm font-medium text-steel">{theme.relatedAssets.slice(0, 4).join(' / ')}</p>
        </Card>
      ))}
    </div>
  )
}
