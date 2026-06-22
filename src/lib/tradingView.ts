const TRADING_VIEW_SYMBOLS: Record<string, string> = {
  SPX: 'SP:SPX',
  QQQ: 'NASDAQ:QQQ',
  DXY: 'TVC:DXY',
  US2Y: 'TVC:US02Y',
  US10Y: 'TVC:US10Y',
  USDKRW: 'FX_IDC:USDKRW',
  USDJPY: 'FX_IDC:USDJPY',
  KR10Y: 'TVC:KR10Y',
  VIX: 'CBOE:VIX',
  GOLD: 'TVC:GOLD',
  OIL: 'TVC:USOIL',
  BRENT: 'TVC:UKOIL',
  USO: 'AMEX:USO',
  BNO: 'AMEX:BNO',
  XLE: 'AMEX:XLE',
  XOP: 'AMEX:XOP',
  OIH: 'AMEX:OIH',
  EWY: 'AMEX:EWY',
  KOSPI: 'KRX:KOSPI',
  KOSDAQ: 'KRX:KOSDAQ',
  SMH: 'NASDAQ:SMH',
  SOXX: 'NASDAQ:SOXX',
  TSM: 'NYSE:TSM',
  MU: 'NASDAQ:MU',
  NVDA: 'NASDAQ:NVDA',
  AMD: 'NASDAQ:AMD',
  AVGO: 'NASDAQ:AVGO',
  LMT: 'NYSE:LMT',
  RTX: 'NYSE:RTX',
  NOC: 'NYSE:NOC',
  GD: 'NYSE:GD',
  HII: 'NYSE:HII',
  LHX: 'NYSE:LHX',
  BA: 'NYSE:BA',
  ITA: 'AMEX:ITA',
  XAR: 'AMEX:XAR',
  '012450.KS': 'KRX:012450',
  '079550.KS': 'KRX:079550',
  '047810.KS': 'KRX:047810',
  '064350.KS': 'KRX:064350',
  '329180.KS': 'KRX:329180',
  '042660.KS': 'KRX:042660',
  '005930.KS': 'KRX:005930',
  '000660.KS': 'KRX:000660'
}

export function getTradingViewSymbol(ticker: string) {
  return TRADING_VIEW_SYMBOLS[ticker]
}

const INLINE_ALLOWED_PREFIXES = [
  'AMEX:',
  'NASDAQ:',
  'NYSE:',
  'SP:',
  'TVC:',
  'FX_IDC:',
  'CBOE:'
]

const INLINE_BLOCKED_PREFIXES = [
  'KRX:',
  'NYMEX:'
]

export function isInlineTradingViewSupported(symbol: string | null | undefined) {
  if (!symbol) return false
  if (INLINE_BLOCKED_PREFIXES.some(prefix => symbol.startsWith(prefix))) return false
  return INLINE_ALLOWED_PREFIXES.some(prefix => symbol.startsWith(prefix))
}

export function getTradingViewUrl(symbol: string) {
  return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`
}
