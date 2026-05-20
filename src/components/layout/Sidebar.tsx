import Link from 'next/link'

const researchLinks = [
  { href: '/research/korea-defense-memo', label: 'Korea defense memo' },
  { href: '/research/hii-stock-pitch', label: 'HII stock pitch' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/about', label: 'Portfolio context' }
]

export function Sidebar() {
  return (
    <aside className="workbench-card p-4">
      <p className="workbench-kicker">Application Links</p>
      <div className="mt-3 grid gap-2">
        {researchLinks.map(link => (
          <Link key={link.href} href={link.href} className="rounded-md border border-line bg-[rgba(0,0,0,0.16)] px-3 py-2 text-sm font-medium text-steel hover:border-steel hover:text-ink">
            {link.label}
          </Link>
        ))}
      </div>
    </aside>
  )
}
