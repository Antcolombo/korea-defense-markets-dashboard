import type { StockPitch } from '@/types/pitch'

export const pitchTemplate: StockPitch = {
  id: 'hood-positioning-driven-catalyst-memo',
  thesis:
    'HOOD is becoming a broader retail trading infrastructure platform, but promotion requires sourced evidence that product expansion is changing engagement and revenue quality.',

  evidenceDrivers: [
    {
      driver: 'Product engagement',
      claim: 'Product breadth can lift revenue per user if users adopt more than brokerage trading.',
      sourceStatus: 'proxy',
      evidence: 'Manual template; replace with sourced company KPI rows before promotion.',
      sourceUrl: null,
      whyItMatters: 'This is the core non-consensus platform thesis.'
    },
    {
      driver: 'Positioning and RS',
      claim: 'Pitch quality depends on whether price leadership confirms the narrative.',
      sourceStatus: 'proxy',
      evidence: 'Relative strength, options, and short-sale proxies must be refreshed from sourced rows.',
      sourceUrl: null,
      whyItMatters: 'Good narrative with weak tape stays watchlist.'
    },
    {
      driver: 'Catalyst path',
      claim: 'Earnings/product/regulatory events must create a dated reason to re-rate.',
      sourceStatus: 'proxy',
      evidence: 'Catalyst dates and source links pending.',
      sourceUrl: null,
      whyItMatters: 'No dated catalyst means no PM-ready pitch.'
    }
  ],

  setup: {
    ticker: 'HOOD',
    companyName: 'Robinhood Markets',
    date: '2026-06-23',
    analyst: 'Anthony Colombo',
    recommendation: 'watchlist',
    oneLineThesis:
      'HOOD is becoming a retail speculation platform across equities, options, crypto, retirement, and event contracts, with the next leg dependent on product expansion and sustained retail engagement.',
    currentPrice: 0,
    marketCap: 0,
    sector: 'Financials / FinTech',
    industry: 'Brokerage / Retail Trading',
    primaryCatalyst: 'Earnings, product expansion, prediction-market/event-contract adoption, retail trading activity',
    timeHorizon: '1-3 months',
    expectedReturn: 0,
    targetPrice: 0,
    downsidePrice: 0
  },

  variantView: {
    marketBelieves:
      'The market treats HOOD as a high-beta brokerage tied to crypto, options volume, and retail trading cycles.',
    myView:
      'HOOD should be evaluated as a retail trading infrastructure platform if product expansion continues to increase revenue per user and engagement.',
    whyNow:
      'Event contracts and broader retail speculation products are becoming a larger part of the platform debate.',
    debate:
      'The core debate is whether HOOD deserves a premium platform multiple or should trade closer to traditional brokerage comps.',
    mispricing:
      'The market may be underpricing the value of cross-product engagement if deposits, Gold subscribers, and trading surfaces keep expanding.'
  },

  positioning: {
    callVolume: 0,
    putVolume: 0,
    callPutRatio: 0,
    impliedVolatility: 0,
    ivRank: 0,
    skew: 'Need live chain data',
    keyCallWall: 0,
    keyPutWall: 0,
    gammaExposureSummary:
      'Map the largest call/put OI levels and identify where dealers may pin or accelerate price.',
    openInterestSummary:
      'Track whether weekly OI is building above spot, below spot, or clustering around round-number strikes.',
    shortInterestPercentFloat: 0,
    daysToCover: 0,
    borrowCost: 0,
    relativeStrengthSummary:
      'Compare ticker against QQQ, sector ETF, and closest peer basket.',
    positioningConclusion:
      'Positioning confirmation requires rising call demand, constructive relative strength, and support above key GEX/volume levels.'
  },

  catalysts: [
    {
      id: 'earnings',
      type: 'earnings',
      date: 'TBD',
      title: 'Next earnings report',
      expectedImpact:
        'Deposits, trading revenue, Gold subscribers, and product revenue will confirm or weaken the platform thesis.',
      importance: 'high'
    },
    {
      id: 'macro',
      type: 'macro',
      date: 'TBD',
      title: 'Macro / rates / equity volatility window',
      expectedImpact:
        'Risk appetite affects retail trading activity, options volume, crypto activity, and fintech multiples.',
      importance: 'medium'
    },
    {
      id: 'product',
      type: 'product',
      date: 'TBD',
      title: 'Product expansion / event contracts',
      expectedImpact:
        'New product adoption could support higher engagement and revenue per user.',
      importance: 'high'
    },
    {
      id: 'regulatory',
      type: 'regulatory',
      date: 'TBD',
      title: 'Regulatory review of event contracts / prediction-market products',
      expectedImpact:
        'Regulatory pressure could reduce the market willingness to assign a premium multiple.',
      importance: 'high'
    }
  ],

  model: {
    revenueDrivers: [
      'Trading revenue',
      'Net deposits',
      'Gold subscribers',
      'Assets under custody',
      'Options activity',
      'Crypto activity',
      'Event-contract adoption'
    ],
    keyKpis: [
      { label: 'Revenue growth', current: 'TBD', baseCase: 'TBD', bullCase: 'TBD', bearCase: 'TBD' },
      { label: 'Net deposits', current: 'TBD', baseCase: 'TBD', bullCase: 'TBD', bearCase: 'TBD' },
      { label: 'Gold subscribers', current: 'TBD', baseCase: 'TBD', bullCase: 'TBD', bearCase: 'TBD' }
    ],
    marginAssumptions: [
      { label: 'Adjusted EBITDA margin', current: 'TBD', baseCase: 'TBD', bullCase: 'TBD', bearCase: 'TBD' }
    ],
    epsFcfAssumptions: [
      { label: 'EPS', current: 'TBD', baseCase: 'TBD', bullCase: 'TBD', bearCase: 'TBD' },
      { label: 'Free cash flow', current: 'TBD', baseCase: 'TBD', bullCase: 'TBD', bearCase: 'TBD' }
    ],
    mostImportantDriver:
      'Sustained revenue per user growth from broader product adoption',
    modelConclusion:
      'The model should test whether product expansion can offset cyclicality in retail trading volumes.'
  },

  valuation: {
    primaryMethod: 'Peer multiple / platform fintech multiple / scenario analysis',
    peerSet: ['IBKR', 'SCHW', 'COIN', 'SOFI'],
    scenarios: [
      {
        name: 'bear',
        priceTarget: 0,
        impliedReturn: 0,
        method: 'Multiple compression',
        assumptions: [
          'Retail activity slows',
          'Product expansion fails to offset trading cyclicality',
          'Regulatory pressure increases'
        ]
      },
      {
        name: 'base',
        priceTarget: 0,
        impliedReturn: 0,
        method: 'Current multiple holds',
        assumptions: [
          'Deposits and subscribers continue growing',
          'Trading revenue normalizes but remains healthy',
          'Product adoption improves revenue mix'
        ]
      },
      {
        name: 'bull',
        priceTarget: 0,
        impliedReturn: 0,
        method: 'Premium platform multiple',
        assumptions: [
          'HOOD proves it can expand beyond brokerage revenue',
          'Event contracts gain traction',
          'Retail engagement stays strong'
        ]
      }
    ],
    valuationConclusion:
      'The valuation debate depends on whether the market assigns HOOD a brokerage multiple or a broader retail financial platform multiple.'
  },

  tradeStructure: {
    preferredExpression: 'call-spread',
    entryTrigger:
      'Enter after pullback to support with flow confirmation or after breakout with volume and OI expansion.',
    invalidation:
      'Exit if relative strength breaks, catalyst path weakens, or product-growth thesis deteriorates.',
    stopLevel: 0,
    takeProfitLevel: 0,
    sizing: 'small',
    timeHorizon: '1-3 months',
    riskReward: 'Defined-risk structure preferred until catalyst confirms',
    whyThisExpression:
      'A call spread expresses upside while controlling premium risk if IV is elevated.'
  },

  redTeam: {
    bearCase:
      'HOOD remains a cyclical retail brokerage and does not deserve a premium platform multiple.',
    strongestCounterargument:
      'Competition from larger brokers and regulatory scrutiny could compress economics before new products scale.',
    whatWouldMakeMeWrong:
      'Deposits slow, Gold subscriber growth stalls, trading revenue weakens, or product adoption fails to show up in KPIs.',
    dataToMonitor: [
      'Net deposits',
      'Gold subscribers',
      'Assets under custody',
      'Options volume',
      'Crypto activity',
      'Event-contract adoption',
      'Regulatory headlines',
      'Relative strength vs peers'
    ]
  },

  postMortem: {
    status: 'not-started',
    thesisWorked: false,
    whatWasRight: '',
    whatWasWrong: '',
    processLesson: ''
  },

  sourceEvidence: [],
  readiness: {
    canPromote: false,
    missing: ['sourced evidence drivers', 'current price', 'target/downside', 'dated catalyst'],
    sourceScore: 0
  }
}
