import { QueryClient } from '@tanstack/react-query'
import type { ApiResponse } from '@/lib/research/api'
import type { StockReport } from '@/lib/research/types'

export function createResearchQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false
      }
    }
  })
}

export async function fetchResearchJson<T>(url: string): Promise<ApiResponse<T>> {
  const response = await fetch(url)
  const payload = await response.json() as ApiResponse<T>
  if (!response.ok) {
    const message = payload.unavailableFields?.[0]?.reason ?? `Request failed with ${response.status}`
    throw new Error(message)
  }
  return payload
}

export function stockReportQueryKey(ticker: string) {
  return ['stock-report', ticker.toUpperCase()] as const
}

export function fetchStockReport(ticker: string) {
  return fetchResearchJson<StockReport>(`/api/research/report/${encodeURIComponent(ticker.toUpperCase())}`)
}
