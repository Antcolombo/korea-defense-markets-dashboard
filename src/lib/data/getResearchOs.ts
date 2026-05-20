import marketTapeJson from '@/generated/marketTape.json'
import companyCoverageJson from '@/generated/companyCoverage.json'
import eventTapeJson from '@/generated/eventTape.json'
import ideaLedgerJson from '@/generated/ideaLedger.json'
import researchArtifactsJson from '@/generated/researchArtifacts.json'
import masteryPipelineJson from '@/generated/masteryPipeline.json'
import type {
  CompanyCoverageRecord,
  EventTapeRecord,
  IdeaLedgerRecord,
  MarketTapeRecord,
  MasteryPipelineStage,
  ResearchArtifactRecord
} from '@/types/researchOs'

export function getMarketTape(): MarketTapeRecord[] {
  return marketTapeJson as MarketTapeRecord[]
}

export function getCompanyCoverage(): CompanyCoverageRecord[] {
  return companyCoverageJson as CompanyCoverageRecord[]
}

export function getEventTape(): EventTapeRecord[] {
  return eventTapeJson as EventTapeRecord[]
}

export function getIdeaLedger(): IdeaLedgerRecord[] {
  return ideaLedgerJson as IdeaLedgerRecord[]
}

export function getResearchArtifacts(): ResearchArtifactRecord[] {
  return researchArtifactsJson as ResearchArtifactRecord[]
}

export function getMasteryPipeline(): MasteryPipelineStage[] {
  return masteryPipelineJson as MasteryPipelineStage[]
}
