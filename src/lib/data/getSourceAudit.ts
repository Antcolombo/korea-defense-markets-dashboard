import sourceAuditJson from '@/generated/sourceAudit.json'
import type { SourceAudit } from '@/types/sourceAudit'

export type { SourceAudit } from '@/types/sourceAudit'

export function getSourceAudit(): SourceAudit {
  return sourceAuditJson as SourceAudit
}
