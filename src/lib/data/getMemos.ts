import memosJson from '@/generated/memos.json'
import type { Memo } from '@/types/memo'

export function getMemos(): Memo[] {
  return memosJson as Memo[]
}
