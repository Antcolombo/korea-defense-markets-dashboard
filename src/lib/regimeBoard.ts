import type { Asset } from '@/types/asset'
import type { MarketTapeRecord } from '@/types/researchOs'

type RegimeTone = 'default' | 'positive' | 'negative' | 'warning'

export type RegimeSignal = {
  label: string
  value: string
  detail: string
  tone: RegimeTone
}

function assetMove(assets: Asset[], ticker: string) {
  return assets.find(asset => asset.ticker === ticker)?.return5d ?? null
}

function average(values: (number | null)[]) {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value))
  if (valid.length === 0) return null
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

function formatMove(value: number | null, suffix = '%') {
  if (value === null) return 'Unavailable'
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}${suffix}`
}

export function buildRegimeSignals(assets: Asset[], marketTape: MarketTapeRecord | null): RegimeSignal[] {
  const usdkrw5d = assetMove(assets, 'USDKRW')
  const us10y5d = assetMove(assets, 'US10Y')
  const ewy5d = assetMove(assets, 'EWY')
  const spx5d = assetMove(assets, 'SPX')
  const vix5d = assetMove(assets, 'VIX')
  const semis5d = average(['SOXX', 'SMH', 'NVDA', 'TSM', 'MU'].map(ticker => assetMove(assets, ticker)))
  const defense5d = average(['HII', 'LMT', 'RTX', 'NOC', 'GD', 'ITA', 'XAR'].map(ticker => assetMove(assets, ticker)))
  const sourcedAssets = assets.filter(asset => asset.dataQuality === 'source').length
  const unavailableAssets = assets.filter(asset => asset.dataQuality === 'unavailable').length

  const fxPressure = usdkrw5d === null
    ? { value: 'Unavailable', tone: 'warning' as RegimeTone, detail: 'USD/KRW source missing.' }
    : usdkrw5d >= 1
      ? { value: 'Pressure rising', tone: 'negative' as RegimeTone, detail: `USD/KRW ${formatMove(usdkrw5d)} over 5D.` }
      : usdkrw5d <= -1
        ? { value: 'Pressure easing', tone: 'positive' as RegimeTone, detail: `USD/KRW ${formatMove(usdkrw5d)} over 5D.` }
        : { value: 'Contained', tone: 'default' as RegimeTone, detail: `USD/KRW ${formatMove(usdkrw5d)} over 5D.` }

  const ratesPressure = us10y5d === null
    ? { value: 'Unavailable', tone: 'warning' as RegimeTone, detail: 'U.S. 10Y source missing.' }
    : us10y5d >= 0.15
      ? { value: 'Tighter', tone: 'negative' as RegimeTone, detail: `U.S. 10Y ${formatMove(us10y5d, ' pts')} over 5D.` }
      : us10y5d <= -0.15
        ? { value: 'Easier', tone: 'positive' as RegimeTone, detail: `U.S. 10Y ${formatMove(us10y5d, ' pts')} over 5D.` }
        : { value: 'Stable', tone: 'default' as RegimeTone, detail: `U.S. 10Y ${formatMove(us10y5d, ' pts')} over 5D.` }

  const riskAppetite = average([ewy5d, spx5d])
  const equityTape = riskAppetite === null
    ? { value: 'Unavailable', tone: 'warning' as RegimeTone, detail: 'EWY/SPX tape missing.' }
    : riskAppetite > 1 && (vix5d ?? 0) <= 0
      ? { value: 'Risk-on', tone: 'positive' as RegimeTone, detail: `EWY/SPX basket ${formatMove(riskAppetite)}; VIX ${formatMove(vix5d)}.` }
      : riskAppetite < -1
        ? { value: 'Risk-off', tone: 'negative' as RegimeTone, detail: `EWY/SPX basket ${formatMove(riskAppetite)}; VIX ${formatMove(vix5d)}.` }
        : { value: 'Mixed', tone: 'warning' as RegimeTone, detail: `EWY/SPX basket ${formatMove(riskAppetite)}; VIX ${formatMove(vix5d)}.` }

  return [
    { label: 'FX pressure', ...fxPressure },
    { label: 'Rates pressure', ...ratesPressure },
    { label: 'Equity tape', ...equityTape },
    {
      label: 'Semis tape',
      value: semis5d === null ? 'Unavailable' : semis5d >= 0 ? 'Bid' : 'Offered',
      detail: `SOXX/SMH/NVDA/TSM/MU basket ${formatMove(semis5d)} over 5D.`,
      tone: semis5d === null ? 'warning' : semis5d >= 0 ? 'positive' : 'negative'
    },
    {
      label: 'Defense tape',
      value: defense5d === null ? 'Unavailable' : defense5d >= 0 ? 'Bid' : 'Offered',
      detail: `U.S. A&D expression basket ${formatMove(defense5d)} over 5D.`,
      tone: defense5d === null ? 'warning' : defense5d >= 0 ? 'positive' : 'negative'
    },
    {
      label: 'Data coverage',
      value: `${sourcedAssets}/${assets.length} sourced`,
      detail: `${unavailableAssets} unavailable assets; ${marketTape?.sourceBacklog.length ?? 0} explicit source backlog items.`,
      tone: unavailableAssets === 0 ? 'positive' : 'warning'
    }
  ]
}
