import './lib/io'
import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { PrismaClient } from '@prisma/client'
import { assertIsoDate, parseCsvWithHeaders } from './lib/csv'

const prisma = new PrismaClient()
const path = process.env.PM_FUNDAMENTALS_CSV ?? 'data/manual/fundamentals/fundamentals.csv'
const requiredHeaders = [
  'ticker',
  'periodEnd',
  'fiscalPeriod',
  'currency',
  'revenue',
  'grossProfit',
  'operatingIncome',
  'ebitda',
  'netIncome',
  'epsDiluted',
  'freeCashFlow',
  'cash',
  'debt',
  'sharesDiluted'
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
    const ticker = row.ticker.trim().toUpperCase()
    if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker)) throw new Error(`${label}: invalid ticker`)
    await prisma.$executeRawUnsafe(
      `INSERT INTO "FundamentalSnapshot" (
        "id", "ticker", "periodEnd", "fiscalPeriod", "currency", "revenue", "grossProfit", "operatingIncome",
        "ebitda", "netIncome", "epsDiluted", "freeCashFlow", "cash", "debt", "sharesDiluted",
        "payload", "asOfDate", "observedAt", "providerTimestamp", "source", "provider", "revisionFlag", "dataStatus"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16::jsonb, $17, $18, $19, $20, $21, 'ORIGINAL', 'AVAILABLE'
      )
      ON CONFLICT ("ticker", "periodEnd", "fiscalPeriod", "provider", "asOfDate")
      DO UPDATE SET
        "currency" = EXCLUDED."currency",
        "revenue" = EXCLUDED."revenue",
        "grossProfit" = EXCLUDED."grossProfit",
        "operatingIncome" = EXCLUDED."operatingIncome",
        "ebitda" = EXCLUDED."ebitda",
        "netIncome" = EXCLUDED."netIncome",
        "epsDiluted" = EXCLUDED."epsDiluted",
        "freeCashFlow" = EXCLUDED."freeCashFlow",
        "cash" = EXCLUDED."cash",
        "debt" = EXCLUDED."debt",
        "sharesDiluted" = EXCLUDED."sharesDiluted",
        "payload" = EXCLUDED."payload",
        "dataStatus" = EXCLUDED."dataStatus"`,
      newId(),
      ticker,
      new Date(`${row.periodEnd}T00:00:00.000Z`),
      row.fiscalPeriod.trim(),
      row.currency.trim() || 'USD',
      numberOrNull(row.revenue),
      numberOrNull(row.grossProfit),
      numberOrNull(row.operatingIncome),
      numberOrNull(row.ebitda),
      numberOrNull(row.netIncome),
      numberOrNull(row.epsDiluted),
      numberOrNull(row.freeCashFlow),
      numberOrNull(row.cash),
      numberOrNull(row.debt),
      numberOrNull(row.sharesDiluted),
      JSON.stringify(row),
      asOfDate,
      new Date(`${row.periodEnd}T00:00:00.000Z`),
      asOfDate,
      path,
      process.env.PM_FUNDAMENTALS_PROVIDER ?? 'manual fundamentals CSV'
    )
  }
  console.log(`Imported ${rows.length} fundamental rows from ${path}`)
}

function numberOrNull(value: string) {
  if (!value.trim()) return null
  const parsed = Number(value.replace(/,/g, ''))
  if (!Number.isFinite(parsed)) throw new Error(`numeric field invalid: ${value}`)
  return parsed
}

function newId() {
  return `fund_${randomBytes(12).toString('hex')}`
}

main().catch(error => {
  console.error(error)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
