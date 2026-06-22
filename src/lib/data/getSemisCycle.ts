import semisCycleJson from '@/generated/semisCycle.json'
import type { SemisCycleRecord } from '@/types/semisCycle'

export function getSemisCycle(): SemisCycleRecord[] {
  return semisCycleJson as SemisCycleRecord[]
}
