import type { Asset } from '@/types/asset'
import type { Company } from '@/types/company'
import type { Event } from '@/types/event'
import { Card } from '@/components/ui/Card'
import { CatalystList } from './CatalystList'
import { formatReturn } from '@/lib/returns'

export function CompanyDossier({ company, asset, events }: { company: Company; asset?: Asset; events: Event[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
      <Card className="p-6">
        <p className="workbench-kicker">Company Overview</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">{company.name}</h2>
        <p className="mt-3 text-sm leading-7 text-muted">{company.description}</p>
        <div className="mt-6 grid gap-5 text-sm md:grid-cols-2">
          <div>
            <p className="font-semibold text-ink">Defense/geopolitical exposure</p>
            <p className="mt-2 leading-6 text-muted">{company.defenseExposure}</p>
          </div>
          <div>
            <p className="font-semibold text-ink">Valuation snapshot</p>
            <p className="mt-2 leading-6 text-muted">{company.valuationSnapshot}</p>
          </div>
          <CatalystList title="Key catalysts" items={company.catalysts} />
          <CatalystList title="Key risks" items={company.risks} />
        </div>
      </Card>
      <div className="grid gap-6">
        <Card className="p-5">
          <p className="workbench-kicker">Market Performance</p>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-muted">1D</p><p className="text-xl font-semibold text-ink">{formatReturn(asset?.return1d)}</p></div>
            <div><p className="text-muted">5D</p><p className="text-xl font-semibold text-ink">{formatReturn(asset?.return5d)}</p></div>
            <div><p className="text-muted">20D</p><p className="text-xl font-semibold text-ink">{formatReturn(asset?.return20d)}</p></div>
            <div><p className="text-muted">YTD</p><p className="text-xl font-semibold text-ink">{formatReturn(asset?.returnYtd)}</p></div>
          </div>
        </Card>
        <Card className="p-5">
          <p className="workbench-kicker">Related Events</p>
          <div className="mt-3 grid gap-3">
            {events.slice(0, 5).map(event => (
              <div key={event.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                <p className="text-sm font-medium text-ink">{event.title}</p>
                <p className="mt-1 text-xs text-muted">{event.date} · {event.verified ? 'verified source context' : 'unverified context'}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
