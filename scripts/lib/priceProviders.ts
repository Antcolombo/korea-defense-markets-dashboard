import { assetWatchlist } from './watchlist'

export type PriceProviderInstrument = {
  ticker: string
  provider: 'Alpha Vantage' | 'Nasdaq Historical' | 'FRED' | 'OpenDART evidence only'
  providerSymbol?: string
  assetClass?: 'stocks' | 'etf'
  reason: string
}

export function getMarketDataProvider() {
  const provider = (process.env.MARKET_DATA_PROVIDER ?? 'nasdaq').trim().toLowerCase()
  if (provider === 'alpha' || provider === 'alpha_vantage') return 'alpha_vantage'
  if (provider === 'nasdaq' || provider === 'nasdaq_historical') return 'nasdaq'
  throw new Error(`Unsupported MARKET_DATA_PROVIDER=${provider}. Use nasdaq or alpha_vantage.`)
}

export function getMarketDataInstruments(): PriceProviderInstrument[] {
  const provider = getMarketDataProvider()
  return assetWatchlist
    .filter(asset => ['equity', 'etf'].includes(asset.assetClass) && !asset.ticker.endsWith('.KS'))
    .map(asset => ({
      ticker: asset.ticker,
      provider: provider === 'nasdaq' ? 'Nasdaq Historical' : 'Alpha Vantage',
      providerSymbol: asset.ticker,
      assetClass: asset.assetClass === 'etf' ? 'etf' : 'stocks',
      reason: `${asset.ticker} is a U.S.-listed expression with daily close coverage.`
    }))
}

export function getPriceCoverage(): PriceProviderInstrument[] {
  const marketProvider = getMarketDataProvider()
  const fredTickers = ['SPX', 'QQQ', 'DXY', 'US2Y', 'US10Y', 'USDKRW', 'USDJPY', 'VIX', 'OIL', 'BRENT', 'GASOLINE', 'KR10Y']
  return assetWatchlist.map(asset => {
    if (['fx', 'rate', 'commodity', 'index'].includes(asset.assetClass) && fredTickers.includes(asset.ticker)) {
      return {
        ticker: asset.ticker,
        provider: 'FRED',
        providerSymbol: asset.ticker,
        reason: `${asset.ticker} is sourced as a macro time series.`
      }
    }
    if (['equity', 'etf'].includes(asset.assetClass) && !asset.ticker.endsWith('.KS')) {
      return {
        ticker: asset.ticker,
        provider: marketProvider === 'nasdaq' ? 'Nasdaq Historical' : 'Alpha Vantage',
        providerSymbol: asset.ticker,
        reason: `${asset.ticker} is sourced as a U.S.-listed daily close.`
      }
    }
    return {
      ticker: asset.ticker,
      provider: 'OpenDART evidence only',
      reason: `${asset.ticker} is tracked as Korean local evidence; daily price ingestion should be upgraded before treating it as decision-grade.`
    }
  })
}
