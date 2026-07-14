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
        <title>Korea Defense Markets | Research Terminal</title>
        <meta name="description" content="Sourced Korea and Indo-Pacific defense market intelligence: catalysts, Korea beta, U.S. supplier confirmation, crowding, and invalidation." />
      </Head>
      <TerminalWorkspace {...props} />
    </>
  )
}

export default WorkspacePage
