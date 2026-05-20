import Head from 'next/head'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { getAssets } from '@/lib/data/getAssets'
import { getSourceAudit } from '@/lib/data/getSourceAudit'
import { formatAssetMove, formatReturn } from '@/lib/returns'
import type { Asset } from '@/types/asset'

const authorName = process.env.NEXT_PUBLIC_AUTHOR_NAME || 'Ant'
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000'
const githubRepoUrl = 'https://github.com/Antcolombo/korea-defense-markets-dashboard'
const projectName = 'Asia Macro Research OS'

const navGroups = [
  {
    title: 'Product walkthrough',
    links: [
      ['Market monitor', '/dashboard'],
      ['Price board', '/markets'],
      ['Energy tape', '/energy'],
      ['Event tape', '/events'],
      ['Return study', '/backtest']
    ]
  },
  {
    title: 'Generated research outputs',
    links: [
      ['Korea macro setup', '/research/korea-defense-memo'],
      ['HII expression note', '/research/hii-stock-pitch'],
      ['Trade note studio', '/memos'],
      ['Methodology', '/methodology']
    ]
  },
  {
    title: 'Engineering proof',
    links: [
      ['Source audit', '/source-audit'],
      ['Regime board', '/risk-index'],
      ['Company universe', '/companies'],
      ['Theme map', '/themes']
    ]
  }
] as const

const resourceGroups = [
  ['Data quality', [['audit gate', '/source-audit'], ['provider limits', '/methodology'], ['llms.txt', '/llms.txt']]],
  ['Execution lens', [['EWY/Korea beta', '/markets'], ['U.S. semis', '/markets'], ['U.S. A&D', '/markets']]],
  ['Energy layer', [['gasoline seasonality', '/energy'], ['EIA inventory backlog', '/energy'], ['oil tape', '/markets']]],
  ['Evidence layer', [['SEC filings', '/companies'], ['OpenDART disclosures', '/companies'], ['event taxonomy', '/events']]],
  ['Recruiter view', [['about', '/about'], ['methodology', '/methodology'], ['trade notes', '/research/korea-defense-memo']]]
] as const

const recruiterLinks = [
  ['GitHub code map', githubRepoUrl],
  ['Architecture', '/about'],
  ['Data pipeline', '/source-audit'],
  ['UI screenshots', '#ui-screenshots'],
  ['What I built', '/about']
] as const

const stackItems = [
  'TypeScript / Next.js product UI',
  'React / Recharts dashboards',
  'Node / tsx provider ingestion',
  'Python / pandas analytics layer',
  'Generated JSON audit artifacts',
  'Rust validation layer planned'
] as const

const proofChips = [
  'TypeScript dashboard',
  'Python analytics scaffold',
  'source audits',
  'market normalization',
  'regime board',
  'trade-expression notes'
] as const

const codeLinks = [
  ['scripts/ingest_*', `${githubRepoUrl}/tree/main/scripts`],
  ['scripts/audit_sources.ts', `${githubRepoUrl}/blob/main/scripts/audit_sources.ts`],
  ['src/lib/data/*', `${githubRepoUrl}/tree/main/src/lib/data`],
  ['src/components/*', `${githubRepoUrl}/tree/main/src/components`]
] as const

const screenshotLinks = [
  ['Dashboard overview', '/dashboard'],
  ['Market price board', '/markets'],
  ['Energy research tape', '/energy'],
  ['Event tape', '/events'],
  ['Return study', '/backtest'],
  ['Source audit', '/source-audit'],
  ['Trade note output', '/research/korea-defense-memo']
] as const

const researchCards = [
  {
    href: '/research/korea-defense-memo',
    title: '2026-05-19 Korea Macro Trade Note',
    image: 'setup',
    meta: 'portfolio-style trade note: setup, evidence, expression, invalidation'
  },
  {
    href: '/markets',
    title: '2026-05-19 Korea And U.S. Expression Price Board',
    image: 'board',
    meta: 'normalized market board across EWY, semis, A&D, FX, and rates'
  },
  {
    href: '/source-audit',
    title: '2026-05-19 Source Audit And Provider Readiness',
    image: 'audit',
    meta: 'provider health, row counts, provenance, and failure-mode limits'
  },
  {
    href: '/research/hii-stock-pitch',
    title: '2026-05-19 HII Naval Capacity Expression Note',
    image: 'hii',
    meta: 'company research output backed by filings and Indo-Pacific context'
  },
  {
    href: '/backtest',
    title: '2026-05-19 Event-To-Market Return Study',
    image: 'returns',
    meta: 'event-to-market analysis with 1D, 5D, 20D, and 60D windows'
  },
  {
    href: '/methodology',
    title: '2026-05-19 Methodology And Data Limitations',
    image: 'method',
    meta: 'clear boundary between sourced facts, derived fields, and demo limits'
  }
] as const

function IndexCard({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return <div id={id} className={`sq-card ${className}`}>{children}</div>
}

function IndexTitle({ children }: { children: ReactNode }) {
  return <div className="sq-card-title">{children}</div>
}

function LinkList({ links }: { links: readonly (readonly [string, string])[] }) {
  return (
    <ul className="sq-link-list">
      {links.map(([label, href]) => (
        <li key={href + label}>
          {href.startsWith('http') ? (
            <a href={href} target="_blank" rel="noreferrer">{label}</a>
          ) : (
            <Link href={href}>{label}</Link>
          )}
        </li>
      ))}
    </ul>
  )
}

function ChipList({ items }: { items: readonly string[] }) {
  return (
    <div className="sq-chip-row">
      {items.map(item => <span key={item} className="sq-chip">{item}</span>)}
    </div>
  )
}

function ResourceRows() {
  return (
    <div className="sq-resource-list">
      {resourceGroups.map(([label, links]) => (
        <div key={label} className="sq-resource-row">
          <span>{label}</span>
          {links.map(([text, href]) => <Link key={text} href={href}>{text}</Link>)}
        </div>
      ))}
    </div>
  )
}

function ResearchThumb({ kind, asset }: { kind: string; asset?: Asset }) {
  const bars = kind === 'audit' ? [92, 100, 88, 76, 100] : kind === 'returns' ? [30, 62, 48, 80, 36] : [72, 44, 88, 58, 68]
  return (
    <div className={`sq-thumb sq-thumb-${kind}`}>
      <div className="sq-thumb-grid">
        <div>
          <p>{asset?.ticker ?? kind.toUpperCase()}</p>
          <strong>{asset ? formatAssetMove(asset, asset.return5d) : 'source'}</strong>
        </div>
        <div>
          <p>status</p>
          <strong>{kind === 'audit' ? 'passed' : 'watch'}</strong>
        </div>
      </div>
      <div className="sq-bars">
        {bars.map((bar, index) => <span key={index} style={{ height: `${bar}%` }} />)}
      </div>
    </div>
  )
}

export function HomePage() {
  const audit = getSourceAudit()
  const assets = getAssets()
  const assetByTicker = new Map(assets.map(asset => [asset.ticker, asset]))
  const usdkrw = assetByTicker.get('USDKRW')
  const ewy = assetByTicker.get('EWY')
  const hii = assetByTicker.get('HII')
  const sourceRows = audit.providers?.reduce((sum, provider) => sum + provider.records, 0) ?? 0
  const bestUsExpression = assets
    .filter(asset => asset.sleeve === 'U.S. trade expression' && asset.return5d !== null)
    .sort((a, b) => (b.return5d ?? -Infinity) - (a.return5d ?? -Infinity))[0]

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: projectName,
    url: siteUrl,
    about: 'Portfolio research operating system by ' + authorName + ' for Asia macro, public-source event monitoring, liquid trade expressions, filings, disclosures, market regimes, and data provenance.',
    mainEntity: {
      '@type': 'Person',
      name: authorName,
      knowsAbout: ['Investment research', 'Korea macro', 'FX/rates', 'semiconductors', 'aerospace and defense', 'public-source intelligence', 'Next.js', 'data ingestion', 'source provenance'],
      description: 'Market research and software portfolio candidate focused on Korea macro, public data pipelines, and trade-note style research workflows.'
    },
    hasPart: researchCards.map(card => ({
      '@type': 'CreativeWork',
      name: card.title,
      url: `${siteUrl}${card.href}`,
      description: card.meta
    }))
  }

  return (
    <>
      <Head>
        <title>{`${projectName} | ${authorName}`}</title>
        <meta name="description" content={`${authorName}'s research operating system with TypeScript dashboards, Python/pandas analytics, typed ingestion scripts, source audits, market regime tracking, and portfolio-style trade notes.`} />
        <meta name="robots" content="index,follow,max-image-preview:large" />
        <meta name="author" content={authorName} />
        <meta property="og:title" content={`${projectName} | ${authorName}`} />
        <meta property="og:description" content="Research OS for public-source ingestion, source audits, market normalization, regime tracking, and trade-expression research outputs." />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={siteUrl} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </Head>
      <div className="sq-index mx-auto max-w-[1000px] px-4 py-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <IndexCard className="sq-hero-card">
              <div className="sq-hero-body">
                <div className="sq-hero-copy">
                  <p className="sq-eyebrow">Portfolio data dashboard</p>
                  <h1>{projectName} by {authorName}</h1>
                  <p className="sq-hero-description">
                    A research operating system with TypeScript dashboards, Python/pandas analytics scaffolding, typed ingestion scripts, source audits, market regime tracking, and portfolio-style trade notes.
                  </p>
                </div>
                <div className="sq-hero-links">
                  <Link href="/source-audit">audit:{audit.status}</Link>
                  <a href={githubRepoUrl} target="_blank" rel="noreferrer">GitHub</a>
                  <Link href="/llms.txt">llms.txt</Link>
                </div>
                <ChipList items={proofChips} />
              </div>
            </IndexCard>
          </div>

          <IndexCard className="h-full">
            <IndexTitle>For recruiters</IndexTitle>
            <div className="sq-card-body">
              <LinkList links={recruiterLinks} />
            </div>
          </IndexCard>

          <IndexCard className="h-full">
            <IndexTitle>Stack</IndexTitle>
            <div className="sq-card-body">
              <ChipList items={stackItems} />
            </div>
          </IndexCard>

          <IndexCard className="h-full">
            <IndexTitle>Code to inspect</IndexTitle>
            <div className="sq-card-body">
              <LinkList links={codeLinks} />
            </div>
          </IndexCard>

          {navGroups.map(group => (
            <IndexCard key={group.title} className="h-full">
              <IndexTitle><Link href={group.links[0][1]}>{group.title}</Link></IndexTitle>
              <div className="sq-card-body">
                <LinkList links={group.links} />
              </div>
            </IndexCard>
          ))}

          <IndexCard id="ui-screenshots" className="h-full sm:col-span-2">
            <IndexTitle>UI screenshots</IndexTitle>
            <div className="sq-card-body">
              <p className="sq-note sq-note-tight">Live screenshot-ready views for reviewing the interface, data model, and research outputs.</p>
              <div className="mt-3">
                <LinkList links={screenshotLinks} />
              </div>
            </div>
          </IndexCard>

          <IndexCard className="h-full">
            <IndexTitle>Current tape</IndexTitle>
            <div className="sq-card-body">
              <div className="sq-metric-row"><span>USD/KRW</span><strong>{usdkrw ? formatAssetMove(usdkrw, usdkrw.return5d) : 'N/A'}</strong></div>
              <div className="sq-metric-row"><span>EWY 5D</span><strong>{ewy ? formatReturn(ewy.return5d) : 'N/A'}</strong></div>
              <div className="sq-metric-row"><span>Best U.S. expr.</span><strong>{bestUsExpression?.ticker ?? 'N/A'}</strong></div>
              <div className="sq-metric-row"><span>Regime</span><strong>price-first</strong></div>
              <div className="sq-metric-row"><span>Source rows</span><strong>{sourceRows}</strong></div>
            </div>
          </IndexCard>

          <IndexCard className="h-full sm:col-span-2 lg:col-span-3">
            <IndexTitle>Project map</IndexTitle>
            <div className="sq-card-body">
              <ResourceRows />
            </div>
          </IndexCard>

          <IndexCard className="sm:col-span-2 lg:col-span-3">
            <IndexTitle>Data reality</IndexTitle>
            <div className="sq-card-body">
              <p className="sq-note">
                Public daily quote coverage is used for the resume demo. U.S. prices are not institutional consolidated tape, NBBO, intraday, execution-grade, or corporate-action-verified data. Korean local equities are disclosure/evidence coverage until a KRX-capable licensed feed is added.
              </p>
            </div>
          </IndexCard>

          {researchCards.map(card => (
            <IndexCard key={card.href} className="h-full">
              <IndexTitle><Link href={card.href}>{card.title}</Link></IndexTitle>
              <Link href={card.href} aria-label={card.title}>
                <ResearchThumb kind={card.image} asset={card.image === 'hii' ? hii : card.image === 'board' ? bestUsExpression : undefined} />
              </Link>
              <div className="sq-card-body sq-card-caption">{card.meta}</div>
            </IndexCard>
          ))}
        </div>
      </div>
    </>
  )
}

export default HomePage
