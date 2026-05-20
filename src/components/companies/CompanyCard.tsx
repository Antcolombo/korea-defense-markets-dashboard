import Link from 'next/link'
import type { Company } from '@/types/company'
import type { Asset } from '@/types/asset'
import { Card } from '@/components/ui/Card'
import { formatReturn, getReturnClass } from '@/lib/returns'

export function CompanyCard({ company, asset }: { company: Company; asset?: Asset }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="workbench-kicker">{company.exchange}</p>
          <Link href={`/companies/${encodeURIComponent(company.ticker)}`} className="mt-1 block text-xl font-semibold text-ink hover:text-steel">
            {company.ticker}
          </Link>
          <p className="mt-1 text-sm text-muted">{company.name}</p>
        </div>
        <p className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-steel">{company.researchStatus}</p>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted">{company.defenseExposure}</p>
      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="workbench-kicker">1D</p>
          <p className={`font-semibold ${getReturnClass(asset?.return1d)}`}>{formatReturn(asset?.return1d)}</p>
        </div>
        <div>
          <p className="workbench-kicker">5D</p>
          <p className={`font-semibold ${getReturnClass(asset?.return5d)}`}>{formatReturn(asset?.return5d)}</p>
        </div>
        <div>
          <p className="workbench-kicker">20D</p>
          <p className={`font-semibold ${getReturnClass(asset?.return20d)}`}>{formatReturn(asset?.return20d)}</p>
        </div>
      </div>
    </Card>
  )
}
