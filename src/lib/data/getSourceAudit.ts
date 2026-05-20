import sourceAuditJson from '@/generated/sourceAudit.json'

export type SourceAudit = {
  generatedAt: string
  status: string
  recordsChecked: number
  datasetCounts?: Record<string, number>
  providers?: {
    provider: string
    status: string
    retrievedAt?: string
    records: number
    failures: string[]
  }[]
  missingProvenance: string[]
  readinessFailures?: string[]
  notes: string[]
}

export function getSourceAudit(): SourceAudit {
  return sourceAuditJson as SourceAudit
}
