import { randomBytes } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { pitchTemplate } from '@/lib/pitch-template'
import { getStockReport } from '@/lib/research/repository'
import { buildStockPitchSourceSnapshot } from '@/lib/research/stockPitchSources'
import { buildTargetConfidence } from '@/lib/research/targetConfidence'
import { getPrisma } from '@/lib/server/prisma'
import type { ReportMetric, ReportSection, StockReport } from '@/lib/research/types'
import type {
  AiScanView,
  Catalyst,
  ModelLineItem,
  PitchEvidenceDriver,
  PitchNewsTapeItem,
  PitchPriceProvenance,
  PitchReadiness,
  PitchSourceSnapshot,
  PitchSourceEvidence,
  PitchSourceQuality,
  PitchModel,
  PitchRecommendation,
  PitchValuation,
  PositioningSnapshot,
  PostMortem,
  RedTeam,
  StockPitch,
  StockPitchRecord,
  StockPitchStatus,
  StockPitchSummary,
  TradeStructure,
  VariantView
} from '@/types/pitch'

type PitchRow = {
  id: string
  slug: string
  ticker: string
  companyName: string
  recommendation: string
  status: string
  shareToken: string
  shareEnabled: boolean
  payload: unknown
  createdAt: Date | string
  updatedAt: Date | string
}

export type CreateStockPitchInput = {
  ticker?: string
  companyName?: string
  analyst?: string
  pitch?: StockPitch
}

export type UpdateStockPitchInput = {
  pitch: StockPitch
  status?: StockPitchStatus
  shareEnabled?: boolean
}

export function buildPitchFromTemplate(input: CreateStockPitchInput = {}): StockPitch {
  const ticker = normalizeTicker(input.ticker || input.pitch?.setup.ticker || pitchTemplate.setup.ticker)
  const date = new Date().toISOString().slice(0, 10)
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

export async function buildPitchFromSourcedContext(input: CreateStockPitchInput = {}): Promise<StockPitch> {
  if (input.pitch) return buildPitchFromTemplate(input)
  const ticker = normalizeTicker(input.ticker || pitchTemplate.setup.ticker)
  try {
    const report = await getStockReport(ticker)
    const sourceSnapshot = await buildStockPitchSourceSnapshot(ticker, report)
    return buildPitchFromReport(report, input, sourceSnapshot)
  } catch (error) {
    console.warn(`Sourced pitch context unavailable for ${ticker}; using template. ${describeError(error)}`)
    return buildPitchFromTemplate(input)
  }
}

function buildPitchFromReport(report: StockReport, input: CreateStockPitchInput = {}, sourceSnapshot?: PitchSourceSnapshot): StockPitch {
  const ticker = normalizeTicker(input.ticker || report.ticker)
  const currentPrice = sourceSnapshot?.price?.price ?? 0
  const return20d = reportMetricValue(report, '20D return')
  const return60d = reportMetricValue(report, '60D return')
  const rs20d = reportMetricValue(report, '20D RS vs SPY')
  const rs60d = reportMetricValue(report, '60D RS vs SPY')
  const volumeVsAverage = reportMetricValue(report, 'Volume vs 20D average')
  const crowding = reportMetricValue(report, 'Crowding score')
  const extensionRisk = reportMetricValue(report, 'Extension risk score')
  const catalystSupport = reportMetricValue(report, 'Catalyst support score')
  const optionsVolume = reportMetricValue(report, 'Options volume')
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

export async function listStockPitchSummaries(): Promise<StockPitchSummary[]> {
  const prisma = getPrisma()
  if (!prisma) return [fallbackPitchRecord()]
  try {
    const rows = await prisma.stockPitch.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      take: 100
    })
    return rows.length ? rows.map(row => pitchSummaryFromRow(row)) : [fallbackPitchRecord()]
  } catch (error) {
    console.warn(`Stock pitch database unavailable; using seeded pitch. ${describeError(error)}`)
    return [fallbackPitchRecord()]
  }
}

export async function getDefaultStockPitch(): Promise<StockPitchRecord> {
  const prisma = getPrisma()
  if (!prisma) return fallbackPitchRecord()
  try {
    const row = await prisma.stockPitch.findFirst({ orderBy: [{ updatedAt: 'desc' }] })
    return row ? pitchRecordFromRow(row) : fallbackPitchRecord()
  } catch (error) {
    console.warn(`Stock pitch database unavailable; using seeded pitch. ${describeError(error)}`)
    return fallbackPitchRecord()
  }
}

export async function getStockPitch(slug: string): Promise<StockPitchRecord | null> {
  const normalized = normalizeSlug(slug)
  if (!normalized) return null
  const prisma = getPrisma()
  if (!prisma) return normalized === fallbackPitchRecord().slug ? fallbackPitchRecord() : null
  try {
    const row = await prisma.stockPitch.findUnique({ where: { slug: normalized } })
    return row ? pitchRecordFromRow(row) : null
  } catch (error) {
    console.warn(`Stock pitch lookup unavailable; using seeded pitch if possible. ${describeError(error)}`)
    return normalized === fallbackPitchRecord().slug ? fallbackPitchRecord() : null
  }
}

export async function getSharedStockPitch(slug: string, token: string | undefined): Promise<StockPitchRecord | null> {
  const normalized = normalizeSlug(slug)
  if (!normalized || !token) return null
  const prisma = getPrisma()
  if (!prisma) return null
  try {
    const row = await prisma.stockPitch.findUnique({ where: { slug: normalized } })
    if (!row || !row.shareEnabled || row.shareToken !== token) return null
    return pitchRecordFromRow(row)
  } catch (error) {
    console.warn(`Shared stock pitch lookup unavailable. ${describeError(error)}`)
    return null
  }
}

export async function createStockPitch(input: CreateStockPitchInput = {}): Promise<StockPitchRecord> {
  const prisma = getPrisma()
  if (!prisma) throw new Error('DATABASE_URL is required to create stock pitches.')
  const pitch = coercePitch(await buildPitchFromSourcedContext(input))
  const slug = await uniquePitchSlug(slugify(pitch.id || `${pitch.setup.ticker}-${pitch.setup.date}-pitch`))
  const fields = pitchFields(pitch)
  const row = await prisma.stockPitch.create({
    data: {
      ...fields,
      slug,
      status: 'draft',
      shareToken: generateShareToken(),
      shareEnabled: false,
      payload: pitch as unknown as Prisma.InputJsonValue
    }
  })
  return pitchRecordFromRow(row)
}

export async function updateStockPitch(slug: string, input: UpdateStockPitchInput): Promise<StockPitchRecord> {
  const prisma = getPrisma()
  if (!prisma) throw new Error('DATABASE_URL is required to update stock pitches.')
  const pitch = coercePitch(input.pitch)
  const fields = pitchFields(pitch)
  const row = await prisma.stockPitch.update({
    where: { slug: normalizeSlug(slug) },
    data: {
      ...fields,
      status: input.status ?? undefined,
      shareEnabled: input.shareEnabled ?? undefined,
      payload: pitch as unknown as Prisma.InputJsonValue
    }
  })
  return pitchRecordFromRow(row)
}

export function pitchSharePath(record: StockPitchRecord) {
  return `/pitch/${encodeURIComponent(record.slug)}?token=${encodeURIComponent(record.shareToken || '')}`
}

export function pitchPrintPath(record: StockPitchRecord) {
  return `/pitch/${encodeURIComponent(record.slug)}/print?token=${encodeURIComponent(record.shareToken || '')}`
}

function pitchRecordFromRow(row: PitchRow): StockPitchRecord {
  const pitch = coercePitch(row.payload)
  return stripUndefinedDeep({
    ...pitchSummaryFromRow(row, pitch),
    shareToken: row.shareToken,
    pitch
  })
}

function pitchSummaryFromRow(row: PitchRow, pitch = coercePitch(row.payload)): StockPitchSummary {
  return stripUndefinedDeep({
    id: row.id,
    slug: row.slug,
    ticker: row.ticker || pitch.setup.ticker,
    companyName: row.companyName || pitch.setup.companyName,
    recommendation: normalizeRecommendation(row.recommendation || pitch.setup.recommendation),
    status: normalizeStatus(row.status),
    shareEnabled: Boolean(row.shareEnabled),
    date: pitch.setup.date,
    oneLineThesis: pitch.setup.oneLineThesis,
    targetPrice: pitch.setup.targetPrice,
    downsidePrice: pitch.setup.downsidePrice,
    expectedReturn: pitch.setup.expectedReturn,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  })
}

function fallbackPitchRecord(): StockPitchRecord {
  const pitch = coercePitch(pitchTemplate)
  return stripUndefinedDeep({
    id: 'seeded-hood-pitch',
    slug: normalizeSlug(pitch.id),
    ticker: pitch.setup.ticker,
    companyName: pitch.setup.companyName,
    recommendation: pitch.setup.recommendation,
    status: 'draft',
    shareEnabled: false,
    shareToken: '',
    date: pitch.setup.date,
    oneLineThesis: pitch.setup.oneLineThesis,
    targetPrice: pitch.setup.targetPrice,
    downsidePrice: pitch.setup.downsidePrice,
    expectedReturn: pitch.setup.expectedReturn,
    createdAt: `${pitch.setup.date}T00:00:00.000Z`,
    updatedAt: `${pitch.setup.date}T00:00:00.000Z`,
    pitch
  })
}

function pitchFields(pitch: StockPitch) {
  return {
    ticker: normalizeTicker(pitch.setup.ticker),
    companyName: pitch.setup.companyName || normalizeTicker(pitch.setup.ticker),
    recommendation: pitch.setup.recommendation
  }
}

function coercePitch(value: unknown): StockPitch {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<StockPitch>
  const setup = { ...pitchTemplate.setup, ...(raw.setup ?? {}) }
  const pitch: StockPitch = {
    id: stringOr(raw.id, pitchTemplate.id),
    thesis: stringOr(raw.thesis, raw.setup?.oneLineThesis ?? pitchTemplate.thesis),
    evidenceDrivers: normalizeEvidenceDrivers(raw.evidenceDrivers),
    setup: {
      ...setup,
      ticker: normalizeTicker(setup.ticker),
      recommendation: normalizeRecommendation(setup.recommendation),
      currentPrice: numberOr(setup.currentPrice, 0),
      marketCap: numberOr(setup.marketCap, 0),
      expectedReturn: optionalNumber(setup.expectedReturn),
      targetPrice: optionalNumber(setup.targetPrice),
      downsidePrice: optionalNumber(setup.downsidePrice)
    },
    variantView: { ...pitchTemplate.variantView, ...(raw.variantView ?? {}) },
    positioning: {
      ...pitchTemplate.positioning,
      ...(raw.positioning ?? {}),
      relativeStrengthSummary: stringOr(raw.positioning?.relativeStrengthSummary, pitchTemplate.positioning.relativeStrengthSummary),
      positioningConclusion: stringOr(raw.positioning?.positioningConclusion, pitchTemplate.positioning.positioningConclusion)
    },
    catalysts: normalizeCatalysts(raw.catalysts),
    model: normalizeModel(raw.model),
    valuation: normalizeValuation(raw.valuation),
    tradeStructure: normalizeTradeStructure(raw.tradeStructure),
    redTeam: normalizeRedTeam(raw.redTeam),
    postMortem: { ...pitchTemplate.postMortem, ...(raw.postMortem ?? {}) },
    sourceEvidence: normalizeSourceEvidence(raw.sourceEvidence),
    readiness: pitchTemplate.readiness,
    sourceSnapshot: normalizeSourceSnapshot(raw.sourceSnapshot),
    aiScanId: optionalString(raw.aiScanId),
    aiScan: normalizeAiScan(raw.aiScan),
    newsTape: normalizeNewsTape(raw.newsTape),
    priceProvenance: normalizePriceProvenance(raw.priceProvenance)
  }
  pitch.readiness = buildPitchReadiness(pitch)
  return stripUndefinedDeep(pitch)
}

function normalizeEvidenceDrivers(value: unknown): PitchEvidenceDriver[] {
  const rows = Array.isArray(value) ? value : []
  const normalized = rows.slice(0, 3).map((item, index) => {
    const raw = item && typeof item === 'object' ? item as Partial<PitchEvidenceDriver> : {}
    return {
      driver: stringOr(raw.driver, pitchTemplate.evidenceDrivers[index]?.driver ?? `Driver ${index + 1}`),
      claim: stringOr(raw.claim, ''),
      sourceStatus: normalizeSourceQuality(raw.sourceStatus),
      evidence: stringOr(raw.evidence, ''),
      sourceUrl: raw.sourceUrl ?? null,
      whyItMatters: stringOr(raw.whyItMatters, '')
    }
  })
  const defaults = pitchTemplate.evidenceDrivers
  while (normalized.length < 3) {
    const fallback = defaults[normalized.length]
    normalized.push({
      driver: fallback?.driver ?? `Driver ${normalized.length + 1}`,
      claim: fallback?.claim ?? '',
      sourceStatus: fallback?.sourceStatus ?? 'unavailable',
      evidence: fallback?.evidence ?? '',
      sourceUrl: fallback?.sourceUrl ?? null,
      whyItMatters: fallback?.whyItMatters ?? ''
    })
  }
  return normalized
}

function normalizeSourceEvidence(value: unknown): PitchSourceEvidence[] {
  if (!Array.isArray(value)) return []
  return value.map((item, index) => {
    const raw = item && typeof item === 'object' ? item as Partial<PitchSourceEvidence> : {}
    return {
      asOfDate: raw.asOfDate ?? null,
      observedAt: raw.observedAt ?? null,
      providerTimestamp: raw.providerTimestamp ?? null,
      ingestedAt: raw.ingestedAt ?? null,
      source: stringOr(raw.source, 'source evidence'),
      provider: stringOr(raw.provider, 'source provider'),
      revisionFlag: raw.revisionFlag ?? 'UNKNOWN',
      dataStatus: raw.dataStatus ?? 'PARTIAL',
      availability: raw.availability ?? 'Partial',
      label: stringOr(raw.label, `Evidence ${index + 1}`),
      detail: stringOr(raw.detail, ''),
      url: raw.url ?? null,
      sourceStatus: normalizeSourceQuality(raw.sourceStatus)
    }
  })
}

function buildPitchReadiness(pitch: StockPitch): PitchReadiness {
  const missing = [
    !pitch.thesis.trim() ? 'thesis' : null,
    ...pitch.evidenceDrivers.flatMap((driver, index) => [
      !driver.driver.trim() ? `driver ${index + 1} name` : null,
      !driver.claim.trim() ? `driver ${index + 1} claim` : null,
      !driver.evidence.trim() ? `driver ${index + 1} evidence` : null,
      !driver.whyItMatters.trim() ? `driver ${index + 1} why it matters` : null,
      driver.sourceStatus === 'unavailable' ? `driver ${index + 1} source` : null
    ]),
    pitch.setup.currentPrice <= 0 ? 'current price' : null,
    !pitch.setup.targetPrice || pitch.setup.targetPrice <= 0 ? 'target price' : null,
    !pitch.setup.downsidePrice || pitch.setup.downsidePrice <= 0 ? 'downside price' : null,
    !pitch.tradeStructure.invalidation.trim() ? 'invalidation' : null,
    pitch.catalysts.length === 0 || pitch.catalysts.every(row => !row.date || row.date === 'TBD') ? 'dated catalyst' : null
  ].filter((item): item is string => Boolean(item))
  const sourceScore = Math.round((pitch.evidenceDrivers.filter(driver => driver.sourceStatus === 'sourced' || driver.sourceStatus === 'derived').length / 3) * 100)
  return {
    canPromote: missing.length === 0,
    missing,
    sourceScore
  }
}

function normalizeCatalysts(value: unknown): Catalyst[] {
  const rows = Array.isArray(value) ? value : pitchTemplate.catalysts
  return rows.map((item, index) => ({
    ...pitchTemplate.catalysts[0],
    ...(item && typeof item === 'object' ? item : {}),
    id: stringOr((item as Catalyst | undefined)?.id, `catalyst-${index + 1}`)
  }))
}

function normalizeSourceQuality(value: unknown): PitchSourceQuality {
  if (value === 'sourced' || value === 'derived' || value === 'proxy' || value === 'plan-locked') return value
  return 'unavailable'
}

function normalizeModel(value: unknown): PitchModel {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<PitchModel>
  return {
    revenueDrivers: stringArray(raw.revenueDrivers, pitchTemplate.model.revenueDrivers),
    keyKpis: Array.isArray(raw.keyKpis) ? raw.keyKpis : pitchTemplate.model.keyKpis,
    marginAssumptions: Array.isArray(raw.marginAssumptions) ? raw.marginAssumptions : pitchTemplate.model.marginAssumptions,
    epsFcfAssumptions: Array.isArray(raw.epsFcfAssumptions) ? raw.epsFcfAssumptions : pitchTemplate.model.epsFcfAssumptions,
    mostImportantDriver: stringOr(raw.mostImportantDriver, pitchTemplate.model.mostImportantDriver),
    modelConclusion: stringOr(raw.modelConclusion, pitchTemplate.model.modelConclusion)
  }
}

function normalizeValuation(value: unknown): PitchValuation {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<PitchValuation>
  return {
    primaryMethod: stringOr(raw.primaryMethod, pitchTemplate.valuation.primaryMethod),
    peerSet: stringArray(raw.peerSet, pitchTemplate.valuation.peerSet),
    scenarios: Array.isArray(raw.scenarios) ? raw.scenarios : pitchTemplate.valuation.scenarios,
    valuationConclusion: stringOr(raw.valuationConclusion, pitchTemplate.valuation.valuationConclusion)
  }
}

function normalizeTradeStructure(value: unknown): TradeStructure {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<TradeStructure>
  return {
    ...pitchTemplate.tradeStructure,
    ...raw,
    stopLevel: optionalNumber(raw.stopLevel),
    takeProfitLevel: optionalNumber(raw.takeProfitLevel)
  }
}

function normalizeRedTeam(value: unknown): RedTeam {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<RedTeam>
  return {
    bearCase: stringOr(raw.bearCase, pitchTemplate.redTeam.bearCase),
    strongestCounterargument: stringOr(raw.strongestCounterargument, pitchTemplate.redTeam.strongestCounterargument),
    whatWouldMakeMeWrong: stringOr(raw.whatWouldMakeMeWrong, pitchTemplate.redTeam.whatWouldMakeMeWrong),
    dataToMonitor: stringArray(raw.dataToMonitor, pitchTemplate.redTeam.dataToMonitor)
  }
}

function normalizeSourceSnapshot(value: unknown): PitchSourceSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Partial<PitchSourceSnapshot>
  return {
    ticker: normalizeTicker(raw.ticker),
    generatedAt: stringOr(raw.generatedAt, new Date().toISOString()),
    reportAsOf: stringOr(raw.reportAsOf, ''),
    price: normalizePriceProvenance(raw.price) ?? null,
    newsTape: normalizeNewsTape(raw.newsTape) ?? [],
    providerNotes: stringArray(raw.providerNotes, []),
    gaps: stringArray(raw.gaps, []),
    optionsBattlefield: raw.optionsBattlefield,
    dayMap: raw.dayMap,
    targetConfidence: raw.targetConfidence,
    sourceQuality: raw.sourceQuality
  }
}

function normalizePriceProvenance(value: unknown): PitchPriceProvenance | undefined {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Partial<PitchPriceProvenance>
  const price = optionalNumber(raw.price)
  if (price === undefined) return undefined
  return {
    asOfDate: raw.asOfDate ?? null,
    observedAt: raw.observedAt ?? null,
    providerTimestamp: raw.providerTimestamp ?? null,
    ingestedAt: raw.ingestedAt ?? null,
    source: stringOr(raw.source, 'price source'),
    provider: stringOr(raw.provider, 'price provider'),
    revisionFlag: raw.revisionFlag ?? 'UNKNOWN',
    dataStatus: raw.dataStatus ?? 'PARTIAL',
    availability: raw.availability ?? 'Partial',
    ticker: normalizeTicker(raw.ticker),
    date: stringOr(raw.date, ''),
    price,
    label: stringOr(raw.label, 'sourced price'),
    fallback: Boolean(raw.fallback)
  }
}

function normalizeNewsTape(value: unknown): PitchNewsTapeItem[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.map((item, index) => {
    const raw = item && typeof item === 'object' ? item as Partial<PitchNewsTapeItem> : {}
    return {
      asOfDate: raw.asOfDate ?? null,
      observedAt: raw.observedAt ?? null,
      providerTimestamp: raw.providerTimestamp ?? null,
      ingestedAt: raw.ingestedAt ?? null,
      source: stringOr(raw.source, 'news source'),
      provider: stringOr(raw.provider, 'news provider'),
      revisionFlag: raw.revisionFlag ?? 'UNKNOWN',
      dataStatus: raw.dataStatus ?? 'PARTIAL',
      availability: raw.availability ?? 'Partial',
      id: stringOr(raw.id, `news-${index + 1}`),
      date: stringOr(raw.date, ''),
      headline: stringOr(raw.headline, 'Untitled news row'),
      sourceName: raw.sourceName ?? null,
      url: raw.url ?? null,
      tickers: stringArray(raw.tickers, []),
      theme: stringOr(raw.theme, 'ticker catalyst'),
      materiality: raw.materiality === null ? null : optionalNumber(raw.materiality) ?? null,
      priceConfirmationRequired: Boolean(raw.priceConfirmationRequired),
      whyMatters: stringOr(raw.whyMatters, ''),
      relevance: raw.relevance === 'ai-confirmed' || raw.relevance === 'theme-context' ? raw.relevance : 'direct'
    }
  })
}

function normalizeAiScan(value: unknown): AiScanView | undefined {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Partial<AiScanView>
  return {
    id: optionalString(raw.id),
    ticker: normalizeTicker(raw.ticker),
    mode: stringOr(raw.mode, 'stock-pitch'),
    inputHash: optionalString(raw.inputHash),
    model: stringOr(raw.model, 'unconfigured'),
    status: raw.status === 'completed' || raw.status === 'error' ? raw.status : 'unavailable',
    createdAt: stringOr(raw.createdAt, new Date().toISOString()),
    errorMessage: optionalString(raw.errorMessage),
    payload: raw.payload
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

function recommendationFromMetrics(input: { rs20d: number | null; return20d: number | null; catalystSupport: number | null; extensionRisk: number | null }): PitchRecommendation {
  const rs = input.rs20d ?? 0
  const ret = input.return20d ?? 0
  const catalyst = input.catalystSupport ?? 0
  const extension = input.extensionRisk ?? 100
  if (rs > 0 && ret > 0 && catalyst >= 50 && extension < 65) return 'long'
  if (rs < -8 && ret < -8) return 'no-trade'
  return 'watchlist'
}

function scenarioReturnMap(input: {
  rs20d: number | null
  rs60d: number | null
  return20d: number | null
  return60d: number | null
  crowding: number | null
  extensionRisk: number | null
  catalystSupport: number | null
}) {
  const rs20 = input.rs20d ?? 0
  const rs60 = input.rs60d ?? 0
  const ret20 = input.return20d ?? 0
  const ret60 = input.return60d ?? 0
  const crowding = input.crowding ?? 50
  const extension = input.extensionRisk ?? 50
  const catalyst = input.catalystSupport ?? 50
  const base = clampReturn((rs20 * 0.6) + ((crowding - 50) * 0.08) + ((catalyst - 50) * 0.12) - (extension * 0.04))
  const bull = clampReturn(Math.max(base + 10, (rs60 * 0.5) + (ret60 * 0.25) + ((catalyst - 50) * 0.12)), -5, 35)
  const bear = clampReturn(Math.min(base - 10, (ret20 * 0.75) - (extension * 0.08)), -35, 5)
  return {
    bear: round(bear, 1),
    base: round(base, 1),
    bull: round(bull, 1)
  }
}

function clampReturn(value: number, min = -25, max = 25) {
  return Math.max(min, Math.min(max, value))
}

function priceFromReturn(currentPrice: number, impliedReturn: number) {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return 0
  return round(currentPrice * (1 + impliedReturn / 100), 2)
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

function formatCount(value: number | null) {
  return value === null ? 'N/A' : Math.round(value).toLocaleString('en-US')
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

async function uniquePitchSlug(base: string) {
  const prisma = getPrisma()
  let candidate = base || 'stock-pitch'
  if (!prisma) return candidate
  for (let index = 0; index < 50; index += 1) {
    const existing = await prisma.stockPitch.findUnique({ where: { slug: candidate } })
    if (!existing) return candidate
    candidate = `${base}-${index + 2}`
  }
  return `${base}-${Date.now()}`
}

function generateShareToken() {
  return randomBytes(18).toString('base64url')
}

function clonePitch(pitch: StockPitch): StockPitch {
  return JSON.parse(JSON.stringify(pitch)) as StockPitch
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeSlug(value: string) {
  return slugify(value)
}

function normalizeTicker(value: string | undefined) {
  return (value || 'UNKNOWN').trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '').slice(0, 10) || 'UNKNOWN'
}

function normalizeStatus(value: string | undefined): StockPitchStatus {
  if (value === 'review' || value === 'published' || value === 'archived') return value
  return 'draft'
}

function normalizeRecommendation(value: string | undefined): PitchRecommendation {
  if (value === 'long' || value === 'short' || value === 'watchlist' || value === 'no-trade') return value
  return 'watchlist'
}

function stringOr(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function stringArray(value: unknown, fallback: string[]) {
  return Array.isArray(value) ? value.map(item => String(item)).filter(Boolean) : fallback
}

function numberOr(value: unknown, fallback: number) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function optionalNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined
  const next = Number(value)
  return Number.isFinite(next) ? next : undefined
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map(item => stripUndefinedDeep(item))
      .filter(item => item !== undefined) as T
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => [key, stripUndefinedDeep(item)])
        .filter(([, item]) => item !== undefined)
    ) as T
  }
  return value
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}
