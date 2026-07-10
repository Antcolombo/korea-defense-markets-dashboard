export function sectorBenchmarkForTicker(ticker: string, sector?: string) {
  const symbol = ticker.toUpperCase()
  const label = `${sector ?? ''} ${symbol}`.toLowerCase()
  if (['NVDA', 'AMD', 'AVGO', 'TSM', 'ASML', 'MU', 'SMH', 'SOXX'].includes(symbol) || /semi|chip|hardware/.test(label)) return 'SMH'
  if (['RTX', 'LMT', 'NOC', 'GD', 'AVAV', 'KTOS', 'XAR', 'ITA'].includes(symbol) || /defense|aerospace|industrial/.test(label)) return 'XAR'
  if (/technology|software|cloud/.test(label)) return 'XLK'
  if (/energy|oil|gas/.test(label)) return 'XLE'
  if (/financial|bank|broker/.test(label)) return 'XLF'
  return 'SPY'
}
