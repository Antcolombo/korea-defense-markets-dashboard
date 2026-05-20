import { assetWatchlist, companyWatchlist } from './lib/watchlist'
import { nowIso, readJson, writeJson } from './lib/io'

type RawGdeltArticle = {
  title?: string
  url?: string
  domain?: string
  seendate?: string
  sourcecountry?: string
  language?: string
}

type RawMarketSeries = {
  symbol: string
  provider?: string
  sourceUrl?: string
  status: string
  rows?: { date: string; close: number; volume: number | null }[]
}

type RawFredSeries = {
  id: string
  ticker: string
  name?: string
  status: string
  observations: { date: string; value: string }[]
}

type RawSecRecord = {
  ticker: string
  cik: string
  status: string
  data: { name?: string; filings?: { recent?: { filingDate?: string[]; form?: string[]; accessionNumber?: string[] } } } | null
}

type RawOpenDartRecord = {
  stock_code?: string
  corp_name?: string
  report_nm?: string
  rcept_dt?: string
  rcept_no?: string
}

const generatedAt = nowIso()

function provenance(provider: string, sourceUrl: string, sourceName: string, isDerived: boolean, dataQuality: string, methodologyNote: string, publishedAt: string | null = null) {
  return {
    provider,
    sourceUrl,
    sourceName,
    retrievedAt: generatedAt,
    publishedAt,
    isDerived,
    methodologyNote,
    dataQuality
  }
}

function classifyCategory(text: string) {
  const lower = text.toLowerCase()
  if (lower.includes('nuclear')) return 'NORTH_KOREA_NUCLEAR'
  if (lower.includes('missile')) return 'NORTH_KOREA_MISSILE'
  if (lower.includes('japan')) return 'US_ROK_JAPAN_TRILATERAL'
  if (lower.includes('ship') || lower.includes('navy') || lower.includes('maritime')) return 'SHIPPING_NAVAL_RISK'
  if (lower.includes('semiconductor') || lower.includes('chip')) return 'SEMICONDUCTOR_EXPORT_CONTROLS'
  if (lower.includes('export')) return 'KOREAN_DEFENSE_EXPORTS'
  if (lower.includes('exercise')) return 'US_ROK_EXERCISE'
  return 'DIPLOMATIC_DEVELOPMENT'
}

function contextFromText(text: string) {
  const lower = text.toLowerCase()
  const sourceContext = [
    lower.includes('korea') ? 'korea-linked' : 'regional',
    lower.includes('missile') || lower.includes('nuclear') ? 'security-event' : 'macro-context',
    lower.includes('defense') || lower.includes('ship') ? 'defense-readthrough' : 'watchlist-context'
  ]

  return {
    sourceContext,
    priceConfirmationRequired: true,
    eventUse: 'Context only; confirm with price, filings, fundamentals, or repeatable return studies.'
  }
}

function themesForCategory(category: string) {
  if (category === 'NORTH_KOREA_MISSILE' || category === 'NORTH_KOREA_NUCLEAR') return ['North Korea Escalation', 'Missile Defense', 'FX / Volatility Stress']
  if (category === 'US_ROK_JAPAN_TRILATERAL' || category === 'US_ROK_EXERCISE') return ['U.S.-ROK-Japan Alliance', 'Missile Defense']
  if (category === 'SHIPPING_NAVAL_RISK') return ['Naval / Shipbuilding', 'China/Taiwan Spillover']
  if (category === 'SEMICONDUCTOR_EXPORT_CONTROLS') return ['Semiconductor Export Controls', 'China/Taiwan Spillover']
  if (category === 'KOREAN_DEFENSE_EXPORTS') return ['Korean Defense Exports', 'Munitions / Defense Industrial Base']
  return ['FX / Volatility Stress']
}

function assetsForThemes(themes: string[]) {
  return assetWatchlist
    .filter(asset => asset.themes.some(theme => themes.includes(theme)))
    .map(asset => asset.ticker)
    .slice(0, 8)
}

function parseMarketReturns(series: RawMarketSeries) {
  const rows = (series.rows ?? [])
    .map(row => ({ date: row.date, price: Number(row.close) }))
    .filter(row => row.date && Number.isFinite(row.price))
    .sort((a, b) => a.date.localeCompare(b.date))

  function ret(days: number) {
    if (rows.length <= days) return null
    const start = rows[rows.length - 1 - days].price
    const end = rows[rows.length - 1].price
    return Number((((end - start) / start) * 100).toFixed(2))
  }

  const currentYear = rows[rows.length - 1]?.date.slice(0, 4)
  const ytdStart = rows.find(row => row.date.startsWith(currentYear))
  const latest = rows[rows.length - 1]

  return {
    hasData: rows.length > 0,
    return1d: ret(1),
    return5d: ret(5),
    return20d: ret(20),
    return60d: ret(60),
    returnYtd: ytdStart && latest ? Number((((latest.price - ytdStart.price) / ytdStart.price) * 100).toFixed(2)) : null,
    rows,
    priceRows: rows.map((row, index) => ({
      ...provenance(series.provider ?? 'Market data provider', series.sourceUrl ?? '/methodology', `${series.provider ?? 'Market data provider'} daily close`, false, 'source', `Daily close sourced from ${series.provider ?? 'configured market data provider'}.`),
      date: row.date,
      ticker: series.symbol,
      price: row.price,
      returnValue: index === 0 ? 0 : Number((((row.price - rows[index - 1].price) / rows[index - 1].price) * 100).toFixed(2))
    }))
  }
}

function parseFredPrices(series: RawFredSeries) {
  const rows = (series.observations ?? [])
    .map(row => ({ date: row.date, price: Number(row.value) }))
    .filter(row => Number.isFinite(row.price))
    .sort((a, b) => a.date.localeCompare(b.date))
  const currentYear = rows[rows.length - 1]?.date.slice(0, 4)
  const ytdStart = rows.find(row => row.date.startsWith(currentYear))
  const latest = rows[rows.length - 1]

  return {
    rows,
    return1d: levelMove(1),
    return5d: levelMove(5),
    return20d: levelMove(20),
    return60d: levelMove(60),
    returnYtd: ytdStart && latest ? Number((latest.price - ytdStart.price).toFixed(2)) : null,
    priceRows: rows.map((row, index) => ({
      ...provenance('FRED', 'https://fred.stlouisfed.org/docs/api/fred/', `${series.name ?? series.id} (${series.id})`, false, 'source', 'Macro observation sourced from FRED.'),
      date: row.date,
      ticker: series.ticker,
      price: row.price,
      returnValue: index === 0 ? 0 : Number((row.price - rows[index - 1].price).toFixed(2))
    }))
  }

  function levelMove(days: number) {
    if (rows.length <= days) return null
    return Number((rows[rows.length - 1].price - rows[rows.length - 1 - days].price).toFixed(2))
  }
}

function eventWindowReturn(rows: { date: string; price: number }[], eventDate: string, days: number) {
  const startIndex = rows.findIndex(row => row.date >= eventDate)
  const anchorIndex = startIndex >= 0 ? startIndex : rows.length - 1
  const forwardIndex = anchorIndex + days
  const backwardIndex = anchorIndex - days
  if (forwardIndex < rows.length) {
    const start = rows[anchorIndex].price
    const end = rows[forwardIndex].price
    return Number((((end - start) / start) * 100).toFixed(2))
  }
  if (backwardIndex >= 0) {
    const start = rows[backwardIndex].price
    const end = rows[anchorIndex].price
    return Number((((end - start) / start) * 100).toFixed(2))
  }
  return null
}

function assertRawSource(condition: boolean, label: string) {
  if (!condition) throw new Error(`Cannot build dataset: ${label}`)
}

async function main() {
  const rawEvents = await readJson<{ status?: string; batches: { articles: RawGdeltArticle[]; provider: string; sourceUrl: string; label: string }[] }>('src/generated/raw/events.news.json', { batches: [] })
  const rawMarket = await readJson<{ status?: string; provider?: string; sourceUrl?: string; series: RawMarketSeries[] }>('src/generated/raw/market.prices.json', { series: [] })
  const rawMacro = await readJson<{ status?: string; series: RawFredSeries[] }>('src/generated/raw/macro.fred.json', { series: [] })
  const rawFilings = await readJson<{ status?: string; sec?: { records?: RawSecRecord[] }; openDart?: { status?: string; records?: RawOpenDartRecord[] } }>('src/generated/raw/filings.json', {})

  assertRawSource(rawEvents.status === 'source', 'news raw event ingestion has not succeeded')
  assertRawSource(rawMarket.status === 'source', 'raw market price ingestion has not succeeded')
  assertRawSource(rawMacro.status === 'source', 'FRED raw macro ingestion has not succeeded')
  assertRawSource(rawFilings.status === 'source', 'filings ingestion has not succeeded')

  const articleMap = new Map<string, RawGdeltArticle>()
  for (const batch of rawEvents.batches ?? []) {
    for (const article of batch.articles ?? []) {
      if (article.url && article.title) articleMap.set(article.url, article)
    }
  }

  const events = Array.from(articleMap.values()).slice(0, 50).map((article, index) => {
    const title = article.title ?? 'Unavailable'
    const category = classifyCategory(title)
    const context = contextFromText(title)
    const affectedThemes = themesForCategory(category)
    return {
      ...provenance('Google News RSS', article.url ?? 'https://news.google.com/rss', article.domain ?? 'Google News source article', false, 'source', 'Event title/date/url sourced from news RSS; category and exposure mappings are deterministic context fields, not market-movement scores.', article.seendate ?? null),
      id: `gdelt-${index + 1}`,
      date: article.seendate ? article.seendate.slice(0, 8).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') : generatedAt.slice(0, 10),
      title,
      summary: 'Open the linked source article for full text. This dashboard stores only sourced metadata and deterministic derived classifications.',
      region: title.toLowerCase().includes('korea') ? 'Korean Peninsula' : 'Indo-Pacific',
      country: article.sourcecountry ?? 'Unavailable',
      category,
      ...context,
      affectedAssets: assetsForThemes(affectedThemes),
      affectedThemes,
      analystNote: 'Derived note: review the source article and methodology before using this record in research.',
      verified: true
    }
  })
  assertRawSource(events.length > 0, 'news ingestion produced zero normalized events')

  const marketByTicker = new Map(
    (rawMarket.series ?? [])
      .filter(series => series.status === 'source')
      .map(series => [series.symbol, parseMarketReturns(series)] as const)
      .filter(([, parsed]) => parsed.hasData)
  )
  const fredByTicker = new Map((rawMacro.series ?? []).filter(series => series.status === 'source').map(series => [series.ticker, parseFredPrices(series)] as const))
  const eventCounts = new Map<string, number>()
  for (const event of events) {
    for (const ticker of event.affectedAssets) eventCounts.set(ticker, (eventCounts.get(ticker) ?? 0) + 1)
  }

  const assets = assetWatchlist.map(asset => {
    const market = marketByTicker.get(asset.ticker)
    const macro = fredByTicker.get(asset.ticker)
    const sourceProvider = market ? rawMarket.provider ?? 'Market data provider' : macro ? 'FRED' : 'watchlist-config'
    const sourceUrl = market ? rawMarket.sourceUrl ?? '/methodology' : macro ? 'https://fred.stlouisfed.org/docs/api/fred/' : '/methodology'
    return {
      ...provenance(sourceProvider, sourceUrl, market ? `${sourceProvider} daily close` : macro ? 'FRED macro series' : 'Configured watchlist', Boolean(!market && !macro), market || macro ? 'source' : 'unavailable', market ? 'Returns derived from sourced daily closes.' : macro ? 'Moves are sourced FRED level changes over the selected window.' : 'Instrument configured as research evidence; market values unavailable until a provider is added.'),
      ...asset,
      description: `${asset.name} is tracked in the ${asset.sleeve} sleeve and mapped to ${asset.themes.join(', ')}.`,
      return1d: market?.return1d ?? macro?.return1d ?? null,
      return5d: market?.return5d ?? macro?.return5d ?? null,
      return20d: market?.return20d ?? macro?.return20d ?? null,
      returnYtd: market?.returnYtd ?? macro?.returnYtd ?? null,
      relatedEventCount: eventCounts.get(asset.ticker) ?? 0,
      riskSensitivity: eventCounts.has(asset.ticker) ? Math.min(5, Math.max(1, eventCounts.get(asset.ticker) ?? 1)) : null,
      notes: market ? 'U.S.-listed price expression' : macro ? 'FRED macro level series' : 'Evidence only; add local exchange price provider'
    }
  })

  const secByTicker = new Map(rawFilings.sec?.records?.map(record => [record.ticker, record]) ?? [])
  const openDartByStockCode = new Map<string, RawOpenDartRecord[]>()
  for (const record of rawFilings.openDart?.records ?? []) {
    if (!record.stock_code) continue
    const list = openDartByStockCode.get(record.stock_code) ?? []
    list.push(record)
    openDartByStockCode.set(record.stock_code, list)
  }
  const companies = companyWatchlist.map(company => {
    const filing = secByTicker.get(company.ticker)
    const dartRecords = openDartByStockCode.get(company.ticker.replace('.KS', '').padStart(6, '0')) ?? []
    const latestFilingDate = filing?.data?.filings?.recent?.filingDate?.[0] ?? null
    const latestForm = filing?.data?.filings?.recent?.form?.[0] ?? null
    const latestDart = dartRecords[0]
    const isKoreanCompany = company.country === 'South Korea'
    const hasSource = isKoreanCompany ? dartRecords.length > 0 : filing?.status === 'source'
    return {
      ...provenance(isKoreanCompany ? 'OpenDART' : 'SEC EDGAR', isKoreanCompany ? 'https://engopendart.fss.or.kr/intro/main.do' : 'https://data.sec.gov/', isKoreanCompany ? 'OpenDART disclosure list API' : 'SEC submissions API', false, hasSource ? 'source' : 'unavailable', isKoreanCompany ? `Latest sourced OpenDART disclosure: ${latestDart?.report_nm ?? 'N/A'} received ${latestDart?.rcept_dt ?? 'N/A'}.` : `Latest sourced SEC filing metadata: ${latestForm ?? 'N/A'} filed ${latestFilingDate ?? 'N/A'}.`, isKoreanCompany ? latestDart?.rcept_dt ?? null : latestFilingDate),
      ticker: company.ticker,
      name: filing?.data?.name ?? latestDart?.corp_name ?? company.name,
      country: company.country,
      sector: company.sector,
      exchange: company.exchange,
      description: hasSource ? `${company.name} is tracked for public ${company.sector} exposure tied to ${company.relatedThemes.join(', ')}.` : 'Provider disclosure coverage failed during ingestion.',
      defenseExposure: `Mapped to ${company.relatedThemes.join(', ')} through the public watchlist taxonomy.`,
      catalysts: isKoreanCompany ? dartRecords.slice(0, 3).map(record => `OpenDART disclosure: ${record.report_nm ?? record.rcept_no}`) : latestForm ? [`Latest sourced SEC filing form: ${latestForm}`] : [],
      risks: ['Provider coverage and public filing metadata do not substitute for full fundamental diligence.'],
      relatedThemes: company.relatedThemes,
      valuationSnapshot: 'Valuation work should be completed from sourced market and filing data before publication.',
      researchStatus: hasSource ? 'Sourced disclosure metadata' : 'Provider coverage failed'
    }
  })

  const themeNames = Array.from(new Set(assetWatchlist.flatMap(asset => asset.themes)))
  const themes = themeNames.map(name => ({
    ...provenance('methodology', '/methodology', 'Dashboard methodology', true, 'derived', 'Theme taxonomy is derived from the dashboard methodology and linked to sourced events/assets.'),
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    name,
    description: `Derived taxonomy bucket for sourced records mapped to ${name}.`,
    marketChannels: Array.from(new Set(assetWatchlist.filter(asset => (asset.themes as readonly string[]).includes(name)).map(asset => asset.group))),
    relatedAssets: assetWatchlist.filter(asset => (asset.themes as readonly string[]).includes(name)).map(asset => asset.ticker),
    relatedCompanies: companyWatchlist.filter(company => (company.relatedThemes as readonly string[]).includes(name)).map(company => company.ticker),
    currentRiskLevel: events.some(event => event.affectedThemes.includes(name)) ? 'Watch' : 'Low',
    investmentImplication: 'Derived research taxonomy only; not a recommendation.',
    keyCatalysts: [],
    keyRisks: []
  }))

  const prices = [
    ...Array.from(marketByTicker.values()).flatMap(value => value.priceRows),
    ...Array.from(fredByTicker.values()).flatMap(value => value.priceRows)
  ]
  assertRawSource(prices.length > 0, 'provider price and macro observations produced zero normalized price records')
  const usdkrw5d = assets.find(asset => asset.ticker === 'USDKRW')?.return5d ?? null
  const us10y5d = assets.find(asset => asset.ticker === 'US10Y')?.return5d ?? null
  const ewy5d = assets.find(asset => asset.ticker === 'EWY')?.return5d ?? null
  const spx5d = assets.find(asset => asset.ticker === 'SPX')?.return5d ?? null
  const vix5d = assets.find(asset => asset.ticker === 'VIX')?.return5d ?? null
  const sourcedCoverage = Math.round((assets.filter(asset => asset.dataQuality === 'source').length / Math.max(1, assets.length)) * 100)
  const riskIndex = events.length === 0 ? [] : [
    {
      ...provenance('derived', '/methodology', 'Market regime board', true, 'derived', 'Market-regime context derived from sourced price, rates, FX, volatility, and source-coverage inputs. Event text is not scored.'),
      date: generatedAt.slice(0, 10),
      totalScore: sourcedCoverage,
      northKoreaEscalation: usdkrw5d === null ? 0 : Math.max(0, Math.min(100, Math.round(50 + usdkrw5d * 10))),
      allianceActivity: us10y5d === null ? 0 : Math.max(0, Math.min(100, Math.round(50 + us10y5d * 100))),
      regionalSpillover: ewy5d === null || spx5d === null ? 0 : Math.max(0, Math.min(100, Math.round(50 + (spx5d - ewy5d) * 5))),
      sanctionsExportControls: Math.round(events.filter(event => event.affectedThemes.includes('Semiconductor Export Controls')).length / events.length * 100),
      defenseDemandSignal: Math.round(events.filter(event => event.affectedThemes.some(theme => theme.includes('Defense') || theme.includes('Munitions'))).length / events.length * 100),
      marketStressOverlay: vix5d === null ? 0 : Math.max(0, Math.min(100, Math.round(50 + vix5d * 5)))
    }
  ]

  const memos = events.length === 0 ? [] : [
    {
      ...provenance('derived', '/methodology', 'Dashboard methodology', true, 'derived', 'Memo assembled only from sourced event titles and sourced/derived dashboard records.'),
      id: `memo-${generatedAt.slice(0, 10)}`,
      date: generatedAt.slice(0, 10),
      title: 'Korea Macro Trade Note',
      researchPriority: 0,
      riskLevel: 'Watch',
      topEvents: events.slice(0, 3).map(event => event.title),
      marketReaction: 'Start with USD/KRW and EWY, then compare liquid U.S. expressions in semis and A&D against the event tape and macro overlays.',
      themeUpdate: `Most recent sourced theme mapping: ${events[0]?.affectedThemes.join(', ')}.`,
      watchlist: assets.filter(asset => ['USDKRW', 'EWY', 'SMH', 'SOXX', 'LMT', 'RTX', 'HII', 'VIX'].includes(asset.ticker)).map(asset => asset.ticker),
      investmentImplication: 'Decision support only: identify the setup, choose the cleanest liquid expression, define invalidation, and size risk outside this app.',
      whatToWatchNext: ['USD/KRW direction and volatility', 'EWY versus U.S. semis and A&D divergence', 'New event tape pressure and source-confirmed disclosure updates'],
      sources: events.slice(0, 5).map(event => event.sourceUrl)
    }
  ]

  const eventReturns = events.flatMap(event => event.affectedAssets.flatMap(ticker => {
    const market = marketByTicker.get(ticker)
    if (!market) return []
    const return1d = eventWindowReturn(market.rows, event.date, 1)
    const return5d = eventWindowReturn(market.rows, event.date, 5)
    const return20d = eventWindowReturn(market.rows, event.date, 20)
    const return60d = eventWindowReturn(market.rows, event.date, 60)
    if (return1d === null || return5d === null || return20d === null || return60d === null) return []
    return [{
      ...provenance('derived', '/methodology', 'Event-to-market return windows', true, 'derived', 'Returns are calculated from sourced daily close observations. Recent events use the available trailing window when a full forward window is not yet observable.'),
      eventId: event.id,
      ticker,
      eventCategory: event.category,
      return1d,
      return5d,
      return20d,
      return60d,
      interpretation: 'Sourced event metadata matched to sourced close-price windows; correlation only, not a causal claim.'
    }]
  }))
  assertRawSource(eventReturns.length > 0, 'event-to-market return generation produced zero rows')

  await writeJson('src/generated/events.json', events)
  await writeJson('src/generated/assets.json', assets)
  await writeJson('src/generated/companies.json', companies)
  await writeJson('src/generated/themes.json', themes)
  await writeJson('src/generated/prices.json', prices)
  await writeJson('src/generated/riskIndex.json', riskIndex)
  await writeJson('src/generated/eventReturns.json', eventReturns)
  await writeJson('src/generated/memos.json', memos)

  console.log(`Built generated dataset: ${events.length} events, ${assets.length} assets, ${companies.length} companies`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
