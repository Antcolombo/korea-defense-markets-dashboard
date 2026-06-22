import './lib/io'
import { PrismaClient } from '@prisma/client'
import { seedBaskets } from '../src/lib/data/baskets/seedBaskets'
import { seedTickers } from '../src/lib/data/baskets/seedTickers'

const prisma = new PrismaClient()

async function main() {
  for (const ticker of seedTickers) {
    await prisma.ticker.upsert({
      where: { ticker: ticker.ticker },
      update: {
        name: ticker.name,
        sector: ticker.sector,
        industry: ticker.industry ?? null,
        country: ticker.country,
        assetType: ticker.assetType,
        isEtf: ticker.isEtf,
        description: ticker.description,
        source: 'taxonomy',
        provider: 'internal',
        dataStatus: 'AVAILABLE'
      },
      create: {
        ticker: ticker.ticker,
        name: ticker.name,
        sector: ticker.sector,
        industry: ticker.industry ?? null,
        country: ticker.country,
        assetType: ticker.assetType,
        isEtf: ticker.isEtf,
        description: ticker.description,
        source: 'taxonomy',
        provider: 'internal',
        dataStatus: 'AVAILABLE'
      }
    })
  }

  for (const basket of seedBaskets) {
    const saved = await prisma.themeBasket.upsert({
      where: { slug: basket.slug },
      update: {
        name: basket.name,
        description: basket.description,
        category: basket.category,
        source: 'taxonomy',
        provider: 'internal',
        dataStatus: 'AVAILABLE'
      },
      create: {
        slug: basket.slug,
        name: basket.name,
        description: basket.description,
        category: basket.category,
        source: 'taxonomy',
        provider: 'internal',
        dataStatus: 'AVAILABLE'
      }
    })

    for (const member of basket.members) {
      const ticker = await prisma.ticker.findUnique({ where: { ticker: member.ticker } })
      if (!ticker) continue
      await prisma.themeBasketMember.upsert({
        where: { basketId_tickerId: { basketId: saved.id, tickerId: ticker.id } },
        update: {
          weight: member.weight ?? null,
          rationale: member.rationale,
          source: 'taxonomy',
          provider: 'internal',
          dataStatus: 'AVAILABLE'
        },
        create: {
          basketId: saved.id,
          tickerId: ticker.id,
          weight: member.weight ?? null,
          rationale: member.rationale,
          source: 'taxonomy',
          provider: 'internal',
          dataStatus: 'AVAILABLE'
        }
      })
    }
  }

  console.log(`Seeded ${seedTickers.length} tickers and ${seedBaskets.length} baskets`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
