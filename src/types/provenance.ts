export type DataQuality = 'source' | 'derived' | 'cached' | 'proxy' | 'unavailable'

export type Provenance = {
  provider: string
  sourceUrl: string
  sourceName: string
  retrievedAt: string
  publishedAt: string | null
  isDerived: boolean
  methodologyNote: string
  dataQuality: DataQuality
}
