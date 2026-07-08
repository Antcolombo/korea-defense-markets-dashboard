import { useQuery } from '@tanstack/react-query'
import { fetchStockReport, stockReportQueryKey } from '@/lib/research/client'

export function useStockReportQuery(ticker: string, enabled = true) {
  return useQuery({
    queryKey: stockReportQueryKey(ticker),
    queryFn: () => fetchStockReport(ticker),
    enabled: enabled && ticker.trim().length > 0
  })
}
