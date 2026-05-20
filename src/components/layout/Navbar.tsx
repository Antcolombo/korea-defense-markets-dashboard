import Link from 'next/link'
import { useRouter } from 'next/router'
import { Badge } from '@/components/ui/Badge'
import { getSourceAudit } from '@/lib/data/getSourceAudit'

const navItems = [
  { href: '/dashboard', label: 'Market Monitor' },
  { href: '/events', label: 'Event Tape' },
  { href: '/markets', label: 'Price Board' },
  { href: '/energy', label: 'Energy' },
  { href: '/backtest', label: 'Return Study' },
  { href: '/source-audit', label: 'Audit' },
  { href: '/research/korea-defense-memo', label: 'Trade Notes' }
]

const secondaryNavItems = [
  { href: '/risk-index', label: 'Signals' },
  { href: '/themes', label: 'Themes' },
  { href: '/companies', label: 'Companies' },
  { href: '/memos', label: 'Notes' }
]

export function Navbar() {
  const router = useRouter()
  const audit = getSourceAudit()
  const auditPassed = audit.status === 'passed'

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[rgba(0,0,0,0.58)] backdrop-blur">
      <div className="mx-auto flex max-w-[1080px] items-center justify-between gap-3 px-4 py-2.5">
        <Link href="/" className="min-w-0">
          <p className="truncate text-sm font-bold uppercase text-ink">Asia Macro Research OS</p>
          <p className="hidden text-xs text-muted sm:block">KRW, Korea beta, and liquid U.S. trade expressions</p>
        </Link>
        <nav className="hidden min-w-0 items-center gap-1 lg:flex">
          {navItems.map(item => {
            const active = router.pathname === item.href || router.pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-2.5 py-1.5 text-sm font-semibold transition ${active ? 'bg-[rgba(80,210,193,0.14)] text-steel' : 'text-ink hover:bg-navy hover:text-steel'}`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="hidden sm:block">
          <Badge tone={auditPassed ? 'source' : 'crisis'}>{auditPassed ? 'Audit passed' : 'Audit failed'}</Badge>
        </div>
      </div>
      <div className="border-t border-line px-4 py-2">
        <div className="mx-auto flex max-w-[1080px] gap-2 overflow-x-auto lg:hidden">
          {[...navItems, ...secondaryNavItems].map(item => {
            const active = router.pathname === item.href || router.pathname.startsWith(`${item.href}/`)
            return (
            <Link key={item.href} href={item.href} className={`whitespace-nowrap rounded-md border px-3 py-2 text-sm font-medium ${active ? 'border-[rgba(80,210,193,0.45)] bg-[rgba(80,210,193,0.14)] text-ink' : 'border-line bg-[rgba(0,0,0,0.24)] text-steel'}`}>
              {item.label}
            </Link>
            )
          })}
        </div>
        <div className="mx-auto hidden max-w-[1080px] gap-4 text-xs lg:flex">
          {secondaryNavItems.map(item => (
            <Link key={item.href} href={item.href} className="font-semibold text-muted hover:text-steel">{item.label}</Link>
          ))}
        </div>
      </div>
    </header>
  )
}
