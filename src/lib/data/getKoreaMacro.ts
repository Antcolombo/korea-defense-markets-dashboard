import koreaMacroJson from '@/generated/koreaMacro.json'
import type { KoreaMacroSummary } from '@/types/koreaMacro'

export function getKoreaMacro(): KoreaMacroSummary[] {
  return koreaMacroJson as KoreaMacroSummary[]
}
