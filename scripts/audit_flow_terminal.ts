import './lib/io'
import { DataStatus, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const staleHours = Number(process.env.FLOW_TERMINAL_STALE_HOURS ?? 36)

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('Flow terminal audit failed:\n- DATABASE_URL is not configured')
    process.exit(1)
  }
  const failures: string[] = []
  const required = await Promise.all([
    prisma.ticker.count(),
    prisma.themeBasket.count(),
    prisma.dailyPrice.count({ where: asOfWhere() }),
    prisma.signalSnapshot.count({ where: asOfWhere() }),
    prisma.providerRun.count()
  ])
  const labels = ['tickers', 'theme baskets', 'daily prices', 'signal snapshots', 'provider runs']
  required.forEach((count, index) => {
    if (count === 0) failures.push(`${labels[index]} missing`)
  })

  const badRows = await prisma.providerRun.findMany({
    where: { dataStatus: { in: ['PROVIDER_ERROR', 'ENTITLEMENT_MISSING', 'STALE'] } },
    orderBy: { startedAt: 'desc' },
    take: 10
  })
  for (const run of badRows) {
    failures.push(`${run.provider}: ${run.dataStatus}${run.errorMessage ? ` (${run.errorMessage})` : ''}`)
  }

  const latestRun = await prisma.providerRun.findFirst({ orderBy: { startedAt: 'desc' } })
  if (latestRun && !process.env.DEMO_AS_OF_DATE) {
    const age = (Date.now() - latestRun.startedAt.getTime()) / 36e5
    if (age > staleHours) failures.push(`latest provider run is stale: ${age.toFixed(1)}h old, threshold ${staleHours}h`)
  }

  if (failures.length > 0) {
    console.error(`Flow terminal audit failed:\n${failures.map(item => `- ${item}`).join('\n')}`)
    process.exit(1)
  }

  console.log('Flow terminal audit passed')
}

function asOfWhere() {
  if (!process.env.DEMO_AS_OF_DATE) return {}
  const date = new Date(`${process.env.DEMO_AS_OF_DATE}T00:00:00.000Z`)
  return { asOfDate: { lte: date }, dataStatus: { in: [DataStatus.AVAILABLE, DataStatus.PARTIAL] } }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
