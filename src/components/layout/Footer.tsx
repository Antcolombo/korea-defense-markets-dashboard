import Link from 'next/link'
import { DISCLAIMER } from '@/lib/constants'

export function Footer() {
  return (
    <footer className="mt-8 border-t border-line bg-[rgba(0,0,0,0.45)]">
      <div className="mx-auto grid max-w-[1080px] gap-5 px-4 py-5 text-sm text-muted lg:grid-cols-[1fr_auto]">
        <div>
          <p className="font-semibold text-ink">Asia Macro Research OS</p>
          <p className="mt-2 max-w-4xl leading-6">{DISCLAIMER}</p>
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Link href="/methodology" className="font-medium text-steel hover:text-ink">Methodology</Link>
          <Link href="/source-audit" className="font-medium text-steel hover:text-ink">Source Audit</Link>
          <Link href="/research/korea-defense-memo" className="font-medium text-steel hover:text-ink">Trade Note</Link>
          <Link href="/research/hii-stock-pitch" className="font-medium text-steel hover:text-ink">HII Note</Link>
          <Link href="/about" className="font-medium text-steel hover:text-ink">About</Link>
        </div>
      </div>
    </footer>
  )
}
