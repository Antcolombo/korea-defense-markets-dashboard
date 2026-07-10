import Head from 'next/head'
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { TerminalWorkspace } from '@/shell/terminal/terminal-shell'
import { loadWorkspacePage, type WorkspacePageProps } from '@/features/workspace/loaders'

export const getServerSideProps: GetServerSideProps<WorkspacePageProps> = async context => ({
  props: await loadWorkspacePage(context.query)
})

export function WorkspacePage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>LIQUIDCHAIN Market Terminal</title>
        <meta name="description" content="Single-workspace PM research terminal for sourced pitches, decision journal, event studies, validation, paper book, risk, and source audit." />
      </Head>
      <TerminalWorkspace {...props} />
    </>
  )
}

export default WorkspacePage
