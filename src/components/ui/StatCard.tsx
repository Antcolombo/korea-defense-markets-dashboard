import { Card } from './Card'

type StatCardProps = {
  label: string
  value: string
  detail?: string
  tone?: 'default' | 'positive' | 'negative' | 'warning'
}

export function StatCard({ label, value, detail, tone = 'default' }: StatCardProps) {
  const valueTone = tone === 'positive' ? 'text-good' : tone === 'negative' ? 'text-danger' : tone === 'warning' ? 'text-amber' : 'text-ink'

  return (
    <Card className="p-4">
      <p className="workbench-kicker">{label}</p>
      <p className={`mt-2 text-2xl font-bold leading-none ${valueTone}`}>{value}</p>
      {detail ? <p className="mt-2 text-sm leading-5 text-muted">{detail}</p> : null}
    </Card>
  )
}
