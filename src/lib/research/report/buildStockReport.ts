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
  const framing = buildFramingSection(input, asOfDate)
  const risks = buildRisks(input.signal, input.positioning, input.crowding, catalysts)
  const invalidation = buildInvalidation(input.signal, input.crowding)
  const pmQuestions = buildPmQuestions(input.signal, input.positioning, input.crowding, catalysts)
  const reportWithoutMarkdown = {
    ticker: input.ticker,
    companyName: input.companyName,
    asOfDate,
    summary: executive.summary,
    variantView: framing.summary,
    evidence: [executive, priceSection, framing],
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
  const price = unavailableSection('Price / Relative Strength', 'Price and relative-strength rows are unavailable.', reason, asOfDate, dataStatus)
  const framing = unavailableSection('Bull/Base/Bear Framing', 'Variant framing is unavailable until sourced rows exist.', reason, asOfDate, dataStatus)
  const positioning = unavailableSection('Positioning / Crowding', 'Positioning, crowding, options, and short-sale proxies are unavailable.', reason, asOfDate, dataStatus)
  const catalysts = unavailableSection('Catalysts', 'No sourced catalyst rows available.', reason, asOfDate, dataStatus)
  const reportWithoutMarkdown = {
    ticker,
    companyName,
    asOfDate,
    summary: `${ticker} report shell only: ${reason}`,
    variantView: 'Bull/base/bear view unavailable until sourced signal, positioning, and catalyst rows exist.',
    evidence: [shell, price, framing],
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
  const point = sectionPoint({
    provider: 'internal report engine',
    source: 'deterministic stock report from sourced snapshots',
    asOfDate,
    dataStatus: combinedStatus(input.signal, input.positioning, input.crowding)
  })
  const bullets = [
    priceRead(input.signal),
    crowdingRead(input.crowding),
    catalystRead(input.catalysts)
  ].slice(0, 3)
  return {
    ...point,
    title: 'Executive Summary',
    summary: bullets.join(' '),
    bullets,
    metrics: [
      reportMetric(input.signal, input.signal.return20d, '20D return', '%'),
      reportMetric(input.signal, input.signal.relativeStrengthVsSpy20d, '20D RS vs SPY', '%'),
      reportMetric(input.crowding, input.crowding.crowdingScore, 'Crowding score', 'score')
    ],
    sources: [
      reportSource(input.signal, 'Signal snapshot', input.signal.trendLabel),
      reportSource(input.crowding, 'Crowding snapshot', input.crowding.crowdingLabel)
    ],
    excludedUnavailableInputs: unique([
      ...input.crowding.excludedUnavailableInputs,
      ...unavailableMetricLabels([
        ['20D return', input.signal.return20d],
        ['20D RS vs SPY', input.signal.relativeStrengthVsSpy20d],
        ['Crowding score', input.crowding.crowdingScore]
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
    reportMetric(crowding, crowding.momentumScore, 'Momentum component', 'score'),
    reportMetric(crowding, crowding.volumeScore, 'Volume component', 'score'),
    reportMetric(crowding, crowding.optionsScore, 'Options component', 'score'),
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
      : `${crowding.crowdingLabel}: crowding score ${crowding.crowdingScore.value.toFixed(1)} using available sourced components.`,
    bullets: [
      `Crowding label: ${crowding.crowdingLabel || 'Unavailable'}.`,
      positioning.positioningNotes || 'No sourced positioning note available.',
      excluded.length ? `Excluded unavailable inputs: ${excluded.join(', ')}.` : 'No unavailable positioning inputs recorded.'
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
  const point = sectionPoint({
    provider: 'internal report engine',
    source: 'deterministic bull/base/bear framing',
    asOfDate,
    dataStatus: combinedStatus(input.signal, input.positioning, input.crowding)
  })
  const bull = input.signal.relativeStrengthVsSpy20d.value !== null && input.signal.relativeStrengthVsSpy20d.value > 0
    ? `Bull: positive RS vs SPY persists with ${input.signal.trendLabel || 'available'} trend label.`
    : 'Bull: unavailable until positive sourced RS/price confirmation appears.'
  const base = input.crowding.crowdingScore.value !== null
    ? `Base: monitor ${input.crowding.crowdingLabel.toLowerCase()} crowding while checking excluded inputs.`
    : 'Base: wait for sourced crowding and positioning components.'
  const bear = input.signal.relativeStrengthVsSpy20d.value !== null && input.signal.relativeStrengthVsSpy20d.value < 0
    ? 'Bear: negative RS vs SPY confirms fading tape.'
    : 'Bear: setup weakens if RS turns negative or crowding moves to reversal risk.'
  const bullets = [bull, base, bear]
  return {
    ...point,
    title: 'Bull/Base/Bear Framing',
    summary: bullets.join(' '),
    bullets,
    metrics: [
      reportMetric(input.signal, input.signal.relativeStrengthVsSpy20d, '20D RS vs SPY', '%'),
      reportMetric(input.crowding, input.crowding.crowdingScore, 'Crowding score', 'score')
    ],
    sources: [
      reportSource(input.signal, 'Signal snapshot', input.signal.trendLabel),
      reportSource(input.crowding, 'Crowding snapshot', input.crowding.explanation)
    ],
    excludedUnavailableInputs: unavailableMetricLabels([
      ['20D RS vs SPY', input.signal.relativeStrengthVsSpy20d],
      ['Crowding score', input.crowding.crowdingScore]
    ])
  }
}

function buildRisks(signal: RotationRow, positioning: PositioningRow, crowding: CrowdingRow, catalysts: ReportSection) {
  const risks = [
    crowding.crowdingLabel === 'Reversal Risk' || crowding.crowdingLabel === 'Crowded Momentum' ? `${crowding.crowdingLabel} can turn momentum into a positioning unwind.` : null,
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
    crowding.crowdingScore.value === null ? 'Cannot judge crowding invalidation until crowding score is sourced.' : 'Crowding moves into reversal-risk band without fresh catalyst support.'
  ]
  return invalidation
}

function buildPmQuestions(signal: RotationRow, positioning: PositioningRow, crowding: CrowdingRow, catalysts: ReportSection) {
  return [
    `Is ${signal.trendLabel || 'the tape'} confirmed by RS and volume, or is it a one-factor move?`,
    crowding.crowdingScore.value === null ? 'Which missing crowding component changes the setup most?' : `Is ${crowding.crowdingLabel.toLowerCase()} a sponsorship signal or a crowded exit risk?`,
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
  return `Crowding score is ${crowding.crowdingScore.value.toFixed(1)} and label is ${crowding.crowdingLabel}.`
}

function catalystRead(catalysts: CatalystReportRow[]) {
  if (catalysts.length === 0) return 'No sourced catalyst row is linked to this ticker.'
  return `Latest catalyst: ${catalysts[0]?.date} ${catalysts[0]?.title}.`
}

function combinedStatus(...points: { dataStatus: DbDataStatus | string }[]) {
  return combineStatuses(points.map(point => point.dataStatus as DbDataStatus))
}

function unavailableMetricLabels(items: [string, { value: number | null; availability?: string }][]) {
  return items.filter(([, metric]) => metric.value === null || metric.availability !== 'Available').map(([label]) => label)
}

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))]
}
