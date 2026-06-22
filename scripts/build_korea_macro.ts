import { nowIso, readJson, writeJson } from './lib/io'
import type { Asset } from '../src/types/asset'
import type { KoreaMacroSummary, KoreaStressDriver } from '../src/types/koreaMacro'

const generatedAt = nowIso()

type RawMacroFlowSeries = {
  ticker: string
  name: string
  provider: string
  sourceUrl: string
  status: string
  unit: string
  observations: { date: string; value: number; unit?: string }[]
}

function provenance(dataQuality: 'source' | 'derived' | 'proxy' | 'unavailable', sourceName: string, methodologyNote: string) {
  return {
    provider: dataQuality === 'source' ? 'Korea macro providers' : 'derived',
    sourceUrl: dataQuality === 'source' ? 'https://ecos.bok.or.kr/api/' : '/methodology',
    sourceName,
    retrievedAt: generatedAt,
    publishedAt: generatedAt,
    isDerived: dataQuality !== 'source',
    methodologyNote,
    dataQuality
  }
}

function latest(series: RawMacroFlowSeries[], ticker: string) {
  const rows = series.find(item => item.ticker === ticker && item.status === 'source')?.observations ?? []
  return [...rows].sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.value ?? null
}

function assetMove(assets: Asset[], ticker: string) {
  return assets.find(asset => asset.ticker === ticker)?.return5d ?? null
}

function classify(args: { usdKrw5d: number | null; kr10y5d: number | null; foreignFlow: number | null; currentAccount: number | null; tradeBalance: number | null }): KoreaStressDriver {
  const fxStress = args.usdKrw5d !== null && args.usdKrw5d > 10
  const ratesStress = args.kr10y5d !== null && args.kr10y5d > 0.12
  const flowStress = args.foreignFlow !== null && args.foreignFlow < -750
  const externalStress = [args.currentAccount, args.tradeBalance].some(value => value !== null && value < 0)
  const count = [fxStress, ratesStress, flowStress, externalStress].filter(Boolean).length
  if (count >= 3) return 'Broad macro stress'
  if (flowStress) return 'Equity-flow driven'
  if (ratesStress) return 'Rates-driven'
  if (fxStress) return 'FX-only'
  return 'Quiet / mixed'
}

async function main() {
  const assets = await readJson<Asset[]>('src/generated/assets.json', [])
  const raw = await readJson<{ status?: string; series?: RawMacroFlowSeries[]; failures?: string[] }>('src/generated/raw/korea.macro-flows.json', {})
  const series = raw.series ?? []
  const usdKrw5d = assetMove(assets, 'USDKRW')
  const kr10y5d = assetMove(assets, 'KR10Y')
  const foreignEquityFlowKrwBn = latest(series, 'KR_FOREIGN_EQUITY_FLOW')
  const bokBaseRate = latest(series, 'BOK_BASE_RATE')
  const currentAccountUsdBn = latest(series, 'KR_CURRENT_ACCOUNT')
  const tradeBalanceUsdBn = latest(series, 'KR_TRADE_BALANCE')
  const stressDriver = classify({ usdKrw5d, kr10y5d, foreignFlow: foreignEquityFlowKrwBn, currentAccount: currentAccountUsdBn, tradeBalance: tradeBalanceUsdBn })
  const sourced = series.some(item => item.status === 'source' && item.observations.length > 0)

  const krwPressureIndicators = [
    usdKrw5d === null ? 'USD/KRW unavailable' : `USD/KRW 5D level move ${usdKrw5d}`,
    kr10y5d === null ? 'KR10Y unavailable' : `KR10Y 5D level move ${kr10y5d}`,
    foreignEquityFlowKrwBn === null ? 'Foreign equity flow unavailable' : `Foreign equity flow ${foreignEquityFlowKrwBn} KRW bn`,
    currentAccountUsdBn === null ? 'Current account unavailable' : `Current account ${currentAccountUsdBn} USD bn`,
    tradeBalanceUsdBn === null ? 'Trade balance unavailable' : `Trade balance ${tradeBalanceUsdBn} USD bn`
  ]

  const records: KoreaMacroSummary[] = [{
    ...provenance(sourced ? 'source' : 'proxy', 'Korea macro summary', 'Korea pressure classification is derived from sourced USD/KRW, Korea rates, and optional BOK/KRX macro-flow inputs. Missing specialty inputs are visible in sourceBacklog.'),
    date: generatedAt.slice(0, 10),
    stressDriver,
    summary: `Current Korea pressure classification: ${stressDriver}. This separates FX, equity-flow, rates, and external-balance evidence instead of treating USD/KRW as the whole macro story.`,
    usdKrw5d,
    kr10y5d,
    foreignEquityFlowKrwBn,
    bokBaseRate,
    currentAccountUsdBn,
    tradeBalanceUsdBn,
    krwPressureIndicators,
    sourceBacklog: raw.failures ?? []
  }]

  await writeJson('src/generated/koreaMacro.json', records)
  console.log(`Built Korea macro summary: ${stressDriver}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
