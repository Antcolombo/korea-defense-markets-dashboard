import './lib/io'
import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { PrismaClient } from '@prisma/client'
import { assertIsoDate, parseCsvWithHeaders } from './lib/csv'

const prisma = new PrismaClient()
const path = process.env.PM_ESTIMATES_CSV ?? 'data/manual/estimates/estimates.csv'
const requiredHeaders = [
  'ticker',
  'periodEnd',
  'fiscalPeriod',
  'estimateDate',
  'revenueEstimate',
  'epsEstimate',
  'ebitdaEstimate',
  'provider'
]

async function main() {
  const text = await readFile(path, 'utf8')
  const { headers, rows } = parseCsvWithHeaders(text)
  for (const header of requiredHeaders) {
    if (!headers.includes(header)) throw new Error(`${path}: missing required header ${header}`)
  }
  const asOfDate = new Date(process.env.PM_IMPORT_AS_OF_DATE ?? new Date().toISOString())
  for (const [index, row] of rows.entries()) {
    const label = `${path}:${index + 2}`
    assertIsoDate(row.periodEnd, `${label} periodEnd`)
    assertIsoDate(row.estimateDate, `${label} estimateDate`)
    const ticker = row.ticker.trim().toUpperCase()
    if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker)) throw new Error(`${label}: invalid ticker`)
    const provider = row.provider.trim() || process.env.PM_ESTIMATES_PROVIDER || 'manual estimates CSV'
    await prisma.$executeRawUnsafe(
      `INSERT INTO "EstimateSnapshot" (
        "id", "ticker", "periodEnd", "fiscalPeriod", "estimateDate", "revenueEstimate", "epsEstimate",
        "ebitdaEstimate", "payload", "asOfDate", "observedAt", "providerTimestamp", "source", "provider",
        "revisionFlag", "dataStatus"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14, 'ORIGINAL', 'AVAILABLE'
      )
      ON CONFLICT ("ticker", "periodEnd", "fiscalPeriod", "estimateDate", "provider", "asOfDate")
      DO UPDATE SET
        "revenueEstimate" = EXCLUDED."revenueEstimate",
        "epsEstimate" = EXCLUDED."epsEstimate",
        "ebitdaEstimate" = EXCLUDED."ebitdaEstimate",
        "payload" = EXCLUDED."payload",
        "dataStatus" = EXCLUDED."dataStatus"`,
      newId(),
      ticker,
      new Date(`${row.periodEnd}T00:00:00.000Z`),
      row.fiscalPeriod.trim(),
      new Date(`${row.estimateDate}T00:00:00.000Z`),
      numberOrNull(row.revenueEstimate),
      numberOrNull(row.epsEstimate),
      numberOrNull(row.ebitdaEstimate),
      JSON.stringify(row),
      asOfDate,
      new Date(`${row.estimateDate}T00:00:00.000Z`),
      asOfDate,
      path,
      provider
    )
  }
  console.log(`Imported ${rows.length} estimate rows from ${path}`)
}

function numberOrNull(value: string) {
  if (!value.trim()) return null
  const parsed = Number(value.replace(/,/g, ''))
  if (!Number.isFinite(parsed)) throw new Error(`numeric field invalid: ${value}`)
  return parsed
}

function newId() {
  return `est_${randomBytes(12).toString('hex')}`
}

main().catch(error => {
  console.error(error)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
