import Head from 'next/head'
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { TerminalWorkspace } from '@/shell/terminal/terminal-shell'
import { createApiResponse, createShellMeta, type ShellMeta, type UnavailableField } from '@/lib/research/api'
import {
  getStockReport,
  isValidTickerSymbol,
  normalizeTickerSymbol
} from '@/lib/research/repository'
import { buildUnavailableStockReport } from '@/lib/research/report/buildStockReport'
import type { StockReport } from '@/lib/research/types'

type Props = {
  report: StockReport
  shell: ShellMeta
  unavailableFields: UnavailableField[]
  deferredUnavailableFields: UnavailableField[]
  selectedTicker: string
}

export const getServerSideProps: GetServerSideProps<Props> = async context => {
  const ticker = normalizeTickerSymbol(context.params?.ticker as string | string[] | undefined)
  const report = isValidTickerSymbol(ticker)
    ? await getStockReport(ticker)
    : buildUnavailableStockReport(ticker || 'UNKNOWN', ticker || 'Unknown ticker', 'Ticker format is invalid.')
  const response = createApiResponse({ report })
  return {
    props: {
      report,
      shell: createShellMeta(response),
      unavailableFields: response.unavailableFields,
      deferredUnavailableFields: response.deferredUnavailableFields,
      selectedTicker: report.ticker
    }
  }
}

export function StockReportRoute({ report, shell, unavailableFields, deferredUnavailableFields, selectedTicker }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>{`${report.ticker} / LIQUIDCHAIN Report`}</title>
        <meta name="description" content={`${report.ticker} sourced PM stock report inside LIQUIDCHAIN terminal.`} />
      </Head>
      <TerminalWorkspace
        module="stock-report"
        data={{ report }}
        shell={shell}
        unavailableFields={unavailableFields}
        deferredUnavailableFields={deferredUnavailableFields}
        selectedTicker={selectedTicker}
      />
    </>
  )
}

export default StockReportRoute
