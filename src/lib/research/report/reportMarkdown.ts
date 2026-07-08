import type { ReportMetric, ReportSection, StockReport } from '@/lib/research/types'

export function buildReportMarkdown(report: Omit<StockReport, 'markdown'>) {
  const lines = [
    `# ${report.ticker} Stock Report - ${report.asOfDate}`,
    '',
    `**Company:** ${report.companyName}`,
    '',
    `## Executive Summary`,
    report.summary,
    '',
    `## Variant View`,
    report.variantView,
    '',
    ...report.evidence.flatMap(sectionMarkdown),
    ...sectionMarkdown(report.positioning),
    ...sectionMarkdown(report.catalysts),
    `## Risks`,
    ...bulletList(report.risks),
    '',
    `## Invalidation`,
    ...bulletList(report.invalidation),
    '',
    `## PM Questions`,
    ...bulletList(report.pmQuestions),
    '',
    `## Source Freshness`,
    ...sourceFreshness(report),
    ''
  ]
  return lines.join('\n')
}

function sectionMarkdown(section: ReportSection) {
  return [
    `## ${section.title}`,
    section.summary,
    '',
    ...bulletList(section.bullets),
    ...(section.metrics.length ? ['', metricTable(section.metrics)] : []),
    ...(section.excludedUnavailableInputs.length ? ['', `Deferred inputs: ${section.excludedUnavailableInputs.join(', ')}`] : []),
    ''
  ]
}

function bulletList(items: string[]) {
  return (items.length ? items : ['Unavailable.']).map(item => `- ${item}`)
}

function metricTable(metrics: ReportMetric[]) {
  return [
    `| Metric | Value | Status | Provider | Source | As of | Ingested |`,
    `|---|---:|---|---|---|---|---|`,
    ...metrics.map(metric => `| ${escapeCell(metric.label)} | ${escapeCell(metric.displayValue)} | ${metric.availability} | ${escapeCell(metric.provider)} | ${escapeCell(metric.source)} | ${metric.asOfDate ?? 'N/A'} | ${metric.ingestedAt ?? 'N/A'} |`)
  ].join('\n')
}

function sourceFreshness(report: Omit<StockReport, 'markdown'>) {
  const seen = new Set<string>()
  const sources = [...report.evidence, report.positioning, report.catalysts].flatMap(section => section.sources)
  const rows = sources.filter(source => {
    const key = `${source.provider}|${source.source}|${source.asOfDate}|${source.ingestedAt}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  if (!rows.length) return ['- No sourced rows available.']
  return rows.map(source => `- ${source.label}: ${source.provider} / ${source.source} / as of ${source.asOfDate ?? 'N/A'} / ingested ${source.ingestedAt ?? 'N/A'}`)
}

function escapeCell(value: string) {
  return value.replace(/\|/g, '\\|')
}
