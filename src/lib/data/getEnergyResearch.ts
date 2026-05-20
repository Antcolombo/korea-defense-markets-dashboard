import energyResearchJson from '@/generated/energyResearch.json'
import type { EnergyResearchRecord } from '@/types/energy'

export function getEnergyResearch(): EnergyResearchRecord[] {
  return energyResearchJson as unknown as EnergyResearchRecord[]
}
