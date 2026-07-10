export type RiskLensRow = {
  ticker: string
  name: string
  asOfDate: string
  provider: string
  rv20: number | null
  rv60: number | null
  atr20: number | null
  range20Pct: number | null
  gapPct: number | null
  extensionRisk: number | null
  vixLevel: number | null
  vixBackdrop: string
  caveats: string[]
}
