import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir } from 'node:fs/promises'
import { fetchJson, fetchText, loadLocalEnv, nowIso, writeJson } from './lib/io'

const outputPath = 'src/generated/raw/energy.eia.json'
const privateOutputPath = 'src/generated/raw/energy.private.json'
const privateEnergyDir = 'data/private/energy-flows'

const eiaSeries = [
  { id: 'PET.WGTSTUS1.W', ticker: 'US_GASOLINE_STOCKS', name: 'U.S. ending stocks of total motor gasoline', unit: 'thousand barrels' },
  { id: 'PET.WCESTUS1.W', ticker: 'US_CRUDE_STOCKS_EX_SPR', name: 'U.S. ending stocks of crude oil excluding SPR', unit: 'thousand barrels' },
  { id: 'PET.WDISTUS1.W', ticker: 'US_DISTILLATE_STOCKS', name: 'U.S. ending stocks of distillate fuel oil', unit: 'thousand barrels' }
]

type EnergyRawSeries = {
  id: string
  ticker: string
  name: string
  unit: string
  status: string
  observations: { period: string; value: number; units?: string | null }[]
  url?: string
  error?: string
}

type PrivateEnergyObservation = {
  ticker: string
  date: string
  value: number
  unit: string
  provider: string
  sourceName: string
  sourceUrl: string
}

const publicDnavSeries = [
  {
    id: 'WGTSTUS1',
    ticker: 'US_GASOLINE_STOCKS',
    name: 'Weekly U.S. Ending Stocks of Total Gasoline',
    unit: 'thousand barrels',
    url: 'https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?f=W&n=PET&s=WGTSTUS1'
  }
]

const paidProviderSeries = [
  { ticker: 'GASOLINE_ON_WATER', name: 'Gasoline on water', unit: 'thousand barrels', providerTarget: 'Kpler / Vortexa / tanker-tracking provider' },
  { ticker: 'APAC_EX_CHINA_CRUDE_INVENTORY', name: 'Asia ex-China crude inventory', unit: 'thousand barrels', providerTarget: 'Kpler / Vortexa / Energy Aspects / commodity data provider' },
  { ticker: 'IRAN_CRUDE_INVENTORY', name: 'Iran weekly crude inventory', unit: 'thousand barrels', providerTarget: 'Kpler / Vortexa / tanker-tracking provider' }
]

function normalizeEiaRows(data: unknown) {
  const object = data as { response?: { data?: Record<string, unknown>[] } }
  return (object.response?.data ?? [])
    .map(row => ({
      period: String(row.period ?? row.date ?? ''),
      value: Number(row.value),
      units: typeof row.units === 'string' ? row.units : null
    }))
    .filter(row => row.period && Number.isFinite(row.value))
}

async function fetchEiaSeries(seriesId: string, apiKey: string) {
  const url = new URL(`https://api.eia.gov/v2/seriesid/${seriesId}`)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('out', 'json')
  url.searchParams.set('data[0]', 'value')
  url.searchParams.set('sort[0][column]', 'period')
  url.searchParams.set('sort[0][direction]', 'desc')
  url.searchParams.set('length', '420')
  const data = await fetchJson(url.toString())
  return normalizeEiaRows(data)
}

function textFromCell(html: string) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseDnavDate(year: number, date: string) {
  const match = date.match(/^(\d{2})\/(\d{2})$/)
  if (!match) return null
  return `${year}-${match[1]}-${match[2]}`
}

async function fetchPublicDnavSeries(item: typeof publicDnavSeries[number]) {
  const html = await fetchText(item.url)
  const rows: { period: string; value: number; units: string }[] = []
  const rowMatches = html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)

  for (const rowMatch of rowMatches) {
    const cells = Array.from(rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)).map(match => textFromCell(match[1]))
    const yearMonth = cells[0]?.match(/^(\d{4})-[A-Za-z]{3}$/)
    if (!yearMonth) continue
    const year = Number(yearMonth[1])

    for (let index = 1; index < cells.length; index += 2) {
      const period = parseDnavDate(year, cells[index])
      const value = Number(cells[index + 1]?.replace(/,/g, ''))
      if (period && Number.isFinite(value)) rows.push({ period, value, units: item.unit })
    }
  }

  return rows.sort((a, b) => b.period.localeCompare(a.period))
}

function parseCsvLine(line: string) {
  const values: string[] = []
  let current = ''
  let quoted = false
  for (const char of line) {
    if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim())
  return values.map(value => value.replace(/^"|"$/g, ''))
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  const headers = parseCsvLine(lines[0] ?? '').map(header => header.trim())
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line)
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
  })
}

function normalizePrivateRows(rows: Record<string, unknown>[], sourceFile: string): PrivateEnergyObservation[] {
  return rows.flatMap(row => {
    const ticker = String(row.series || row.ticker || '').trim().toUpperCase()
    const date = String(row.date || row.period || '').trim()
    const value = Number(String(row.value || '').replace(/,/g, ''))
    if (!ticker || !date || !Number.isFinite(value)) return []
    return [{
      ticker,
      date,
      value,
      unit: String(row.unit || paidProviderSeries.find(series => series.ticker === ticker)?.unit || 'unknown'),
      provider: String(row.provider || 'Private energy export'),
      sourceName: String(row.sourceName || sourceFile),
      sourceUrl: String(row.sourceUrl || '/methodology')
    }]
  })
}

async function ingestPrivateEnergyExports(retrievedAt: string) {
  await mkdir(privateEnergyDir, { recursive: true })
  const failures: string[] = []
  const observations: PrivateEnergyObservation[] = []

  if (existsSync(privateEnergyDir)) {
    const files = (await readdir(privateEnergyDir)).filter(file => file.endsWith('.csv') || file.endsWith('.json'))
    for (const file of files) {
      try {
        const path = `${privateEnergyDir}/${file}`
        const text = await readFile(path, 'utf8')
        if (file.endsWith('.json')) {
          const parsed = JSON.parse(text)
          const rows = Array.isArray(parsed) ? parsed : parsed.observations ?? []
          observations.push(...normalizePrivateRows(rows, file))
        } else {
          observations.push(...normalizePrivateRows(parseCsv(text), file))
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        failures.push(`${file}: ${message}`)
      }
    }
  }

  const series = paidProviderSeries.map(item => ({
    ...item,
    status: observations.some(row => row.ticker === item.ticker) ? 'source' : 'not_configured',
    observations: observations
      .filter(row => row.ticker === item.ticker)
      .sort((a, b) => b.date.localeCompare(a.date))
  }))

  await writeJson(privateOutputPath, {
    provider: 'Private paid energy exports',
    sourceUrl: privateEnergyDir,
    retrievedAt,
    status: series.some(item => item.status === 'source') ? 'source' : 'not_configured',
    failures,
    expectedPath: privateEnergyDir,
    expectedSchema: 'series,date,value,unit,provider,sourceName,sourceUrl',
    series
  })
}

async function main() {
  loadLocalEnv()
  const retrievedAt = nowIso()
  const apiKey = process.env.EIA_API_KEY?.trim()
  await ingestPrivateEnergyExports(retrievedAt)

  if (!apiKey) {
    const publicSeries: EnergyRawSeries[] = []
    const failures: string[] = []
    for (const item of publicDnavSeries) {
      try {
        const observations = await fetchPublicDnavSeries(item)
        if (observations.length === 0) throw new Error('zero observations from public EIA DNav page')
        publicSeries.push({ ...item, status: 'source', observations })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        failures.push(`${item.id}: ${message}`)
        publicSeries.push({ ...item, status: 'unavailable', error: message, observations: [] })
      }
    }

    await writeJson(outputPath, {
      provider: 'EIA Open Data',
      sourceUrl: 'https://www.eia.gov/opendata/',
      retrievedAt,
      status: publicSeries.some(item => item.status === 'source') ? 'source' : 'not_configured',
      failures: [
        'EIA_API_KEY is not configured. Public EIA DNav fallback is used where available.',
        ...failures
      ],
      series: [
        ...publicSeries,
        ...eiaSeries
          .filter(series => !publicSeries.some(item => item.ticker === series.ticker))
          .map(series => ({ ...series, status: 'not_configured', observations: [] }))
      ]
    })
    console.log(`Wrote ${outputPath}`)
    return
  }

  const failures: string[] = []
  const series = []
  for (const item of eiaSeries) {
    try {
      const observations = await fetchEiaSeries(item.id, apiKey)
      if (observations.length === 0) throw new Error('zero observations')
      series.push({ ...item, status: 'source', observations })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(`${item.id}: ${message}`)
      series.push({ ...item, status: 'unavailable', error: message, observations: [] })
    }
  }

  await writeJson(outputPath, {
    provider: 'EIA Open Data',
    sourceUrl: 'https://www.eia.gov/opendata/',
    retrievedAt,
    status: series.some(item => item.status === 'source') ? 'source' : 'failed',
    failures,
    series
  })
  console.log(`Wrote ${outputPath}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
