import type { Memo } from '@/types/memo'
import type { Event } from '@/types/event'
import type { Asset } from '@/types/asset'
import type { Theme } from '@/types/theme'
import type { RiskLevel } from '@/types/theme'

type BuildWeeklyMemoInput = {
  researchPriority: number
  riskLevel: RiskLevel
  topEvents: Event[]
  marketMovers: Asset[]
  activeThemes: Theme[]
}

export function buildWeeklyMemo({ researchPriority, riskLevel, topEvents, marketMovers, activeThemes }: BuildWeeklyMemoInput): Memo {
  const retrievedAt = new Date().toISOString()
  return {
    provider: 'derived',
    sourceUrl: '/methodology',
    sourceName: 'Dashboard methodology',
    retrievedAt,
    publishedAt: retrievedAt,
    isDerived: true,
    methodologyNote: 'Memo assembled from supplied sourced event, market, and theme records.',
    dataQuality: 'derived',
    id: `memo-${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    title: 'Korea Macro Trade Note',
    researchPriority,
    riskLevel,
    topEvents: topEvents.slice(0, 3).map(event => event.title),
    marketReaction: `${marketMovers[0]?.ticker ?? 'U.S.-listed expressions'} led the generated watchlist where sourced price data was available. Unavailable values are not estimated.`,
    themeUpdate: `${activeThemes[0]?.name ?? 'Alliance activity'} remains the most active public-source theme in the generated dataset.`,
    watchlist: marketMovers.slice(0, 8).map(asset => asset.ticker),
    investmentImplication: 'Use Korea as the signal domain, then decide whether USD/KRW, EWY, semis, A&D, or cash is the cleanest expression.',
    whatToWatchNext: [
      'USD/KRW direction and volatility',
      'EWY versus U.S. semis and A&D divergence',
      'Public disclosures or filings that confirm/refute the setup'
    ],
    sources: topEvents.slice(0, 5).map(event => event.sourceUrl)
  }
}
