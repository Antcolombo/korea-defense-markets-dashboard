import { nowIso, readJson, writeJson } from './lib/io'
import type { Asset } from '../src/types/asset'
import type { SemisCycleRecord } from '../src/types/semisCycle'

const generatedAt = nowIso()

function provenance(dataQuality: 'derived' | 'proxy', sourceName: string, methodologyNote: string) {
  return {
    provider: 'derived',
    sourceUrl: '/methodology',
    sourceName,
    retrievedAt: generatedAt,
    publishedAt: generatedAt,
    isDerived: true,
    methodologyNote,
    dataQuality
  }
}

function move(assets: Asset[], ticker: string) {
  return assets.find(asset => asset.ticker === ticker)?.return5d ?? null
}

async function main() {
  const assets = await readJson<Asset[]>('src/generated/assets.json', [])
  const records: SemisCycleRecord[] = [
    {
      ...provenance('derived', 'Semis price tape', 'Semiconductor tape is derived from sourced daily closes for listed semis expressions and Korea local semis when official local data is configured.'),
      date: generatedAt.slice(0, 10),
      layer: 'price_tape',
      title: 'Semis Price Tape',
      status: 'sourced',
      signal: 'Compare SOXX/SMH/NVDA/TSM/MU against Samsung and SK Hynix when local KRX prices are sourced.',
      evidence: ['SOXX/SMH ETF moves', 'NVDA/TSM/MU U.S.-listed closes', 'Samsung/SK Hynix KRX closes when configured'],
      soxx5d: move(assets, 'SOXX'),
      smh5d: move(assets, 'SMH'),
      nvda5d: move(assets, 'NVDA'),
      tsm5d: move(assets, 'TSM'),
      mu5d: move(assets, 'MU'),
      samsung5d: move(assets, '005930.KS'),
      skHynix5d: move(assets, '000660.KS'),
      sourceBacklog: []
    },
    {
      ...provenance('proxy', 'Semis fundamentals cycle', 'True DRAM/NAND pricing remains proxy-labeled unless TrendForce, DRAMeXchange, or equivalent licensed data is configured.'),
      date: generatedAt.slice(0, 10),
      layer: 'fundamentals_cycle',
      title: 'Memory-Cycle Evidence',
      status: 'proxy',
      signal: 'Cycle evidence is not the same as price tape; require DRAM/NAND pricing or public export/unit-value proxies before upgrading conviction.',
      evidence: ['TrendForce / DRAMeXchange provider target', 'Korea semiconductor exports or unit-value proxy target', 'Company disclosure read-through'],
      soxx5d: move(assets, 'SOXX'),
      smh5d: move(assets, 'SMH'),
      nvda5d: move(assets, 'NVDA'),
      tsm5d: move(assets, 'TSM'),
      mu5d: move(assets, 'MU'),
      samsung5d: move(assets, '005930.KS'),
      skHynix5d: move(assets, '000660.KS'),
      sourceBacklog: [
        'DRAM/NAND pricing requires TrendForce, DRAMeXchange, or equivalent licensed/source-backed feed.',
        'Korea semis export/unit-value proxy should be added before treating the cycle layer as sourced fundamentals.'
      ]
    }
  ]

  await writeJson('src/generated/semisCycle.json', records)
  console.log(`Built semis cycle records: ${records.length}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
