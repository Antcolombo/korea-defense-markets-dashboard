import type { EvidenceDriver, EvidenceQuality, InvestmentDecisionRecord, VariantStrength } from '@/types/decision'

export function validateDecisionState(record: InvestmentDecisionRecord) {
  if (record.status === 'accepted' && !record.readiness.canAccept) {
    throw new Error(`Decision cannot be accepted yet. Missing: ${record.readiness.missingForAccept.join(', ')}`)
  }
  if (record.status === 'closed' && !record.readiness.canClose) {
    throw new Error(`Decision cannot be closed yet. Missing: ${record.readiness.missingForClose.join(', ')}`)
  }
}

export function canDeleteDraftDecision(record: InvestmentDecisionRecord) {
  return !isTemplateDecision(record) &&
    !record.isPublic &&
    record.status === 'watch' &&
    record.decision === 'watch' &&
    !record.marketBelief.trim() &&
    !record.variantView.trim() &&
    !record.invalidation.trim() &&
    record.evidence.every(driver => !driver.claim.trim() && !driver.sourcedEvidence.trim() && !driver.whyItMatters.trim()) &&
    record.outcomeReturn === null &&
    !record.lesson.trim()
}

function isTemplateDecision(record: Pick<InvestmentDecisionRecord, 'id' | 'slug'>) {
  return record.id.startsWith('template-') || record.slug.endsWith('-decision-template')
}

export function missingAcceptFields(record: Omit<InvestmentDecisionRecord, 'pmRead' | 'readiness'>) {
  return [
    !record.risk.thesis.trim() ? 'thesis' : null,
    !record.marketBelief.trim() ? 'market belief' : null,
    !record.variantView.trim() ? 'variant view' : null,
    ...record.evidence.flatMap((driver, index) => [
      !driver.driver.trim() ? `driver ${index + 1} name` : null,
      !driver.claim.trim() ? `driver ${index + 1} claim` : null,
      !driver.sourcedEvidence.trim() ? `driver ${index + 1} sourced evidence` : null,
      !driver.whyItMatters.trim() ? `driver ${index + 1} why it matters` : null,
      driver.sourceStatus === 'missing' ? `driver ${index + 1} source status` : null
    ]),
    !record.invalidation.trim() ? 'invalidation' : null,
    ...missingRiskFields(record)
  ].filter((item): item is string => Boolean(item))
}

export function missingCloseFields(record: Omit<InvestmentDecisionRecord, 'pmRead' | 'readiness'>) {
  return [
    ...missingAcceptFields(record),
    record.outcomeReturn === null ? 'outcome return' : null,
    !record.lesson.trim() ? 'lesson' : null
  ].filter((item): item is string => Boolean(item))
}

export function missingRiskFields(record: Pick<InvestmentDecisionRecord, 'risk'> | Omit<InvestmentDecisionRecord, 'pmRead' | 'readiness'>) {
  const risk = record.risk
  return [
    !risk.decidedAt.trim() ? 'decision timestamp' : null,
    !risk.entry.trim() ? 'entry' : null,
    risk.entryPrice === null ? 'entry price' : null,
    risk.targetPrice === null ? 'target price' : null,
    !risk.sizing ? 'sizing' : null,
    risk.positionSizePct === null ? 'position size %' : null,
    !risk.stop.trim() ? 'stop' : null,
    risk.stopPrice === null ? 'stop price' : null,
    !risk.upside.trim() ? 'upside' : null,
    !risk.downside.trim() ? 'downside' : null,
    !risk.timeHorizon.trim() ? 'time horizon' : null,
    risk.confidence === null ? 'confidence' : null,
    !risk.whatWouldChangeMind.trim() ? 'what would change mind' : null
  ].filter((item): item is string => Boolean(item))
}

export function variantStrength(record: Omit<InvestmentDecisionRecord, 'pmRead' | 'readiness'>): VariantStrength {
  const length = record.risk.thesis.trim().length + record.marketBelief.trim().length + record.variantView.trim().length
  if (length >= 240 && record.variantView.toLowerCase().includes('because')) return 'strong'
  if (length >= 90) return 'medium'
  return 'weak'
}

export function evidenceQuality(evidence: EvidenceDriver[]): EvidenceQuality {
  if (evidence.some(item => item.sourceStatus === 'stale')) return 'stale'
  if (evidence.length && evidence.every(item => item.sourceStatus === 'sourced')) return 'sourced'
  return 'partial'
}
