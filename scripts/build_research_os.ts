import { nowIso, readJson, writeJson } from './lib/io'
import type { Asset } from '../src/types/asset'
import type { Company } from '../src/types/company'
import type { Event } from '../src/types/event'
import type { Memo } from '../src/types/memo'
import type { EventReturn, PricePoint } from '../src/types/market'
import type {
  CompanyCoverageRecord,
  EventTapeRecord,
  IdeaLedgerRecord,
  MarketTapeRecord,
  MasteryPipelineStage,
  ResearchArtifactRecord,
  ResearchEventType,
  SourceBacklogItem
} from '../src/types/researchOs'

const generatedAt = nowIso()

function provenance(sourceName: string, methodologyNote: string, sourceUrl = '/methodology') {
  return {
    provider: 'derived',
    sourceUrl,
    sourceName,
    retrievedAt: generatedAt,
    publishedAt: generatedAt,
    isDerived: true,
    methodologyNote,
    dataQuality: 'derived' as const
  }
}

function latestByTicker(prices: PricePoint[]) {
  const latest = new Map<string, PricePoint>()
  for (const point of prices) {
    const current = latest.get(point.ticker)
    if (!current || point.date.localeCompare(current.date) > 0) latest.set(point.ticker, point)
  }
  return latest
}

function latestPrice(latest: Map<string, PricePoint>, ticker: string) {
  return latest.get(ticker)?.price ?? null
}

function populatedMarketFields(row: MarketTapeRecord) {
  const fields = ['SPX', 'QQQ', 'KOSPI', 'USD_KRW', 'USD_JPY', 'DXY', 'US_2Y', 'US_10Y', 'KR10Y', 'oil', 'gold', 'SOX', 'VIX'] as const
  return fields.filter(field => row[field] !== null && row[field] !== undefined).length
}

function sourceBacklog(assets: Asset[]): SourceBacklogItem[] {
  const staticBacklog: SourceBacklogItem[] = [
    { name: 'foreign equity flows', providerTarget: 'KRX / Bank of Korea / licensed market data', reasonBlocked: 'No configured public provider in the current ingestion layer.', status: 'Not yet sourced' },
    { name: 'gold spot series', providerTarget: 'FRED / LBMA / market data provider', reasonBlocked: 'Current provider mapping is not configured as a stable build dependency.', status: 'Not yet sourced' },
    { name: 'DRAM/NAND pricing', providerTarget: 'TrendForce / DRAMeXchange / company disclosures', reasonBlocked: 'Specialized semiconductor pricing feed is not configured.', status: 'Not yet sourced' },
    { name: 'KOSPI live price', providerTarget: 'KRX-capable market data provider', reasonBlocked: 'Current pipeline tracks KOSPI as evidence-only until a licensed/index-capable provider is configured.', status: 'Not yet sourced' }
  ]

  const providerTargets: Record<string, string> = {
    '079550.KS': 'OpenDART plus KRX-capable market data provider',
    '042660.KS': 'OpenDART plus KRX-capable market data provider',
    KOSPI: 'KRX-capable market data provider',
    GOLD: 'FRED / LBMA / market data provider'
  }

  const dynamicBacklog = assets
    .filter(asset => asset.dataQuality === 'unavailable')
    .filter(asset => !staticBacklog.some(item => item.name.toLowerCase().includes(asset.ticker.toLowerCase()) || item.name.toLowerCase().includes(asset.name.toLowerCase())))
    .map(asset => ({
      name: `${asset.name} (${asset.ticker})`,
      providerTarget: providerTargets[asset.ticker] ?? 'Licensed or provider-backed market/disclosure feed',
      reasonBlocked: asset.notes || 'Configured watchlist item has no source-backed market data in the current ingestion layer.',
      status: 'Not yet sourced' as const
    }))

  return [...staticBacklog, ...dynamicBacklog]
}

function eventType(event: Event): ResearchEventType {
  if (event.category.includes('MISSILE') || event.category.includes('NUCLEAR')) return 'missile_test'
  if (event.category.includes('EXPORT_CONTROLS')) return 'export_control'
  if (event.category.includes('DEFENSE') || event.category.includes('PROCUREMENT')) return 'defense_contract'
  if (event.category.includes('OIL')) return 'oil_shock'
  if (event.category.includes('ELECTION') || event.category.includes('SANCTIONS')) return 'policy_announcement'
  if (event.category.includes('SEMICONDUCTOR')) return 'chip_cycle'
  return 'geopolitical_event'
}

function companyTheme(company: Company) {
  return company.relatedThemes[0] ?? company.sector
}

function buildMarketTape(assets: Asset[], prices: PricePoint[]): MarketTapeRecord[] {
  const latest = latestByTicker(prices)
  const movers = assets
    .filter(asset => asset.return5d !== null)
    .sort((a, b) => Math.abs(b.return5d ?? 0) - Math.abs(a.return5d ?? 0))
    .slice(0, 5)
    .map(asset => `${asset.ticker} ${asset.return5d}% 5D`)

  const row: MarketTapeRecord = {
    ...provenance('Research OS market tape', 'Daily market tape derived from sourced price and macro observations. Missing providers are tracked in sourceBacklog, not silently rendered.'),
    date: generatedAt.slice(0, 10),
    SPX: latestPrice(latest, 'SPX'),
    QQQ: latestPrice(latest, 'QQQ'),
    KOSPI: latestPrice(latest, 'KOSPI'),
    USD_KRW: latestPrice(latest, 'USDKRW'),
    USD_JPY: latestPrice(latest, 'USDJPY'),
    DXY: latestPrice(latest, 'DXY'),
    US_2Y: latestPrice(latest, 'US2Y'),
    US_10Y: latestPrice(latest, 'US10Y'),
    KR10Y: latestPrice(latest, 'KR10Y'),
    oil: latestPrice(latest, 'OIL'),
    gold: latestPrice(latest, 'GOLD'),
    SOX: latestPrice(latest, 'SOXX'),
    VIX: latestPrice(latest, 'VIX'),
    top_movers: movers,
    market_summary: 'Daily command-center row built from sourced macro and market observations; use it to ask what moved, why, whether it matters, and whether an expression is warranted.',
    todays_question: 'What moved today, what source explains it, and does it change any Korea macro, defense, or semis idea?',
    sourceBacklog: sourceBacklog(assets)
  }

  if (populatedMarketFields(row) < 8) {
    console.warn(`Research OS market tape has ${populatedMarketFields(row)} populated market fields; audit requires at least 8.`)
  }

  return [row]
}

function buildCompanyCoverage(companies: Company[]): CompanyCoverageRecord[] {
  return companies.map(company => ({
    ...provenance('Research OS company coverage', 'Company coverage extends sourced disclosure metadata with explicit diligence fields and research-state tracking.', company.sourceUrl),
    ticker: company.ticker,
    company: company.name,
    country: company.country,
    sector: company.sector,
    theme: companyTheme(company),
    revenue_segments: ['Not yet modeled from filings'],
    margin_trend: 'Not yet modeled from filings',
    backlog: company.relatedThemes.some(theme => theme.includes('Defense') || theme.includes('Munitions') || theme.includes('Naval')) ? 'Backlog diligence required from filings and contract disclosures.' : 'Not central to current thesis.',
    debt: 'Not yet modeled from filings',
    cash: 'Not yet modeled from filings',
    valuation_multiple: company.valuationSnapshot,
    next_earnings: 'Not yet sourced',
    latest_filing: company.methodologyNote,
    key_risks: company.risks,
    current_thesis: company.description,
    research_state: company.researchStatus.includes('Sourced') ? 'Watching' : 'Unresearched'
  }))
}

function buildEventTape(events: Event[], eventReturns: EventReturn[]): EventTapeRecord[] {
  const returnsByEvent = new Map<string, EventReturn[]>()
  for (const row of eventReturns) {
    const rows = returnsByEvent.get(row.eventId) ?? []
    rows.push(row)
    returnsByEvent.set(row.eventId, rows)
  }

  return events.slice(0, 50).map(event => {
    const rows = returnsByEvent.get(event.id) ?? []
    const firstReturn = rows[0]
    return {
      ...provenance('Research OS event tape', 'Event tape derived from sourced event metadata and event-to-market return windows where available.', event.sourceUrl),
      date: event.date,
      event_type: eventType(event),
      event_name: event.title,
      country: event.country,
      companies_affected: event.affectedAssets,
      asset_reaction_1d: firstReturn?.return1d ?? null,
      asset_reaction_5d: firstReturn?.return5d ?? null,
      asset_reaction_20d: firstReturn?.return20d ?? null,
      source: event.sourceUrl,
      notes: event.analystNote
    }
  })
}

function buildIdeaLedger(events: Event[], assets: Asset[]): IdeaLedgerRecord[] {
  const topEvent = events[0]
  const defenseAsset = assets.find(asset => asset.ticker === 'HII') ?? assets.find(asset => asset.sector.includes('Defense')) ?? assets[0]
  const semisAsset = assets.find(asset => asset.ticker === 'SOXX') ?? assets[0]
  const krwAsset = assets.find(asset => asset.ticker === 'USDKRW') ?? assets[0]
  const ideas = [
    { id: 'idea-001', status: 'raw' as const, asset: krwAsset, theme: 'FX / Volatility Stress', thesis: 'KRW weakness may be the cleanest first signal for Korea macro stress.' },
    { id: 'idea-002', status: 'screened' as const, asset: semisAsset, theme: 'Semiconductor Export Controls', thesis: 'SOXX can act as a liquid proxy for Korea semis cycle pressure before local data is upgraded.' },
    { id: 'idea-003', status: 'accepted' as const, asset: defenseAsset, theme: 'Naval / Shipbuilding', thesis: 'U.S. naval capacity names may be a cleaner public expression than unsourced Korea local price action.' },
    { id: 'idea-004', status: 'rejected' as const, asset: assets.find(asset => asset.ticker === 'KOSPI') ?? assets[0], theme: 'Korea Beta', thesis: 'KOSPI-only expression is too broad until local price and flow coverage improves.' },
    { id: 'idea-005', status: 'watchlist' as const, asset: assets.find(asset => asset.ticker === 'VIX') ?? assets[0], theme: 'Global Risk', thesis: 'VIX regime may explain when Korea macro stress becomes broad liquidation instead of isolated FX pressure.' }
  ]

  return ideas.map(idea => ({
    ...provenance('Research OS idea ledger seed', 'Starter idea ledger records are public-safe examples used to prevent empty workflow pages and force explicit acceptance/rejection logic.'),
    idea_id: idea.id,
    date: generatedAt.slice(0, 10),
    theme: idea.theme,
    asset: idea.asset?.ticker ?? 'N/A',
    thesis: idea.thesis,
    market_implies: 'Current public dashboard evidence is incomplete; treat this as a research question, not a conclusion.',
    i_believe: 'The idea must earn promotion through source checks, event evidence, and price reaction review.',
    catalyst: topEvent?.title ?? 'Next sourced event tape update',
    expression: 'Watchlist only until memo, risk, and invalidation are written.',
    evidence: [topEvent?.sourceUrl ?? '/events', '/source-audit', '/backtest'],
    status: idea.status,
    reason_accepted_or_rejected: idea.status === 'rejected' ? 'Rejected until source and expression quality improve.' : 'Seeded for workflow tracking.',
    expected_payoff: 'Defined during memo stage.',
    invalidation: 'Invalidated if source, price, or event evidence contradicts the setup.',
    result_after_1w: 'Pending',
    result_after_1m: 'Pending',
    post_mortem: 'Pending'
  }))
}

function buildResearchArtifacts(events: Event[], companies: Company[], memos: Memo[]): ResearchArtifactRecord[] {
  const latestEvent = events[0]
  const latestMemo = memos[0]
  const hii = companies.find(company => company.ticker === 'HII') ?? companies[0]
  return [
    { id: 'artifact-market-note', type: 'market_note' as const, title: 'Daily Market Command Center', url: '/dashboard', conclusion: 'Market tape, Korea beta, and risk overlays are already visible as a daily workflow.' },
    { id: 'artifact-company-model', type: 'company_model' as const, title: `${hii?.name ?? 'Company'} Dossier`, url: hii ? `/companies/${hii.ticker}` : '/companies', conclusion: 'Company pages connect public filing metadata to research-state coverage.' },
    { id: 'artifact-macro-chart', type: 'macro_chart' as const, title: 'Korea Macro Price Board', url: '/markets', conclusion: 'Macro, FX, rates, semis, and defense expressions are tracked with source labels.' },
    { id: 'artifact-event-study', type: 'event_study' as const, title: 'Event-To-Market Return Study', url: '/backtest', conclusion: 'Event windows are calculated from sourced daily closes and labeled as non-causal context.' },
    { id: 'artifact-research-memo', type: 'research_memo' as const, title: latestMemo?.title ?? 'Korea Macro Trade Note', url: '/research/korea-defense-memo', conclusion: 'Memo output links sourced events to expression, invalidation, and what-to-watch logic.' },
    { id: 'artifact-source-audit', type: 'dashboard_module' as const, title: 'Source Audit Gate', url: '/source-audit', conclusion: 'The build blocks publication when required generated data or provenance is missing.' }
  ].map(artifact => ({
    ...provenance('Research OS artifact registry', 'Artifact registry turns produced research, code, and dashboard modules into public proof.'),
    artifact_id: artifact.id,
    type: artifact.type,
    title: artifact.title,
    date: generatedAt.slice(0, 10),
    linked_idea: null,
    linked_company: artifact.type === 'company_model' ? hii?.ticker ?? null : null,
    linked_event: artifact.type === 'event_study' ? latestEvent?.id ?? null : null,
    data_sources: ['/source-audit', '/methodology'],
    conclusion: artifact.conclusion,
    confidence: 'Medium' as const,
    what_i_learned: 'Every research output must show source quality, method limits, and the next action.',
    public_url: artifact.url
  }))
}

function buildMasteryPipeline(): MasteryPipelineStage[] {
  const stages = [
    ['market-basics', 'Market basics', 'Markets', 'Understand what moved and why.', ['Equity indexes', 'FX', 'Rates', 'Commodities', 'Volatility'], ['Write the daily market map', 'Update top movers', 'Ask what changed'], 'Market note', ['/dashboard', '/markets']],
    ['accounting-valuation', 'Accounting and valuation', 'Research', 'Read companies as operating machines.', ['Statements', 'Margins', 'Backlog', 'Debt', 'Cash', 'Multiples'], ['Read one filing', 'Update one company one-pager'], 'Company model', ['/companies']],
    ['data-engineering', 'Data engineering', 'Data', 'Make source truth auditable.', ['Ingestion', 'Normalization', 'Schemas', 'Freshness', 'Failure modes'], ['Improve one dataset', 'Run source audit'], 'Data quality improvement', ['/source-audit']],
    ['statistics', 'Statistics', 'Data', 'Know when a result may be fake.', ['Sample size', 'Base rates', 'Bias', 'Event windows'], ['Run one event study', 'Write false-positive risk'], 'Event study', ['/backtest']],
    ['trading-research', 'Trading research process', 'Research', 'Turn observations into structured decisions.', ['Market-implies', 'Variant view', 'Catalysts', 'Expression'], ['Promote one idea to memo'], 'Research memo', ['/memos']],
    ['risk-management', 'Risk management', 'Risk', 'Survive being wrong.', ['Sizing', 'Invalidation', 'Correlation', 'Drawdowns'], ['Define risk before expression'], 'Risk section in memo', ['/methodology']],
    ['macro-framework', 'Macro framework', 'Markets', 'Connect Korea to USD, rates, oil, and semis.', ['USD liquidity', 'Rates', 'Current account', 'Trade balance'], ['Update macro monitor inputs'], 'Macro chart', ['/markets']],
    ['options-derivatives', 'Options and derivatives', 'Risk', 'Understand payoff shape before expression.', ['Calls', 'Puts', 'Spreads', 'Volatility', 'Convexity'], ['Compare stock vs option expression'], 'Expression note', ['/memos']],
    ['software-craft', 'Software craft', 'Data', 'Build reliable research tools.', ['TypeScript', 'Tests', 'CI', 'Generated data', 'README'], ['Ship one code improvement'], 'Dashboard module', ['/source-audit']],
    ['research-factory', 'Research factory', 'Research', 'Make output repeatable.', ['Weekly cadence', 'Rejected ideas', 'Post-mortems'], ['5 raw ideas, 1 memo, 1 post-mortem'], 'Weekly review', ['/memos']],
    ['specialization', 'Specialization', 'Markets', 'Become useful on Korea macro, defense, and semis.', ['Korea FX', 'Defense exporters', 'Memory cycle', 'China risk'], ['Deepen one battlefield per week'], 'Specialist memo', ['/themes']],
    ['public-proof', 'Public proof', 'Proof', 'Show the work publicly without overclaiming.', ['Code map', 'Screenshots', 'Source map', 'Failures'], ['Publish one public artifact'], 'Proof page update', ['/about']]
  ] as const

  return stages.map(([id, title, track, goal, learn, actions, artifact, proofLinks]) => ({
    ...provenance('Research OS mastery pipeline', 'Mastery pipeline converts passive learning topics into required public research outputs.'),
    id,
    title,
    track,
    goal,
    learn: [...learn],
    do: [...actions],
    artifact,
    proofLinks: [...proofLinks],
    status: id === 'public-proof' ? 'Proof-ready' : 'Building'
  }))
}

async function main() {
  const assets = await readJson<Asset[]>('src/generated/assets.json', [])
  const companies = await readJson<Company[]>('src/generated/companies.json', [])
  const events = await readJson<Event[]>('src/generated/events.json', [])
  const prices = await readJson<PricePoint[]>('src/generated/prices.json', [])
  const eventReturns = await readJson<EventReturn[]>('src/generated/eventReturns.json', [])
  const memos = await readJson<Memo[]>('src/generated/memos.json', [])

  const marketTape = buildMarketTape(assets, prices)
  const companyCoverage = buildCompanyCoverage(companies)
  const eventTape = buildEventTape(events, eventReturns)
  const ideaLedger = buildIdeaLedger(events, assets)
  const researchArtifacts = buildResearchArtifacts(events, companies, memos)
  const masteryPipeline = buildMasteryPipeline()

  await writeJson('src/generated/marketTape.json', marketTape)
  await writeJson('src/generated/companyCoverage.json', companyCoverage)
  await writeJson('src/generated/eventTape.json', eventTape)
  await writeJson('src/generated/ideaLedger.json', ideaLedger)
  await writeJson('src/generated/researchArtifacts.json', researchArtifacts)
  await writeJson('src/generated/masteryPipeline.json', masteryPipeline)

  console.log(`Built Research OS datasets: ${marketTape.length} market tape rows, ${companyCoverage.length} companies, ${eventTape.length} events, ${ideaLedger.length} ideas, ${researchArtifacts.length} artifacts, ${masteryPipeline.length} stages`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
