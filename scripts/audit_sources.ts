import { readdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { readJson, writeJson, nowIso } from './lib/io'

const files = [
  'src/generated/events.json',
  'src/generated/assets.json',
  'src/generated/companies.json',
  'src/generated/themes.json',
  'src/generated/prices.json',
  'src/generated/riskIndex.json',
  'src/generated/eventReturns.json',
  'src/generated/memos.json',
  'src/generated/koreaMacro.json',
  'src/generated/semisCycle.json',
  'src/generated/marketTape.json',
  'src/generated/companyCoverage.json',
  'src/generated/eventTape.json',
  'src/generated/ideaLedger.json',
  'src/generated/weeklyReview.json',
  'src/generated/researchArtifacts.json',
  'src/generated/masteryPipeline.json',
  'src/generated/energyResearch.json'
]

const required = ['provider', 'sourceUrl', 'sourceName', 'retrievedAt', 'isDerived', 'methodologyNote', 'dataQuality']
const requiredNonEmpty = [
  'src/generated/events.json',
  'src/generated/prices.json',
  'src/generated/riskIndex.json',
  'src/generated/eventReturns.json',
  'src/generated/memos.json',
  'src/generated/koreaMacro.json',
  'src/generated/semisCycle.json',
  'src/generated/marketTape.json',
  'src/generated/companyCoverage.json',
  'src/generated/eventTape.json',
  'src/generated/ideaLedger.json',
  'src/generated/weeklyReview.json',
  'src/generated/researchArtifacts.json',
  'src/generated/masteryPipeline.json',
  'src/generated/energyResearch.json'
]

type ProviderStatus = {
  provider: string
  status: string
  retrievedAt?: string
  records: number
  failures: string[]
  optional?: boolean
  staleAfterHours?: number
  ageHours?: number | null
  freshnessStatus?: 'fresh' | 'stale' | 'unknown'
}

type KoreaUnlockItem = {
  label: string
  status: 'ready' | 'missing'
  detail: string
}

function ageHours(retrievedAt?: string) {
  if (!retrievedAt) return null
  const time = Date.parse(retrievedAt)
  if (!Number.isFinite(time)) return null
  return Number(((Date.now() - time) / 36e5).toFixed(1))
}

function staleAfter(provider: string) {
  if (provider.includes('News')) return 24
  if (provider.includes('Market') || provider.includes('Nasdaq') || provider.includes('Korea official')) return 36
  if (provider.includes('FRED')) return 72
  if (provider.includes('BOK') || provider.includes('macro')) return 168
  return 168
}

function withFreshness<T extends ProviderStatus>(provider: T): T {
  if (provider.status !== 'source') {
    return {
      ...provider,
      staleAfterHours: staleAfter(provider.provider),
      ageHours: null,
      freshnessStatus: 'unknown'
    }
  }
  const age = ageHours(provider.retrievedAt)
  const staleAfterHours = staleAfter(provider.provider)
  return {
    ...provider,
    staleAfterHours,
    ageHours: age,
    freshnessStatus: age === null ? 'unknown' : age > staleAfterHours ? 'stale' : 'fresh'
  }
}

function nextScheduledRefresh(now = new Date()) {
  const schedules = [
    { day: 1, hour: 12, minute: 30 },
    { day: 1, hour: 21, minute: 30 },
    { day: 2, hour: 2, minute: 30 },
    { day: 2, hour: 12, minute: 30 },
    { day: 2, hour: 21, minute: 30 },
    { day: 3, hour: 2, minute: 30 },
    { day: 3, hour: 12, minute: 30 },
    { day: 3, hour: 21, minute: 30 },
    { day: 4, hour: 2, minute: 30 },
    { day: 4, hour: 12, minute: 30 },
    { day: 4, hour: 21, minute: 30 },
    { day: 5, hour: 2, minute: 30 },
    { day: 5, hour: 12, minute: 30 },
    { day: 5, hour: 21, minute: 30 },
    { day: 6, hour: 2, minute: 30 }
  ]
  const candidates: Date[] = []
  for (let offset = 0; offset < 8; offset += 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset))
    for (const schedule of schedules) {
      if (date.getUTCDay() !== schedule.day) continue
      const candidate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), schedule.hour, schedule.minute))
      if (candidate.getTime() > now.getTime()) candidates.push(candidate)
    }
  }
  return candidates.sort((a, b) => a.getTime() - b.getTime())[0]?.toISOString() ?? null
}

function koreaUnlockChecklist(): KoreaUnlockItem[] {
  const hasDataGoKr = Boolean(process.env.DATA_GO_KR_SERVICE_KEY?.trim() || process.env.KOREA_STOCK_API_KEY?.trim())
  const hasBok = Boolean(process.env.BOK_ECOS_API_KEY?.trim())
  return [
    {
      label: 'data.go.kr local equity key',
      status: hasDataGoKr ? 'ready' : 'missing',
      detail: hasDataGoKr ? 'DATA_GO_KR_SERVICE_KEY is configured.' : 'Set DATA_GO_KR_SERVICE_KEY to unlock Samsung, SK Hynix, Hanwha Aerospace, LIG Nex1, KAI, Hyundai Rotem, and Hanwha Ocean daily closes.'
    },
    {
      label: 'KOSPI/KOSDAQ index export',
      status: existsSync('data/private/korea-index-prices.json') ? 'ready' : 'missing',
      detail: 'Create data/private/korea-index-prices.json with npm run import:korea:index or a validated KRX Data Marketplace export.'
    },
    {
      label: 'BOK ECOS key',
      status: hasBok ? 'ready' : 'missing',
      detail: hasBok ? 'BOK_ECOS_API_KEY is configured.' : 'Set BOK_ECOS_API_KEY for BOK rates/current-account/trade-balance ingestion.'
    },
    {
      label: 'BOK series mappings',
      status: process.env.BOK_BASE_RATE_STAT_CODE && process.env.BOK_BASE_RATE_ITEM_CODE && process.env.BOK_CURRENT_ACCOUNT_STAT_CODE && process.env.BOK_CURRENT_ACCOUNT_ITEM_CODE && process.env.BOK_TRADE_BALANCE_STAT_CODE && process.env.BOK_TRADE_BALANCE_ITEM_CODE ? 'ready' : 'missing',
      detail: 'Configure BOK_BASE_RATE_*, BOK_CURRENT_ACCOUNT_*, and BOK_TRADE_BALANCE_* STAT_CODE/ITEM_CODE env vars.'
    },
    {
      label: 'Foreign equity flow export',
      status: existsSync('data/private/korea-macro-flows.json') ? 'ready' : 'missing',
      detail: 'Create data/private/korea-macro-flows.json with npm run import:korea:macro or a validated KRX/BOK export.'
    }
  ]
}

function allowStaleCache() {
  return process.env.ALLOW_STALE_CACHE === 'true'
}

async function providerStatuses(): Promise<ProviderStatus[]> {
  const rawEvents = await readJson<{ status?: string; retrievedAt?: string; articleCount?: number; failures?: string[] }>('src/generated/raw/events.news.json', {})
  const rawMarket = await readJson<{ provider?: string; status?: string; retrievedAt?: string; series?: { status?: string; rows?: unknown[] }[]; failures?: string[] }>('src/generated/raw/market.prices.json', {})
  const rawKoreaMarket = await readJson<{ provider?: string; status?: string; retrievedAt?: string; series?: { status?: string; rows?: unknown[] }[]; failures?: string[] }>('src/generated/raw/korea.market.json', {})
  const rawMacro = await readJson<{ status?: string; retrievedAt?: string; series?: { status?: string; observations?: unknown[] }[]; failures?: string[] }>('src/generated/raw/macro.fred.json', {})
  const rawKoreaMacro = await readJson<{ provider?: string; status?: string; retrievedAt?: string; series?: { status?: string; observations?: unknown[] }[]; failures?: string[] }>('src/generated/raw/korea.macro-flows.json', {})
  const rawFilings = await readJson<{ status?: string; retrievedAt?: string; failures?: string[]; sec?: { records?: { status?: string }[] }; openDart?: { status?: string; records?: unknown[]; error?: string } }>('src/generated/raw/filings.json', {})

  return [
    {
      provider: 'Google News RSS',
      status: rawEvents.status ?? 'missing',
      retrievedAt: rawEvents.retrievedAt,
      records: rawEvents.articleCount ?? 0,
      failures: rawEvents.failures ?? []
    },
    {
      provider: rawMarket.provider ?? 'Market Prices',
      status: rawMarket.status ?? 'missing',
      retrievedAt: rawMarket.retrievedAt,
      records: rawMarket.series?.reduce((sum, item) => sum + (item.rows?.length ?? 0), 0) ?? 0,
      failures: rawMarket.failures ?? []
    },
    {
      provider: 'Korea official market data',
      status: rawKoreaMarket.status ?? 'missing',
      retrievedAt: rawKoreaMarket.retrievedAt,
      records: rawKoreaMarket.series?.reduce((sum, item) => sum + (item.rows?.length ?? 0), 0) ?? 0,
      failures: rawKoreaMarket.failures ?? [],
      optional: true
    },
    {
      provider: 'FRED',
      status: rawMacro.status ?? 'missing',
      retrievedAt: rawMacro.retrievedAt,
      records: rawMacro.series?.reduce((sum, item) => sum + (item.observations?.length ?? 0), 0) ?? 0,
      failures: rawMacro.failures ?? []
    },
    {
      provider: 'Korea macro / BOK / flows',
      status: rawKoreaMacro.status ?? 'missing',
      retrievedAt: rawKoreaMacro.retrievedAt,
      records: rawKoreaMacro.series?.reduce((sum, item) => sum + (item.observations?.length ?? 0), 0) ?? 0,
      failures: rawKoreaMacro.failures ?? [],
      optional: true
    },
    {
      provider: 'SEC EDGAR',
      status: rawFilings.status === 'source' ? 'source' : rawFilings.status ?? 'missing',
      retrievedAt: rawFilings.retrievedAt,
      records: rawFilings.sec?.records?.filter(item => item.status === 'source').length ?? 0,
      failures: rawFilings.failures?.filter(item => !item.startsWith('OpenDART:')) ?? []
    },
    {
      provider: 'OpenDART',
      status: rawFilings.openDart?.status ?? 'missing',
      retrievedAt: rawFilings.retrievedAt,
      records: rawFilings.openDart?.records?.length ?? 0,
      failures: rawFilings.openDart?.error ? [rawFilings.openDart.error] : rawFilings.failures?.filter(item => item.startsWith('OpenDART:')) ?? []
    }
  ].map(withFreshness)
}

async function readGeneratedArray(path: string, failures: string[]) {
  let parsed: unknown
  try {
    const text = await readFile(path, 'utf8')
    parsed = JSON.parse(text)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    failures.push(`${path}: missing or invalid JSON (${message})`)
    return []
  }

  if (!Array.isArray(parsed)) {
    failures.push(`${path}: root is not an array`)
    return []
  }

  return parsed
}

function asObject(record: unknown) {
  return record && typeof record === 'object' ? record as Record<string, unknown> : null
}

function hasText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
}

function hasArray(value: unknown) {
  return Array.isArray(value) && value.length > 0
}

function populatedMarketFieldCount(record: Record<string, unknown>) {
  const fields = ['SPX', 'QQQ', 'KOSPI', 'USD_KRW', 'USD_JPY', 'DXY', 'US_2Y', 'US_10Y', 'KR10Y', 'oil', 'gold', 'SOX', 'VIX']
  return fields.filter(field => record[field] !== null && record[field] !== undefined && record[field] !== '').length
}

function auditResearchOsDataset(file: string, records: unknown[], failures: string[]) {
  const objects = records.map(asObject).filter(Boolean) as Record<string, unknown>[]

  if (file.endsWith('marketTape.json')) {
    const row = objects[0]
    if (!row) return
    const count = populatedMarketFieldCount(row)
    if (count < 8) failures.push(`${file}: marketTape requires at least 8 populated market fields; found ${count}`)
    if (!hasArray(row.top_movers)) failures.push(`${file}: marketTape top_movers is empty`)
    if (!hasText(row.market_summary)) failures.push(`${file}: marketTape market_summary is empty`)
    if (!hasText(row.todays_question)) failures.push(`${file}: marketTape todays_question is empty`)
    if (!Array.isArray(row.sourceBacklog)) failures.push(`${file}: marketTape sourceBacklog must be present`)
  }

  if (file.endsWith('companyCoverage.json')) {
    if (objects.length < 8) failures.push(`${file}: companyCoverage requires at least 8 companies; found ${objects.length}`)
    const hasKoreaDefense = objects.some(record => record.country === 'South Korea' && (String(record.sector).includes('Defense') || String(record.theme).includes('Defense') || String(record.theme).includes('Munitions')))
    const hasKoreaSemis = objects.some(record => record.country === 'South Korea' && String(record.sector).includes('Semiconductor'))
    const hasUsPeers = objects.some(record => record.country === 'United States')
    if (!hasKoreaDefense) failures.push(`${file}: companyCoverage missing Korea defense coverage`)
    if (!hasKoreaSemis) failures.push(`${file}: companyCoverage missing Korea semis coverage`)
    if (!hasUsPeers) failures.push(`${file}: companyCoverage missing U.S. peer coverage`)
    for (const [index, record] of objects.entries()) {
      for (const field of ['ticker', 'company', 'theme', 'current_thesis', 'research_state']) {
        if (!hasText(record[field])) failures.push(`${file}[${index}]: missing ${field}`)
      }
    }
  }

  if (file.endsWith('eventTape.json')) {
    if (objects.length < 10) failures.push(`${file}: eventTape requires at least 10 events; found ${objects.length}`)
    if (!objects.some(record => record.asset_reaction_1d !== null || record.asset_reaction_5d !== null || record.asset_reaction_20d !== null)) {
      failures.push(`${file}: eventTape requires at least one available return-window reaction`)
    }
    for (const [index, record] of objects.entries()) {
      for (const field of ['date', 'event_type', 'event_name', 'country', 'source', 'notes']) {
        if (!hasText(record[field])) failures.push(`${file}[${index}]: missing ${field}`)
      }
    }
  }

  if (file.endsWith('ideaLedger.json')) {
    if (objects.length < 5) failures.push(`${file}: ideaLedger requires at least 5 starter ideas; found ${objects.length}`)
    const statuses = new Set(objects.map(record => record.status))
    for (const status of ['accepted', 'rejected', 'watchlist', 'raw']) {
      if (!statuses.has(status)) failures.push(`${file}: ideaLedger missing ${status} status`)
    }
    for (const [index, record] of objects.entries()) {
      for (const field of ['idea_id', 'date', 'theme', 'asset', 'thesis', 'market_implies', 'i_believe', 'catalyst', 'expression', 'status', 'invalidation']) {
        if (!hasText(record[field])) failures.push(`${file}[${index}]: missing ${field}`)
      }
    }
  }

  if (file.endsWith('weeklyReview.json')) {
    if (objects.length < 1) failures.push(`${file}: weeklyReview requires at least 1 record; found ${objects.length}`)
    for (const [index, record] of objects.entries()) {
      for (const field of ['date', 'sourceStatus']) {
        if (!hasText(record[field])) failures.push(`${file}[${index}]: missing ${field}`)
      }
      if (!Array.isArray(record.rawIdeas)) failures.push(`${file}[${index}]: rawIdeas must be present`)
      if (!hasArray(record.checklist)) failures.push(`${file}[${index}]: checklist is empty`)
    }
  }

  if (file.endsWith('researchArtifacts.json')) {
    if (objects.length < 5) failures.push(`${file}: researchArtifacts requires at least 5 artifacts; found ${objects.length}`)
    for (const [index, record] of objects.entries()) {
      for (const field of ['artifact_id', 'type', 'title', 'date', 'conclusion', 'confidence', 'what_i_learned', 'public_url']) {
        if (!hasText(record[field])) failures.push(`${file}[${index}]: missing ${field}`)
      }
      if (!hasArray(record.data_sources)) failures.push(`${file}[${index}]: data_sources is empty`)
    }
  }

  if (file.endsWith('masteryPipeline.json')) {
    const requiredStages = ['market-basics', 'accounting-valuation', 'data-engineering', 'statistics', 'trading-research', 'risk-management', 'macro-framework', 'options-derivatives', 'software-craft', 'research-factory', 'specialization', 'public-proof']
    const ids = new Set(objects.map(record => record.id))
    for (const id of requiredStages) {
      if (!ids.has(id)) failures.push(`${file}: masteryPipeline missing stage ${id}`)
    }
    for (const [index, record] of objects.entries()) {
      for (const field of ['id', 'title', 'track', 'goal', 'artifact', 'status']) {
        if (!hasText(record[field])) failures.push(`${file}[${index}]: missing ${field}`)
      }
      if (!hasArray(record.learn)) failures.push(`${file}[${index}]: learn is empty`)
      if (!hasArray(record.do)) failures.push(`${file}[${index}]: do is empty`)
      if (!hasArray(record.proofLinks)) failures.push(`${file}[${index}]: proofLinks is empty`)
    }
  }

  if (file.endsWith('energyResearch.json')) {
    if (objects.length < 1) failures.push(`${file}: energyResearch requires at least 1 record; found ${objects.length}`)
    for (const [index, record] of objects.entries()) {
      for (const field of ['id', 'title', 'unit']) {
        if (!hasText(record[field])) failures.push(`${file}[${index}]: missing ${field}`)
      }
      if (!hasArray(record.seasonalBars)) failures.push(`${file}[${index}]: seasonalBars is empty`)
      if (!Array.isArray(record.paidFlowSeries)) failures.push(`${file}[${index}]: paidFlowSeries must be present`)
      if (!Array.isArray(record.sourceBacklog)) failures.push(`${file}[${index}]: sourceBacklog must be present`)
      if (record.latestObservation === null || record.latestObservation === undefined) failures.push(`${file}[${index}]: latestObservation is missing`)
    }
  }

  if (file.endsWith('koreaMacro.json')) {
    if (objects.length < 1) failures.push(`${file}: koreaMacro requires at least 1 summary record; found ${objects.length}`)
    for (const [index, record] of objects.entries()) {
      for (const field of ['date', 'stressDriver', 'summary']) {
        if (!hasText(record[field])) failures.push(`${file}[${index}]: missing ${field}`)
      }
      if (!Array.isArray(record.krwPressureIndicators)) failures.push(`${file}[${index}]: krwPressureIndicators must be present`)
      if (!Array.isArray(record.sourceBacklog)) failures.push(`${file}[${index}]: sourceBacklog must be present`)
    }
  }

  if (file.endsWith('semisCycle.json')) {
    if (objects.length < 2) failures.push(`${file}: semisCycle requires price-tape and fundamentals-cycle records; found ${objects.length}`)
    const layers = new Set(objects.map(record => record.layer))
    for (const layer of ['price_tape', 'fundamentals_cycle']) {
      if (!layers.has(layer)) failures.push(`${file}: semisCycle missing ${layer}`)
    }
    for (const [index, record] of objects.entries()) {
      for (const field of ['date', 'layer', 'title', 'status', 'signal']) {
        if (!hasText(record[field])) failures.push(`${file}[${index}]: missing ${field}`)
      }
      if (!hasArray(record.evidence)) failures.push(`${file}[${index}]: evidence is empty`)
      if (!Array.isArray(record.sourceBacklog)) failures.push(`${file}[${index}]: sourceBacklog must be present`)
    }
  }
}

async function findFiles(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return []
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(entries.map(async entry => {
    const path = `${dir}/${entry.name}`
    return entry.isDirectory() ? findFiles(path) : [path]
  }))
  return files.flat()
}

async function auditPrivateTradeLeakage(failures: string[]) {
  const publicFiles = await findFiles('public')
  const forbiddenPublicPatterns = [/privateTradeJournal/i, /private[-_ ]?trade/i, /flowNote/i, /tradeId/i, /entryPrice/i]
  for (const file of publicFiles) {
    const text = await readFile(file, 'utf8').catch(() => '')
    if (forbiddenPublicPatterns.some(pattern => pattern.test(file) || pattern.test(text))) {
      failures.push(`${file}: private trade journal data or route marker must not be published`)
    }
  }

  const publicRouteFiles = [
    'src/pages/sitemap.xml.tsx',
    'src/components/layout/Navbar.tsx',
    'src/components/layout/Sidebar.tsx',
    'src/pages/index.tsx',
    'src/pages/proof.tsx',
    'src/pages/dashboard.tsx',
    'src/generated/sourceAudit.json'
  ]
  for (const file of publicRouteFiles) {
    const text = await readFile(file, 'utf8').catch(() => '')
    if (text.includes('/private/trades') || text.includes('privateTradeJournal')) {
      failures.push(`${file}: private trade journal must stay out of public navigation, sitemap, proof, dashboard, and source-audit output`)
    }
  }
}

async function main() {
  const missingProvenance: string[] = []
  const readinessFailures: string[] = []
  const datasetCounts: Record<string, number> = {}
  let recordsChecked = 0

  for (const file of files) {
    const records = await readGeneratedArray(file, readinessFailures)
    datasetCounts[file.replace('src/generated/', '').replace('.json', '')] = Array.isArray(records) ? records.length : 0
    if (requiredNonEmpty.includes(file) && records.length === 0) {
      readinessFailures.push(`${file}: required dataset is empty`)
    }
    auditResearchOsDataset(file, records, readinessFailures)

    records.forEach((record, index) => {
      recordsChecked += 1
      if (!record || typeof record !== 'object') {
        missingProvenance.push(`${file}[${index}]: not an object`)
        return
      }
      const object = record as Record<string, unknown>
      for (const field of required) {
        if (object[field] === undefined || object[field] === null || object[field] === '') {
          missingProvenance.push(`${file}[${index}]: missing ${field}`)
        }
      }
    })
  }
  const providers = await providerStatuses()
  for (const provider of providers) {
    if (provider.status !== 'source' && !provider.optional) {
      readinessFailures.push(`${provider.provider}: provider status is ${provider.status}`)
    }
    if (provider.records === 0 && !provider.optional) {
      readinessFailures.push(`${provider.provider}: provider returned zero records`)
    }
  }
  await auditPrivateTradeLeakage(readinessFailures)
  const sourceProviders = providers.filter(provider => provider.status === 'source' && provider.retrievedAt)
  const lastSuccessfulRefreshAt = sourceProviders
    .map(provider => provider.retrievedAt as string)
    .sort()
    .at(-1) ?? null
  const freshnessWarnings = providers
    .filter(provider => provider.freshnessStatus === 'stale')
    .map(provider => `${provider.provider}: retrieved ${provider.ageHours} hours ago; stale threshold is ${provider.staleAfterHours} hours`)
  if (freshnessWarnings.length > 0 && !allowStaleCache()) {
    readinessFailures.push(...freshnessWarnings.map(warning => `stale provider cache: ${warning}`))
  }

  const audit = {
    generatedAt: nowIso(),
    lastSuccessfulRefreshAt,
    nextScheduledRefreshAt: nextScheduledRefresh(),
    freshnessWarnings,
    koreaUnlockChecklist: koreaUnlockChecklist(),
    status: missingProvenance.length === 0 && readinessFailures.length === 0 ? 'passed' : 'failed',
    recordsChecked,
    datasetCounts,
    providers,
    missingProvenance,
    readinessFailures,
    notes: missingProvenance.length === 0 && readinessFailures.length === 0
      ? ['All generated records include required provenance fields and core datasets are populated.']
      : ['Source audit failed. Fix provider ingestion, generated dataset readiness, or provenance before publishing.']
  }

  await writeJson('src/generated/sourceAudit.json', audit)

  if (audit.status === 'failed') {
    console.error(`Data audit failed with ${missingProvenance.length + readinessFailures.length} issues`)
    process.exit(1)
  }

  console.log(`Data audit passed for ${recordsChecked} records`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
