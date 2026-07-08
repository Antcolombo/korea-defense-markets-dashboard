import { combineStatuses } from '@/lib/data/availability'
import type { CatalystReportRow, CrowdingRow, DbDataStatus, PositioningRow, ReportSection, RotationRow, StockReport } from '@/lib/research/types'
import { buildReportMarkdown } from './reportMarkdown'
import { catalystSource, latestReportDate, reportMetric, reportSource, sectionPoint, unavailableSection } from './reportEvidence'

export type StockReportInput = {
  ticker: string
  companyName: string
  signal: RotationRow
  positioning: PositioningRow
  crowding: CrowdingRow
  catalysts: CatalystReportRow[]
}

export function buildStockReport(input: StockReportInput): StockReport {
  const fallbackDate = process.env.DEMO_AS_OF_DATE ?? new Date().toISOString().slice(0, 10)
  const asOfDate = latestReportDate([input.signal, input.positioning, input.crowding, ...input.catalysts], fallbackDate)
  const priceSection = buildPriceSection(input.signal)
  const positioning = buildPositioningSection(input.positioning, input.crowding)
  const catalysts = buildCatalystsSection(input.catalysts, asOfDate)
  const executive = buildExecutiveSection(input, asOfDate)
  const variantLens = buildVariantLensSection(input, asOfDate)
  const framing = buildFramingSection(input, asOfDate)
  const risks = buildRisks(input.signal, input.positioning, input.crowding, catalysts)
  const invalidation = buildInvalidation(input.signal, input.crowding)
  const pmQuestions = buildPmQuestions(input.signal, input.positioning, input.crowding, catalysts)
  const reportWithoutMarkdown = {
    ticker: input.ticker,
    companyName: input.companyName,
    asOfDate,
    summary: executive.summary,
    variantView: variantLens.summary,
    evidence: [executive, variantLens, priceSection, framing],
    positioning,
    catalysts,
    risks,
    invalidation,
    pmQuestions
  }

  return {
    ...reportWithoutMarkdown,
    markdown: buildReportMarkdown(reportWithoutMarkdown)
  }
}

export function buildUnavailableStockReport(ticker: string, companyName: string, reason: string, dataStatus: DbDataStatus = 'UNAVAILABLE'): StockReport {
  const asOfDate = process.env.DEMO_AS_OF_DATE ?? new Date().toISOString().slice(0, 10)
  const shell = unavailableSection('Executive Summary', `${ticker} has no sourced report inputs available.`, reason, asOfDate, dataStatus)
  const variantLens = unavailableSection('Variant Lens / Originality Gate', 'No original read is generated because the report has no sourced signal, positioning, crowding, or catalyst evidence.', reason, asOfDate, dataStatus)
  const price = unavailableSection('Price / Relative Strength', 'Price and relative-strength rows are unavailable.', reason, asOfDate, dataStatus)
  const framing = unavailableSection('Bull/Base/Bear Framing', 'Variant framing is unavailable until sourced rows exist.', reason, asOfDate, dataStatus)
  const positioning = unavailableSection('Positioning / Crowding', 'Positioning, crowding, options, and short-sale proxies are unavailable.', reason, asOfDate, dataStatus)
  const catalysts = unavailableSection('Catalysts', 'No sourced catalyst rows available.', reason, asOfDate, dataStatus)
  const reportWithoutMarkdown = {
    ticker,
    companyName,
    asOfDate,
    summary: `${ticker} report shell only: ${reason}`,
    variantView: 'No variant view generated. Load sourced signal, positioning, crowding, and catalyst rows first.',
    evidence: [shell, variantLens, price, framing],
    positioning,
    catalysts,
    risks: ['Missing or stale data is the primary risk to using this report.'],
    invalidation: ['No setup can be invalidated until sourced price and positioning inputs are present.'],
    pmQuestions: ['Which provider snapshot should be loaded first?', 'Is the ticker in the seeded coverage universe?', 'Are options or FINRA inputs entitlement-blocked?']
  }
  return {
    ...reportWithoutMarkdown,
    markdown: buildReportMarkdown(reportWithoutMarkdown)
  }
}

function buildExecutiveSection(input: StockReportInput, asOfDate: string): ReportSection {
  const readiness = sourceReadiness(input)
  const point = sectionPoint({
    provider: 'internal report engine',
    source: 'deterministic stock report from sourced snapshots',
    asOfDate,
    dataStatus: combinedStatus(input.signal, input.positioning, input.crowding)
  })
  const bullets = readiness.score < 50
    ? [
      `Not actionable: ${readiness.available}/${readiness.total} core evidence fields are sourced.`,
      `Blocking fields: ${readiness.missing.slice(0, 6).join(', ') || 'none recorded'}.`,
      'No thesis should be treated as original until the source grid clears enough to create a contradiction.'
    ]
    : [
      setupVerdict(input),
      priceRead(input.signal),
      crowdingRead(input.crowding),
      catalystRead(input.catalysts)
    ].slice(0, 4)
  return {
    ...point,
    title: 'Executive Summary',
    summary: bullets.join(' '),
    bullets,
    metrics: [
      reportMetric(input.signal, input.signal.return20d, '20D return', '%'),
      reportMetric(input.signal, input.signal.relativeStrengthVsSpy20d, '20D RS vs SPY', '%'),
      reportMetric(input.crowding, input.crowding.crowdingScore, 'Crowding score', 'score'),
      reportMetric(input.crowding, input.crowding.extensionRiskScore, 'Extension risk score', 'score'),
      reportMetric(input.crowding, input.crowding.catalystSupportScore, 'Catalyst support score', 'score')
    ],
    sources: [
      reportSource(input.signal, 'Signal snapshot', input.signal.trendLabel),
      reportSource(input.crowding, 'Crowding snapshot', input.crowding.setupLabel)
    ],
    excludedUnavailableInputs: unique([
      ...input.crowding.excludedUnavailableInputs,
      ...unavailableMetricLabels([
        ['20D return', input.signal.return20d],
        ['20D RS vs SPY', input.signal.relativeStrengthVsSpy20d],
        ['Crowding score', input.crowding.crowdingScore],
        ['Extension risk score', input.crowding.extensionRiskScore],
        ['Catalyst support score', input.crowding.catalystSupportScore]
      ])
    ])
  }
}

function buildVariantLensSection(input: StockReportInput, asOfDate: string): ReportSection {
  const readiness = sourceReadiness(input)
  const point = sectionPoint({
    provider: 'internal report engine',
    source: 'variant lens from sourced signal + crowding contradictions',
    asOfDate,
    dataStatus: combinedStatus(input.signal, input.positioning, input.crowding)
  })
  const contradiction = variantContradiction(input, readiness)
  const missing = readiness.missing.slice(0, 6)
  const bullets = readiness.score < 50
    ? [
      'Originality gate failed: source coverage is too thin for a real variant view.',
      `Load or repair: ${missing.join(', ') || 'core signal and crowding fields'}.`,
      'Report output should stay in audit mode, not PM-note mode.'
    ]
    : [
      contradiction,
      variantNoGo(input),
      `Next source to verify: ${missing[0] ?? 'fresh catalyst and positioning trail'}.`
    ]
  return {
    ...point,
    title: 'Variant Lens / Originality Gate',
    summary: readiness.score < 50
      ? `${input.ticker} has no defensible original read yet. ${readiness.available}/${readiness.total} core fields are sourced, so the correct output is a data-gap diagnosis, not a generic AI-style thesis.`
      : contradiction,
    bullets,
    metrics: [
      reportMetric(input.signal, input.signal.return20d, '20D return', '%'),
      reportMetric(input.signal, input.signal.relativeStrengthVsSpy20d, '20D RS vs SPY', '%'),
      reportMetric(input.signal, input.signal.volumeVs20dAvg, 'Volume vs 20D average', 'x'),
      reportMetric(input.crowding, input.crowding.crowdingScore, 'Crowding score', 'score'),
      reportMetric(input.crowding, input.crowding.extensionRiskScore, 'Extension risk score', 'score'),
      reportMetric(input.crowding, input.crowding.catalystSupportScore, 'Catalyst support score', 'score')
    ],
    sources: [
      reportSource(input.signal, 'Signal snapshot', input.signal.trendLabel),
      reportSource(input.crowding, 'Crowding snapshot', input.crowding.explanation),
      ...input.catalysts.slice(0, 2).map(catalystSource)
    ],
    excludedUnavailableInputs: unique([
      ...input.crowding.excludedUnavailableInputs,
      ...missing,
      ...unavailableMetricLabels([
        ['20D return', input.signal.return20d],
        ['20D RS vs SPY', input.signal.relativeStrengthVsSpy20d],
        ['Volume vs 20D average', input.signal.volumeVs20dAvg],
        ['Crowding score', input.crowding.crowdingScore],
        ['Extension risk score', input.crowding.extensionRiskScore],
        ['Catalyst support score', input.crowding.catalystSupportScore]
      ])
    ])
  }
}

function buildPriceSection(signal: RotationRow): ReportSection {
  const metrics = [
    reportMetric(signal, signal.return1d, '1D return', '%'),
    reportMetric(signal, signal.return5d, '5D return', '%'),
    reportMetric(signal, signal.return20d, '20D return', '%'),
    reportMetric(signal, signal.return60d, '60D return', '%'),
    reportMetric(signal, signal.relativeStrengthVsSpy20d, '20D RS vs SPY', '%'),
    reportMetric(signal, signal.relativeStrengthVsSpy60d, '60D RS vs SPY', '%'),
    reportMetric(signal, signal.volumeVs20dAvg, 'Volume vs 20D average', 'x')
  ]
  return {
    ...signal,
    title: 'Price / Relative Strength',
    summary: `${signal.ticker} trend label: ${signal.trendLabel || 'Unavailable'}.`,
    bullets: [
      `1D / 5D / 20D / 60D returns: ${metrics[0]?.displayValue}, ${metrics[1]?.displayValue}, ${metrics[2]?.displayValue}, ${metrics[3]?.displayValue}.`,
      `RS vs SPY: ${metrics[4]?.displayValue} over 20D and ${metrics[5]?.displayValue} over 60D.`,
      `Volume confirmation: ${metrics[6]?.displayValue}; trend label ${signal.trendLabel || 'Unavailable'}.`
    ],
    metrics,
    sources: [reportSource(signal, 'Signal snapshot', `Trend label: ${signal.trendLabel || 'Unavailable'}`)],
    excludedUnavailableInputs: unavailableMetricLabels(metrics.map(item => [item.label, item]))
  }
}

function buildPositioningSection(positioning: PositioningRow, crowding: CrowdingRow): ReportSection {
  const status = combinedStatus(positioning, crowding)
  const point = sectionPoint({
    provider: 'internal report engine',
    source: 'positioning + crowding report section',
    asOfDate: latestReportDate([positioning, crowding], process.env.DEMO_AS_OF_DATE ?? new Date().toISOString().slice(0, 10)),
    dataStatus: status
  })
  const metrics = [
    reportMetric(crowding, crowding.crowdingScore, 'Crowding score', 'score'),
    reportMetric(crowding, crowding.extensionRiskScore, 'Extension risk score', 'score'),
    reportMetric(crowding, crowding.catalystSupportScore, 'Catalyst support score', 'score'),
    reportMetric(crowding, crowding.momentumScore, 'Momentum component', 'score'),
    reportMetric(crowding, crowding.volumeScore, 'Volume component', 'score'),
    reportMetric(crowding, crowding.optionsScore, 'Options component', 'score'),
    reportMetric(crowding, crowding.volatilityScore, 'Volatility component', 'score'),
    reportMetric(crowding, crowding.shortInterestScore, 'Short-interest component', 'score'),
    reportMetric(positioning, positioning.optionsVolume, 'Options volume', 'count'),
    reportMetric(positioning, positioning.openInterest, 'Open interest', 'count'),
    reportMetric(positioning, positioning.putCallRatio, 'Put/call ratio', 'ratio'),
    reportMetric(positioning, positioning.shortVolumeRatio, 'FINRA short-sale volume ratio', 'ratio')
  ]
  const excluded = unique([
    ...positioning.excludedUnavailableInputs,
    ...crowding.excludedUnavailableInputs,
    ...unavailableMetricLabels(metrics.map(item => [item.label, item]))
  ])
  return {
    ...point,
    title: 'Positioning / Crowding',
    summary: crowding.crowdingScore.value === null
      ? 'Crowding score unavailable because sourced components are missing.'
      : `${crowding.setupLabel}: crowding ${crowding.crowdingScore.value.toFixed(1)}, extension risk ${scoreText(crowding.extensionRiskScore)}, catalyst support ${scoreText(crowding.catalystSupportScore)}.`,
    bullets: [
      `Setup label: ${crowding.setupLabel || 'Unavailable'}; crowding label: ${crowding.crowdingLabel || 'Unavailable'}.`,
      positioning.positioningNotes || 'No sourced positioning note available.',
      excluded.length ? `Deferred inputs: ${excluded.join(', ')}.` : 'No deferred positioning inputs recorded.'
    ],
    metrics,
    sources: [
      reportSource(crowding, 'Crowding snapshot', crowding.explanation),
      reportSource(positioning, 'Positioning snapshot', positioning.positioningNotes)
    ],
    excludedUnavailableInputs: excluded
  }
}

function buildCatalystsSection(catalysts: CatalystReportRow[], asOfDate: string): ReportSection {
  if (catalysts.length === 0) {
    return unavailableSection('Catalysts', 'No SEC, news, or macro catalyst rows are sourced for this ticker.', 'Catalyst rows missing', asOfDate)
  }
  const status = combineStatuses(catalysts.map(item => item.dataStatus as DbDataStatus))
  const point = sectionPoint({
    provider: 'internal report engine',
    source: 'sourced catalyst rows',
    asOfDate,
    dataStatus: status
  })
  return {
    ...point,
    title: 'Catalysts',
    summary: `${catalysts.length} sourced catalyst row${catalysts.length === 1 ? '' : 's'} linked to this ticker.`,
    bullets: catalysts.slice(0, 3).map(row => `${row.date}: ${row.title}`),
    metrics: catalysts.slice(0, 3).map(row => reportMetric(row, row.materialityScore, `Materiality: ${row.title}`, 'score')),
    sources: catalysts.slice(0, 5).map(catalystSource),
    excludedUnavailableInputs: unavailableMetricLabels(catalysts.map(row => [`${row.title} materiality`, row.materialityScore]))
  }
}

function buildFramingSection(input: StockReportInput, asOfDate: string): ReportSection {
  const readiness = sourceReadiness(input)
  const point = sectionPoint({
    provider: 'internal report engine',
    source: 'deterministic bull/base/bear framing',
    asOfDate,
    dataStatus: combinedStatus(input.signal, input.positioning, input.crowding)
  })
  const bull = readiness.score < 50
    ? 'Bull: blocked until 20D return, RS, crowding, extension, and catalyst support are sourced.'
    : input.signal.relativeStrengthVsSpy20d.value !== null && input.signal.relativeStrengthVsSpy20d.value > 0
    ? `Bull: positive RS vs SPY persists with ${input.signal.trendLabel || 'available'} trend label.`
    : 'Bull: unavailable until positive sourced RS/price confirmation appears.'
  const base = readiness.score < 50
    ? 'Base: audit provider gaps first; no PM-grade base case yet.'
    : input.crowding.crowdingScore.value !== null
    ? `Base: monitor ${input.crowding.setupLabel.toLowerCase()} while checking deferred inputs.`
    : 'Base: wait for sourced crowding and positioning components.'
  const bear = readiness.score < 50
    ? 'Bear: data vacuum can create false confidence; missing evidence is the risk.'
    : input.signal.relativeStrengthVsSpy20d.value !== null && input.signal.relativeStrengthVsSpy20d.value < 0
    ? 'Bear: negative RS vs SPY confirms fading tape.'
    : 'Bear: setup weakens if RS turns negative or extension risk rises without catalyst support.'
  const bullets = [bull, base, bear]
  return {
    ...point,
    title: 'Bull/Base/Bear Framing',
    summary: bullets.join(' '),
    bullets,
    metrics: [
      reportMetric(input.signal, input.signal.relativeStrengthVsSpy20d, '20D RS vs SPY', '%'),
      reportMetric(input.crowding, input.crowding.crowdingScore, 'Crowding score', 'score'),
      reportMetric(input.crowding, input.crowding.extensionRiskScore, 'Extension risk score', 'score'),
      reportMetric(input.crowding, input.crowding.catalystSupportScore, 'Catalyst support score', 'score')
    ],
    sources: [
      reportSource(input.signal, 'Signal snapshot', input.signal.trendLabel),
      reportSource(input.crowding, 'Crowding snapshot', input.crowding.explanation)
    ],
    excludedUnavailableInputs: unavailableMetricLabels([
      ['20D RS vs SPY', input.signal.relativeStrengthVsSpy20d],
      ['Crowding score', input.crowding.crowdingScore],
      ['Extension risk score', input.crowding.extensionRiskScore],
      ['Catalyst support score', input.crowding.catalystSupportScore]
    ])
  }
}

function sourceReadiness(input: StockReportInput) {
  const checks = [
    { label: '20D return', available: hasMetric(input.signal.return20d) },
    { label: '20D RS vs SPY', available: hasMetric(input.signal.relativeStrengthVsSpy20d) },
    { label: '60D RS vs SPY', available: hasMetric(input.signal.relativeStrengthVsSpy60d) },
    { label: 'Volume vs 20D average', available: hasMetric(input.signal.volumeVs20dAvg) },
    { label: 'Crowding score', available: hasMetric(input.crowding.crowdingScore) },
    { label: 'Extension risk score', available: hasMetric(input.crowding.extensionRiskScore) },
    { label: 'Catalyst support score', available: hasMetric(input.crowding.catalystSupportScore) },
    { label: 'Options put/call ratio', available: hasMetric(input.positioning.putCallRatio) },
    { label: 'Short-sale volume ratio', available: hasMetric(input.positioning.shortVolumeRatio) },
    { label: 'Sourced catalyst row', available: input.catalysts.length > 0 }
  ]
  const available = checks.filter(check => check.available).length
  const total = checks.length
  return {
    checks,
    available,
    total,
    score: Math.round((available / total) * 100),
    missing: checks.filter(check => !check.available).map(check => check.label)
  }
}

function setupVerdict(input: StockReportInput) {
  const rs = input.signal.relativeStrengthVsSpy20d.value
  const crowding = input.crowding.crowdingScore.value
  const extension = input.crowding.extensionRiskScore.value
  const catalyst = input.crowding.catalystSupportScore.value
  if (rs !== null && rs > 0 && (crowding ?? 0) < 60 && (extension ?? 0) < 65) {
    return `${input.ticker} screens as early sponsorship: positive RS without crowded/extended risk.`
  }
  if (rs !== null && rs > 0 && (extension ?? 0) >= 70 && (catalyst ?? 0) < 50) {
    return `${input.ticker} screens as an extension trap: positive tape, but catalyst support does not justify chase risk.`
  }
  if (rs !== null && rs < 0 && (crowding ?? 0) >= 60) {
    return `${input.ticker} screens as crowded weakness: negative RS with stale sponsorship risk.`
  }
  if (catalyst !== null && catalyst >= 70 && rs !== null && rs <= 0) {
    return `${input.ticker} has catalyst support before price confirmation; watch for a rotation catch-up.`
  }
  return `${input.ticker} has mixed evidence; treat the report as a decision map, not a buy/sell conclusion.`
}

function variantContradiction(input: StockReportInput, readiness: ReturnType<typeof sourceReadiness>) {
  const rs = input.signal.relativeStrengthVsSpy20d.value
  const crowding = input.crowding.crowdingScore.value
  const extension = input.crowding.extensionRiskScore.value
  const catalyst = input.crowding.catalystSupportScore.value
  if (readiness.score < 50) return `${input.ticker} has no defensible original read until missing source fields clear.`
  if (rs !== null && rs > 0 && extension !== null && extension >= 70 && catalyst !== null && catalyst < 50) {
    return `Variant lens: market may be chasing visible momentum, but the terminal flags extension without enough catalyst support. Edge is patience, not excitement.`
  }
  if (rs !== null && rs > 0 && crowding !== null && crowding < 55 && extension !== null && extension < 65) {
    return `Variant lens: positive RS has not yet turned into crowding. Edge is finding whether sponsorship is still early or merely unnoticed.`
  }
  if (rs !== null && rs < 0 && catalyst !== null && catalyst >= 70) {
    return `Variant lens: catalysts exist but tape has not confirmed them. Edge is waiting for RS repair instead of buying the story.`
  }
  if (crowding !== null && crowding >= 75 && extension !== null && extension >= 70) {
    return `Variant lens: consensus attention may already be expressed in price and positioning. Edge is risk control around reversal triggers.`
  }
  return `Variant lens: no single clean contradiction dominates. Best work is to rank which source field changes the setup first.`
}

function variantNoGo(input: StockReportInput) {
  const rs = input.signal.relativeStrengthVsSpy20d.value
  const extension = input.crowding.extensionRiskScore.value
  const catalyst = input.crowding.catalystSupportScore.value
  if (rs !== null && rs > 0) return 'No-go: RS rolls below SPY while volume confirmation fades.'
  if (extension !== null && extension >= 70 && (catalyst ?? 0) < 50) return 'No-go: extension stays high without a fresh catalyst row.'
  return 'No-go: key source fields stale, unavailable, or contradictory after refresh.'
}

function hasMetric(metric: { value: number | null }) {
  return metric.value !== null
}

function buildRisks(signal: RotationRow, positioning: PositioningRow, crowding: CrowdingRow, catalysts: ReportSection) {
  const risks = [
    (crowding.extensionRiskScore.value ?? 0) >= 75 && (crowding.catalystSupportScore.value ?? 0) < 50 ? 'Extension risk is high without sourced catalyst support.' : null,
    (crowding.crowdingScore.value ?? 0) >= 75 ? `${crowding.crowdingLabel} can turn sponsorship into crowded positioning.` : null,
    signal.volumeVs20dAvg.value === null ? 'Volume confirmation is unavailable.' : signal.volumeVs20dAvg.value < 0.8 ? 'Move lacks volume confirmation versus 20D average.' : null,
    positioning.shortVolumeRatio.value === null ? 'FINRA short-sale volume proxy is unavailable.' : null,
    catalysts.availability !== 'Available' ? 'Catalyst coverage is unavailable or partial.' : null,
    signal.availability !== 'Available' ? 'Signal snapshot is stale, partial, or unavailable.' : null
  ].filter((item): item is string => Boolean(item))
  return risks.length ? risks : ['No major sourced data caveat recorded beyond normal market risk.']
}

function buildInvalidation(signal: RotationRow, crowding: CrowdingRow) {
  const invalidation = [
    signal.relativeStrengthVsSpy20d.value === null ? 'Cannot define RS invalidation until RS vs SPY is sourced.' : '20D RS vs SPY turns negative and stays there.',
    signal.volumeVs20dAvg.value === null ? 'Cannot confirm participation until volume proxy is sourced.' : 'Volume confirmation falls below 20D average while price trend fades.',
    crowding.extensionRiskScore.value === null ? 'Cannot judge extension invalidation until extension risk is sourced.' : 'Extension risk stays high while catalyst support remains missing or weak.'
  ]
  return invalidation
}

function buildPmQuestions(signal: RotationRow, positioning: PositioningRow, crowding: CrowdingRow, catalysts: ReportSection) {
  return [
    `Is ${signal.trendLabel || 'the tape'} confirmed by RS and volume, or is it a one-factor move?`,
    crowding.crowdingScore.value === null ? 'Which missing crowding component changes the setup most?' : `Does ${crowding.setupLabel.toLowerCase()} reflect sponsorship, extension, or catalyst support?`,
    positioning.putCallRatio.value === null ? 'Are options inputs entitlement-blocked or genuinely absent?' : 'Does options activity confirm or contradict the price move?',
    catalysts.availability === 'Available' ? 'Which catalyst has enough evidence to matter for the next PM discussion?' : 'What sourced catalyst would make this report actionable?',
    'What data field must be refreshed before this note is emailed?'
  ]
}

function priceRead(signal: RotationRow) {
  if (signal.return20d.value === null || signal.relativeStrengthVsSpy20d.value === null) return `${signal.ticker} lacks sourced 20D return or RS vs SPY, so price read is unavailable.`
  return `${signal.ticker} 20D return is ${signal.return20d.value.toFixed(1)}% with ${signal.relativeStrengthVsSpy20d.value.toFixed(1)}% RS vs SPY; trend label is ${signal.trendLabel}.`
}

function crowdingRead(crowding: CrowdingRow) {
  if (crowding.crowdingScore.value === null) return 'Crowding read unavailable because sourced components are missing.'
  return `Crowding score is ${crowding.crowdingScore.value.toFixed(1)}, extension risk is ${scoreText(crowding.extensionRiskScore)}, catalyst support is ${scoreText(crowding.catalystSupportScore)}, and setup label is ${crowding.setupLabel}.`
}

function catalystRead(catalysts: CatalystReportRow[]) {
  if (catalysts.length === 0) return 'No sourced catalyst row is linked to this ticker.'
  return `Latest catalyst: ${catalysts[0]?.date} ${catalysts[0]?.title}.`
}

function combinedStatus(...points: { dataStatus: DbDataStatus | string }[]) {
  return combineStatuses(points.map(point => point.dataStatus as DbDataStatus))
}

function unavailableMetricLabels(items: [string, { value: number | null; availability?: string }][]) {
  return items.filter(([, metric]) => metric.value === null).map(([label]) => label)
}

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))]
}

function scoreText(metric: { value: number | null }) {
  return metric.value === null ? 'deferred' : metric.value.toFixed(1)
}
