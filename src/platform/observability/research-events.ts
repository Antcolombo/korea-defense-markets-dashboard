export type ResearchEvent = {
  event: string
  durationMs?: number
  module?: string
  dataMode?: string
  status?: string
  coveragePercent?: number
  unavailableCount?: number
  deferredUnavailableCount?: number
}

export function recordResearchEvent(event: ResearchEvent) {
  const payload = {
    timestamp: new Date().toISOString(),
    ...event
  }
  console.info(JSON.stringify(payload))
}
