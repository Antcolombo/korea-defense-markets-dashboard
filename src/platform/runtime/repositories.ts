import { getAssets } from '@/lib/data/getAssets'
import { getEventReturns } from '@/lib/data/getEventReturns'
import { getEvents } from '@/lib/data/getEvents'
import { getPrices } from '@/lib/data/getPrices'
import { getSourceAudit } from '@/lib/data/getSourceAudit'
import {
  getBasketDetail,
  getBasketSummaries,
  getCrowdingRows,
  getHomeSummary,
  getPositioningRows,
  getRotationRows,
  getStockReport,
  getValidationRows
} from '@/lib/research/repository'
import { buildRiskLensRows } from '@/lib/research/riskLens'
import { buildInvestmentDecisionTemplate, getInvestmentDecision, listInvestmentDecisions, listInvestmentDecisionSummaries } from '@/lib/research/decisions'
import { getDefaultStockPitch, getStockPitch, listStockPitchSummaries } from '@/lib/research/pitches'
import { buildPmEngineView } from '@/lib/research/pm'
import { buildStockPitchSourceSnapshot, getSourcedPriceSeries } from '@/lib/research/stockPitchSources'
import { buildTargetConfidence } from '@/features/pitches/domain/target-confidence'
import { providerRunRepository } from '@/platform/persistence/prisma/provider-run-repository'

export type RuntimeRepositories = {
  research: {
    getHomeSummary: typeof getHomeSummary
    getRotationRows: typeof getRotationRows
    getBasketSummaries: typeof getBasketSummaries
    getBasketDetail: typeof getBasketDetail
    getPositioningRows: typeof getPositioningRows
    getCrowdingRows: typeof getCrowdingRows
    getValidationRows: typeof getValidationRows
    getStockReport: typeof getStockReport
  }
  generated: {
    getEvents: typeof getEvents
    getEventReturns: typeof getEventReturns
    getAssets: typeof getAssets
    getPrices: typeof getPrices
    getSourceAudit: typeof getSourceAudit
  }
  pitches: {
    getDefaultStockPitch: typeof getDefaultStockPitch
    getStockPitch: typeof getStockPitch
    listStockPitchSummaries: typeof listStockPitchSummaries
    buildStockPitchSourceSnapshot: typeof buildStockPitchSourceSnapshot
    getSourcedPriceSeries: typeof getSourcedPriceSeries
    buildTargetConfidence: typeof buildTargetConfidence
  }
  decisions: {
    buildInvestmentDecisionTemplate: typeof buildInvestmentDecisionTemplate
    getInvestmentDecision: typeof getInvestmentDecision
    listInvestmentDecisions: typeof listInvestmentDecisions
    listInvestmentDecisionSummaries: typeof listInvestmentDecisionSummaries
  }
  pm: { buildPmEngineView: typeof buildPmEngineView }
  risk: { buildRiskLensRows: typeof buildRiskLensRows }
  providerRuns: { getAudit: typeof providerRunRepository.getAudit }
}

export const runtimeRepositories: RuntimeRepositories = {
  research: {
    getHomeSummary,
    getRotationRows,
    getBasketSummaries,
    getBasketDetail,
    getPositioningRows,
    getCrowdingRows,
    getValidationRows,
    getStockReport
  },
  generated: { getEvents, getEventReturns, getAssets, getPrices, getSourceAudit },
  pitches: {
    getDefaultStockPitch,
    getStockPitch,
    listStockPitchSummaries,
    buildStockPitchSourceSnapshot,
    getSourcedPriceSeries,
    buildTargetConfidence
  },
  decisions: {
    buildInvestmentDecisionTemplate,
    getInvestmentDecision,
    listInvestmentDecisions,
    listInvestmentDecisionSummaries
  },
  pm: { buildPmEngineView },
  risk: { buildRiskLensRows },
  providerRuns: { getAudit: providerRunRepository.getAudit.bind(providerRunRepository) }
}
