import Head from 'next/head'
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { TerminalWorkspace } from '@/shell/terminal/terminal-shell'
import { loadWorkspacePage, type WorkspacePageProps } from '@/features/workspace/loaders'

export const getServerSideProps: GetServerSideProps<WorkspacePageProps> = async context => ({
  props: await loadWorkspacePage({
    ...context.query,
    ticker: context.params?.ticker,
    module: 'stock-report'
  })
})

export function StockReportRoute(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const ticker = props.data.report?.ticker ?? props.selectedTicker ?? 'UNKNOWN'
  return (
    <>
      <Head>
        <title>{`${ticker} / KOREA DEFENSE Report`}</title>
        <meta name="description" content={`${ticker} sourced PM stock report inside the Korea Defense Markets terminal.`} />
      </Head>
      <TerminalWorkspace {...props} />
    </>
  )
}

export default StockReportRoute
