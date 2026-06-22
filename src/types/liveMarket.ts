export type LiveMarketSymbol = {
  label: string
  symbol: string
  description: string
  group: string
  displayGroup?: string
  inlineSupported?: boolean
  preferredWidget?: 'advanced' | 'mini' | 'symbol-overview'
  fallbackLabel?: string
}
