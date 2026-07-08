import './lib/io'
import { randomBytes } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { pitchTemplate } from '../src/lib/pitch-template'
import type { StockPitch } from '../src/types/pitch'

const prisma = new PrismaClient()

function shareToken() {
  return randomBytes(18).toString('base64url')
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function pitchSlug(pitch: StockPitch) {
  return slugify(pitch.id || `${pitch.setup.ticker}-${pitch.setup.date}-pitch`)
}

async function main() {
  const pitch = pitchTemplate
  const slug = pitchSlug(pitch)
  await prisma.stockPitch.upsert({
    where: { slug },
    update: {
      ticker: pitch.setup.ticker,
      companyName: pitch.setup.companyName,
      recommendation: pitch.setup.recommendation,
      payload: pitch,
      status: 'draft'
    },
    create: {
      slug,
      ticker: pitch.setup.ticker,
      companyName: pitch.setup.companyName,
      recommendation: pitch.setup.recommendation,
      status: 'draft',
      shareToken: shareToken(),
      shareEnabled: false,
      payload: pitch
    }
  })

  console.log(`Seeded stock pitch ${slug}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
