import { assertNonEmpty, fetchText, nowIso, sleep, writeJson } from './lib/io'

const outputPath = 'src/generated/raw/events.news.json'

const queries = [
  {
    label: 'Korea defense',
    query: 'South Korea defense missile military navy shipbuilding'
  },
  {
    label: 'North Korea missile',
    query: '"North Korea" missile nuclear border'
  },
  {
    label: 'US ROK Japan',
    query: 'United States South Korea Japan defense'
  }
]

function decodeXml(value: string) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
}

function tagValue(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match ? decodeXml(match[1].replace(/^<!\[CDATA\[|\]\]>$/g, '').trim()) : ''
}

function compactDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return nowIso().slice(0, 10).replaceAll('-', '')
  return date.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
}

function parseNewsRss(xml: string) {
  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)).map(match => {
    const block = match[1]
    const title = tagValue(block, 'title')
    const url = tagValue(block, 'link')
    const sourceName = tagValue(block, 'source')
    return {
      title,
      url,
      domain: sourceName || 'Google News source',
      seendate: compactDate(tagValue(block, 'pubDate')),
      sourcecountry: 'US',
      language: 'en'
    }
  }).filter(article => article.title && article.url)
}

async function fetchNewsArticles(query: string, attempt = 1) {
  const url = new URL('https://news.google.com/rss/search')
  url.searchParams.set('q', `${query} when:30d`)
  url.searchParams.set('hl', 'en-US')
  url.searchParams.set('gl', 'US')
  url.searchParams.set('ceid', 'US:en')
  try {
    const xml = await fetchText(url.toString(), {
      'User-Agent': 'KoreaDefenseMarketsDashboard public-source-research'
    })
    return parseNewsRss(xml).slice(0, 20)
  } catch (error) {
    if (attempt >= 3) throw error
    await sleep(3000 * attempt)
    return fetchNewsArticles(query, attempt + 1)
  }
}

async function main() {
  const retrievedAt = nowIso()
  const batches = []
  const failures: string[] = []

  for (const query of queries) {
    try {
      const articles = assertNonEmpty(await fetchNewsArticles(query.query), `Google News RSS query "${query.label}"`)
      batches.push({
        ...query,
        provider: 'Google News RSS',
        sourceUrl: 'https://news.google.com/rss',
        retrievedAt,
        status: 'source',
        articles
      })
      await sleep(1000)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(`${query.label}: ${message}`)
      batches.push({
        ...query,
        provider: 'Google News RSS',
        sourceUrl: 'https://news.google.com/rss',
        retrievedAt,
        status: 'unavailable',
        error: message,
        articles: []
      })
    }
  }

  const articleCount = batches.reduce((sum, batch) => sum + batch.articles.length, 0)
  await writeJson(outputPath, { retrievedAt, status: failures.length === 0 ? 'source' : 'failed', articleCount, failures, batches })
  if (failures.length > 0 || articleCount === 0) {
    throw new Error(`News ingestion failed: ${failures.join('; ') || 'zero articles returned'}`)
  }
  console.log(`Wrote ${outputPath}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
