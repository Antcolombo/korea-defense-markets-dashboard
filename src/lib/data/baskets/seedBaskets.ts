import type { BasketSeed } from '@/lib/research/types'

export const seedBaskets: BasketSeed[] = [
  {
    slug: 'defense-rearmament',
    name: 'Defense / Rearmament',
    category: 'Defense',
    description: 'U.S. defense primes, defense IT, and unmanned systems tied to rearmament and defense budget cycles.',
    members: ['LMT', 'RTX', 'NOC', 'GD', 'LHX', 'PLTR', 'LDOS', 'BAH', 'CACI', 'SAIC', 'AVAV', 'KTOS'].map(ticker => ({ ticker, rationale: 'Defense/rearmament exposure.' }))
  },
  {
    slug: 'korea-indo-pacific',
    name: 'Korea / Indo-Pacific',
    category: 'Case Study',
    description: 'Korea beta, U.S. defense suppliers, semiconductors, and Indo-Pacific defense/technology exposures.',
    members: ['EWY', 'LMT', 'RTX', 'NOC', 'LHX', 'PLTR', 'TSM', 'MU', 'ASML', 'AVAV', 'KTOS'].map(ticker => ({ ticker, rationale: 'Korea / Indo-Pacific case-study exposure.' }))
  },
  {
    slug: 'ai-infrastructure',
    name: 'AI Infrastructure',
    category: 'Technology',
    description: 'AI compute, memory, semiconductor equipment, and infrastructure silicon.',
    members: ['NVDA', 'AMD', 'AVGO', 'MU', 'MRVL', 'TSM', 'ASML', 'ARM'].map(ticker => ({ ticker, rationale: 'AI infrastructure exposure.' }))
  },
  {
    slug: 'power-grid',
    name: 'Power / Grid',
    category: 'Infrastructure',
    description: 'Power generation, grid equipment, electrification, and data-center infrastructure.',
    members: ['GEV', 'ETN', 'PWR', 'VRT', 'CEG', 'VST', 'NRG', 'HUBB'].map(ticker => ({ ticker, rationale: 'Power/grid exposure.' }))
  },
  {
    slug: 'energy-commodities',
    name: 'Energy / Commodities',
    category: 'Commodities',
    description: 'Oil, gas, copper, uranium, and energy services exposures.',
    members: ['XOM', 'CVX', 'SLB', 'HAL', 'LNG', 'FCX', 'CCJ'].map(ticker => ({ ticker, rationale: 'Energy/commodity exposure.' }))
  },
  {
    slug: 'financials-capital-markets',
    name: 'Financials / Capital Markets',
    category: 'Financials',
    description: 'Banks, alternative asset managers, exchanges, and capital-market infrastructure.',
    members: ['JPM', 'GS', 'MS', 'BLK', 'BX', 'KKR', 'APO', 'CME', 'ICE', 'CBOE'].map(ticker => ({ ticker, rationale: 'Financials/capital-markets exposure.' }))
  }
]
