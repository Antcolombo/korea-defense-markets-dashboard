import { pitchTemplate } from '@/features/pitches/domain/template'
import { buildTargetConfidence } from '@/features/pitches/domain/target-confidence'
import { priceFromReturn, recommendationFromMetrics, scenarioReturnMap } from '@/features/pitches/domain/market-rules'
import { buildPitchReadiness } from '@/features/pitches/domain/readiness'
import { normalizeEvidenceDrivers, normalizeSourceEvidence } from '@/features/pitches/domain/normalization'
import type { ReportMetric, ReportSection, StockReport } from '@/types/research'
import type {
  Catalyst,
  ModelLineItem,
  PitchEvidenceDriver,
  PitchNewsTapeItem,
  PitchSourceSnapshot,
  PitchSourceEvidence,
  PitchSourceQuality,
  PitchModel,
  PitchValuation,
  PositioningSnapshot,
  RedTeam,
  StockPitch,
  StockPitchStatus,
  TradeStructure,
  VariantView
} from '@/types/pitch'

export type CreateStockPitchInput = {
  ticker?: string
  companyName?: string
  analyst?: string
  pitch?: StockPitch
  now?: () => Date
}

export type UpdateStockPitchInput = {
  pitch: StockPitch
  status?: StockPitchStatus
  shareEnabled?: boolean
}

export function buildPitchFromTemplate(input: CreateStockPitchInput = {}): StockPitch {
  const ticker = normalizeTicker(input.ticker || input.pitch?.setup.ticker || pitchTemplate.setup.ticker)
  const date = (input.now?.() ?? new Date()).toISOString().slice(0, 10)
  const base = clonePitch(input.pitch ?? pitchTemplate)
  const isHood = ticker === 'HOOD'
  const companyName = input.companyName || input.pitch?.setup.companyName || (isHood ? pitchTemplate.setup.companyName : ticker)

  return {
    ...base,
    id: input.pitch?.id || `${ticker.toLowerCase()}-${date}-stock-pitch`,
    thesis: input.pitch?.thesis || base.thesis || (isHood
      ? pitchTemplate.thesis
      : `${ticker} pitch needs a sourced thesis before it can be promoted.`),
    evidenceDrivers: normalizeEvidenceDrivers(input.pitch?.evidenceDrivers || (isHood ? base.evidenceDrivers : genericEvidenceDrivers(ticker))),
    setup: {
      ...base.setup,
      ticker,
      companyName,
      date: input.pitch?.setup.date || date,
      analyst: input.analyst || input.pitch?.setup.analyst || base.setup.analyst,
      recommendation: input.pitch?.setup.recommendation || 'watchlist',
      oneLineThesis: input.pitch?.setup.oneLineThesis || (isHood
        ? base.setup.oneLineThesis
        : `${ticker} draft pitch. Define the variant view, catalyst path, valuation range, expression, and invalidation.`),
      sector: input.pitch?.setup.sector || (isHood ? base.setup.sector : 'TBD'),
      industry: input.pitch?.setup.industry || (isHood ? base.setup.industry : 'TBD'),
      primaryCatalyst: input.pitch?.setup.primaryCatalyst || (isHood ? base.setup.primaryCatalyst : 'Define primary catalyst'),
      timeHorizon: input.pitch?.setup.timeHorizon || '1-3 months'
    },
    variantView: input.pitch?.variantView || (isHood ? base.variantView : genericVariantView(ticker)),
    positioning: input.pitch?.positioning || (isHood ? base.positioning : genericPositioning()),
    catalysts: input.pitch?.catalysts || (isHood ? base.catalysts : genericCatalysts()),
    model: input.pitch?.model || (isHood ? base.model : genericModel()),
    valuation: input.pitch?.valuation || (isHood ? base.valuation : genericValuation()),
    tradeStructure: input.pitch?.tradeStructure || (isHood ? base.tradeStructure : genericTradeStructure()),
    redTeam: input.pitch?.redTeam || (isHood ? base.redTeam : genericRedTeam()),
    postMortem: input.pitch?.postMortem || base.postMortem,
    sourceEvidence: normalizeSourceEvidence(input.pitch?.sourceEvidence || []),
    readiness: buildPitchReadiness({
      ...base,
      thesis: input.pitch?.thesis || base.thesis || '',
      evidenceDrivers: normalizeEvidenceDrivers(input.pitch?.evidenceDrivers || (isHood ? base.evidenceDrivers : genericEvidenceDrivers(ticker))),
      setup: {
        ...base.setup,
        ticker,
        companyName,
        date: input.pitch?.setup.date || date,
        analyst: input.analyst || input.pitch?.setup.analyst || base.setup.analyst,
        recommendation: input.pitch?.setup.recommendation || 'watchlist',
        oneLineThesis: input.pitch?.setup.oneLineThesis || base.setup.oneLineThesis,
        currentPrice: input.pitch?.setup.currentPrice ?? base.setup.currentPrice,
        marketCap: input.pitch?.setup.marketCap ?? base.setup.marketCap,
        sector: input.pitch?.setup.sector || base.setup.sector,
        industry: input.pitch?.setup.industry || base.setup.industry,
        primaryCatalyst: input.pitch?.setup.primaryCatalyst || base.setup.primaryCatalyst,
        timeHorizon: input.pitch?.setup.timeHorizon || base.setup.timeHorizon,
        expectedReturn: input.pitch?.setup.expectedReturn ?? base.setup.expectedReturn,
        targetPrice: input.pitch?.setup.targetPrice ?? base.setup.targetPrice,
        downsidePrice: input.pitch?.setup.downsidePrice ?? base.setup.downsidePrice
      },
      variantView: input.pitch?.variantView || base.variantView,
      positioning: input.pitch?.positioning || base.positioning,
      catalysts: input.pitch?.catalysts || base.catalysts,
      model: input.pitch?.model || base.model,
      valuation: input.pitch?.valuation || base.valuation,
      tradeStructure: input.pitch?.tradeStructure || base.tradeStructure,
      redTeam: input.pitch?.redTeam || base.redTeam,
      postMortem: input.pitch?.postMortem || base.postMortem,
      sourceEvidence: normalizeSourceEvidence(input.pitch?.sourceEvidence || []),
      readiness: base.readiness
    })
  }
}

export function buildPitchFromReport(report: StockReport, input: CreateStockPitchInput = {}, sourceSnapshot?: PitchSourceSnapshot): StockPitch {
  const ticker = normalizeTicker(input.ticker || report.ticker)
  const currentPrice = sourceSnapshot?.price?.price ?? 0
  const return20d = reportMetricValue(report, '20D return')
  const return60d = reportMetricValue(report, '60D return')
  const rs20d = reportMetricValue(report, '20D RS vs SPY')
  const rs60d = reportMetricValue(report, '60D RS vs SPY')
  const crowding = reportMetricValue(report, 'Crowding score')
  const extensionRisk = reportMetricValue(report, 'Extension risk score')
  const catalystSupport = reportMetricValue(report, 'Catalyst support score')
  const putCallRatio = reportMetricValue(report, 'Put/call ratio')
  const shortSaleRatio = reportMetricValue(report, 'FINRA short-sale volume ratio')
  const setupLabel = setupFromReport(report)
  const recommendation = recommendationFromMetrics({ rs20d, return20d, catalystSupport, extensionRisk })
  const scenarioReturns = scenarioReturnMap({ rs20d, rs60d, return20d, return60d, crowding, extensionRisk, catalystSupport })
  const targetPrice = priceFromReturn(currentPrice, scenarioReturns.base)
  const downsidePrice = priceFromReturn(currentPrice, scenarioReturns.bear)
  const bullPrice = priceFromReturn(currentPrice, scenarioReturns.bull)
  const primaryCatalyst = sourceSnapshot?.newsTape[0]?.headline ?? report.catalysts.bullets[0] ?? 'No direct catalyst row passed relevance filter; use AI/news refresh before promotion.'
  const positioningNote = report.positioning.bullets.find(item => item.includes('Massive') || item.includes('FINRA')) ?? report.positioning.summary
  const catalystRows = catalystsFromReport(report, sourceSnapshot?.newsTape)
  const battlefield = sourceSnapshot?.optionsBattlefield
  const battlefieldRead = battlefield
    ? `${battlefield.sourceLabel}: call wall ${formatLevel(battlefield.callWall)}, put wall ${formatLevel(battlefield.putWall)}, pressure ${battlefield.pressureDirection}.`
    : 'Options battlefield unavailable.'
  const enrichedSourceSnapshot = sourceSnapshot ? {
    ...sourceSnapshot,
    targetConfidence: buildTargetConfidence({
      report,
      sourceSnapshot,
      currentPrice,
      targetPrice,
      expectedReturn: scenarioReturns.base
    })
  } : undefined

  return {
    ...buildPitchFromTemplate({ ...input, ticker, companyName: input.companyName || report.companyName }),
    id: `${ticker.toLowerCase()}-${report.asOfDate}-sourced-stock-pitch`,
    thesis: [
      `${ticker} is a ${setupLabel.toLowerCase()} setup, not a generic ticker memo.`,
      `Variant depends on whether RS/catalyst conflict resolves with sourced confirmation.`
    ].join(' '),
    evidenceDrivers: [
      {
        driver: 'Relative strength',
        claim: `20D RS is ${metricDisplay(report, '20D RS vs SPY')} and 60D RS is ${metricDisplay(report, '60D RS vs SPY')}.`,
        sourceStatus: metricSourceQuality(reportMetric(report, '20D RS vs SPY')),
        evidence: `Report as of ${report.asOfDate}: ${metricDisplay(report, '20D RS vs SPY')} / ${metricDisplay(report, '60D RS vs SPY')}.`,
        sourceUrl: null,
        whyItMatters: 'This decides whether sponsorship is broadening or fading.'
      },
      {
        driver: 'Volume and crowding',
        claim: `Volume confirmation is ${metricDisplay(report, 'Volume vs 20D average')} and crowding is ${metricDisplay(report, 'Crowding score')}.`,
        sourceStatus: metricSourceQuality(reportMetric(report, 'Volume vs 20D average')),
        evidence: `Crowding ${metricDisplay(report, 'Crowding score')}; extension ${metricDisplay(report, 'Extension risk score')}.`,
        sourceUrl: null,
        whyItMatters: 'This separates healthy sponsorship from crowded late risk.'
      },
      {
        driver: 'Catalyst support',
        claim: `Catalyst support score is ${metricDisplay(report, 'Catalyst support score')}.`,
        sourceStatus: sourceSnapshot?.newsTape.length ? 'sourced' : 'unavailable',
        evidence: primaryCatalyst,
        sourceUrl: sourceSnapshot?.newsTape[0]?.url ?? null,
        whyItMatters: 'A PM-ready idea needs a dated reason for the market to move.'
      }
    ],
    setup: {
      ticker,
      companyName: input.companyName || report.companyName,
      date: report.asOfDate,
      analyst: input.analyst || pitchTemplate.setup.analyst,
      recommendation,
      oneLineThesis: [
        `${ticker} is a ${setupLabel.toLowerCase()} setup, not a generic ticker memo.`,
        `20D RS is ${metricDisplay(report, '20D RS vs SPY')} while 60D RS is ${metricDisplay(report, '60D RS vs SPY')}; that contradiction is the pitch gate.`,
        `Options proxy shows ${metricDisplay(report, 'Options volume')} sampled volume, put/call ${metricDisplay(report, 'Put/call ratio')}, and FINRA short-sale ratio ${metricDisplay(report, 'FINRA short-sale volume ratio')}.`
      ].join(' '),
      currentPrice,
      marketCap: 0,
      sector: 'Sourced report',
      industry: setupLabel,
      primaryCatalyst,
      timeHorizon: '1-3 months',
      expectedReturn: scenarioReturns.base,
      targetPrice,
      downsidePrice
    },
    variantView: {
      marketBelieves: `Market debate is still dominated by the headline story in ${ticker}; the sourced tape says ${report.summary}`,
      myView: `The useful variant is the conflict between ${setupLabel}, ${metricDisplay(report, '20D RS vs SPY')} 20D RS, ${metricDisplay(report, '60D RS vs SPY')} 60D RS, and ${metricDisplay(report, 'Catalyst support score')} catalyst support. Promote only if the next source refresh resolves that conflict in the same direction.`,
      whyNow: `The pitch is timely because fresh positioning is now sourced: ${positioningNote}`,
      debate: report.evidence.find(section => section.title.includes('Bull/Base/Bear'))?.summary ?? report.variantView,
      mispricing: `Mispricing is not "AI-generated upside"; it is whether investors are over-weighting the old narrative and under-weighting the current source mix: RS ${metricDisplay(report, '20D RS vs SPY')}, crowding ${metricDisplay(report, 'Crowding score')}, extension ${metricDisplay(report, 'Extension risk score')}, and catalyst ${metricDisplay(report, 'Catalyst support score')}.`
    },
    positioning: {
      callPutRatio: putCallRatio && putCallRatio > 0 ? round(1 / putCallRatio, 2) : undefined,
      skew: putCallRatio === null ? 'Options skew unavailable on current plan' : putCallRatio > 1.2 ? 'Put demand heavier than calls' : putCallRatio < 0.8 ? 'Call demand heavier than puts' : 'Balanced listed put/call proxy',
      gammaExposureSummary: `${battlefieldRead} ${battlefield?.mode === 'true-gex' ? 'True GEX is sourced from snapshot data.' : 'This is not true GEX unless OI/IV/Greeks are present.'}`,
      openInterestSummary: battlefield?.mode === 'true-gex'
        ? `Open interest sourced in options battlefield. Primary OI/volume cluster confidence ${battlefield.confidence.toFixed(0)}/100.`
        : 'Open interest remains plan-locked on Massive Basic; battlefield uses proxy strike interest only.',
      shortInterestPercentFloat: undefined,
      relativeStrengthSummary: `1D/5D/20D/60D tape: ${metricDisplay(report, '1D return')}, ${metricDisplay(report, '5D return')}, ${metricDisplay(report, '20D return')}, ${metricDisplay(report, '60D return')}. RS vs SPY: ${metricDisplay(report, '20D RS vs SPY')} over 20D and ${metricDisplay(report, '60D RS vs SPY')} over 60D.`,
      positioningConclusion: `Positioning read: ${setupLabel}; FINRA short-sale ratio ${formatRatio(shortSaleRatio)}, options proxy ${metricDisplay(report, 'Options volume')} volume, put/call ${metricDisplay(report, 'Put/call ratio')}.`
    },
    catalysts: catalystRows,
    model: {
      revenueDrivers: [
        '20D RS repair or continued fade',
        '60D sponsorship persistence',
        'Volume confirmation vs 20D average',
        'Catalyst support score and source freshness',
        'Options proxy / FINRA short-sale pressure'
      ],
      keyKpis: [
        kpi('20D return', metricDisplay(report, '20D return'), 'turn positive with SPY-relative support', '+5% to +10%', '-10% or weaker'),
        kpi('20D RS vs SPY', metricDisplay(report, '20D RS vs SPY'), 'cross back above 0%', '+5% or better', 'stays below -5%'),
        kpi('Volume vs 20D avg', metricDisplay(report, 'Volume vs 20D average'), 'hold above 1.0x', '1.5x+', 'below 0.8x')
      ],
      marginAssumptions: [
        kpi('Crowding score', metricDisplay(report, 'Crowding score'), 'confirmed sponsorship', 'sponsorship broadens', 'sponsorship rolls over'),
        kpi('Extension risk', metricDisplay(report, 'Extension risk score'), 'risk stays contained', 'risk falls below 25', 'risk spikes above 70')
      ],
      epsFcfAssumptions: [
        kpi('Catalyst support', metricDisplay(report, 'Catalyst support score'), 'source support remains above 50', 'new catalyst confirms', 'fresh catalyst fails')
      ],
      mostImportantDriver: rs20d !== null && rs20d < 0 ? '20D relative-strength repair without losing 60D sponsorship' : 'Continuation of sourced sponsorship with fresh catalyst confirmation',
      modelConclusion: `This model is a source-driven decision map. It stands out by gating the pitch on measurable source fields, not generic narrative: RS ${metricDisplay(report, '20D RS vs SPY')}, volume ${metricDisplay(report, 'Volume vs 20D average')}, crowding ${metricDisplay(report, 'Crowding score')}, and short-sale ${formatRatio(shortSaleRatio)}.`
    },
    valuation: {
      primaryMethod: 'Source-conditioned scenario map, not fundamental DCF',
      peerSet: ['SPY', 'QQQ', 'SMH', `${ticker} peer basket`],
      scenarios: [
        { name: 'bear', priceTarget: downsidePrice, impliedReturn: scenarioReturns.bear, method: 'RS fade + catalyst miss', assumptions: ['20D RS stays negative', 'Volume confirmation fades', 'Short-sale pressure rises or catalyst support fails'] },
        { name: 'base', priceTarget: targetPrice, impliedReturn: scenarioReturns.base, method: 'Confirmed sponsorship but unresolved RS conflict', assumptions: ['60D sponsorship holds', '20D RS remains mixed', 'Options/FINRA proxies do not deteriorate'] },
        { name: 'bull', priceTarget: bullPrice, impliedReturn: scenarioReturns.bull, method: 'RS repair + catalyst confirmation', assumptions: ['20D RS flips positive', 'Volume remains above average', 'Catalyst support improves and deferred options gaps shrink'] }
      ],
      valuationConclusion: `Scenario range is anchored to current sourced tape. Base expected return is ${scenarioReturns.base.toFixed(1)}%; bull requires source confirmation, bear triggers if the RS/catalyst conflict worsens.`
    },
    tradeStructure: {
      preferredExpression: recommendation === 'long' ? 'common-stock' : 'no-trade',
      entryTrigger: recommendation === 'long'
        ? `Enter only while RS remains constructive and volume stays above 1.0x; current volume proxy is ${metricDisplay(report, 'Volume vs 20D average')}.`
        : `No entry until 20D RS repairs from ${metricDisplay(report, '20D RS vs SPY')} or a fresh catalyst raises conviction.`,
      invalidation: report.invalidation.join(' '),
      stopLevel: priceFromReturn(currentPrice, scenarioReturns.bear),
      takeProfitLevel: priceFromReturn(currentPrice, scenarioReturns.bull),
      sizing: recommendation === 'long' ? 'small' : 'small',
      timeHorizon: '1-3 months',
      riskReward: `Bear/base/bull: ${scenarioReturns.bear.toFixed(1)}% / ${scenarioReturns.base.toFixed(1)}% / ${scenarioReturns.bull.toFixed(1)}%.`,
      whyThisExpression: 'Use expression only after source gates confirm. Until then, the pitch object should preserve the decision map rather than force a trade.'
    },
    redTeam: {
      bearCase: report.risks.join(' ') || 'Main bear case is source deterioration after refresh.',
      strongestCounterargument: `The setup may only be consensus sponsorship; ${metricDisplay(report, '20D RS vs SPY')} 20D RS says recent buyers are not leading SPY.`,
      whatWouldMakeMeWrong: report.invalidation.join(' '),
      dataToMonitor: [
        '20D RS vs SPY',
        '60D RS vs SPY',
        'Volume vs 20D average',
        'Crowding score',
        'Catalyst support score',
        'Options proxy volume',
        'FINRA short-sale volume ratio',
        ...report.pmQuestions.slice(0, 3)
      ]
    },
    postMortem: buildPitchFromTemplate({ ticker }).postMortem,
    sourceEvidence: sourceEvidenceFromReport(report, enrichedSourceSnapshot),
    readiness: buildPitchReadiness({
      ...buildPitchFromTemplate({ ticker }),
      thesis: `${ticker} source-conditioned thesis.`,
      evidenceDrivers: [
        {
          driver: 'Relative strength',
          claim: `20D RS is ${metricDisplay(report, '20D RS vs SPY')} and 60D RS is ${metricDisplay(report, '60D RS vs SPY')}.`,
          sourceStatus: metricSourceQuality(reportMetric(report, '20D RS vs SPY')),
          evidence: `Report as of ${report.asOfDate}.`,
          sourceUrl: null,
          whyItMatters: 'This decides whether sponsorship is broadening or fading.'
        },
        {
          driver: 'Volume and crowding',
          claim: `Volume confirmation is ${metricDisplay(report, 'Volume vs 20D average')}.`,
          sourceStatus: metricSourceQuality(reportMetric(report, 'Volume vs 20D average')),
          evidence: `Crowding ${metricDisplay(report, 'Crowding score')}.`,
          sourceUrl: null,
          whyItMatters: 'This separates healthy sponsorship from crowded late risk.'
        },
        {
          driver: 'Catalyst support',
          claim: `Catalyst support score is ${metricDisplay(report, 'Catalyst support score')}.`,
          sourceStatus: sourceSnapshot?.newsTape.length ? 'sourced' : 'unavailable',
          evidence: primaryCatalyst,
          sourceUrl: sourceSnapshot?.newsTape[0]?.url ?? null,
          whyItMatters: 'A PM-ready idea needs a dated reason for the market to move.'
        }
      ],
      setup: {
        ticker,
        companyName: input.companyName || report.companyName,
        date: report.asOfDate,
        analyst: input.analyst || pitchTemplate.setup.analyst,
        recommendation,
        oneLineThesis: `${ticker} source-conditioned thesis.`,
        currentPrice,
        marketCap: 0,
        sector: 'Sourced report',
        industry: setupLabel,
        primaryCatalyst,
        timeHorizon: '1-3 months',
        expectedReturn: scenarioReturns.base,
        targetPrice,
        downsidePrice
      },
      variantView: {
        marketBelieves: `Market debate is still dominated by the headline story in ${ticker}; the sourced tape says ${report.summary}`,
        myView: `The useful variant is the conflict between ${setupLabel}, ${metricDisplay(report, '20D RS vs SPY')} 20D RS, ${metricDisplay(report, '60D RS vs SPY')} 60D RS, and ${metricDisplay(report, 'Catalyst support score')} catalyst support.`,
        whyNow: `The pitch is timely because fresh positioning is now sourced: ${positioningNote}`,
        debate: report.evidence.find(section => section.title.includes('Bull/Base/Bear'))?.summary ?? report.variantView,
        mispricing: `Mispricing is whether investors are over-weighting old narrative and under-weighting current source mix.`
      },
      positioning: buildPitchFromTemplate({ ticker }).positioning,
      catalysts: catalystRows,
      model: buildPitchFromTemplate({ ticker }).model,
      valuation: {
        primaryMethod: 'Source-conditioned scenario map, not fundamental DCF',
        peerSet: ['SPY', 'QQQ', 'SMH', `${ticker} peer basket`],
        scenarios: [
          { name: 'bear', priceTarget: downsidePrice, impliedReturn: scenarioReturns.bear, method: 'RS fade + catalyst miss', assumptions: ['20D RS stays negative'] },
          { name: 'base', priceTarget: targetPrice, impliedReturn: scenarioReturns.base, method: 'Confirmed sponsorship but unresolved RS conflict', assumptions: ['60D sponsorship holds'] },
          { name: 'bull', priceTarget: bullPrice, impliedReturn: scenarioReturns.bull, method: 'RS repair + catalyst confirmation', assumptions: ['20D RS flips positive'] }
        ],
        valuationConclusion: `Scenario range is anchored to current sourced tape.`
      },
      tradeStructure: buildPitchFromTemplate({ ticker }).tradeStructure,
      redTeam: buildPitchFromTemplate({ ticker }).redTeam,
      postMortem: buildPitchFromTemplate({ ticker }).postMortem,
      sourceEvidence: sourceEvidenceFromReport(report, enrichedSourceSnapshot),
      readiness: pitchTemplate.readiness
    }),
    sourceSnapshot: enrichedSourceSnapshot,
    newsTape: enrichedSourceSnapshot?.newsTape,
    priceProvenance: enrichedSourceSnapshot?.price ?? undefined
  }
}

function genericEvidenceDrivers(ticker: string): PitchEvidenceDriver[] {
  return [
    {
      driver: 'Variant thesis',
      claim: `${ticker} needs a non-consensus claim before promotion.`,
      sourceStatus: 'unavailable',
      evidence: '',
      sourceUrl: null,
      whyItMatters: ''
    },
    {
      driver: 'Price/flow confirmation',
      claim: `${ticker} needs sourced price, RS, volume, or positioning evidence.`,
      sourceStatus: 'unavailable',
      evidence: '',
      sourceUrl: null,
      whyItMatters: ''
    },
    {
      driver: 'Catalyst',
      claim: `${ticker} needs a dated catalyst path.`,
      sourceStatus: 'unavailable',
      evidence: '',
      sourceUrl: null,
      whyItMatters: ''
    }
  ]
}

function genericVariantView(ticker: string): VariantView {
  return {
    marketBelieves: `${ticker} consensus view not written yet.`,
    myView: `${ticker} variant view not written yet.`,
    whyNow: 'Define why this pitch matters now.',
    debate: 'Define the bull/base/bear debate.',
    mispricing: 'Define what the market is missing.'
  }
}

function sourceEvidenceFromReport(report: StockReport, sourceSnapshot?: PitchSourceSnapshot): PitchSourceEvidence[] {
  const reportSources = allReportSections(report)
    .flatMap(section => section.sources.map(source => ({
      ...source,
      label: `${section.title}: ${source.label}`,
      detail: source.detail ?? section.summary,
      sourceStatus: source.dataStatus === 'AVAILABLE' ? 'sourced' as const : source.dataStatus === 'PARTIAL' ? 'proxy' as const : 'unavailable' as const
    })))
    .slice(0, 8)
  const snapshotSources: PitchSourceEvidence[] = []
  if (sourceSnapshot?.price) {
    snapshotSources.push({
      ...sourceSnapshot.price,
      label: `Price: ${sourceSnapshot.price.label}`,
      detail: `${sourceSnapshot.price.ticker} close ${sourceSnapshot.price.price} on ${sourceSnapshot.price.date}`,
      url: null,
      sourceStatus: sourceSnapshot.price.fallback ? 'proxy' : 'sourced'
    })
  }
  snapshotSources.push(...(sourceSnapshot?.newsTape ?? []).map(item => ({
      ...item,
      label: `Catalyst: ${item.headline}`,
      detail: item.whyMatters,
      url: item.url,
      sourceStatus: item.dataStatus === 'AVAILABLE' ? 'sourced' as const : 'proxy' as const
    })))
  return normalizeSourceEvidence([...snapshotSources, ...reportSources])
}

function metricSourceQuality(metric: ReportMetric | undefined): PitchSourceQuality {
  if (!metric || metric.value === null) return 'unavailable'
  if (metric.dataStatus === 'AVAILABLE') return 'sourced'
  if (metric.dataStatus === 'PARTIAL') return 'derived'
  if (metric.dataStatus === 'ENTITLEMENT_MISSING') return 'plan-locked'
  return 'unavailable'
}

function genericPositioning(): PositioningSnapshot {
  return {
    skew: 'Need live chain data',
    gammaExposureSummary: 'Map call/put OI and likely dealer pressure points.',
    openInterestSummary: 'Track where open interest clusters versus spot.',
    relativeStrengthSummary: 'Compare ticker against SPY, sector ETF, and closest peers.',
    positioningConclusion: 'Positioning conclusion pending sourced flow and relative-strength checks.'
  }
}

function genericCatalysts(): Catalyst[] {
  return [
    {
      id: 'earnings',
      type: 'earnings',
      date: 'TBD',
      title: 'Next earnings report',
      expectedImpact: 'Define KPIs that confirm or weaken the thesis.',
      importance: 'high'
    }
  ]
}

function genericModel(): PitchModel {
  return {
    revenueDrivers: ['Revenue growth', 'Margins', 'Cash conversion'],
    keyKpis: [{ label: 'Revenue growth', current: 'TBD', baseCase: 'TBD', bullCase: 'TBD', bearCase: 'TBD' }],
    marginAssumptions: [{ label: 'Operating margin', current: 'TBD', baseCase: 'TBD', bullCase: 'TBD', bearCase: 'TBD' }],
    epsFcfAssumptions: [{ label: 'Free cash flow', current: 'TBD', baseCase: 'TBD', bullCase: 'TBD', bearCase: 'TBD' }],
    mostImportantDriver: 'Define the driver that matters most.',
    modelConclusion: 'Model conclusion pending KPI assumptions.'
  }
}

function genericValuation(): PitchValuation {
  return {
    primaryMethod: 'Scenario analysis',
    peerSet: [],
    scenarios: [
      { name: 'bear', priceTarget: 0, impliedReturn: 0, method: 'Downside case', assumptions: ['Define bear case'] },
      { name: 'base', priceTarget: 0, impliedReturn: 0, method: 'Base case', assumptions: ['Define base case'] },
      { name: 'bull', priceTarget: 0, impliedReturn: 0, method: 'Upside case', assumptions: ['Define bull case'] }
    ],
    valuationConclusion: 'Valuation conclusion pending scenario targets.'
  }
}

function genericTradeStructure(): TradeStructure {
  return {
    preferredExpression: 'common-stock',
    entryTrigger: 'Define entry trigger.',
    invalidation: 'Define invalidation.',
    sizing: 'small',
    timeHorizon: '1-3 months',
    riskReward: 'Define risk/reward.',
    whyThisExpression: 'Define why this expression best fits the setup.'
  }
}

function genericRedTeam(): RedTeam {
  return {
    bearCase: 'Define the bear case.',
    strongestCounterargument: 'Define the strongest counterargument.',
    whatWouldMakeMeWrong: 'Define what would falsify the pitch.',
    dataToMonitor: ['Price action', 'Earnings KPIs', 'Peer relative strength']
  }
}

function allReportSections(report: StockReport): ReportSection[] {
  return [...report.evidence, report.positioning, report.catalysts]
}

function reportMetric(report: StockReport, label: string): ReportMetric | undefined {
  return allReportSections(report).flatMap(section => section.metrics).find(metric => metric.label === label)
}

function reportMetricValue(report: StockReport, label: string) {
  const value = reportMetric(report, label)?.value
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function metricDisplay(report: StockReport, label: string) {
  return reportMetric(report, label)?.displayValue ?? 'N/A'
}

function setupFromReport(report: StockReport) {
  const match = report.summary.match(/setup label is ([^.]+)\./i)
  return match?.[1]?.trim() || report.positioning.summary.split(':')[0] || 'Sourced Setup'
}

function catalystsFromReport(report: StockReport, newsTape: PitchNewsTapeItem[] = []): Catalyst[] {
  const sourceRows = newsTape.length
    ? newsTape.map(item => `${item.date}: ${item.headline}`)
    : report.catalysts.bullets
  const rows = sourceRows.slice(0, 5).map((bullet, index) => {
    const split = bullet.match(/^(\d{4}-\d{2}-\d{2}):\s*(.+)$/)
    const news = newsTape[index]
    return {
      id: `source-catalyst-${index + 1}`,
      type: 'other',
      date: split?.[1] ?? report.asOfDate,
      title: split?.[2] ?? bullet,
      expectedImpact: news
        ? `${news.whyMatters} Materiality ${news.materiality ?? 'N/A'}; price confirmation required.`
        : `Materiality ${metricDisplay(report, `Materiality: ${split?.[2] ?? bullet}`)}. Verify whether this changes RS, volume, or crowding on next refresh.`,
      importance: index === 0 ? 'high' : 'medium'
    } satisfies Catalyst
  })
  return rows.length ? rows : [{
    id: 'no-direct-catalyst',
    type: 'other',
    date: report.asOfDate,
    title: 'No direct catalyst passed relevance filter',
    expectedImpact: 'Broad theme headlines are context only until linked to the ticker by source or AI scan.',
    importance: 'medium'
  }]
}

function kpi(label: string, current: number | string, baseCase: number | string, bullCase: number | string, bearCase: number | string): ModelLineItem {
  return { label, current, baseCase, bullCase, bearCase }
}

function formatRatio(value: number | null) {
  return value === null ? 'N/A' : value.toFixed(2)
}

function formatLevel(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A'
  return value >= 100 ? `$${value.toFixed(0)}` : `$${value.toFixed(2)}`
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function clonePitch(pitch: StockPitch): StockPitch {
  return JSON.parse(JSON.stringify(pitch)) as StockPitch
}

function normalizeTicker(value: string | undefined) {
  return (value || 'UNKNOWN').trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '').slice(0, 10) || 'UNKNOWN'
}
